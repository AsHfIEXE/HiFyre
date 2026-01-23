import md5 from 'md5';
import { useSettingsStore } from './settings';
import type { Track } from './api';

const API_KEY = '0ecf01914957b40c17030db822845a76';
const API_SECRET = 'bd37e61e0b16b8c7bf8de2862de5493c';
const API_URL = 'https://ws.audioscrobbler.com/2.0/';

export class LastFMScrobbler {
    private scrobbleTimer: ReturnType<typeof setTimeout> | null = null;
    private hasScrobbled = false;
    private currentTrack: Track | null = null;

    private get sessionKey() {
        return useSettingsStore.getState().sessionKey;
    }

    private isAuthenticated() {
        return !!this.sessionKey;
    }

    private async generateSignature(params: Record<string, string>): Promise<string> {
        const filteredParams = { ...params };
        delete filteredParams.format;
        delete filteredParams.callback;

        const sortedKeys = Object.keys(filteredParams).sort();
        const signatureString = sortedKeys.map(key => `${key}${filteredParams[key]}`).join('') + API_SECRET;

        return md5(signatureString);
    }

    private async makeRequest(method: string, params: Record<string, any> = {}, requiresAuth = false) {
        const requestParams: Record<string, string> = {
            method,
            api_key: API_KEY,
            ...params
        };

        if (requiresAuth && this.sessionKey) {
            requestParams.sk = this.sessionKey;
        }

        const signature = await this.generateSignature(requestParams);

        const formData = new URLSearchParams({
            ...requestParams,
            api_sig: signature,
            format: 'json'
        });

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });

        const data = await response.json();
        if (data.error) throw new Error(data.message);
        return data;
    }

    async getAuthUrl() {
        // Last.fm web auth flow usually involves redirecting user to a page
        // But for API auth we verify token
        // Step 1: Redirect user to auth page with API Key
        // Step 2: User approves, redirects back with token
        // Step 3: We exchange token for session
        return `https://www.last.fm/api/auth/?api_key=${API_KEY}`;
    }

    async getSession(token: string) {
        const data = await this.makeRequest('auth.getSession', { token });
        if (data.session) {
            useSettingsStore.getState().setSession(data.session.key, data.session.name);
            return data.session;
        }
        throw new Error('No session returned');
    }

    async updateNowPlaying(track: Track) {
        if (!this.isAuthenticated()) return;

        this.currentTrack = track;
        this.hasScrobbled = false;
        if (this.scrobbleTimer) clearTimeout(this.scrobbleTimer);

        try {
            const artist = track.artists?.[0]?.name || track.artist || 'Unknown';
            await this.makeRequest('track.updateNowPlaying', {
                artist,
                track: track.title,
                album: track.album || '',
                duration: Math.floor(track.duration)
            }, true);

            // Scrobble after 50% or 4 minutes
            const threshold = Math.min(track.duration / 2, 240);
            this.scrobbleTimer = setTimeout(() => this.scrobbleCurrentTrack(), threshold * 1000);

        } catch (e) {
            console.error('Last.fm Now Playing Error:', e);
        }
    }

    async scrobbleCurrentTrack() {
        if (!this.isAuthenticated() || !this.currentTrack || this.hasScrobbled) return;

        try {
            const track = this.currentTrack;
            const artist = track.artists?.[0]?.name || track.artist || 'Unknown';
            const timestamp = Math.floor(Date.now() / 1000);

            await this.makeRequest('track.scrobble', {
                artist,
                track: track.title,
                timestamp,
                album: track.album || '',
                duration: Math.floor(track.duration)
            }, true);

            this.hasScrobbled = true;
            console.log('Scrobbled:', track.title);
        } catch (e) {
            console.error('Last.fm Scrobble Error:', e);
        }
    }

    async loveTrack(track: Track) {
        if (!this.isAuthenticated()) return;
        try {
            const artist = track.artists?.[0]?.name || track.artist || 'Unknown';
            await this.makeRequest('track.love', { artist, track: track.title }, true);
        } catch (e) {
            console.error('Last.fm Love Error:', e);
        }
    }

    async unloveTrack(track: Track) {
        if (!this.isAuthenticated()) return;
        try {
            const artist = track.artists?.[0]?.name || track.artist || 'Unknown';
            await this.makeRequest('track.unlove', { artist, track: track.title }, true);
        } catch (e) {
            console.error('Last.fm Unlove Error:', e);
        }
    }
}

export const lastFm = new LastFMScrobbler();
