// API Service - Migrated and adapted from Monochrome
// Handles all music streaming API calls

import { API_INSTANCES, STREAMING_INSTANCES } from '../config/instances';
import { DashDownloader } from './dash-downloader';

export const DASH_MANIFEST_UNAVAILABLE_CODE = 'DASH_MANIFEST_UNAVAILABLE';

// Types
export interface Track {
    id: string;
    title: string;
    artist: string;
    artistId?: string;
    artists?: Artist[];
    album: string;
    albumId?: string;
    duration: number;
    coverUrl: string;
    explicit?: boolean;
    trackNumber?: number;
    discNumber?: number;
    quality?: string;
    replayGain?: number;
    // Internal fields for stream handling
    info?: { manifest: string };
    originalTrackUrl?: string;
}

export interface Album {
    id: string;
    title: string;
    artist: string;
    artistId?: string;
    coverUrl: string;
    releaseDate?: string;
    numberOfTracks?: number;
    tracks?: Track[];
    type?: 'ALBUM' | 'EP' | 'SINGLE';
}

export interface Artist {
    id: string;
    name: string;
    pictureUrl?: string;
    bio?: string;
    albums?: Album[];
    eps?: Album[];
    tracks?: Track[];
}

export interface Playlist {
    id: string;
    title: string;
    description?: string;
    coverUrl?: string;
    numberOfTracks?: number;
    tracks?: Track[];
    creator?: string;
}

export interface SearchResults {
    tracks: Track[];
    albums: Album[];
    artists: Artist[];
    playlists: Playlist[];
}

// API Cache
class APICache {
    private cache: Map<string, { data: any; timestamp: number }>;
    private maxSize: number;
    private ttl: number;

    constructor(options: { maxSize?: number; ttl?: number } = {}) {
        this.cache = new Map();
        this.maxSize = options.maxSize || 200;
        this.ttl = options.ttl || 1000 * 60 * 30; // 30 minutes default
    }

    get(key: string): any | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }

    set(key: string, data: any): void {
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
        }
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    clear(): void {
        this.cache.clear();
    }
}

// Main API Class
export class MusicAPI {
    private cache: APICache;
    private streamCache: Map<string, { url: string; timestamp: number }>;

    constructor() {
        this.cache = new APICache({ maxSize: 200, ttl: 1000 * 60 * 30 });
        this.streamCache = new Map();

        // Prune stream cache periodically
        setInterval(() => this.pruneStreamCache(), 1000 * 60 * 5);
    }

    private pruneStreamCache(): void {
        const maxAge = 1000 * 60 * 10; // 10 minutes
        const now = Date.now();
        for (const [key, value] of this.streamCache) {
            if (now - value.timestamp > maxAge) {
                this.streamCache.delete(key);
            }
        }
    }

    private getInstances(type: 'api' | 'streaming' = 'api'): string[] {
        return type === 'api' ? API_INSTANCES : STREAMING_INSTANCES;
    }

    private async fetchWithRetry(
        path: string,
        options: { retries?: number; type?: 'api' | 'streaming' } = {}
    ): Promise<Response> {
        const type = options.type || 'api';
        const instances = this.getInstances(type);

        let lastError: Error | null = null;

        // Try each instance
        const maxAttempts = instances.length * 2; // Allow cycling through twice if needed
        let instanceIndex = 0;

        for (let i = 0; i < maxAttempts; i++) {
            const baseUrl = instances[instanceIndex % instances.length];
            const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
            const cleanPath = path.startsWith('/') ? path : `/${path}`;
            const url = `${cleanBase}${cleanPath}`;

            try {
                const response = await fetch(url);

                if (response.status === 429) {
                    // Rate limited, try next instance immediately
                    console.warn(`Rate limit on ${baseUrl}, switching instance...`);
                    instanceIndex++;
                    continue;
                }

                if (response.status >= 500) {
                    // Server error, try next
                    console.warn(`Server error ${response.status} on ${baseUrl}, switching instance...`);
                    instanceIndex++;
                    continue;
                }

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                return response;
            } catch (error) {
                lastError = error as Error;
                console.warn(`Fetch failed on ${baseUrl}:`, error);
                instanceIndex++;
                // Small delay before next attempt
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        throw lastError || new Error('All instances failed');
    }

    // Search Methods
    async search(query: string, limit = 20): Promise<SearchResults> {
        // Parallel search for all types
        const [tracks, albums, artists, playlists] = await Promise.all([
            this.searchTracks(query, limit),
            this.searchAlbums(query, limit),
            this.searchArtists(query, limit),
            this.searchPlaylists(query, limit)
        ]);

        return { tracks, albums, artists, playlists };
    }

    async searchTracks(query: string, limit = 20): Promise<Track[]> {
        const cacheKey = `search:tracks:${query}:${limit}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await this.fetchWithRetry(`/search/?s=${encodeURIComponent(query)}&limit=${limit}`);
            const data = await response.json();
            const results = this.normalizeSearchResponse(data, 'tracks')
                .items.map((t: any) => this.normalizeTrack(t));

            this.cache.set(cacheKey, results);
            return results;
        } catch (e) {
            console.error("Search tracks failed", e);
            return [];
        }
    }

    async searchAlbums(query: string, limit = 20): Promise<Album[]> {
        const cacheKey = `search:albums:${query}:${limit}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await this.fetchWithRetry(`/search/?al=${encodeURIComponent(query)}&limit=${limit}`);
            const data = await response.json();
            const results = this.normalizeSearchResponse(data, 'albums')
                .items.map((a: any) => this.normalizeAlbum(a));

            this.cache.set(cacheKey, results);
            return results;
        } catch (e) {
            console.error("Search albums failed", e);
            return [];
        }
    }

    async searchArtists(query: string, limit = 20): Promise<Artist[]> {
        const cacheKey = `search:artists:${query}:${limit}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await this.fetchWithRetry(`/search/?a=${encodeURIComponent(query)}&limit=${limit}`);
            const data = await response.json();
            const results = this.normalizeSearchResponse(data, 'artists')
                .items.map((a: any) => this.normalizeArtist(a));

            this.cache.set(cacheKey, results);
            return results;
        } catch (e) {
            console.error("Search artists failed", e);
            return [];
        }
    }

    async searchPlaylists(query: string, limit = 20): Promise<Playlist[]> {
        const cacheKey = `search:playlists:${query}:${limit}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await this.fetchWithRetry(`/search/?p=${encodeURIComponent(query)}&limit=${limit}`);
            const data = await response.json();
            const results = this.normalizeSearchResponse(data, 'playlists')
                .items.map((p: any) => this.normalizePlaylist(p));

            this.cache.set(cacheKey, results);
            return results;
        } catch (e) {
            console.error("Search playlists failed", e);
            return [];
        }
    }

