import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- Interfaces ---

interface PlaybackSettings {
    audioQuality: 'LOW' | 'HIGH' | 'LOSSLESS' | 'HI_RES_LOSSLESS';
    replayGainMode: 'off' | 'track' | 'album';
    replayGainPreamp: number;
    gapless: boolean;
    setAudioQuality: (q: 'LOW' | 'HIGH' | 'LOSSLESS' | 'HI_RES_LOSSLESS') => void;
    setReplayGainMode: (m: 'off' | 'track' | 'album') => void;
    setReplayGainPreamp: (db: number) => void;
    setGapless: (enabled: boolean) => void;
}

interface AppearanceSettings {
    theme: 'system' | 'light' | 'dark' | 'custom';
    customThemeColors?: Record<string, string>;
    nowPlayingMode: 'cover' | 'lyrics';
    cardCompactArtist: boolean;
    cardCompactAlbum: boolean;
    backgroundEnabled: boolean; // Album art background
    setTheme: (t: 'system' | 'light' | 'dark' | 'custom') => void;
    setCustomThemeColors: (colors: Record<string, string>) => void;
    setNowPlayingMode: (m: 'cover' | 'lyrics') => void;
    setCardCompactArtist: (enabled: boolean) => void;
    setCardCompactAlbum: (enabled: boolean) => void;
    setBackgroundEnabled: (enabled: boolean) => void;
}

interface BehaviorSettings {
    smoothScrolling: boolean;
    downloadLyrics: boolean;
    romajiMode: boolean;
    sleepTimer: number | null; // minutes, null means off. Note: Timer STATE is local to player, this might be default? Or just strictly UI state. 
    // Actually sleep timer is usually a temporary state, not a persisted setting. 
    // But we might want to persist "default sleep timer duration". 
    // For now let's keep sleep timer state in the Player component/store, not here.

    setSmoothScrolling: (enabled: boolean) => void;
    setDownloadLyrics: (enabled: boolean) => void;
    setRomajiMode: (enabled: boolean) => void;
}

interface DownloadSettings {
    downloadQuality: 'LOW' | 'HIGH' | 'LOSSLESS' | 'HI_RES_LOSSLESS';
    filenameTemplate: string;
    zipFolderTemplate: string;
    forceIndividualDownloads: boolean;
    setDownloadQuality: (q: 'LOW' | 'HIGH' | 'LOSSLESS' | 'HI_RES_LOSSLESS') => void;
    setFilenameTemplate: (t: string) => void;
    setZipFolderTemplate: (t: string) => void;
    setForceIndividualDownloads: (enabled: boolean) => void;
}

interface LastFMSettings {
    sessionKey: string | null;
    username: string | null;
    loveOnLike: boolean;
    setSession: (key: string | null, user: string | null) => void;
    setLoveOnLike: (enabled: boolean) => void;
}

// --- Store Implementation ---

export const useSettingsStore = create<
    PlaybackSettings & AppearanceSettings & BehaviorSettings & DownloadSettings & LastFMSettings
>()(
    persist(
        (set) => ({
            // Playback
            audioQuality: 'HI_RES_LOSSLESS',
            replayGainMode: 'track',
            replayGainPreamp: 0,
            gapless: true,
            setAudioQuality: (q) => set({ audioQuality: q }),
            setReplayGainMode: (m) => set({ replayGainMode: m }),
            setReplayGainPreamp: (db) => set({ replayGainPreamp: db }),
            setGapless: (enabled) => set({ gapless: enabled }),

            // Appearance
            theme: 'system',
            customThemeColors: undefined,
            nowPlayingMode: 'cover',
            cardCompactArtist: false,
            cardCompactAlbum: false,
            backgroundEnabled: true,
            setTheme: (t) => set({ theme: t }),
            setCustomThemeColors: (c) => set({ customThemeColors: c }),
            setNowPlayingMode: (m) => set({ nowPlayingMode: m }),
            setCardCompactArtist: (e) => set({ cardCompactArtist: e }),
            setCardCompactAlbum: (e) => set({ cardCompactAlbum: e }),
            setBackgroundEnabled: (e) => set({ backgroundEnabled: e }),

            // Behavior
            smoothScrolling: true,
            downloadLyrics: false,
            romajiMode: false,
            sleepTimer: null,
            setSmoothScrolling: (e) => set({ smoothScrolling: e }),
            setDownloadLyrics: (e) => set({ downloadLyrics: e }),
            setRomajiMode: (e) => set({ romajiMode: e }),

            // Downloads
            downloadQuality: 'HI_RES_LOSSLESS',
            filenameTemplate: '{trackNumber} - {artist} - {title}',
            zipFolderTemplate: '{albumTitle} - {albumArtist}',
            forceIndividualDownloads: false, // Default to using zip for playlists
            setDownloadQuality: (q) => set({ downloadQuality: q }),
            setFilenameTemplate: (t) => set({ filenameTemplate: t }),
            setZipFolderTemplate: (t) => set({ zipFolderTemplate: t }),
            setForceIndividualDownloads: (e) => set({ forceIndividualDownloads: e }),

            // Last.fm
            sessionKey: null,
            username: null,
            loveOnLike: true,
            setSession: (key, user) => set({ sessionKey: key, username: user }),
            setLoveOnLike: (e) => set({ loveOnLike: e }),
        }),
        {
            name: 'hifyre-settings',
            partialize: (state) => ({
                // Persist everything except temporary states if any
                audioQuality: state.audioQuality,
                replayGainMode: state.replayGainMode,
                replayGainPreamp: state.replayGainPreamp,
                gapless: state.gapless,
                theme: state.theme,
                customThemeColors: state.customThemeColors,
                nowPlayingMode: state.nowPlayingMode,
                cardCompactArtist: state.cardCompactArtist,
                cardCompactAlbum: state.cardCompactAlbum,
                backgroundEnabled: state.backgroundEnabled,
                smoothScrolling: state.smoothScrolling,
                downloadLyrics: state.downloadLyrics,
                romajiMode: state.romajiMode,
                downloadQuality: state.downloadQuality,
                filenameTemplate: state.filenameTemplate,
                zipFolderTemplate: state.zipFolderTemplate,
                forceIndividualDownloads: state.forceIndividualDownloads,
                sessionKey: state.sessionKey,
                username: state.username,
                loveOnLike: state.loveOnLike,
            })
        }
    )
);
