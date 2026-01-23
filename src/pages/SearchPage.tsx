import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import type { Track, Artist, Album } from '../lib/api';
import { TrackCard } from '../components/common/TrackCard';
import { ArtistCard } from '../components/common/ArtistCard';
import { AlbumCard } from '../components/common/AlbumCard';
import { usePlayerStore } from '../lib/player';
import './SearchPage.css';

export function SearchPage() {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Results
    const [tracks, setTracks] = useState<Track[]>([]);
    const [artists, setArtists] = useState<Artist[]>([]);
    const [albums, setAlbums] = useState<Album[]>([]);

    const { setTrack, currentTrack, isPlaying, setIsPlaying } = usePlayerStore();

    // Debounce query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 500);
        return () => clearTimeout(timer);
    }, [query]);

    // Search effect
    useEffect(() => {
        if (!debouncedQuery.trim()) {
            setTracks([]);
            setArtists([]);
            setAlbums([]);
            return;
        }

        const performSearch = async () => {
            setIsLoading(true);
            try {
                const [trackResults, artistResults, albumResults] = await Promise.all([
                    api.searchTracks(debouncedQuery, 5),
                    api.searchArtists(debouncedQuery, 5),
                    api.searchAlbums(debouncedQuery, 5)
                ]);

                setTracks(trackResults);
                setArtists(artistResults);
                setAlbums(albumResults);
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                setIsLoading(false);
            }
        };

        performSearch();
    }, [debouncedQuery]);

    const handlePlayTrack = (track: Track) => {
        if (currentTrack?.id === track.id) {
            setIsPlaying(!isPlaying);
        } else {
            setTrack(track);
            setIsPlaying(true);
        }
    };

    return (
        <div className="search-page page-container">
            <header className="page-header">
                <h1 className="page-title">Search</h1>
                <div className="search-bar-container">
                    <div className="search-input-wrapper">
                        <Search size={20} className="search-icon" />
                        <input
                            type="search"
                            placeholder="What do you want to listen to?"
                            className="search-input"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                        {isLoading && <Loader2 size={18} className="search-spinner" />}
                    </div>
                </div>
            </header>

            <div className="search-results">
                {!query && (
                    <div className="search-placeholder">
                        <p>Start typing to search for tracks, artists, and albums</p>
                    </div>
                )}

                {/* Tracks Section */}
                {tracks.length > 0 && (
                    <section className="results-section">
                        <h2 className="section-title">Songs</h2>
                        <div className="track-list">
                            {tracks.map((track) => (
                                <TrackCard
                                    key={track.id}
                                    track={track}
                                    onPlay={() => handlePlayTrack(track)}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Artists Section */}
                {artists.length > 0 && (
                    <section className="results-section">
                        <h2 className="section-title">Artists</h2>
                        <div className="grid-responsive-circle">
                            {artists.map((artist) => (
                                <ArtistCard key={artist.id} artist={artist} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Albums Section */}
                {albums.length > 0 && (
                    <section className="results-section">
                        <h2 className="section-title">Albums</h2>
                        <div className="grid-responsive">
                            {albums.map((album) => (
                                <AlbumCard key={album.id} album={album} />
                            ))}
                        </div>
                    </section>
                )}

                {query && !isLoading && tracks.length === 0 && artists.length === 0 && albums.length === 0 && (
                    <div className="no-results">
                        <p>No results found for "{query}"</p>
                    </div>
                )}
            </div>
        </div>
    );
}
