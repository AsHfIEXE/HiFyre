
// Queue Panel - Shows current and upcoming tracks with Drag & Drop

import { useState } from 'react';
import { X, GripVertical, Play, Trash2 } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    type DropAnimation,
    type DragEndEvent
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { usePlayerStore } from '../../lib/player';
import type { Track } from '../../lib/api';
import './QueuePanel.css';

interface QueuePanelProps {
    onClose: () => void;
}

// --- Sortable Item Component ---
interface SortableItemProps {
    track: Track;
    id: string; // Unique ID for dnd-kit
    onPlay: () => void;
    onRemove: () => void;
}

function SortableQueueItem({ track, id, onPlay, onRemove }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        touchAction: 'none' // Important for touch dragging
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`queue-panel__item ${isDragging ? 'is-dragging' : ''}`}
        >
            <button className="queue-panel__drag" {...attributes} {...listeners}>
                <GripVertical size={16} />
            </button>
            <img
                src={track.coverUrl || '/placeholder-cover.png'}
                alt={track.title}
                className="queue-panel__cover"
            />
            <div className="queue-panel__info">
                <span className="queue-panel__title">{track.title}</span>
                <span className="queue-panel__artist">{track.artist}</span>
            </div>
            <div className="queue-panel__actions">
                <button
                    className="queue-panel__action"
                    onClick={onPlay}
                    title="Play now"
                >
                    <Play size={14} fill="currentColor" />
                </button>
                <button
                    className="queue-panel__action queue-panel__action--danger"
                    onClick={onRemove}
                    title="Remove"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
}

// --- Main Component ---
export function QueuePanel({ onClose }: QueuePanelProps) {
    const {
        currentTrack,
        queue,
        queueIndex,
        removeFromQueue,
        skipTo,
        reorderQueue
    } = usePlayerStore();

    // We only sort the "Next Up" items
    const upNextStartIndex = queueIndex + 1;
    // Map tracks to items with unique IDs for DND (using index if track ids are duplicate? better use unique IDs)
    // Assuming track objects are referentially stable or have unique IDs. 
    // If tracks can be duplicate in queue, we might need composite keys.
    // For now, let's assume we use index-based keys for the sortable context? 
    // No, SortableContext needs unique IDs. User might queue same song twice.
    // Let's create a derived list with stable IDs if possible, but store only holds Track[].
    // We can use `${track.id}-${index}` as key.

    // items passed to SortableContext
    const upNextItems = queue.slice(upNextStartIndex).map((track, idx) => ({
        ...track,
        uniqueId: `${track.id}-${upNextStartIndex + idx}`,
        originalIndex: upNextStartIndex + idx
    }));

    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndexInUpNext = upNextItems.findIndex(i => i.uniqueId === active.id);
            const newIndexInUpNext = upNextItems.findIndex(i => i.uniqueId === over?.id);

            if (oldIndexInUpNext !== -1 && newIndexInUpNext !== -1) {
                // Convert back to global queue indices
                const oldGlobalIndex = upNextStartIndex + oldIndexInUpNext;
                const newGlobalIndex = upNextStartIndex + newIndexInUpNext;
                reorderQueue(oldGlobalIndex, newGlobalIndex);
            }
        }
        setActiveId(null);
    };

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    };

    const activeTrack = upNextItems.find(t => t.uniqueId === activeId);

    return (
        <div className="queue-panel">
            <header className="queue-panel__header">
                <h2>Queue</h2>
                <button className="queue-panel__close" onClick={onClose}>
                    <X size={20} />
                </button>
            </header>

            <div className="queue-panel__content">
                {/* Now Playing */}
                {currentTrack && (
                    <section className="queue-panel__section">
                        <h3 className="queue-panel__section-title">Now Playing</h3>
                        <div className="queue-panel__item queue-panel__item--current">
                            <img
                                src={currentTrack.coverUrl || '/placeholder-cover.png'}
                                alt={currentTrack.title}
                                className="queue-panel__cover"
                            />
                            <div className="queue-panel__info">
                                <span className="queue-panel__title">{currentTrack.title}</span>
                                <span className="queue-panel__artist">{currentTrack.artist}</span>
                            </div>
                            <div className="queue-panel__playing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    </section>
                )}

                {/* Up Next */}
                {upNextItems.length > 0 && (
                    <section className="queue-panel__section">
                        <h3 className="queue-panel__section-title">Next Up</h3>
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                            onDragStart={handleDragStart}
                        >
                            <SortableContext
                                items={upNextItems.map(i => i.uniqueId)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="queue-panel__list">
                                    {upNextItems.map((item) => (
                                        <SortableQueueItem
                                            key={item.uniqueId}
                                            id={item.uniqueId}
                                            track={item}
                                            onPlay={() => skipTo(item.originalIndex)}
                                            onRemove={() => removeFromQueue(item.originalIndex)}
                                        />
                                    ))}
                                </div>
                            </SortableContext>

                            <DragOverlay dropAnimation={dropAnimation}>
                                {activeId && activeTrack ? (
                                    <div className="queue-panel__item is-overlay">
                                        <button className="queue-panel__drag">
                                            <GripVertical size={16} />
                                        </button>
                                        <img
                                            src={activeTrack.coverUrl || '/placeholder-cover.png'}
                                            alt={activeTrack.title}
                                            className="queue-panel__cover"
                                        />
                                        <div className="queue-panel__info">
                                            <span className="queue-panel__title">{activeTrack.title}</span>
                                            <span className="queue-panel__artist">{activeTrack.artist}</span>
                                        </div>
                                    </div>
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    </section>
                )}

                {queue.length === 0 && (
                    <div className="queue-panel__empty">
                        <p>Your queue is empty</p>
                        <p className="queue-panel__empty-hint">Add songs using the menu</p>
                    </div>
                )}
            </div>
        </div>
    );
}
