// Home Page - Main dashboard

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { TrackCard, TrackCardSkeleton } from '../components/common/TrackCard';
import { AlbumCard, AlbumCardSkeleton } from '../components/common/AlbumCard';
import { ArtistCard, ArtistCardSkeleton } from '../components/common/ArtistCard';
import { usePlayerStore } from '../lib/player';
import { api, type Track, type Album, type Artist } from '../lib/api';
import './HomePage.css';

export function HomePage() {
    const [recommendedTracks, setRecommendedTracks] = useState<Track[]>([]);
    const [recommendedAlbums, setRecommendedAlbums] = useState<Album[]>([]);
    const [topArtists, setTopArtists] = useState<Artist[]>([]);
    const [loading, setLoading] = useState(true);

    const { playTrack, playAlbum } = usePlayerStore();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch real data from API
                const [tracks, albums, artists] = await Promise.all([
                    api.searchTracks('The Weeknd', 4),
                    api.searchAlbums('The Weeknd', 4),
                    api.searchArtists('The Weeknd', 5)
                ]);

                setRecommendedTracks(tracks);
                setRecommendedAlbums(albums);
                setTopArtists(artists);
            } catch (error) {
                console.error("Failed to fetch home data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    return (
        <div className="home-container">
            {/* Search Header */}
            <div className="home-search-container">
                <form
                    className="search-input-wrapper"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (searchQuery.trim()) {
                            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                        }
                    }}
                >
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        placeholder="Search for tracks, artists, albums..."
                        className="search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </form>
            </div>

            <div className="home-content">
                {/* Welcome Section */}
                <section className="welcome-section">
                    <h1>Welcome to HiFyre</h1>
                    <p>Your premium high-fidelity music streaming experience</p>
                </section>

                {/* Recommended Tracks */}
                <section className="dashboard-section">
                    <div className="section-header">
                        <h2>Recommended Songs</h2>
                        <button className="see-all-btn">See All</button>
                    </div>
                    <div className="track-list">
                        {loading ? (
                            Array(4).fill(0).map((_, i) => (
                                <TrackCardSkeleton key={i} />
                            ))
                        ) : (
                            recommendedTracks.map((track, i) => (
                                <TrackCard
                                    key={track.id}
                                    track={track}
                                    index={i + 1}
                                    showIndex={true}
                                    onPlay={playTrack}
                                />
                            ))
                        )}
                    </div>
                </section>

                {/* Top Albums */}
                <section className="dashboard-section">
                    <div className="section-header">
                        <h2>Top Albums</h2>
                        <button className="see-all-btn">See All</button>
                    </div>
                    <div className="grid-list">
                        {loading ? (
                            Array(4).fill(0).map((_, i) => (
                                <AlbumCardSkeleton key={i} />
                            ))
                        ) : (
                            recommendedAlbums.map(album => (
                                <AlbumCard
                                    key={album.id}
                                    album={album}
                                    // For now playing an album just plays its first track if available, 
                                    // or we would fetch tracks first.
                                    onPlay={() => {
                                        if (album.tracks && album.tracks.length > 0) {
                                            playAlbum(album.tracks);
                                        }
                                    }}
                                />
                            ))
                        )}
                    </div>
                </section>

                {/* Top Artists */}
                <section className="dashboard-section">
                    <div className="section-header">
                        <h2>Popular Artists</h2>
                        <button className="see-all-btn">See All</button>
                    </div>
                    <div className="artist-list">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <ArtistCardSkeleton key={i} />
                            ))
                        ) : (
                            topArtists.map(artist => (
                                <ArtistCard
                                    key={artist.id}
                                    artist={artist}
                                />
                            ))
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
