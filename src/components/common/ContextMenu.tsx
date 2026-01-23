import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './ContextMenu.css';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    onAddToQueue: () => void;
    onAddNextToQueue: () => void;
    onAddToPlaylist: () => void;
    onToggleFavorite: () => void;
    onDownload: () => void;
    onGoToArtist: () => void;
    onGoToAlbum: () => void;
    isFavorite: boolean;
}

export function ContextMenu({
    x,
    y,
    onClose,
    onAddToQueue,
    onAddNextToQueue,
    onAddToPlaylist,
    onToggleFavorite,
    onDownload,
    onGoToArtist,
    onGoToAlbum,
    isFavorite
}: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [adjustedPos, setAdjustedPos] = useState({ x, y });

    // Adjust position to prevent overflow
    useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            let newX = x;
            let newY = y;

            if (x + rect.width > window.innerWidth) {
                newX = window.innerWidth - rect.width - 20;
            }
            if (y + rect.height > window.innerHeight) {
                newY = window.innerHeight - rect.height - 20;
            }
            setAdjustedPos({ x: newX, y: newY });
        }
    }, [x, y]);

    // Close on click outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('click', handleClick);
        document.addEventListener('contextmenu', handleClick);
        return () => {
            document.removeEventListener('click', handleClick);
            document.removeEventListener('contextmenu', handleClick);
        };
    }, [onClose]);

    return createPortal(
        <div
            ref={menuRef}
            className="context-menu"
            style={{
                top: adjustedPos.y,
                left: adjustedPos.x,
                position: 'fixed'
            }}
            onClick={(e) => {
                e.stopPropagation();
                onClose();
            }}
            onContextMenu={(e) => e.preventDefault()}
        >
            <button className="context-menu-item" onClick={onToggleFavorite}>
                {isFavorite ? 'Dislike' : 'Like'}
            </button>
            <button className="context-menu-item" onClick={onAddToPlaylist}>
                Add to Playlist
            </button>
            <button className="context-menu-item" onClick={onGoToArtist}>
                Go to Artist
            </button>
            <button className="context-menu-item" onClick={onGoToAlbum}>
                Go to Album
            </button>
            <button className="context-menu-item" onClick={() => { }}>
                Track Mix
            </button>
            <button className="context-menu-item" onClick={onAddNextToQueue}>
                Play Next
            </button>
            <button className="context-menu-item" onClick={onAddToQueue}>
                Add to Queue
            </button>
            <button className="context-menu-item" onClick={onDownload}>
                Download
            </button>
        </div>,
        document.body
    );
}
