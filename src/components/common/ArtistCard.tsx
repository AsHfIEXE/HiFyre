// Artist Card Component

import type { Artist } from '../../lib/api';
import './ArtistCard.css';

interface ArtistCardProps {
    artist: Artist;
    onClick?: (artist: Artist) => void;
}

export function ArtistCard({ artist, onClick }: ArtistCardProps) {
    const handleClick = () => {
        if (onClick) onClick(artist);
    };

    return (
        <div className="artist-card" onClick={handleClick}>
            <div className="artist-image-container">
                <img
                    src={artist.pictureUrl}
                    alt={artist.name}
                    className="artist-image"
                    loading="lazy"
                />
            </div>
            <h3 className="artist-name" title={artist.name}>{artist.name}</h3>
            <span className="artist-label">Artist</span>
        </div>
    );
}

export function ArtistCardSkeleton() {
    return (
        <div className="artist-card skeleton">
            <div className="artist-image-container skeleton-box" />
            <div className="skeleton-box skeleton-name" />
        </div>
    );
}