    // Helper to find nested search results
    private normalizeSearchResponse(data: any, key: string) {
        // Unwrap { version, data } envelope
        const unwrapped = data.data || data;

        if (!unwrapped) return { items: [] };

        // 1. Direct items array (e.g. from /search/?s=... endpoints)
        if (unwrapped.items) {
            return { items: unwrapped.items };
        }

        // 2. Nested key (e.g. from /search/?q=... or composite endpoints)
        if (unwrapped[key]) {
            return { items: unwrapped[key].items || unwrapped[key] || [] };
        }

        // 3. Root is array
        if (Array.isArray(unwrapped)) {
            return { items: unwrapped };
        }

        return { items: [] };
    }

    // Get Methods
    async getTrack(id: string): Promise<Track | null> {
        const cacheKey = `track:${id}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        try {
            // NOTE: Original used 'streaming' type for track info, but 'api' for metadata?
            // Actually getTrack in orig uses type: 'streaming'
            const response = await this.fetchWithRetry(`/track/?id=${id}`, { type: 'api' });
            const json = await response.json();

            // The response format from /track/ endpoint usually contains { data: ... } or just the object
            const data = json.data || json;

            // We need to handle the specific structure returned by the API which might include manifest info
            // for now, let's normalize what we can. 
            // Warning: /track/ endpoint might return different structure than search results.

            // In original code: parseTrackLookup expects an array or object
            // It looks for { track, info, originalTrackUrl } properties scattered across the response

            const track = this.normalizeTrack(data);

            // If the response has manifest info directly (unlikely in basic metadata call, usually specific quality call)
            // But let's store the raw response for stream extraction later if needed
            if (data.manifest || (data[0] && data[0].manifest)) {
                track.info = { manifest: data.manifest || data[0].manifest };
            }

            this.cache.set(cacheKey, track);
            return track;
        } catch (e) {
            console.error(`Failed to get track ${id}`, e);
            return null;
        }
    }

    // Helper: Stream URL Extraction
    private extractStreamUrlFromManifest(manifest: string): string | null {
        try {
            const decoded = atob(manifest);

            // Check if it's a DASH manifest (XML)
            if (decoded.includes('<MPD')) {
                const blob = new Blob([decoded], { type: 'application/dash+xml' });
                return URL.createObjectURL(blob);
            }

            try {
                const parsed = JSON.parse(decoded);
                if (parsed?.urls?.[0]) {
                    return parsed.urls[0];
                }
            } catch {
                const match = decoded.match(/https?:\/\/[\w\-.~:?#[@!$&'()*+,;=%\/]+/);
                return match ? match[0] : null;
            }
            return null;
        } catch (error) {
            console.error('Failed to decode manifest:', error);
            return null;
        }
    }

    async getStreamUrl(trackId: string, quality = 'HI_RES_LOSSLESS'): Promise<string | null> {
        const cacheKey = `stream:${trackId}:${quality}`;
        const cached = this.streamCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < 1000 * 60 * 10) {
            return cached.url;
        }

        try {
            // We need to call the track endpoint WITH quality to get the manifest
            const response = await this.fetchWithRetry(`/track/?id=${trackId}&quality=${quality}`, { type: 'streaming' });
            const json = await response.json();

            // Adapt the parsing logic from parseTrackLookup
            const data = Array.isArray(json) ? json : (json.data ? [json.data] : [json]);

            let originalTrackUrl: string | undefined;
            let manifest: string | undefined;

            for (const entry of data) {
                if (!entry) continue;
                if (entry.OriginalTrackUrl) originalTrackUrl = entry.OriginalTrackUrl;
                if (entry.manifest) manifest = entry.manifest;
            }

            let url: string | null = null;
            if (originalTrackUrl) {
                url = originalTrackUrl;
            } else if (manifest) {
                url = this.extractStreamUrlFromManifest(manifest);
            }

            if (url) {
                this.streamCache.set(cacheKey, { url, timestamp: Date.now() });
            }
            return url;
        } catch (e) {
            console.error('Failed to get stream url', e);
            return null;
        }
    }

    async downloadTrack(track: Track, filename: string, onProgress?: (progress: any) => void): Promise<void> {
        try {
            // 1. Get Stream URL
            const streamUrl = await this.getStreamUrl(track.id, 'HI_RES_LOSSLESS');
            if (!streamUrl) throw new Error('Could not resolve stream URL');

            let blob: Blob;

            // 2. Handle DASH vs Direct
            if (streamUrl.startsWith('blob:')) {
                const downloader = new DashDownloader();
                blob = await downloader.downloadDashStream(streamUrl, {
                    onProgress
                });
            } else {
                // Direct download
                const response = await fetch(streamUrl);
                if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
                blob = await response.blob();
            }

            // 3. Trigger Download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Download failed:', error);
            throw error;
        }
    }

    // Cover URLs
    getCoverUrl(albumId: string, size = '320'): string {
        if (!albumId) return '/placeholder-cover.png';
        return `https://resources.tidal.com/images/${albumId.replace(/-/g, '/')}/${size}x${size}.jpg`;
    }

