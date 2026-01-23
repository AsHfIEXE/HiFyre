
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pencil, Trash2, Clock, Music } from 'lucide-react';
import { db } from '../lib/db';
import { usePlayerStore } from '../lib/player';
import { EditPlaylistModal } from '../components/playlists/EditPlaylistModal';
import { TrackCard } from '../components/common/TrackCard';
import { type Track } from '../lib/api';

interface PlaylistData {
    id: string;
    userId: string;
    name: string;
    cover?: string;
    tracks: Track[];
    createdAt: number;
    updatedAt: number;
}

export function PlaylistPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { playPlaylist } = usePlayerStore();

    const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch playlist
    useEffect(() => {
        if (!id) return;

        const fetchPlaylist = async () => {
            setLoading(true);
            try {
                const pl = await db.getPlaylist(id);
                if (pl) {
                    setPlaylist(pl);
                } else {
                    setError('Playlist not found');
                }
            } catch (e) {
                setError('Failed to load playlist');
            } finally {
                setLoading(false);
            }
        };
        fetchPlaylist();
    }, [id]);

    const handlePlay = () => {
        if (playlist && playlist.tracks.length > 0) {
            playPlaylist(playlist.tracks);
        }
    };

    const handleEditSave = async (name: string, cover?: string) => {
        if (!playlist) return;

        try {
            const updated = { ...playlist, name, cover };
            await db.updatePlaylist(updated);
            setPlaylist(updated);
        } catch (e) {
            console.error('Failed to update playlist', e);
        }
    };

    const handleDelete = async () => {
        if (!playlist || !confirm('Are you sure you want to delete this playlist? This action cannot be undone.')) return;

        setIsDeleting(true);
        try {
            await db.deletePlaylist(playlist.id);
            navigate('/library');
        } catch (e) {
            console.error('Failed to delete playlist', e);
            setIsDeleting(false);
        }
    };

    const handleRemoveTrack = async (trackId: string) => {
        if (!playlist) return;
        try {
            await db.removeTrackFromPlaylist(playlist.id, trackId);
            // Refresh
            const pl = await db.getPlaylist(playlist.id);
            if (pl) setPlaylist(pl);
        } catch (e) {
            console.error('Failed to remove track', e);
        }
    };

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <div className="loading-spinner" />
            </div>
        );
    }

    if (error || !playlist) {
        return (
            <div className="page-container" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                <h2>Playlist not found</h2>
                <button className="btn-secondary" onClick={() => navigate('/library')}>Back to Library</button>
            </div>
        );
    }

    const totalDuration = playlist.tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
    const formattedDuration = `${Math.floor(totalDuration / 60)} min`;

    return (
        <div className="page-container">
            {/* Header */}
            <header className="playlist-header" style={{
                display: 'flex', gap: 'var(--space-6)', alignItems: 'flex-end',
                marginBottom: 'var(--space-8)', flexWrap: 'wrap'
            }}>
                <div className="playlist-cover" style={{
                    width: '232px', height: '232px',
                    boxShadow: '0 4px 60px rgba(0,0,0,0.5)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    background: 'var(--card)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    {playlist.cover ? (
                        <img src={playlist.cover} alt={playlist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <Music size={80} color="var(--muted)" />
                    )}
                </div>

                <div className="playlist-info" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase' }}>Playlist</span>
                    <h1 style={{
                        fontSize: 'clamp(2rem, 5vw, 6rem)',
                        fontWeight: 900,
                        lineHeight: 1,
                        margin: '0.1em 0'
                    }}>{playlist.name}</h1>
                    <div style={{
                        marginTop: 'var(--space-2)',
                        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                        color: 'var(--muted)', fontSize: '0.875rem', fontWeight: 500
                    }}>
                        <span>{playlist.tracks.length} songs,</span>
                        <span style={{ opacity: 0.7 }}>{formattedDuration}</span>
                    </div>
                </div>
            </header>

            {/* Actions */}
            <div className="playlist-actions" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                {playlist.tracks.length > 0 && (
                    <button className="btn-play" onClick={handlePlay} style={{
                        width: '56px', height: '56px', borderRadius: '50%',
                        background: 'var(--highlight)', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'black', cursor: 'pointer', transition: 'transform 0.1s'
                    }}>
                        <Play size={28} fill="currentColor" />
                    </button>
                )}

                <button onClick={() => setIsEditModalOpen(true)} title="Edit Playlist" style={{
                    background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 'var(--space-2)'
                }}>
                    <Pencil size={24} />
                </button>

                <button onClick={handleDelete} disabled={isDeleting} title="Delete Playlist" style={{
                    background: 'none', border: 'none', color: isDeleting ? 'var(--muted)' : 'var(--muted)', cursor: isDeleting ? 'wait' : 'pointer', padding: 'var(--space-2)'
                }}>
                    {isDeleting ? <Clock size={24} className="animate-spin" /> : <Trash2 size={24} />}
                </button>
            </div>

            {/* Track List */}
            <div className="playlist-tracks">
                <div className="track-list-header" style={{
                    display: 'grid', gridTemplateColumns: '16px 4fr 3fr 2fr minmax(120px, 1fr)',
                    gap: 'var(--space-4)', padding: '0 var(--space-4) var(--space-2)',
                    borderBottom: '1px solid var(--border)', color: 'var(--muted)',
                    fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px'
                }}>
                    <span>#</span>
                    <span>Title</span>
                    <span>Album</span>
                    <span>Date Added</span>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <Clock size={16} />
                    </div>
                </div>

                <div style={{ marginTop: 'var(--space-2)' }}>
                    {playlist.tracks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--muted)' }}>
                            <p>This playlist is empty.</p>
                            <p style={{ fontSize: '0.875rem', marginTop: 'var(--space-2)' }}>Add some songs!</p>
                        </div>
                    ) : (
                        playlist.tracks.map((track, index) => (
                            <div key={`${track.id}-${index}`} className="playlist-track-row" style={{ position: 'relative' }}>
                                <TrackCard
                                    track={track}
                                    index={index + 1}
                                    onPlay={() => playPlaylist(playlist.tracks, index)}
                                />
                                <button
                                    className="remove-track-btn"
                                    onClick={(e) => { e.stopPropagation(); handleRemoveTrack(track.id); }}
                                    title="Remove from playlist"
                                    style={{
                                        position: 'absolute', right: 'var(--space-12)', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
                                        opacity: 0, transition: 'opacity 0.2s'
                                    }}
                                >
                                    <Trash2 size={16} />
                                </button>
                                {/* Small hack: The delete button sits on top of the row. We need CSS to show it on hover. */}
                                <style>{`
                                    .playlist-track-row:hover .remove-track-btn { opacity: 1 !important; }
                                `}</style>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <EditPlaylistModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleEditSave}
                playlist={playlist}
            />
        </div>
    );
}
