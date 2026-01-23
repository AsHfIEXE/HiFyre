// Player Store - Zustand store for audio player state

import { create } from 'zustand';
import type { Track } from './api';
import { volumeManager, queueManager, qualitySettings } from './storage';
import { db } from './db';

export type RepeatMode = 'none' | 'all' | 'one';
export type ShuffleMode = 'off' | 'on';

interface PlayerState {
    // Current track
    currentTrack: Track | null;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    buffered: number;

    // Queue
    queue: Track[];
    queueIndex: number;
    originalQueue: Track[];

    // Controls
    volume: number;
    muted: boolean;
    repeatMode: RepeatMode;
    shuffleMode: ShuffleMode;
    quality: string;

    // Loading state
    loading: boolean;
    error: string | null;

    // Actions
    setTrack: (track: Track) => void;
    play: () => void;
    pause: () => void;
    togglePlay: () => void;
    playTrack: (track: Track, addToQueue?: boolean) => void;
    playAlbum: (tracks: Track[], startIndex?: number) => void;
    playPlaylist: (tracks: Track[], startIndex?: number) => void;

    // Queue actions
    addToQueue: (track: Track) => void;
    addTracksToQueue: (tracks: Track[]) => void;
    addNextToQueue: (track: Track) => void;
    removeFromQueue: (index: number) => void;
    clearQueue: () => void;
    playNext: () => void;
    playPrevious: () => void;
    skipTo: (index: number) => void;
    reorderQueue: (oldIndex: number, newIndex: number) => void;

    // Playback controls
    seek: (time: number) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    setRepeatMode: (mode: RepeatMode) => void;
    toggleShuffle: () => void;
    setQuality: (quality: string) => void;

    // State updates
    setCurrentTime: (time: number) => void;
    setDuration: (duration: number) => void;
    setBuffered: (buffered: number) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setIsPlaying: (playing: boolean) => void;
}

