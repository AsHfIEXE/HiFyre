// Storage utilities - settings and preferences

const STORAGE_KEYS = {
    INSTANCES: 'hifyre-api-instances-v1',
    THEME: 'hifyre-theme',
    VOLUME: 'hifyre-volume',
    QUALITY: 'hifyre-quality',
    QUEUE: 'hifyre-queue',
    RECENT: 'hifyre-recent-activity',
} as const;

// API Settings
export const apiSettings = {
    INSTANCES_URL: '/instances.json',
    defaultInstances: [
        {
            name: "Monochrome (Main)",
            url: "https://monochrome-api.samidy.com",
            type: "api"
        },
        {
            name: "Squid",
            url: "https://triton.squid.wtf",
            type: "api"
        }
    ] as ApiInstance[],
    instancesLoaded: false,

    async loadInstances(): Promise<void> {
        if (this.instancesLoaded) return;

        try {
            const response = await fetch(this.INSTANCES_URL);
            if (response.ok) {
                const data = await response.json();
                this.defaultInstances = data.instances || [];
                this.instancesLoaded = true;
            }
        } catch (e) {
            console.warn('Failed to load instances:', e);
        }
    },

    async getInstances(type: 'api' | 'streaming' = 'api'): Promise<ApiInstance[]> {
        await this.loadInstances();

        // Check localStorage first
        const stored = localStorage.getItem(STORAGE_KEYS.INSTANCES);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed[type]?.length > 0) {
                    return parsed[type];
                }
            } catch (e) {
                // Invalid stored data
            }
        }

        return this.defaultInstances.filter(i => i.type === type || !i.type);
    },

    saveInstances(instances: ApiInstance[], type: 'api' | 'streaming'): void {
        const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.INSTANCES) || '{}');
        current[type] = instances;
        localStorage.setItem(STORAGE_KEYS.INSTANCES, JSON.stringify(current));
    },
};

export interface ApiInstance {
    url: string;
    name?: string;
    type?: 'api' | 'streaming';
    speed?: number;
}

// Theme Manager
export const themeManager = {
    getTheme(): string {
        return localStorage.getItem(STORAGE_KEYS.THEME) || 'midnight';
    },

    setTheme(theme: string): void {
        localStorage.setItem(STORAGE_KEYS.THEME, theme);
        document.documentElement.setAttribute('data-theme', theme);
    },

    applyTheme(): void {
        const theme = this.getTheme();
        document.documentElement.setAttribute('data-theme', theme);
    },
};

// Volume Manager
export const volumeManager = {
    getVolume(): number {
        const stored = localStorage.getItem(STORAGE_KEYS.VOLUME);
        return stored ? parseFloat(stored) : 1;
    },

    setVolume(volume: number): void {
        localStorage.setItem(STORAGE_KEYS.VOLUME, String(volume));
    },
};

// Quality Settings
export const qualitySettings = {
    getQuality(): string {
        return localStorage.getItem(STORAGE_KEYS.QUALITY) || 'HI_RES_LOSSLESS';
    },

    setQuality(quality: string): void {
        localStorage.setItem(STORAGE_KEYS.QUALITY, quality);
    },
};

// Queue Manager
export const queueManager = {
    getQueue(): any {
        const stored = localStorage.getItem(STORAGE_KEYS.QUEUE);
        if (!stored) return { queue: [], index: 0, position: 0 };
        try {
            return JSON.parse(stored);
        } catch {
            return { queue: [], index: 0, position: 0 };
        }
    },

    saveQueue(data: { queue: any[]; index: number; position: number }): void {
        localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(data));
    },

    clearQueue(): void {
        localStorage.removeItem(STORAGE_KEYS.QUEUE);
    },
};

// Recent Activity Manager
export const recentManager = {
    LIMIT: 50,

    getRecent(): any[] {
        const stored = localStorage.getItem(STORAGE_KEYS.RECENT);
        if (!stored) return [];
        try {
            return JSON.parse(stored);
        } catch {
            return [];
        }
    },

    addRecent(item: any): void {
        const recent = this.getRecent();
        // Remove if already exists
        const filtered = recent.filter(r => r.id !== item.id || r.type !== item.type);
        // Add to front
        filtered.unshift({ ...item, timestamp: Date.now() });
        // Limit
        const limited = filtered.slice(0, this.LIMIT);
        localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(limited));
    },

    clearRecent(): void {
        localStorage.removeItem(STORAGE_KEYS.RECENT);
    },
};
