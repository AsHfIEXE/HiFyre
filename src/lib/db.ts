// IndexedDB Database using 'idb' wrapper
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Track, Album, Artist, Playlist } from './api';
import { syncUserData } from '../services/firebase';

const DB_NAME = 'HiFyreDB';
const DB_VERSION = 1;

interface FavoriteItem {
    userId: string;
    id: string;
    type: 'track' | 'album' | 'artist' | 'playlist';
    data: Track | Album | Artist | Playlist;
    addedAt: number;
}

export interface UserPlaylist {
    id: string;
    userId: string;
    name: string;
    tracks: Track[];
    cover?: string;
    createdAt: number;
    updatedAt: number;
}

interface HistoryItem {
    id: string; // trackId
    userId: string;
    track: Track;
    playedAt: number;
}

interface HiFyreSchema extends DBSchema {
    favorites: {
        key: [string, string, string]; // [userId, type, id]
        value: FavoriteItem;
        indexes: { 'userId': string, 'type': string };
    };
    playlists: {
        key: string;
        value: UserPlaylist;
        indexes: { 'userId': string };
    };
    history: {
        key: [string, string]; // [userId, id] -> composite key to allow one history entry per track per user? 
        // Or should history be a log? 
        // Current requirement seems to be "recently played", so unique per track is fine.
        // Let's use [userId, id] as key.
        value: HistoryItem;
        indexes: { 'userId': string, 'playedAt': number };
    };
}

class MusicDatabase {
    private currentUserId: string = 'anonymous';
    private dbPromise: Promise<IDBPDatabase<HiFyreSchema>>;

