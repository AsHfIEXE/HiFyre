
export interface DashManifest {
    baseUrl: string;
    initialization: string | null;
    media: string;
    segments: { number: number; time: number }[];
    repId: string;
}

export interface DownloadProgress {
    stage: 'downloading' | 'processing';
    receivedBytes?: number;
    totalBytes?: number;
    currentSegment?: number;
    totalSegments?: number;
    message?: string;
}

interface DownloadOptions {
    onProgress?: (progress: DownloadProgress) => void;
    signal?: AbortSignal;
}

export class DashDownloader {
    constructor() { }

    async downloadDashStream(manifestBlobUrl: string, options: DownloadOptions = {}): Promise<Blob> {
        const { onProgress, signal } = options;

        // 1. Fetch and Parse Manifest
        const response = await fetch(manifestBlobUrl);
        const manifestText = await response.text();

        const manifest = this.parseManifest(manifestText);
        if (!manifest) {
            throw new Error('Failed to parse DASH manifest');
        }

        // 2. Generate URLs
        const urls = this.generateSegmentUrls(manifest);

        // 3. Download Segments
        const chunks: ArrayBuffer[] = [];
        let downloadedBytes = 0;
        const totalSegments = urls.length;

        for (let i = 0; i < urls.length; i++) {
            if (signal?.aborted) throw new Error('AbortError');

            const url = urls[i];

            // Initial fetch attempt
            let segmentResponse: Response;
            try {
                segmentResponse = await fetch(url, { signal });
            } catch (e) {
                console.warn(`Fetch error for segment ${i}, retrying...`, e);
                await new Promise((r) => setTimeout(r, 1000));
                segmentResponse = await fetch(url, { signal });
            }

            if (!segmentResponse.ok) {
                // Retry logic for bad status
                console.warn(`Failed to fetch segment ${i} (status ${segmentResponse.status}), retrying...`);
                await new Promise((r) => setTimeout(r, 1000));
                segmentResponse = await fetch(url, { signal });
                if (!segmentResponse.ok) throw new Error(`Failed to fetch segment ${i}: ${segmentResponse.status}`);
            }

            const chunk = await segmentResponse.arrayBuffer();
            chunks.push(chunk);
            downloadedBytes += chunk.byteLength;

            if (onProgress) {
                onProgress({
                    stage: 'downloading',
                    receivedBytes: downloadedBytes,
                    totalBytes: undefined, // Unknown total for DASH
                    currentSegment: i + 1,
                    totalSegments: totalSegments,
                });
            }
        }

        // 4. Concatenate
        return new Blob(chunks, { type: 'audio/mp4' });
    }

    private parseManifest(manifestText: string): DashManifest {
        const parser = new DOMParser();
        const xml = parser.parseFromString(manifestText, 'text/xml');

        const mpd = xml.querySelector('MPD');
        if (!mpd) throw new Error('Invalid DASH manifest: No MPD tag');

        const period = mpd.querySelector('Period');
        if (!period) throw new Error('Invalid DASH manifest: No Period tag');

        // Prefer highest bandwidth audio adaptation set
        const adaptationSets = Array.from(period.querySelectorAll('AdaptationSet'));
        let audioSet = adaptationSets.find((as) => as.getAttribute('mimeType')?.startsWith('audio'));

        // Fallback: look for any adaptation set if mimeType is missing
        if (!audioSet && adaptationSets.length > 0) audioSet = adaptationSets[0];
        if (!audioSet) throw new Error('No AdaptationSet found');

        // Find Representation
        // Get all representations and sort by bandwidth descending
        const representations = Array.from(audioSet.querySelectorAll('Representation')).sort((a, b) => {
            const bwA = parseInt(a.getAttribute('bandwidth') || '0');
            const bwB = parseInt(b.getAttribute('bandwidth') || '0');
            return bwB - bwA;
        });

        if (representations.length === 0) throw new Error('No Representation found');
        const rep = representations[0];
        const repId = rep.getAttribute('id') || '';

        // Find SegmentTemplate
        const segmentTemplate = rep.querySelector('SegmentTemplate') || audioSet.querySelector('SegmentTemplate');
        if (!segmentTemplate) throw new Error('No SegmentTemplate found');

        const initialization = segmentTemplate.getAttribute('initialization');
        const media = segmentTemplate.getAttribute('media') || '';
        const startNumber = parseInt(segmentTemplate.getAttribute('startNumber') || '1', 10);

        // BaseURL Resolution
        const baseUrlTag =
            rep.querySelector('BaseURL') ||
            audioSet.querySelector('BaseURL') ||
            period.querySelector('BaseURL') ||
            mpd.querySelector('BaseURL');
        const baseUrl = baseUrlTag ? baseUrlTag.textContent?.trim() || '' : '';

        // SegmentTimeline
        const segmentTimeline = segmentTemplate.querySelector('SegmentTimeline');
        const segments: { number: number; time: number }[] = [];

        if (segmentTimeline) {
            const sElements = segmentTimeline.querySelectorAll('S');
            let currentTime = 0;
            let currentNumber = startNumber;

            sElements.forEach((s) => {
                const tAttr = s.getAttribute('t');
                if (tAttr) currentTime = parseInt(tAttr, 10);

                const d = parseInt(s.getAttribute('d') || '0', 10);
                const r = parseInt(s.getAttribute('r') || '0', 10);

                // Initial segment
                segments.push({ number: currentNumber, time: currentTime });
                currentTime += d;
                currentNumber++;

                // Repeats
                for (let i = 0; i < r; i++) {
                    segments.push({ number: currentNumber, time: currentTime });
                    currentTime += d;
                    currentNumber++;
                }
            });
        }

        return {
            baseUrl,
            initialization,
            media,
            segments,
            repId,
        };
    }

    private generateSegmentUrls(manifest: DashManifest): string[] {
        const { baseUrl, initialization, media, segments, repId } = manifest;
        const urls: string[] = [];

        // Helper to resolve template strings
        const resolveTemplate = (template: string, number: number, time: number) => {
            return template
                .replace(/\$RepresentationID\$/g, repId)
                .replace(/\$Number(?:%0([0-9]+)d)?\$/g, (_match, width) => {
                    if (width) {
                        return number.toString().padStart(parseInt(width), '0');
                    }
                    return number.toString();
                })
                .replace(/\$Time(?:%0([0-9]+)d)?\$/g, (_match, width) => {
                    if (width) {
                        return time.toString().padStart(parseInt(width), '0');
                    }
                    return time.toString();
                });
        };

        // Helper to join paths handling slashes
        const joinPath = (base: string, part: string) => {
            if (!base) return part;
            if (part.startsWith('http')) return part;
            return base.endsWith('/') ? base + part : base + '/' + part;
        };

        // 1. Initialization Segment
        if (initialization) {
            const initPath = resolveTemplate(initialization, 0, 0);
            urls.push(joinPath(baseUrl, initPath));
        }

        // 2. Media Segments
        if (segments && segments.length > 0) {
            segments.forEach((seg) => {
                const path = resolveTemplate(media, seg.number, seg.time);
                urls.push(joinPath(baseUrl, path));
            });
        }

        return urls;
    }
}
