import { useState, useRef } from 'react';
import { FileUp, X, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { parseCSV, type CSVProgress } from '../../lib/csv-parser';
import { type Track } from '../../lib/api';
// Using a simple event or prop to notify parent to close/refresh
// In real app, might want to use a global modal manager

interface ImportPlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete: (name: string, tracks: Track[]) => void;
}

export function ImportPlaylistModal({ isOpen, onClose, onImportComplete }: ImportPlaylistModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [progress, setProgress] = useState<CSVProgress | null>(null);
    const [result, setResult] = useState<{ tracks: Track[], missingTracks: string[] } | null>(null);
    const [playlistName, setPlaylistName] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setPlaylistName(selectedFile.name.replace('.csv', ''));
        }
    };

    const handleImport = async () => {
        if (!file) return;

        setIsParsing(true);
        setResult(null);

        try {
            const text = await file.text();
            const parseResult = await parseCSV(text, (p) => setProgress(p));
            setResult(parseResult);
        } catch (error) {
            console.error(error);
            alert('Failed to parse CSV');
        } finally {
            setIsParsing(false);
        }
    };

    const handleCreate = async () => {
        if (result && result.tracks.length > 0) {
            try {
                await onImportComplete(playlistName, result.tracks);
                // onSuccess handled by parent closing or simple effect
            } catch (error) {
                console.error("Failed to create playlist:", error);
                alert("Failed to create playlist. Please try again.");
            }
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
                width: '100%', maxWidth: '500px',
                border: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', gap: 'var(--space-4)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)' }}>Import Playlist</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                {!result ? (
                    <>
                        <div
                            style={{
                                border: '2px dashed var(--border)',
                                borderRadius: 'var(--radius-lg)',
                                padding: 'var(--space-8)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                gap: 'var(--space-2)',
                                cursor: 'pointer',
                                backgroundColor: 'var(--background)'
                            }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <FileUp size={48} color="var(--muted-foreground)" />
                            <p style={{ color: 'var(--foreground)', fontWeight: 'var(--font-medium)' }}>
                                {file ? file.name : 'Click to upload CSV'}
                            </p>
                            <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-sm)' }}>
                                Format: Title, Artist, Album
                            </p>
                            <input
                                type="file"
                                accept=".csv"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                        </div>

                        {file && (
                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                                    Playlist Name
                                </label>
                                <input
                                    type="text"
                                    value={playlistName}
                                    onChange={(e) => setPlaylistName(e.target.value)}
                                    className="input-field"
                                    style={{
                                        width: '100%',
                                        padding: 'var(--space-2) var(--space-3)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border)',
                                        background: 'var(--background)',
                                        color: 'var(--foreground)'
                                    }}
                                />
                            </div>
                        )}

                        {isParsing && progress && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                                    <span>Processing...</span>
                                    <span>{progress.current} / {progress.total}</span>
                                </div>
                                <div style={{ height: 4, background: 'var(--secondary)', borderRadius: 2, overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${(progress.current / progress.total) * 100}%`,
                                        background: 'var(--highlight)',
                                        transition: 'width 0.2s'
                                    }} />
                                </div>
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {progress.currentTrack}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                            <button className="btn-secondary" onClick={onClose} disabled={isParsing}>Cancel</button>
                            <button
                                className="btn-primary"
                                onClick={handleImport}
                                disabled={!file || isParsing}
                                style={{
                                    background: 'var(--highlight)', color: 'black',
                                    padding: 'var(--space-2) var(--space-4)',
                                    borderRadius: 'var(--radius-md)',
                                    border: 'none',
                                    fontWeight: 'var(--font-medium)',
                                    cursor: file && !isParsing ? 'pointer' : 'not-allowed',
                                    opacity: file && !isParsing ? 1 : 0.5
                                }}
                            >
                                {isParsing ? <Loader2 className="animate-spin" size={20} /> : 'Start Import'}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <div style={{
                                padding: 'var(--space-4)',
                                background: 'rgba(16, 185, 129, 0.1)',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex', alignItems: 'center', gap: 'var(--space-3)'
                            }}>
                                <Check size={24} color="#10b981" />
                                <div>
                                    <div style={{ fontWeight: 'var(--font-bold)' }}>{result.tracks.length} tracks found</div>
                                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)' }}>Ready to be added to playlist</div>
                                </div>
                            </div>

                            {result.missingTracks.length > 0 && (
                                <div style={{
                                    padding: 'var(--space-4)',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    maxHeight: '150px', overflowY: 'auto'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', color: '#ef4444' }}>
                                        <AlertTriangle size={16} />
                                        <span style={{ fontWeight: 'var(--font-medium)' }}>{result.missingTracks.length} tracks not found</span>
                                    </div>
                                    <ul style={{ fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)', paddingLeft: 'var(--space-4)' }}>
                                        {result.missingTracks.map((t, i) => (
                                            <li key={i}>{t}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                                <button className="btn-secondary" onClick={() => setResult(null)}>Back</button>
                                <button
                                    className="btn-primary"
                                    onClick={handleCreate}
                                    style={{
                                        background: 'var(--highlight)', color: 'black',
                                        padding: 'var(--space-2) var(--space-4)',
                                        borderRadius: 'var(--radius-md)',
                                        border: 'none',
                                        fontWeight: 'var(--font-medium)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Create Playlist
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