    constructor() {
        this.dbPromise = openDB<HiFyreSchema>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Favorites
                if (!db.objectStoreNames.contains('favorites')) {
                    const store = db.createObjectStore('favorites', { keyPath: ['userId', 'type', 'id'] });
                    store.createIndex('userId', 'userId');
                    store.createIndex('type', 'type');
                }

                // Playlists
                if (!db.objectStoreNames.contains('playlists')) {
                    const store = db.createObjectStore('playlists', { keyPath: 'id' });
                    store.createIndex('userId', 'userId');
                }

                // History
                if (!db.objectStoreNames.contains('history')) {
                    const store = db.createObjectStore('history', { keyPath: ['userId', 'id'] });
                    store.createIndex('userId', 'userId');
                    store.createIndex('playedAt', 'playedAt');
                }
            },
        });
    }

    setUserId(id: string) {
        this.currentUserId = id;
    }

    private async syncToCloud() {
        if (this.currentUserId === 'anonymous') return;
        // implementation remains same, just simplified calling
        try {
            const tracks = await this.getFavorites('track');
            const albums = await this.getFavorites('album');
            const artists = await this.getFavorites('artist');
            const playlists = await this.getFavorites('playlist');

            await syncUserData(this.currentUserId, {
                favorites: { tracks, albums, artists, playlists },
                playlists: await this.getPlaylists(),
                history: await this.getHistory(100)
            });
        } catch (e) {
            console.error('Cloud sync failed:', e);
        }
    }

    // Favorites
    async addFavorite(type: FavoriteItem['type'], item: any): Promise<void> {
        const db = await this.dbPromise;
        await db.put('favorites', {
            userId: this.currentUserId,
            id: item.id,
            type,
            data: item,
            addedAt: Date.now()
        });
        this.syncToCloud();
    }

    async removeFavorite(type: FavoriteItem['type'], id: string): Promise<void> {
        const db = await this.dbPromise;
        await db.delete('favorites', [this.currentUserId, type, id]);
        this.syncToCloud();
    }

    async isFavorite(type: FavoriteItem['type'], id: string): Promise<boolean> {
        const db = await this.dbPromise;
        const item = await db.get('favorites', [this.currentUserId, type, id]);
        return !!item;
    }

    async getFavorites(type: FavoriteItem['type']): Promise<any[]> {
        const db = await this.dbPromise;
        // idb doesn't support compound range on unrelated indexes easily without a composite index.
        // But our PK is [userId, type, id].
        // We can get all items for the user, then filter. Or use a range on the PK.
        // IDBKeyRange.bound([userId, type], [userId, type, '\uffff'])
        const range = IDBKeyRange.bound(
            [this.currentUserId, type],
            [this.currentUserId, type, '\uffff']
        );
        const items = await db.getAll('favorites', range);
        return items.sort((a, b) => b.addedAt - a.addedAt).map(i => i.data);
    }

    async toggleFavorite(type: FavoriteItem['type'], item: any): Promise<boolean> {
        const exists = await this.isFavorite(type, item.id);
        if (exists) {
            await this.removeFavorite(type, item.id);
            return false;
        } else {
            await this.addFavorite(type, item);
            return true;
        }
    }

    // Playlists
    async createPlaylist(name: string, tracks: Track[] = [], cover?: string): Promise<UserPlaylist> {
        const db = await this.dbPromise;
        const playlist: UserPlaylist = {
            id: `playlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId: this.currentUserId,
            name,
            tracks,
            cover,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        await db.add('playlists', playlist);
        this.syncToCloud();
        return playlist;
    }

    async getPlaylists(): Promise<UserPlaylist[]> {
        const db = await this.dbPromise;
        const playlists = await db.getAllFromIndex('playlists', 'userId', this.currentUserId);
        return playlists.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    async getPlaylist(id: string): Promise<UserPlaylist | undefined> {
        const db = await this.dbPromise;
        const playlist = await db.get('playlists', id);
        return (playlist && playlist.userId === this.currentUserId) ? playlist : undefined;
    }

    async updatePlaylist(playlist: UserPlaylist): Promise<void> {
        if (playlist.userId !== this.currentUserId) return;
        const db = await this.dbPromise;
        await db.put('playlists', { ...playlist, updatedAt: Date.now() });
        this.syncToCloud();
    }

    async deletePlaylist(id: string): Promise<void> {
        const db = await this.dbPromise;
        const pl = await db.get('playlists', id);
        if (pl && pl.userId === this.currentUserId) {
            await db.delete('playlists', id);
            this.syncToCloud();
        }
    }

    async addTrackToPlaylist(playlistId: string, track: Track): Promise<void> {
        const pl = await this.getPlaylist(playlistId);
        if (pl) {
            if (!pl.tracks.some(t => t.id === track.id)) {
                pl.tracks.push(track);
                await this.updatePlaylist(pl);
            }
        }
    }

    async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
        const pl = await this.getPlaylist(playlistId);
        if (pl) {
            pl.tracks = pl.tracks.filter(t => t.id !== trackId);
            await this.updatePlaylist(pl);
        }
    }

    // History
    async addToHistory(track: Track): Promise<void> {
        const db = await this.dbPromise;
        await db.put('history', {
            id: track.id,
            userId: this.currentUserId,
            track,
            playedAt: Date.now()
        });
        this.syncToCloud();
    }

    async getHistory(limit = 50): Promise<Track[]> {
        const db = await this.dbPromise;
        const history = await db.getAllFromIndex('history', 'userId', this.currentUserId);
        // Sort in memory since we need complex sort
        history.sort((a, b) => b.playedAt - a.playedAt);
        return history.slice(0, limit).map(h => h.track);
    }

    async clearHistory(): Promise<void> {
        const db = await this.dbPromise;
        // Range delete would be ideal but getAllKeys + delete is safer for "userId" index
        const keys = await db.getAllKeysFromIndex('history', 'userId', this.currentUserId);
        const tx = db.transaction('history', 'readwrite');
        await Promise.all(keys.map(k => tx.store.delete(k)));
        await tx.done;
    }

    // Backup/Restore
    async exportData(): Promise<any> {
        const [tracks, albums, artists, playlists, history] = await Promise.all([
            this.getFavorites('track'),
            this.getFavorites('album'),
            this.getFavorites('artist'),
            this.getPlaylists(),
            this.getHistory(1000)
        ]);

        return {
            version: DB_VERSION,
            timestamp: Date.now(),
            data: { favorites: { tracks, albums, artists }, playlists, history }
        };
    }

    async importData(backup: any): Promise<void> {
        if (!backup?.data) throw new Error('Invalid backup');

        // Sequential to avoid slamming DB
        const { favorites, playlists, history } = backup.data;

        if (favorites) {
            if (favorites.tracks) for (const t of favorites.tracks) await this.addFavorite('track', t);
            if (favorites.albums) for (const a of favorites.albums) await this.addFavorite('album', a);
            if (favorites.artists) for (const a of favorites.artists) await this.addFavorite('artist', a);
        }

        if (playlists) {
            for (const pl of playlists) {
                await this.createPlaylist(pl.name, pl.tracks, pl.cover);
            }
        }

        if (history) {
            for (const t of history) await this.addToHistory(t);
        }
    }

    async clear(): Promise<void> {
        const db = await this.dbPromise;
        await db.clear('favorites');
        await db.clear('playlists');
        await db.clear('history');
    }
}

export const db = new MusicDatabase();
