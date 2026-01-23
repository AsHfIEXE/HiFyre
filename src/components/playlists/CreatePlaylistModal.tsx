import { useState, useRef, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

interface CreatePlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string) => Promise<void>;
}

export function CreatePlaylistModal({ isOpen, onClose, onCreate }: CreatePlaylistModalProps) {
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setName('');
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsLoading(true);
        try {
            await onCreate(name.trim());
            onClose();
        } catch (error) {
            console.error('Failed to create playlist:', error);
        } finally {
            setIsLoading(false);
        }
    };

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
                display: 'flex', flexDirection: 'column', gap: 'var(--space-4)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)' }}>New Playlist</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                            Playlist Name
                        </label>
                        <input
                            ref={inputRef}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Awesome Playlist"
                            className="input-field"
                            style={{
                                width: '100%',
                                padding: 'var(--space-2) var(--space-3)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                background: 'var(--background)',
                                color: 'var(--foreground)',
                                fontSize: 'var(--text-base)'
                            }}
                            autoFocus
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={isLoading}>Cancel</button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={!name.trim() || isLoading}
                            style={{
                                background: 'var(--highlight)', color: 'black',
                                padding: 'var(--space-2) var(--space-4)',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                fontWeight: 'var(--font-medium)',
                                cursor: name.trim() && !isLoading ? 'pointer' : 'not-allowed',
                                opacity: name.trim() && !isLoading ? 1 : 0.5,
                                minWidth: '80px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