    getArtistPictureUrl(artistId: string, size = '320'): string {
        if (!artistId) return '/placeholder-artist.png';
        return `https://resources.tidal.com/images/${artistId.replace(/-/g, '/')}/${size}x${size}.jpg`;
    }

    // Normalization helpers
    private normalizeTrack(data: any): Track {
        // Handles both { item: ... } wrapper and direct object
        const t = data.item || data;

        return {
            id: String(t.id || t.trackId), // Some endpoints use trackId
            title: t.title || 'Unknown Track',
            artist: t.artist?.name || t.artists?.[0]?.name || 'Unknown Artist',
            artistId: String(t.artist?.id || t.artists?.[0]?.id || ''),
            artists: t.artists?.map((a: any) => ({ id: String(a.id), name: a.name })),
            album: t.album?.title || 'Unknown Album',
            albumId: String(t.album?.id || ''),
            duration: t.duration || 0,
            coverUrl: t.album?.cover
                ? this.getCoverUrl(t.album.cover)
                : '/placeholder-cover.png',
            explicit: t.explicit || false,
            trackNumber: t.trackNumber,
            discNumber: t.volumeNumber,
            quality: t.audioQuality,
            replayGain: t.replayGain,
        };
    }

    private normalizeAlbum(data: any): Album {
        const a = data.item || data;
        return {
            id: String(a.id),
            title: a.title || 'Unknown Album',
            artist: a.artist?.name || a.artists?.[0]?.name || 'Unknown Artist',
            artistId: String(a.artist?.id || a.artists?.[0]?.id || ''),
            coverUrl: a.cover
                ? this.getCoverUrl(a.cover)
                : '/placeholder-cover.png',
            releaseDate: a.releaseDate,
            numberOfTracks: a.numberOfTracks,
            tracks: a.tracks?.items?.map((t: any) => this.normalizeTrack(t)),
            type: a.type,
        };
    }

    private normalizeArtist(data: any): Artist {
        const a = data.item || data;
        return {
            id: String(a.id),
            name: a.name || 'Unknown Artist',
            pictureUrl: a.picture
                ? this.getArtistPictureUrl(a.picture)
                : '/placeholder-artist.png',
            bio: a.bio,
        };
    }

    private normalizePlaylist(data: any): Playlist {
        const p = data.item || data;
        return {
            id: String(p.uuid || p.id),
            title: p.title || 'Unknown Playlist',
            description: p.description,
            coverUrl: p.squareImage || p.image || '/placeholder-cover.png',
            numberOfTracks: p.numberOfTracks,
            tracks: p.tracks?.items?.map((t: any) => this.normalizeTrack(t.item || t)),
            creator: p.creator?.name,
        };
    }

    // Clear cache
    clearCache(): void {
        this.cache.clear();
        this.streamCache.clear();
    }
}

// Export singleton instance
export const api = new MusicAPI();
