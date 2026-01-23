// Fullscreen Now Playing Panel - Immersive music experience

import { useEffect, useState } from 'react';
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Repeat,
    Repeat1,
    Shuffle,
    Heart,
    Mic2,
    Share2,
    PlusCircle,
    ChevronDown,
    ListMusic
} from 'lucide-react';
import { usePlayerStore } from '../../lib/player';
import { lastFm } from '../../lib/lastfm';
import { LyricsPanel } from './LyricsPanel';
import { AddToPlaylistModal } from '../playlists/AddToPlaylistModal';
import { QueueList } from './QueueList';
import './NowPlaying.css';

interface NowPlayingProps {
    onClose: () => void;
    onLyricsToggle: () => void;
    showLyrics: boolean;
}

// ... (existing imports)

export function NowPlaying({ onClose, onLyricsToggle, showLyrics }: NowPlayingProps) {
    // ... (existing hooks)
    const {
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        repeatMode,
        shuffleMode,
        togglePlay,
        playNext,
        playPrevious,
        seek,
        setRepeatMode,
        toggleShuffle
    } = usePlayerStore();

    const [isLiked, setIsLiked] = useState(false);
    const [seekValue, setSeekValue] = useState(currentTime);
    const [isSeeking, setIsSeeking] = useState(false);
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);
    const [showQueue, setShowQueue] = useState(false);

    useEffect(() => {
        if (!isSeeking) {
            setSeekValue(currentTime);
        }
    }, [currentTime, isSeeking]);

    const formatTime = (time: number) => {
        if (!time || isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSeekValue(parseFloat(e.target.value));
    };

    const handleSeekEnd = () => {
        seek(seekValue);
        setIsSeeking(false);
    };

    const handleLike = () => {
        setIsLiked(!isLiked);
        if (currentTrack && !isLiked) {
            lastFm.loveTrack(currentTrack);
        }
    };

    const cycleRepeat = () => {
        const modes: Array<'none' | 'all' | 'one'> = ['none', 'all', 'one'];
        const currentIndex = modes.indexOf(repeatMode);
        setRepeatMode(modes[(currentIndex + 1) % modes.length]);
    };

    const progress = duration ? (seekValue / duration) * 100 : 0;

    if (!currentTrack) return null;

    return (
        <div className="now-playing">
            {/* Background blur */}
            <div
                className="now-playing__bg"
                style={{ backgroundImage: `url(${currentTrack.coverUrl})` }}
            />
            <div className="now-playing__gradient" />

            {/* Header */}
            <header className="now-playing__header">
                <button className="now-playing__close" onClick={onClose}>
                    <ChevronDown size={28} />
                </button>
                <div className="now-playing__header-info">
                    <span className="now-playing__label">{showQueue ? 'QUEUE' : 'PLAYING FROM'}</span>
                    <span className="now-playing__source">{currentTrack.album || 'Unknown Album'}</span>
                </div>
                <button
                    className={`now-playing__menu ${showQueue ? 'active' : ''}`}
                    onClick={() => setShowQueue(!showQueue)}
                    title="Toggle Queue"
                >
                    <ListMusic size={24} />
                </button>
            </header>

            {/* Main content */}
            <main className="now-playing__content">
                {showQueue ? (
                    <div className="now-playing__queue">
                        <QueueList />
                    </div>
                ) : (
                    <>
                        {/* Album Art */}
                        <div className={`now-playing__artwork ${isPlaying ? 'playing' : ''}`}>
                            <img
                                src={currentTrack.coverUrl || '/placeholder-cover.png'}
                                alt={currentTrack.title}
                            />
                        </div>

                        {/* Track Info */}
                        <div className="now-playing__info">
                            <div className="now-playing__title-row">
                                <div>
                                    <h1 className="now-playing__title">{currentTrack.title}</h1>
                                    <p className="now-playing__artist">{currentTrack.artist}</p>
                                </div>
                                <button
                                    className={`now-playing__like ${isLiked ? 'active' : ''}`}
                                    onClick={handleLike}
                                >
                                    <Heart size={24} fill={isLiked ? 'currentColor' : 'none'} />
                                </button>
                            </div>

                            {/* Progress */}
                            <div className="now-playing__progress">
                                <div
                                    className="now-playing__slider-track"
                                    style={{ '--progress': `${progress}%` } as React.CSSProperties}
                                >
                                    <input
                                        type="range"
                                        min="0"
                                        max={duration || 100}
                                        value={seekValue}
                                        onChange={handleSeekChange}
                                        onMouseDown={() => setIsSeeking(true)}
                                        onMouseUp={handleSeekEnd}
                                        onTouchStart={() => setIsSeeking(true)}
                                        onTouchEnd={handleSeekEnd}
                                        className="now-playing__slider"
                                    />
                                </div>
                                <div className="now-playing__times">
                                    <span>{formatTime(seekValue)}</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                            </div>

                            {/* Main Controls */}
                            <div className="now-playing__controls">
                                <button
                                    className={`now-playing__btn ${shuffleMode !== 'off' ? 'active' : ''}`}
                                    onClick={toggleShuffle}
                                >
                                    <Shuffle size={24} />
                                </button>
                                <button className="now-playing__btn" onClick={playPrevious}>
                                    <SkipBack size={32} fill="currentColor" />
                                </button>
                                <button className="now-playing__btn now-playing__btn--play" onClick={togglePlay}>
                                    {isPlaying ? (
                                        <Pause size={40} fill="currentColor" />
                                    ) : (
                                        <Play size={40} fill="currentColor" />
                                    )}
                                </button>
                                <button className="now-playing__btn" onClick={playNext}>
                                    <SkipForward size={32} fill="currentColor" />
                                </button>
                                <button
                                    className={`now-playing__btn ${repeatMode !== 'none' ? 'active' : ''}`}
                                    onClick={cycleRepeat}
                                >
                                    {repeatMode === 'one' ? <Repeat1 size={24} /> : <Repeat size={24} />}
                                </button>
                            </div>

                            {/* Bottom Actions */}
                            <div className="now-playing__actions">
                                <button className="now-playing__action" onClick={onLyricsToggle}>
                                    <Mic2 size={20} />
                                    <span>Lyrics</span>
                                </button>
                                <button className="now-playing__action">
                                    <Share2 size={20} />
                                    <span>Share</span>
                                </button>
                                <button className="now-playing__action" onClick={() => setShowPlaylistModal(true)}>
                                    <PlusCircle size={20} />
                                    <span>Add</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Inline Lyrics (optional) */}
            {showLyrics && !showQueue && (
                <div className="now-playing__lyrics">
                    <LyricsPanel fullscreen={true} />
                </div>
            )}

            <AddToPlaylistModal
                isOpen={showPlaylistModal}
                onClose={() => setShowPlaylistModal(false)}
                track={currentTrack}
            />
        </div>
    );
}
