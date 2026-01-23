// Track Card Component - Individual track display

import { useState } from 'react';
import { Play, Pause, Heart, Plus, Download } from 'lucide-react';
import { api, type Track } from '../../lib/api';
import { usePlayerStore } from '../../lib/player';
import { db } from '../../lib/db';
import { AddToPlaylistModal } from '../playlists/AddToPlaylistModal';
import { ContextMenu } from './ContextMenu';
import { useToast } from '../ui/ToastContext';
import './TrackCard.css';

interface TrackCardProps {
    track: Track;
    index?: number;
    showIndex?: boolean;
    showAlbum?: boolean;
    compact?: boolean;
    onPlay?: (track: Track) => void;
}

export function TrackCard({
    track,
    index,
    showIndex = false,
    showAlbum = true,
    compact = false,
    onPlay
}: TrackCardProps) {
    const [isFavorite, setIsFavorite] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
    const { showToast } = useToast();

    const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
    const isCurrentTrack = currentTrack?.id === track.id;

    // Check favorite status on mount
    useState(() => {
        db.isFavorite('track', track.id).then(setIsFavorite);
    });

    const handlePlay = () => {
        if (onPlay) {
            onPlay(track);
        } else if (isCurrentTrack) {
            togglePlay();
        } else {
            playTrack(track);
        }
    };

    const handleFavorite = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const newState = await db.toggleFavorite('track', track);
        setIsFavorite(newState);
    };

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isDownloading) return;

        setIsDownloading(true);
        try {
            const filename = `${track.artist} - ${track.title}.flac`.replace(/[^a-z0-9 \.-]/gi, '');
            await api.downloadTrack(track, filename);
            // Could add toast here
        } catch (error) {
            console.error("Download failed", error);
        } finally {
            setIsDownloading(false);
        }
    };



    const handleAddToPlaylist = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowPlaylistModal(true);
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    const closeContextMenu = () => setContextMenu(null);

    return (
        <>
            <div
                className={`track-card ${compact ? 'compact' : ''} ${isCurrentTrack ? 'active' : ''}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={handlePlay}
                onContextMenu={handleContextMenu}
            >
                {showIndex && (
                    <div className="track-index">
                        {isHovered || isCurrentTrack ? (
                            <button className="track-play-btn" onClick={(e) => { e.stopPropagation(); handlePlay(); }}>
                                {isCurrentTrack && isPlaying ? (
                                    <Pause size={14} />
                                ) : (
                                    <Play size={14} />
                                )}
                            </button>
                        ) : (
                            <span className={isCurrentTrack ? 'playing' : ''}>{index}</span>
                        )}
                    </div>
                )}

                <div className="track-cover">
                    <img src={track.coverUrl} alt={track.album} loading="lazy" />
                    {!showIndex && (isHovered || isCurrentTrack) && (
                        <button className="track-cover-play" onClick={(e) => { e.stopPropagation(); handlePlay(); }}>
                            {isCurrentTrack && isPlaying ? (
                                <Pause size={20} />
                            ) : (
                                <Play size={20} />
                            )}
                        </button>
                    )}
                </div>

                <div className="track-info">
                    <span className={`track-title ${isCurrentTrack ? 'active' : ''}`}>
                        {track.title}
                        {track.explicit && <span className="explicit-badge">E</span>}
                    </span>
                    <span className="track-artist">{track.artist}</span>
                </div>

                {showAlbum && !compact && (
                    <div className="track-album">{track.album}</div>
                )}

                <div className="track-actions">
                    <button
                        className={`track-action-btn ${isFavorite ? 'active' : ''}`}
                        onClick={handleFavorite}
                        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                        <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                        className="track-action-btn"
                        onClick={handleDownload}
                        disabled={isDownloading}
                        title="Download"
                    >
                        <Download size={16} />
                    </button>
                    <button
                        className="track-action-btn"
                        onClick={handleAddToPlaylist}
                        title="Add to Playlist"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                <div className="track-duration">
                    {formatDuration(track.duration)}
                </div>

                <AddToPlaylistModal
                    isOpen={showPlaylistModal}
                    onClose={() => setShowPlaylistModal(false)}
                    track={track}
                />
            </div>

            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={closeContextMenu}
                    onAddToQueue={() => {
                        usePlayerStore.getState().addToQueue(track);
                        showToast('Added to queue', 'success');
                        closeContextMenu();
                    }}
                    onAddNextToQueue={() => {
                        usePlayerStore.getState().addNextToQueue(track);
                        showToast('Playing next', 'success');
                        closeContextMenu();
                    }}
                    onAddToPlaylist={() => {
                        setShowPlaylistModal(true);
                        closeContextMenu();
                    }}
                    onToggleFavorite={() => {
                        db.toggleFavorite('track', track).then(setIsFavorite);
                        closeContextMenu();
                    }}
                    onDownload={() => {
                        const filename = `${track.artist} - ${track.title}.flac`.replace(/[^a-z0-9 \.-]/gi, '');
                        api.downloadTrack(track, filename);
                        closeContextMenu();
                    }}
                    onGoToArtist={() => {
                        // navigate(`/artist/${track.artistId}`); // If we had IDs
                        // For now we search
                        // navigate(`/search?q=${track.artist}`);
                        closeContextMenu();
                    }}
                    onGoToAlbum={() => {
                        closeContextMenu();
                    }}
                    isFavorite={isFavorite}
                />
            )}
        </>
    );
}

export function TrackCardSkeleton({ compact = false }: { compact?: boolean }) {
    return (
        <div className={`track-card skeleton ${compact ? 'compact' : ''}`}>
            <div className="track-cover skeleton-box" />
            <div className="track-info">
                <div className="skeleton-box skeleton-title" />
                <div className="skeleton-box skeleton-subtitle" />
            </div>
            {!compact && <div className="track-album skeleton-box" />}
            <div className="track-duration skeleton-box" />
        </div>
    );
}
