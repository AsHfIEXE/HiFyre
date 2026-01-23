import { api, type Track } from './api';

export interface CSVParseResult {
    tracks: Track[];
    missingTracks: string[];
}

export interface CSVProgress {
    current: number;
    total: number;
    currentTrack: string;
    currentArtist: string;
}

export async function parseCSV(csvText: string, onProgress?: (progress: CSVProgress) => void): Promise<CSVParseResult> {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return { tracks: [], missingTracks: [] };

    // Robust CSV line parser that respects quotes
    const parseLine = (text: string): string[] => {
        const values: string[] = [];
        let current = '';
        let inQuote = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current);

        // Clean up quotes: remove surrounding quotes and unescape double quotes if any
        return values.map((v) => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"').trim());
    };

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1);

    const tracks: Track[] = [];
    const missingTracks: string[] = [];
    const totalTracks = rows.length;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.trim()) continue; // Skip empty lines

        const values = parseLine(row);

        if (values.length >= headers.length) {
            let trackTitle = '';
            let artistNames = '';
            let albumName = '';

            headers.forEach((header, index) => {
                const value = values[index];
                if (!value) return;

                switch (header.toLowerCase()) {
                    case 'track name':
                    case 'title':
                    case 'song':
                        trackTitle = value;
                        break;
                    case 'artist name(s)':
                    case 'artist name':
                    case 'artist':
                    case 'artists':
                        artistNames = value;
                        break;
                    case 'album':
                    case 'album name':
                        albumName = value;
                        break;
                }
            });

            if (onProgress) {
                onProgress({
                    current: i,
                    total: totalTracks,
                    currentTrack: trackTitle || 'Unknown track',
                    currentArtist: artistNames || '',
                });
            }

            // Search for the track in catalog
            if (trackTitle && artistNames) {
                // Add a small delay to prevent rate limiting
                await new Promise((resolve) => setTimeout(resolve, 300));

                try {
                    let foundTrack: Track | null = null;

                    // Helper: Normalize strings for fuzzy matching
                    const normalize = (str: string) =>
                        str
                            .normalize('NFD') // @ts-ignore
                            .replace(/[\u0300-\u036f]/g, '')
                            .toLowerCase()
                            .replace(/[^\w\s]/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim();

                    // Helper: Check if result matches our criteria
                    const isValidMatch = (track: Track, title: string, artists: string, album: string | null) => {
                        if (!track) return false;

                        const trackTitle = normalize(track.title || '');
                        const trackArtists = (track.artists || []).map((a) => normalize(a.name || '')).join(' ');
                        const trackAlbum = normalize(track.album || '');

                        const queryTitle = normalize(title);
                        const queryArtists = normalize(artists);
                        const queryAlbum = normalize(album || '');

                        // Must match title (exact or substring match)
                        const titleMatch =
                            trackTitle === queryTitle ||
                            trackTitle.includes(queryTitle) ||
                            queryTitle.includes(trackTitle);
                        if (!titleMatch) return false;

                        // Must match at least one artist
                        const artistMatch =
                            trackArtists.includes(queryArtists.split(' ')[0]) ||
                            queryArtists.includes(trackArtists.split(' ')[0]);
                        if (!artistMatch) return false;

                        // If album provided, prefer matching album but not strict
                        if (queryAlbum) {
                            const albumMatch =
                                trackAlbum === queryAlbum ||
                                trackAlbum.includes(queryAlbum) ||
                                queryAlbum.includes(trackAlbum);
                            return albumMatch;
                        }

                        return true;
                    };

                    // Helper: Clean title for search (remove feat, from, parens)
                    const cleanQuery = (str: string) => {
                        return str
                            .replace(/\(feat\..*?\)/gi, '')
                            .replace(/\(with.*?\)/gi, '')
                            .replace(/\(from.*?\)/gi, '')
                            .replace(/feat\..*/gi, '')
                            .replace(/from\s+.*/gi, '') // "from Kaiju No. 8"
                            .replace(/\(.*\)/g, '') // Remove generic parens
                            .trim();
                    };

                    // 1. Initial Search: Title + All Artists + Album (most specific)
                    if (!foundTrack) {
                        let searchQuery = `${trackTitle} ${artistNames}`;
                        if (albumName) searchQuery += ` ${albumName}`;
                        let searchResults = await api.searchTracks(searchQuery);

                        if (searchResults.length === 0) {
                            // Try cleaner query if strict failed
                            const cleanTitle = cleanQuery(trackTitle);
                            const cleanArtist = cleanQuery(artistNames);
                            if (cleanTitle !== trackTitle || cleanArtist !== artistNames) {
                                searchQuery = `${cleanTitle} ${cleanArtist}`;
                                searchResults = await api.searchTracks(searchQuery);
                            }
                        }

                        if (searchResults.length > 0) {
                            // Try to find best match within results
                            for (const result of searchResults) {
                                if (isValidMatch(result, trackTitle, artistNames, albumName)) {
                                    foundTrack = result;
                                    break;
                                }
                            }
                            // Fallback: if no valid match found, use first result only if album matches
                            if (!foundTrack && albumName) {
                                const firstResult = searchResults[0];
                                if (isValidMatch(firstResult, trackTitle, artistNames, albumName)) {
                                    foundTrack = firstResult;
                                }
                            }
                        }
                    }

                    // 2. Retry: Title + Main Artist + Album
                    if (!foundTrack && artistNames) {
                        const mainArtist = artistNames.split(',')[0].trim();
                        if (mainArtist && mainArtist !== artistNames) {
                            let searchQuery = `${trackTitle} ${mainArtist}`;
                            if (albumName) searchQuery += ` ${albumName}`;
                            const searchResults = await api.searchTracks(searchQuery);

                            if (searchResults.length > 0) {
                                for (const result of searchResults) {
                                    if (isValidMatch(result, trackTitle, mainArtist, albumName)) {
                                        foundTrack = result;
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    // 3. Retry: Just Title + Album (strong album context)
                    if (!foundTrack && albumName) {
                        const searchQuery = `${trackTitle} ${albumName}`;
                        const searchResults = await api.searchTracks(searchQuery);

                        if (searchResults.length > 0) {
                            for (const result of searchResults) {
                                if (isValidMatch(result, trackTitle, artistNames, albumName)) {
                                    foundTrack = result;
                                    break;
                                }
                            }
                        }
                    }

                    // 4. Retry: Title + Main Artist (Ignore Album)
                    if (!foundTrack) {
                        const mainArtist = (artistNames || '').split(',')[0].trim();
                        const searchQuery = `${trackTitle} ${mainArtist}`;
                        const searchResults = await api.searchTracks(searchQuery);

                        if (searchResults.length > 0) {
                            for (const result of searchResults) {
                                if (isValidMatch(result, trackTitle, mainArtist, null)) {
                                    foundTrack = result;
                                    break;
                                }
                            }
                        }
                    }

                    if (foundTrack) {
                        tracks.push(foundTrack);
                        console.log(`✓ "${trackTitle}" by ${artistNames}`);
                    } else {
                        console.warn(
                            `✗ Track not found: "${trackTitle}" by ${artistNames}`
                        );
                        missingTracks.push(
                            `${trackTitle} - ${artistNames}${albumName ? ' (album: ' + albumName + ')' : ''}`
                        );
                    }
                } catch (error) {
                    console.error(`Error searching for track "${trackTitle}":`, error);
                    missingTracks.push(
                        `${trackTitle} - ${artistNames}${albumName ? ' (album: ' + albumName + ')' : ''}`
                    );
                }
            }
        }
    }

    if (onProgress) {
        onProgress({
            current: totalTracks,
            total: totalTracks,
            currentTrack: 'Import complete',
            currentArtist: '',
        });
    }

    return { tracks, missingTracks };
}
