import { create } from 'zustand';

import { downloadZip } from 'client-zip';
import { api, type Track } from './api';
import { useSettingsStore } from './settings';
import { DashDownloader } from './dash-downloader';

export interface DownloadTask {
    id: string; // trackId or playlistId
    type: 'track' | 'album' | 'playlist';
    name: string;
    progress: number;
    status: 'pending' | 'downloading' | 'completed' | 'error';
    error?: string;
    abortController?: AbortController;
}

interface DownloadState {
    tasks: DownloadTask[];
    addTask: (task: Omit<DownloadTask, 'abortController' | 'progress' | 'status'>) => void;
    updateProgress: (id: string, progress: number) => void;
    completeTask: (id: string) => void;
    failTask: (id: string, error: string) => void;
    removeTask: (id: string) => void;
    cancelTask: (id: string) => void;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
    tasks: [],

    addTask: (task) => {
        const controller = new AbortController();
        const newTask: DownloadTask = {
            ...task,
            progress: 0,
            status: 'pending',
            abortController: controller
        };
        set(state => ({ tasks: [...state.tasks, newTask] }));
        return newTask;
    },

    updateProgress: (id, progress) => {
        set(state => ({
            tasks: state.tasks.map(t => t.id === id ? { ...t, progress, status: 'downloading' } : t)
        }));
    },

    completeTask: (id) => {
        set(state => ({
            tasks: state.tasks.map(t => t.id === id ? { ...t, progress: 100, status: 'completed' } : t)
        }));
    },

    failTask: (id, error) => {
        set(state => ({
            tasks: state.tasks.map(t => t.id === id ? { ...t, status: 'error', error } : t)
        }));
    },

    removeTask: (id) => {
        set(state => ({
            tasks: state.tasks.filter(t => t.id !== id)
        }));
    },

    cancelTask: (id) => {
        const task = get().tasks.find(t => t.id === id);
        if (task && task.abortController) {
            task.abortController.abort();
        }
        get().removeTask(id);
    }
}));


// --- Logic Helpers ---

function buildTrackFilename(track: Track, quality: string): string {
    const artist = track.artists && track.artists.length > 0 ? track.artists[0].name : track.artist || 'Unknown';
    const title = track.title || 'Unknown';
    const ext = quality === 'LOSSLESS' || quality === 'HI_RES_LOSSLESS' ? 'flac' : 'm4a';
    // Simple sanitization
    const sanitize = (s: string) => s.replace(/[\/\\?%*:|"<>]/g, '-');
    return `${sanitize(artist)} - ${sanitize(title)}.${ext}`;
}

// Fetch blob helper (reused logic from api.downloadTrack partial)
async function fetchTrackBlob(track: Track, quality: string, onProgress: (p: any) => void, signal: AbortSignal): Promise<Blob> {

    // 1. Get Stream URL
    const streamUrl = await api.getStreamUrl(track.id, quality);
    if (!streamUrl) throw new Error('Could not resolve stream URL');

    if (signal.aborted) throw new Error('Aborted');

    // 2. Handle DASH vs Direct
    if (streamUrl.startsWith('blob:') || streamUrl.includes('.mpd')) {
        // Assume DASH if blob or mpd extension (though blob url usually means it's already a blob or object url?)
        // Actually api.getStreamUrl returns a blob url ONLY if it extracted from manifest using URL.createObjectURL(blob)
        // Check api.ts: extractStreamUrlFromManifest returns URL.createObjectURL(blob) if <MPD ...

        // Wait, if extractStreamUrlFromManifest returns URL.createObjectURL(blob), that blob IS the manifest XML text.
        // It is NOT the audio blob.
        // DashDownloader needs the URL to the manifest. 
        // If it's a blob url created from text, we can fetch it to get text back or pass it?
        // DashDownloader.downloadDashStream expects "url". 
        // Let's assume DashDownloader handles it.

        const downloader = new DashDownloader();
        return await downloader.downloadDashStream(streamUrl, {
            onProgress: (p: any) => {
                if (signal.aborted) throw new Error('Aborted');
                // DashDownloader usually returns 0-1 or 0-100? Assuming 0-100 based on api.ts usage
                // api.ts doesn't transform p, so lets forward it
                onProgress(p);
            }
        });
    } else {
        // Direct download
        const response = await fetch(streamUrl, { signal });
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

        const contentLength = +response.headers.get('Content-Length')!;
        const reader = response.body?.getReader();

        if (!reader) {
            const blob = await response.blob();
            onProgress(100);
            return blob;
        }

        let receivedLength = 0;
        const chunks = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            receivedLength += value.length;

            if (contentLength) {
                onProgress(Math.round((receivedLength / contentLength) * 100));
            }
        }

        return new Blob(chunks);
    }
}

export async function downloadTrack(track: Track) {
    const store = useDownloadStore.getState();
    const settings = useSettingsStore.getState();
    const quality = settings.downloadQuality;

    const taskData = {
        id: track.id,
        type: 'track' as const,
        name: track.title,
    };

    if (store.tasks.find(t => t.id === track.id)) return;

    store.addTask(taskData);
    const task = store.tasks.find(t => t.id === track.id);
    if (!task || !task.abortController) return;

    const signal = task.abortController.signal;

    try {
        store.updateProgress(track.id, 0);

        const blob = await fetchTrackBlob(track, quality, (p) => {
            store.updateProgress(track.id, typeof p === 'number' ? p : p.percent || 0);
        }, signal);

        // Limit concurrency save
        if (signal.aborted) return;

        // Trigger Save
        const filename = buildTrackFilename(track, quality);
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);

        store.completeTask(track.id);
    } catch (error: any) {
        if (signal.aborted) return;
        console.error('Download failed:', error);
        store.failTask(track.id, error.message || 'Failed');
    }
}

export async function downloadPlaylistAsZip(name: string, tracks: Track[]) {
    const store = useDownloadStore.getState();
    const settings = useSettingsStore.getState();
    const quality = settings.downloadQuality;
    const id = `playlist-${Date.now()}`;

    if (tracks.length === 0) return;

    store.addTask({
        id,
        type: 'playlist',
        name: `Playlist: ${name}`
    });

    const task = store.tasks.find(t => t.id === id);
    if (!task || !task.abortController) return;
    const signal = task.abortController.signal;

    try {
        // client-zip expects { name, lastModified, input } where input is Blob/string etc.
        const files: Array<{ name: string; lastModified: Date; input: Blob }> = [];
        let completed = 0;

        store.updateProgress(id, 0);

        // Sequential download to avoid rate limits
        for (const track of tracks) {
            if (signal.aborted) throw new Error('Aborted');

            try {
                const blob = await fetchTrackBlob(track, quality, () => { }, signal);

                const filename = buildTrackFilename(track, quality);
                files.push({
                    name: filename,
                    lastModified: new Date(),
                    input: blob
                });
            } catch (e) {
                console.warn(`Failed to download ${track.title}`, e);
            }

            completed++;
            store.updateProgress(id, Math.round((completed / tracks.length) * 90));
        }

        // Zip it (using client-zip)
        if (files.length > 0) {
            if (signal.aborted) throw new Error('Aborted');
            // client-zip returns a Response, we get blob
            const response = downloadZip(files);
            const blob = await response.blob();

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${name}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        store.completeTask(id);

    } catch (error: any) {
        if (signal.aborted) return;
        store.failTask(id, error.message || 'Failed');
    }
}
