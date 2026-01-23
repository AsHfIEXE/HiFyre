// Library Page
import { useState, useEffect } from 'react';
import { Plus, Heart, Music, Disc, User, FileUp } from 'lucide-react';
import { db } from '../lib/db';
import type { Track, Album, Artist } from '../lib/api';
import { TrackCard } from '../components/common/TrackCard';
import { AlbumCard } from '../components/common/AlbumCard';
import { ArtistCard } from '../components/common/ArtistCard';
import { usePlayerStore } from '../lib/player';
import { ImportPlaylistModal } from '../components/playlists/ImportPlaylistModal';

import { CreatePlaylistModal } from '../components/playlists/CreatePlaylistModal';

type Tab = 'playlists' | 'tracks' | 'albums' | 'artists';

export function LibraryPage() {
    const [activeTab, setActiveTab] = useState<Tab>('playlists');
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [likedTracks, setLikedTracks] = useState<Track[]>([]);
    const [likedAlbums, setLikedAlbums] = useState<Album[]>([]);
    const [likedArtists, setLikedArtists] = useState<Artist[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { setTrack, currentTrack, isPlaying, setIsPlaying } = usePlayerStore();

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);

    useEffect(() => {
        loadLibraryData();
    }, [activeTab]);

    const loadLibraryData = async () => {
        setIsLoading(true);
        try {
            switch (activeTab) {
                case 'playlists':
                    const pls = await db.getPlaylists();
                    setPlaylists(pls);
                    break;
                case 'tracks':
                    const tracks = await db.getFavorites('track');
                    setLikedTracks(tracks);
                    break;
                case 'albums':
                    const albums = await db.getFavorites('album');
                    setLikedAlbums(albums);
                    break;
                case 'artists':
                    const artists = await db.getFavorites('artist');
                    setLikedArtists(artists);
                    break;
            }
        } catch (error) {
            console.error('Failed to load library data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreatePlaylist = async (name: string) => {
        await db.createPlaylist(name);
        loadLibraryData();
    };

    const handleImportComplete = async (name: string, tracks: Track[]) => {
        try {
            await db.createPlaylist(name, tracks);
            loadLibraryData();
            setImportModalOpen(false);
        } catch (error) {
            console.error('Failed to save imported playlist:', error);
            alert('Failed to save playlist');
        }
    };

    const handlePlayTrack = (track: Track) => {
        if (currentTrack?.id === track.id) {
            setIsPlaying(!isPlaying);
        } else {
            setTrack(track);
            setIsPlaying(true);
        }
    };

    return (
        <div className="library-page page-container">
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h1 className="page-title">Your Library</h1>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            className="btn-secondary"
                            onClick={() => setImportModalOpen(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <FileUp size={18} />
                            Import CSV
                        </button>
                        <button
                            className="btn-primary"
                            onClick={() => setCreateModalOpen(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Plus size={18} />
                            New Playlist
                        </button>
                    </div>
                </div>

                <div className="tabs-container">
                    <button
                        className={`tab-btn ${activeTab === 'playlists' ? 'active' : ''}`}
                        onClick={() => setActiveTab('playlists')}
                    >
                        Playlists
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'tracks' ? 'active' : ''}`}
                        onClick={() => setActiveTab('tracks')}
                    >
                        Liked Songs
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'albums' ? 'active' : ''}`}
                        onClick={() => setActiveTab('albums')}
                    >
                        Albums
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'artists' ? 'active' : ''}`}
                        onClick={() => setActiveTab('artists')}
                    >
                        Artists
                    </button>
                </div>
            </header>

            <div className="library-content">
                {isLoading ? (
                    <div className="loading-state">Loading...</div>
                ) : (
                    <>
                        {activeTab === 'playlists' && (
                            <div className="grid-responsive">
                                {playlists.length === 0 ? (
                                    <EmptyState
                                        icon={<Music size={48} />}
                                        title="No Playlists Yet"
                                        message="Create your first playlist to start collecting your favorite music."
                                    />
                                ) : (
                                    playlists.map(pl => (
                                        <div key={pl.id} className="playlist-card">
                                            <div className="playlist-cover">
                                                <Music size={40} />
                                            </div>
                                            <h3>{pl.name}</h3>
                                            <p>{pl.tracks.length} tracks</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'tracks' && (
                            <div className="track-list">
                                {likedTracks.length === 0 ? (
                                    <EmptyState
                                        icon={<Heart size={48} />}
                                        title="No Liked Songs"
                                        message="Tap the heart icon on any track to add it to your favorites."
                                    />
                                ) : (
                                    likedTracks.map((track, i) => (
                                        <TrackCard
                                            key={track.id}
                                            track={track}
                                            index={i + 1}
                                            showIndex
                                            onPlay={() => handlePlayTrack(track)}
                                        />
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'albums' && (
                            <div className="grid-responsive">
                                {likedAlbums.length === 0 ? (
                                    <EmptyState
                                        icon={<Disc size={48} />}
                                        title="No Liked Albums"
                                        message="Save albums to your library for quick access."
                                    />
                                ) : (
                                    likedAlbums.map(album => (
                                        <AlbumCard key={album.id} album={album} />
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'artists' && (
                            <div className="grid-responsive-circle">
                                {likedArtists.length === 0 ? (
                                    <EmptyState
                                        icon={<User size={48} />}
                                        title="No Liked Artists"
                                        message="Follow artists to keep up with their latest releases."
                                    />
                                ) : (
                                    likedArtists.map(artist => (
                                        <ArtistCard key={artist.id} artist={artist} />
                                    ))
                                )}
                            </div>
                        )}
                    </>
                )}

            </div>

            <CreatePlaylistModal
                isOpen={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onCreate={handleCreatePlaylist}
            />

            <ImportPlaylistModal
                isOpen={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onImportComplete={handleImportComplete}
            />


            <style>{`
                .tabs-container {
                    display: flex;
                    gap: var(--space-1);
                    border-bottom: 1px solid var(--border);
                    margin-top: var(--space-6);
                }
                .tab-btn {
                    padding: var(--space-3) var(--space-4);
                    background: transparent;
                    border: none;
                    color: var(--muted);
                    font-size: var(--text-sm);
                    font-weight: var(--font-medium);
                    border-bottom: 2px solid transparent;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .tab-btn:hover {
                    color: var(--foreground);
                }
                .tab-btn.active {
                    color: var(--foreground);
                    border-bottom-color: var(--accent);
                }
                .empty-state {
                    text-align: center;
                    padding: var(--space-16) 0;
                    color: var(--muted);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: var(--space-4);
                }
                .playlist-card {
                    background: var(--card);
                    padding: var(--space-4);
                    border-radius: var(--radius-md);
                    transition: background 0.2s;
                    cursor: pointer;
                }
                .playlist-card:hover {
                    background: var(--card-hover);
                }
                .playlist-cover {
                    aspect-ratio: 1;
                    background: var(--card-hover);
                    border-radius: var(--radius-sm);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: var(--space-3);
                    color: var(--muted);
                }
            `}</style>
        </div >
    );
}

function EmptyState({ icon, title, message }: { icon: React.ReactNode, title: string, message: string }) {
    return (
        <div className="empty-state">
            <div style={{ opacity: 0.5 }}>{icon}</div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--foreground)' }}>
                {title}
            </h3>
            <p style={{ maxWidth: 300 }}>{message}</p>
        </div>
    );
}
