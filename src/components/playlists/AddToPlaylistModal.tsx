import { useState, useEffect } from 'react';
import { X, Plus, Music, Check, Search } from 'lucide-react';
import { db } from '../../lib/db';
import { type Track } from '../../lib/api';

interface AddToPlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    track: Track | null;
}

export function AddToPlaylistModal({ isOpen, onClose, track }: AddToPlaylistModalProps) {
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [addedToMap, setAddedToMap] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (isOpen) {
            loadPlaylists();
            setAddedToMap({});
            setSearchQuery('');
            setIsCreating(false);
            setNewPlaylistName('');
        }
    }, [isOpen]);

    const loadPlaylists = async () => {
        const pls = await db.getPlaylists();
        setPlaylists(pls);
    };

    const handleCreatePlaylist = async () => {
        if (!newPlaylistName.trim()) return;

        try {
            const newPl = await db.createPlaylist(newPlaylistName.trim());
            setPlaylists([newPl, ...playlists]);
            setNewPlaylistName('');
            setIsCreating(false);

            // Auto add to the new playlist? Maybe optional.
        } catch (error) {
            console.error('Failed to create playlist', error);
        }
    };

    const handleAddToPlaylist = async (playlistId: string) => {
        if (!track) return;

        try {
            await db.addTrackToPlaylist(playlistId, track);
            setAddedToMap(prev => ({ ...prev, [playlistId]: true }));

            // Optional: Close modal after short delay or let user add to multiple
            // setTimeout(onClose, 500);
        } catch (error) {
            console.error('Failed to add track to playlist', error);
        }
    };

    if (!isOpen || !track) return null;

    const filteredPlaylists = playlists.filter(pl =>
        pl.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
            <div className="modal-content" style={{
                backgroundColor: 'var(--card)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-6)',
                width: '100%', maxWidth: '400px',
                border: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
                maxHeight: '80vh'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' }}>Add to Playlist</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                        background: 'var(--background)',
                        padding: 'var(--space-2) var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        flex: 1
                    }}>
                        <Search size={16} color="var(--muted-foreground)" />
                        <input
                            type="text"
                            placeholder="Search playlists..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                background: 'transparent', border: 'none', color: 'var(--foreground)',
                                width: '100%', outline: 'none'
                            }}
                        />
                    </div>
                </div>

                <div className="playlist-list" style={{
                    display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
                    overflowY: 'auto', flex: 1, minHeight: '200px'
                }}>
                    <button
                        onClick={() => setIsCreating(!isCreating)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                            padding: 'var(--space-3)',
                            background: isCreating ? 'var(--secondary)' : 'transparent',
                            border: '1px dashed var(--border)',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            color: 'var(--foreground)',
                            textAlign: 'left'
                        }}
                    >
                        <div style={{
                            width: 40, height: 40,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'var(--secondary)', borderRadius: 'var(--radius-sm)'
                        }}>
                            <Plus size={20} />
                        </div>
                        <span style={{ fontWeight: 'var(--font-medium)' }}>New Playlist</span>
                    </button>

                    {isCreating && (
                        <div style={{
                            padding: 'var(--space-3)',
                            border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                            display: 'flex', gap: 'var(--space-2)'
                        }}>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Playlist Name"
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                style={{
                                    flex: 1, background: 'var(--background)', border: '1px solid var(--border)',
                                    padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', color: 'var(--foreground)'
                                }}
                            />
                            <button
                                onClick={handleCreatePlaylist}
                                disabled={!newPlaylistName.trim()}
                                style={{
                                    background: 'var(--highlight)', color: 'black',
                                    border: 'none', borderRadius: 'var(--radius-sm)',
                                    padding: '0 var(--space-3)', cursor: 'pointer'
                                }}
                            >
                                <Check size={18} />
                            </button>
                        </div>
                    )}

                    {filteredPlaylists.map(pl => (
                        <button
                            key={pl.id}
                            onClick={() => handleAddToPlaylist(pl.id)}
                            disabled={addedToMap[pl.id]}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: 'var(--space-2)',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                            className="playlist-item"
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <div style={{
                                    width: 40, height: 40,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'var(--secondary)', borderRadius: 'var(--radius-sm)',
                                    color: 'var(--muted)'
                                }}>
                                    <Music size={20} />
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ color: 'var(--foreground)', fontWeight: 'var(--font-medium)' }}>{pl.name}</div>
                                    <div style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-xs)' }}>{pl.tracks.length} tracks</div>
                                </div>
                            </div>
                            {addedToMap[pl.id] && (
                                <div style={{
                                    color: '#10b981',
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)'
                                }}>
                                    <Check size={16} />
                                    Added
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>
            <style>{`
                .playlist-item:hover {
                    background: var(--secondary);
                }
            `}</style>
        </div>
    );
}
