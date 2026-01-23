import type { Track } from './api';
import { useSettingsStore } from './settings';

export interface SyncedLine {
    time: number; // seconds
    text: string;
    translation?: string; // For Romaji
}

export interface LyricsData {
    lines: SyncedLine[];
    provider: string;
    type: 'synced' | 'plain';
}

class LyricsManager {
    private cache = new Map<string, LyricsData>();

    async fetchLyrics(track: Track): Promise<LyricsData | null> {
        if (this.cache.has(track.id)) return this.cache.get(track.id) || null;

        try {
            const artist = track.artists?.[0]?.name || track.artist || '';
            const title = track.title;
            const album = track.album || '';
            const duration = track.duration;

            const params = new URLSearchParams({
                track_name: title,
                artist_name: artist,
            });
            if (album) params.append('album_name', album);
            if (duration) params.append('duration', duration.toString());

            const response = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
            if (!response.ok) throw new Error('Lyrics not found');

            const data = await response.json();

            let lyricsData: LyricsData | null = null;

            if (data.syncedLyrics) {
                lyricsData = {
                    lines: this.parseLRC(data.syncedLyrics),
                    provider: 'LRCLIB',
                    type: 'synced'
                };
            } else if (data.plainLyrics) {
                lyricsData = {
                    lines: [{ time: 0, text: data.plainLyrics }],
                    provider: 'LRCLIB',
                    type: 'plain'
                };
            }

            if (lyricsData) {
                this.cache.set(track.id, lyricsData);
                // Trigger Romaji conversion if enabled
                if (useSettingsStore.getState().romajiMode) {
                    this.convertLyrics(track.id);
                }
            }

            return lyricsData;

        } catch (e) {
            console.warn('Lyrics fetch failed:', e);
            return null;
        }
    }

    parseLRC(lrc: string): SyncedLine[] {
        const lines = lrc.split('\n');
        return lines.map(line => {
            const match = line.match(/\[(\d+):(\d+)\.(\d+)\](.*)/);
            if (match) {
                const min = parseInt(match[1]);
                const sec = parseInt(match[2]);
                const ms = parseInt(match[3]);
                const text = match[4].trim();
                // Format is usually MM:SS.xx (hundredths) -> seconds
                return {
                    time: min * 60 + sec + ms / 100,
                    text
                };
            }
            return null;
        }).filter(Boolean) as SyncedLine[];
    }

    async convertLyrics(trackId: string) {
        const data = this.cache.get(trackId);
        if (!data) return;

        // Stub for Kuroshiro since npm installation is flaky in this env
        // Real implementation would import Kuroshiro here
        console.log('Romaji conversion requested for', trackId);

        // Mock conversion for demonstration if needed, or just leave as is
        // In a real env, we would instantiate Kuroshiro, init it, and convert line.text
    }
}

export const lyricsManager = new LyricsManager();