// Shuffle array using Fisher-Yates
function shuffleArray<T>(array: T[], keepFirst?: T): T[] {
    const result = [...array];

    if (keepFirst) {
        const firstIndex = result.findIndex(item => item === keepFirst);
        if (firstIndex > -1) {
            result.splice(firstIndex, 1);
        }
    }

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    if (keepFirst) {
        result.unshift(keepFirst);
    }

    return result;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
    // Initial state
    // Initial state
    currentTrack: queueManager.getQueue().queue[queueManager.getQueue().index] || null,
    isPlaying: false,
    currentTime: queueManager.getQueue().position || 0,
    duration: 0,
    buffered: 0,

    queue: queueManager.getQueue().queue || [],
    queueIndex: queueManager.getQueue().index || 0,
    originalQueue: queueManager.getQueue().queue || [],

    volume: volumeManager.getVolume(),
    muted: false,
    repeatMode: 'none',
    shuffleMode: 'off',
    quality: qualitySettings.getQuality(),

    loading: false,
    error: null,

    // Actions
    setTrack: (track) => {
        set({ currentTrack: track, error: null });
        db.addToHistory(track);
    },

    play: () => set({ isPlaying: true }),
    pause: () => set({ isPlaying: false }),
    togglePlay: () => set(state => ({ isPlaying: !state.isPlaying })),

    playTrack: (track, addToQueue = false) => {
        const state = get();
        if (addToQueue) {
            // Check if track is already in queue?
            // User might want to add duplicates. Let's allow duplicates for now.
            const newQueue = [...state.queue, track];
            const newOriginalQueue = state.shuffleMode === 'off' ? newQueue : [...state.originalQueue, track];

            set({
                queue: newQueue,
                originalQueue: newOriginalQueue
            });

            // Persist
            queueManager.saveQueue({
                queue: newQueue,
                index: state.queueIndex,
                position: state.currentTime
            });
        } else {
            const newQueue = [track];
            set({
                currentTrack: track,
                queue: newQueue,
                originalQueue: newQueue,
                queueIndex: 0,
                isPlaying: true,
                error: null
            });
            db.addToHistory(track);

            // Persist
            queueManager.saveQueue({
                queue: newQueue,
                index: 0,
                position: 0
            });
        }
    },

    playAlbum: (tracks, startIndex = 0) => {
        const state = get();
        const queue = state.shuffleMode === 'on'
            ? shuffleArray(tracks, tracks[startIndex])
            : tracks;
        const index = state.shuffleMode === 'on' ? 0 : startIndex;

        set({
            currentTrack: queue[index],
            queue,
            originalQueue: tracks,
            queueIndex: index,
            isPlaying: true,
            error: null
        });

        if (queue[index]) {
            db.addToHistory(queue[index]);
        }
    },

    playPlaylist: (tracks, startIndex = 0) => {
        const state = get();
        const queue = state.shuffleMode === 'on'
            ? shuffleArray(tracks, tracks[startIndex])
            : tracks;
        const index = state.shuffleMode === 'on' ? 0 : startIndex;

        set({
            currentTrack: queue[index],
            queue,
            originalQueue: tracks,
            queueIndex: index,
            isPlaying: true,
            error: null
        });

        if (queue[index]) {
            db.addToHistory(queue[index]);
        }
    },

    addToQueue: (track) => {
        const state = get();
        const newQueue = [...state.queue, track];
        const newOriginalQueue = state.shuffleMode === 'off' ? newQueue : [...state.originalQueue, track];

        set({
            queue: newQueue,
            originalQueue: newOriginalQueue
        });

        // Persist
        queueManager.saveQueue({
            queue: newQueue,
            index: state.queueIndex,
            position: state.currentTime
        });
    },

    addTracksToQueue: (tracks) => {
        const state = get();
        const newQueue = [...state.queue, ...tracks];
        const newOriginalQueue = state.shuffleMode === 'off' ? newQueue : [...state.originalQueue, ...tracks];

        set({
            queue: newQueue,
            originalQueue: newOriginalQueue
        });

        // Persist
        queueManager.saveQueue({
            queue: newQueue,
            index: state.queueIndex,
            position: state.currentTime
        });
    },

    addNextToQueue: (track) => {
        const state = get();
        const newQueue = [...state.queue];
        const insertIndex = state.queueIndex + 1;
        newQueue.splice(insertIndex, 0, track);

        const newOriginalQueue = state.shuffleMode === 'off' ? newQueue : [...state.originalQueue, track];

        set({
            queue: newQueue,
            originalQueue: newOriginalQueue
        });

        queueManager.saveQueue({
            queue: newQueue,
            index: state.queueIndex,
            position: state.currentTime
        });
    },

    removeFromQueue: (index) => {
        const state = get();
        const newQueue = state.queue.filter((_, i) => i !== index);
        let newIndex = state.queueIndex;

        if (index < state.queueIndex) {
            newIndex = state.queueIndex - 1;
        } else if (index === state.queueIndex) {
            // Currently playing track removed
            if (newQueue.length > 0) {
                newIndex = Math.min(state.queueIndex, newQueue.length - 1);
                set({
                    queue: newQueue,
                    queueIndex: newIndex,
                    currentTrack: newQueue[newIndex] || null
                });
                return;
            }
        }

        set({ queue: newQueue, queueIndex: Math.max(0, newIndex) });
    },

    clearQueue: () => {
        set({
            queue: [],
            originalQueue: [],
            queueIndex: 0,
            currentTrack: null,
            isPlaying: false
        });
        queueManager.clearQueue();
    },

    playNext: () => {
        const state = get();
        const { queue, queueIndex, repeatMode } = state;

        if (queue.length === 0) return;

        let nextIndex = queueIndex + 1;

        if (nextIndex >= queue.length) {
            if (repeatMode === 'all') {
                nextIndex = 0;
            } else {
                set({ isPlaying: false });
                return;
            }
        }

        const nextTrack = queue[nextIndex];
        set({
            currentTrack: nextTrack,
            queueIndex: nextIndex,
            isPlaying: true,
            error: null
        });

        if (nextTrack) {
            db.addToHistory(nextTrack);
        }
    },

    playPrevious: () => {
        const state = get();
        const { queue, queueIndex, currentTime, repeatMode } = state;

        if (queue.length === 0) return;

        // If more than 3 seconds in, restart current track
        if (currentTime > 3) {
            set({ currentTime: 0 });
            return;
        }

        let prevIndex = queueIndex - 1;

        if (prevIndex < 0) {
            if (repeatMode === 'all') {
                prevIndex = queue.length - 1;
            } else {
                prevIndex = 0;
            }
        }

        const prevTrack = queue[prevIndex];
        set({
            currentTrack: prevTrack,
            queueIndex: prevIndex,
            isPlaying: true,
            error: null
        });

        if (prevTrack) {
            db.addToHistory(prevTrack);
        }
    },

    skipTo: (index) => {
        const state = get();
        if (index < 0 || index >= state.queue.length) return;

        const track = state.queue[index];
        set({
            currentTrack: track,
            queueIndex: index,
            isPlaying: true,
            error: null
        });

        if (track) {
            db.addToHistory(track);
        }
    },

    seek: (time) => set({ currentTime: time }),

    setVolume: (volume) => {
        volumeManager.setVolume(volume);
        set({ volume, muted: volume === 0 });
    },

    toggleMute: () => set(state => ({ muted: !state.muted })),

    setRepeatMode: (mode) => set({ repeatMode: mode }),

    toggleShuffle: () => {
        const state = get();
        const newMode = state.shuffleMode === 'off' ? 'on' : 'off';

        if (newMode === 'on') {
            // Shuffle queue, keeping current track first
            const shuffled = shuffleArray(state.originalQueue, state.currentTrack || undefined);
            const newIndex = shuffled.findIndex(t => t.id === state.currentTrack?.id);
            set({
                shuffleMode: 'on',
                queue: shuffled,
                queueIndex: newIndex >= 0 ? newIndex : 0
            });
        } else {
            // Restore original queue
            const newIndex = state.originalQueue.findIndex(t => t.id === state.currentTrack?.id);
            set({
                shuffleMode: 'off',
                queue: state.originalQueue,
                queueIndex: newIndex >= 0 ? newIndex : 0
            });
        }
    },

    setQuality: (quality) => {
        qualitySettings.setQuality(quality);
        set({ quality });
    },

    setCurrentTime: (time) => set({ currentTime: time }),
    setDuration: (duration) => set({ duration }),
    setBuffered: (buffered) => set({ buffered }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),

    reorderQueue: (oldIndex: number, newIndex: number) => {
        set(state => {
            const newQueue = [...state.queue];
            const [movedTrack] = newQueue.splice(oldIndex, 1);
            newQueue.splice(newIndex, 0, movedTrack);

            // Update queueIndex if necessary
            let newQueueIndex = state.queueIndex;
            if (state.queueIndex === oldIndex) {
                newQueueIndex = newIndex;
            } else if (state.queueIndex > oldIndex && state.queueIndex <= newIndex) {
                newQueueIndex--;
            } else if (state.queueIndex < oldIndex && state.queueIndex >= newIndex) {
                newQueueIndex++;
            }

            // Sync originalQueue if shuffle is off (optional, but good for "User Intent")
            let newOriginalQueue = state.originalQueue;
            if (state.shuffleMode === 'off') {
                newOriginalQueue = [...newQueue];
            }

            return {
                queue: newQueue,
                queueIndex: newQueueIndex,
                originalQueue: newOriginalQueue
            };
        });
    }
}));
