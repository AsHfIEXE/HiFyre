// Player Bar Component - Premium Spotify-like design
// Features: Gradient bg, refined layout, expand to fullscreen

import { useRef, useEffect, useState } from 'react';
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    Volume1,
    VolumeX,
    Repeat,
    Repeat1,
    Shuffle,
    ListMusic,
    Mic2,
    Maximize2,
    Heart
} from 'lucide-react';
import { usePlayerStore } from '../../lib/player';
import { api } from '../../lib/api';
import './PlayerBar.css';
import { lastFm } from '../../lib/lastfm';
import { LyricsPanel, NowPlaying, QueuePanel } from '../player';

export function PlayerBar() {
    const {
        currentTrack,
        isPlaying,
        volume,
        muted,
        repeatMode,
        shuffleMode,
        currentTime,
        duration,
        togglePlay,
        playNext,
        playPrevious,
        seek,
        setVolume,
        toggleMute,
        setRepeatMode,
        toggleShuffle,
        setCurrentTime,
        setDuration,
        playNext: handleEnded
    } = usePlayerStore();

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const dashPlayerRef = useRef<any>(null);
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekValue, setSeekValue] = useState(0);
    const [showLyrics, setShowLyrics] = useState(false);
    const [showQueue, setShowQueue] = useState(false);
    const [showNowPlaying, setShowNowPlaying] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const hasScrobbledRef = useRef(false);

    // Effect: Last.fm scrobbling on track change
    useEffect(() => {
        if (currentTrack && isPlaying) {
            lastFm.updateNowPlaying(currentTrack);
            hasScrobbledRef.current = false;
        }
    }, [currentTrack?.id, isPlaying]);

    // Initial audio setup
    useEffect(() => {
        audioRef.current = new Audio();
        const audio = audioRef.current;

        const onTimeUpdate = () => {
            if (!isSeeking) {
                setCurrentTime(audio.currentTime);
            }
        };

        const onDurationChange = () => {
            setDuration(audio.duration);
        };

        const onEnded = () => {
            handleEnded();
        };

        const onError = (e: Event) => {
            console.error("Audio playback error:", e);
        };

        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('durationchange', onDurationChange);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);

        return () => {
            audio.pause();
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('durationchange', onDurationChange);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onError);

            if (dashPlayerRef.current) {
                dashPlayerRef.current.reset();
            }
        };
    }, []);

    // Handle track changes
    useEffect(() => {
        let isCancelled = false;

        const loadTrack = async () => {
            const audio = audioRef.current;
            if (!audio || !currentTrack) return;

            if (dashPlayerRef.current) {
                dashPlayerRef.current.reset();
                dashPlayerRef.current = null;
            }
            audio.removeAttribute('src');
            audio.load();

            try {
                console.log(`Loading track: ${currentTrack.title} (${currentTrack.id})`);
                const url = await api.getStreamUrl(currentTrack.id);

                if (isCancelled) return;

                if (!url) {
                    console.error("No stream URL available for track:", currentTrack.title);
                    return;
                }

                if (url.startsWith('blob:') || url.includes('.mpd')) {
                    const dashjs = await import('dashjs');
                    const player = dashjs.MediaPlayer().create();
                    player.initialize(audio, url, false);
                    player.on('error', (e: any) => console.error("DASH Error:", e));
                    dashPlayerRef.current = player;

                    if (isPlaying) {
                        player.play();
                    }
                } else {
                    audio.src = url;
                    if (isPlaying) {
                        try {
                            await audio.play();
                        } catch (e) {
                            console.warn("Autoplay failed:", e);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to load track stream:", error);
            }
        };

        loadTrack();

        return () => { isCancelled = true; };
    }, [currentTrack?.id]);

    // Handle play/pause toggle
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentTrack) return;

        if (isPlaying) {
            if (dashPlayerRef.current) {
                dashPlayerRef.current.play();
            } else if (audio.currentSrc || audio.src) {
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        if (e.name !== 'AbortError') console.warn("Play failed:", e);
                    });
                }
            }
        } else {
            if (dashPlayerRef.current) {
                dashPlayerRef.current.pause();
            } else {
                audio.pause();
            }
        }
    }, [isPlaying]);

    // Handle volume
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = muted ? 0 : volume;
    }, [volume, muted]);

    const formatTime = (time: number) => {
        if (!time || isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSeekValue(parseFloat(e.target.value));
    };

    const handleSeekStart = () => setIsSeeking(true);

    const handleSeekEnd = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
        const target = e.currentTarget as HTMLInputElement;
        const val = parseFloat(target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = val;
        }
        seek(val);
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

    const progress = duration ? (currentTime / duration) * 100 : 0;

    if (!currentTrack) {
        return (
            <div className="player-bar player-bar--empty">
                <div className="player-bar__empty-message">
                    Select a track to start playing
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="player-bar">
                {/* Left: Track Info */}
                <div className="player-bar__left">
                    <div
                        className="player-bar__cover"
                        onClick={() => setShowNowPlaying(true)}
                    >
                        <img
                            src={currentTrack.coverUrl || '/placeholder-cover.png'}
                            alt={currentTrack.title}
                            className={isPlaying ? 'playing' : ''}
                        />
                        <div className="player-bar__cover-overlay">
                            <Maximize2 size={16} />
                        </div>
                    </div>
                    <div className="player-bar__info">
                        <div className="player-bar__title">{currentTrack.title}</div>
                        <div className="player-bar__artist">{currentTrack.artist}</div>
                    </div>
                    <button
                        className={`player-bar__like ${isLiked ? 'active' : ''}`}
                        onClick={handleLike}
                    >
                        <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
                    </button>
                </div>

                {/* Center: Controls */}
                <div className="player-bar__center">
                    <div className="player-bar__controls">
                        <button
                            className={`control-btn ${shuffleMode !== 'off' ? 'active' : ''}`}
                            onClick={toggleShuffle}
                            title="Shuffle"
                        >
                            <Shuffle size={18} />
                        </button>
                        <button className="control-btn" onClick={playPrevious} title="Previous">
                            <SkipBack size={22} fill="currentColor" />
                        </button>
                        <button className="control-btn control-btn--play" onClick={togglePlay}>
                            {isPlaying ? (
                                <Pause size={24} fill="currentColor" />
                            ) : (
                                <Play size={24} fill="currentColor" />
                            )}
                        </button>
                        <button className="control-btn" onClick={playNext} title="Next">
                            <SkipForward size={22} fill="currentColor" />
                        </button>
                        <button
                            className={`control-btn ${repeatMode !== 'none' ? 'active' : ''}`}
                            onClick={cycleRepeat}
                            title="Repeat"
                        >
                            {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
                        </button>
                    </div>

                    <div className="player-bar__progress">
                        <span className="player-bar__time">{formatTime(isSeeking ? seekValue : currentTime)}</span>
                        <div className="player-bar__slider-wrapper">
                            <div
                                className="player-bar__slider-track"
                                style={{ '--progress': `${progress}%` } as React.CSSProperties}
                            >
                                <input
                                    type="range"
                                    min="0"
                                    max={duration || 100}
                                    value={isSeeking ? seekValue : currentTime}
                                    onChange={handleSeekChange}
                                    onMouseDown={handleSeekStart}
                                    onMouseUp={handleSeekEnd}
                                    onTouchStart={handleSeekStart}
                                    onTouchEnd={handleSeekEnd}
                                    className="player-bar__slider"
                                />
                            </div>
                        </div>
                        <span className="player-bar__time">{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Right: Extras */}
                <div className="player-bar__right">
                    <button
                        className={`control-btn ${showLyrics ? 'active' : ''}`}
                        onClick={() => {
                            setShowLyrics(!showLyrics);
                            if (!showLyrics) setShowQueue(false);
                        }}
                        title="Lyrics"
                    >
                        <Mic2 size={18} />
                    </button>
                    <button
                        className={`control-btn ${showQueue ? 'active' : ''}`}
                        onClick={() => {
                            setShowQueue(!showQueue);
                            if (!showQueue) setShowLyrics(false);
                        }}
                        title="Queue"
                    >
                        <ListMusic size={18} />
                    </button>

                    <div className="player-bar__volume">
                        <button className="control-btn" onClick={toggleMute}>
                            {muted || volume === 0 ? (
                                <VolumeX size={18} />
                            ) : volume < 0.5 ? (
                                <Volume1 size={18} />
                            ) : (
                                <Volume2 size={18} />
                            )}
                        </button>
                        <div className="player-bar__volume-slider">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={muted ? 0 : volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                style={{ '--progress': `${(muted ? 0 : volume) * 100}%` } as React.CSSProperties}
                            />
                        </div>
                    </div>

                    <button
                        className="control-btn"
                        onClick={() => setShowNowPlaying(true)}
                        title="Expand"
                    >
                        <Maximize2 size={18} />
                    </button>
                </div>
            </div>

            {/* Panels */}
            {/* Hide sidebar lyrics if Now Playing is open (fullscreen handles its own lyrics) */}
            {showLyrics && !showNowPlaying && (
                <>
                    <div className="panel-overlay" onClick={() => setShowLyrics(false)} />
                    <div className="side-drawer show">
                        <LyricsPanel onClose={() => setShowLyrics(false)} />
                    </div>
                </>
            )}

            {showQueue && (
                <>
                    <div className="panel-overlay" onClick={() => setShowQueue(false)} />
                    <div className="side-drawer show">
                        <QueuePanel onClose={() => setShowQueue(false)} />
                    </div>
                </>
            )}

            {showNowPlaying && (
                <NowPlaying
                    onClose={() => setShowNowPlaying(false)}
                    onLyricsToggle={() => setShowLyrics(!showLyrics)}
                    showLyrics={showLyrics}
                />
            )}
        </>
    );
}
