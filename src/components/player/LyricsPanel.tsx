// Lyrics Panel - Karaoke-style with click-to-seek

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerStore } from '../../lib/player';
import { lyricsManager, type LyricsData } from '../../lib/lyrics';
import { useSettingsStore } from '../../lib/settings';
import { X } from 'lucide-react';
import './LyricsPanel.css';

interface LyricsPanelProps {
    onClose?: () => void;
    fullscreen?: boolean;
}

export function LyricsPanel({ onClose, fullscreen = false }: LyricsPanelProps) {
    const { currentTrack, currentTime, seek } = usePlayerStore();
    const { romajiMode, setRomajiMode } = useSettingsStore();
    const [lyrics, setLyrics] = useState<LyricsData | null>(null);
    const [loading, setLoading] = useState(false);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const activeLineRef = useRef<HTMLDivElement | null>(null);
    const isUserScrolling = useRef(false);
    const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch lyrics on track change
    useEffect(() => {
        if (currentTrack) {
            setLoading(true);
            setLyrics(null);
            lyricsManager.fetchLyrics(currentTrack)
                .then(data => {
                    setLyrics(data);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        }
    }, [currentTrack?.id]);

    // Auto-scroll to active line
    useEffect(() => {
        if (activeLineRef.current && containerRef.current && !isUserScrolling.current) {
            activeLineRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }, [currentTime, lyrics]);

    const handleScroll = useCallback(() => {
        isUserScrolling.current = true;
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        scrollTimeout.current = setTimeout(() => {
            isUserScrolling.current = false;
        }, 3000);
    }, []);

    // Click on line to seek
    const handleLineClick = useCallback((time: number) => {
        seek(time);
        // Also seek the actual audio element
        const audio = document.querySelector('audio');
        if (audio) {
            audio.currentTime = time;
        }
    }, [seek]);

    // Find active line index
    const activeIndex = lyrics?.lines.findIndex((line, i) => {
        const nextLine = lyrics.lines[i + 1];
        return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
    }) ?? -1;

    // Calculate progress within current line for karaoke effect
    const getLineProgress = (lineIndex: number): number => {
        if (!lyrics || lineIndex !== activeIndex) return lineIndex < activeIndex ? 100 : 0;

        const line = lyrics.lines[lineIndex];
        const nextLine = lyrics.lines[lineIndex + 1];
        const lineStart = line.time;
        const lineEnd = nextLine?.time ?? lineStart + 5;
        const lineDuration = lineEnd - lineStart;

        if (lineDuration <= 0) return 100;
        const progress = ((currentTime - lineStart) / lineDuration) * 100;
        return Math.min(100, Math.max(0, progress));
    };

    if (loading) {
        return (
            <div className={`lyrics-panel ${fullscreen ? 'lyrics-panel--fullscreen' : ''}`}>
                <div className="lyrics-panel__loading">
                    <div className="lyrics-panel__spinner"></div>
                    <span>Loading lyrics...</span>
                </div>
            </div>
        );
    }

    if (!lyrics || lyrics.lines.length === 0) {
        return (
            <div className={`lyrics-panel ${fullscreen ? 'lyrics-panel--fullscreen' : ''}`}>
                <div className="lyrics-panel__empty">
                    <span>♪</span>
                    <p>No lyrics available</p>
                    <p className="lyrics-panel__empty-hint">Lyrics are sourced from LRCLIB</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`lyrics-panel ${fullscreen ? 'lyrics-panel--fullscreen' : ''}`}>
            {/* Header */}
            <header className="lyrics-panel__header">
                <h3>Lyrics</h3>
                <div className="lyrics-panel__header-actions">
                    <button
                        className={`lyrics-panel__toggle ${romajiMode ? 'active' : ''}`}
                        onClick={() => setRomajiMode(!romajiMode)}
                    >
                        Romaji
                    </button>
                    {onClose && (
                        <button className="lyrics-panel__close" onClick={onClose}>
                            <X size={18} />
                        </button>
                    )}
                </div>
            </header>

            {/* Lyrics Content */}
            <div
                ref={containerRef}
                className="lyrics-panel__content"
                onScroll={handleScroll}
            >
                {lyrics.lines.map((line, index) => {
                    const isActive = index === activeIndex;
                    const isPast = index < activeIndex;
                    const progress = getLineProgress(index);

                    return (
                        <div
                            key={index}
                            ref={isActive ? activeLineRef : null}
                            className={`lyrics-panel__line ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}
                            onClick={() => handleLineClick(line.time)}
                            role="button"
                            tabIndex={0}
                        >
                            <div className="lyrics-panel__line-wrapper">
                                {/* Background text (dimmed) */}
                                <span className="lyrics-panel__line-bg">{line.text}</span>
                                {/* Foreground text (karaoke fill) */}
                                <span
                                    className="lyrics-panel__line-fill"
                                    style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }}
                                >
                                    {line.text}
                                </span>
                            </div>
                            {romajiMode && line.translation && (
                                <p className="lyrics-panel__translation">{line.translation}</p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer info */}
            <footer className="lyrics-panel__footer">
                <span>Synced lyrics • Click any line to jump</span>
            </footer>
        </div>
    );
}
