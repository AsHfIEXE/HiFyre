// Album Card Component

import { useState } from 'react';
import { Play } from 'lucide-react';
import type { Album } from '../../lib/api';
import './AlbumCard.css';

interface AlbumCardProps {
    album: Album;
    onClick?: (album: Album) => void;
    onPlay?: (album: Album) => void;
}

export function AlbumCard({ album, onClick, onPlay }: AlbumCardProps) {
    const [isHovered, setIsHovered] = useState(false);

    const handleClick = () => {
        if (onClick) onClick(album);
    };

    const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onPlay) onPlay(album);
    };

    return (
        <div
            className="album-card"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
        >
            <div className="album-cover-container">
                <img
                    src={album.coverUrl}
                    alt={album.title}
                    className="album-cover"
                    loading="lazy"
                />
                <div className={`album-play-overlay ${isHovered ? 'visible' : ''}`}>
                    <button className="album-play-btn" onClick={handlePlay}>
                        <Play size={24} fill="currentColor" />
                    </button>
                </div>
            </div>

            <div className="album-info">
                <h3 className="album-title" title={album.title}>{album.title}</h3>
                <p className="album-artist" title={album.artist}>
                    {album.type === 'SINGLE' ? 'Single • ' : ''}
                    {album.type === 'EP' ? 'EP • ' : ''}
                    {album.artist}
                </p>
            </div>
        </div>
    );
}

export function AlbumCardSkeleton() {
    return (
        <div className="album-card skeleton">
            <div className="album-cover-container skeleton-box" />
            <div className="album-info">
                <div className="skeleton-box skeleton-title" />
                <div className="skeleton-box skeleton-subtitle" />
            </div>
        </div>
    );
}
