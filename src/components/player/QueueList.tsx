
import { useRef, useEffect } from 'react';
import { usePlayerStore } from '../../lib/player';
import { Play, Trash2 } from 'lucide-react';
import './QueueList.css';

export function QueueList() {
    const {
        queue,
        queueIndex,
        currentTrack,
        skipTo,
        removeFromQueue,
        clearQueue
    } = usePlayerStore();

    const activeRef = useRef<HTMLDivElement>(null);

    // Scroll active track into view on mount/change
    useEffect(() => {
        if (activeRef.current) {
            activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [queueIndex]);

    if (queue.length === 0) {
        return (
            <div className="queue-empty">
                <p>Queue is empty</p>
                <p className="queue-empty-sub">Add songs to see them here</p>
            </div>
        );
    }

    return (
        <div className="queue-list-container">
            <div className="queue-header">
                <h3>Queue</h3>
                <button className="queue-clear-btn" onClick={clearQueue}>
                    Clear Queue
                </button>
            </div>

            <div className="queue-list">
                {/* Now Playing Section */}
                {currentTrack && (
                    <div className="queue-section">
                        <h4>Now Playing</h4>
                        <div className="queue-item active" ref={activeRef}>
                            <div className="queue-item-cover">
                                <img src={currentTrack.coverUrl} alt={currentTrack.title} />
                                <div className="queue-playing-indicator">
                                    <div className="bar n1"></div>
                                    <div className="bar n2"></div>
                                    <div className="bar n3"></div>
                                </div>
                            </div>
                            <div className="queue-item-info">
                                <span className="title">{currentTrack.title}</span>
                                <span className="artist">{currentTrack.artist}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Up Next */}
                {queue.length > 1 && (
                    <div className="queue-section">
                        <h4>Up Next</h4>
                        {queue.map((track, index) => {
                            if (index === queueIndex) return null; // Skip current
                            const isPast = index < queueIndex;

                            return (
                                <div
                                    key={`${track.id}-${index}`}
                                    className={`queue-item ${isPast ? 'past' : ''}`}
                                    onClick={() => skipTo(index)}
                                >
                                    <div className="queue-item-cover">
                                        <img src={track.coverUrl} alt={track.title} loading="lazy" />
                                        <div className="queue-item-overlay">
                                            <Play size={16} fill="white" />
                                        </div>
                                    </div>
                                    <div className="queue-item-info">
                                        <span className="title">{track.title}</span>
                                        <span className="artist">{track.artist}</span>
                                    </div>
                                    <button
                                        className="queue-remove-btn"
                                        onClick={(e) => { e.stopPropagation(); removeFromQueue(index); }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
