import { useState } from 'react';
import { useSettingsStore } from '../lib/settings';
import { db } from '../lib/db';
import { Settings, Music, Download, Type, Laptop, Database, Save, AlertTriangle } from 'lucide-react';
import { ImportPlaylistModal } from '../components/playlists/ImportPlaylistModal';

type SettingTab = 'general' | 'playback' | 'downloads' | 'lyrics' | 'advanced';

export function SettingsPage() {
    const [activeTab, setActiveTab] = useState<SettingTab>('general');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Settings Store
    const settings = useSettingsStore();
    const {
        theme, setTheme,
        audioQuality, setAudioQuality,
        replayGainMode, setReplayGainMode, replayGainPreamp, setReplayGainPreamp, gapless, setGapless,
        downloadQuality, setDownloadQuality, filenameTemplate, setFilenameTemplate, zipFolderTemplate, setZipFolderTemplate,
        forceIndividualDownloads, setForceIndividualDownloads,
        nowPlayingMode, setNowPlayingMode, cardCompactArtist, setCardCompactArtist, cardCompactAlbum, setCardCompactAlbum,
        backgroundEnabled, setBackgroundEnabled, smoothScrolling, setSmoothScrolling,
        downloadLyrics, setDownloadLyrics, romajiMode, setRomajiMode,
        sessionKey, username, setSession, setLoveOnLike, loveOnLike
    } = settings;

    // Advanced & Backup
    const handleExportLibrary = async () => {
        try {
            const data = await db.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `hifyre-library-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            alert('Failed to export library.');
        }
    };

    const handleImportLibrary = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                await db.importData(data);
                alert('Library imported successfully! Reloading...');
                window.location.reload();
            } catch (err) {
                alert('Invalid backup file.');
            }
        };
        reader.readAsText(file);
    };

    const handleLastFMConnect = () => {
        if (sessionKey) {
            if (confirm('Disconnect from Last.fm?')) {
                setSession(null, null);
            }
        } else {
            // Placeholder: This logic will be moved to lastfm.ts integration later
            window.open('https://www.last.fm/api/auth/?api_key=0ecf01914957b40c17030db822845a76&cb=http://localhost:5173/callback', '_blank');
            const token = prompt('Please enter the token from the URL if not automatically redirected (Auto-auth not fully implemented yet):');
            if (token) {
                // Mock session for now until lastfm.ts is fully linked
                setSession('mock-session-key', 'User');
            }
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="settings-section">
                        <h2 className="section-title">General Appearance</h2>

                        <div className="setting-item">
                            <label>Theme</label>
                            <select value={theme} onChange={(e) => setTheme(e.target.value as any)}>
                                <option value="system">System Default</option>
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                                <option value="custom">Custom (Coming Soon)</option>
                            </select>
                        </div>

                        <div className="setting-item">
                            <label>Now Playing View</label>
                            <select value={nowPlayingMode} onChange={(e) => setNowPlayingMode(e.target.value as any)}>
                                <option value="cover">Album Art</option>
                                <option value="lyrics">Lyrics</option>
                            </select>
                        </div>

                        <div className="setting-item-toggle">
                            <label>Album Background</label>
                            <input
                                type="checkbox"
                                checked={backgroundEnabled}
                                onChange={(e) => setBackgroundEnabled(e.target.checked)}
                            />
                        </div>

                        <div className="setting-item-toggle">
                            <label>Smooth Scrolling</label>
                            <input
                                type="checkbox"
                                checked={smoothScrolling}
                                onChange={(e) => setSmoothScrolling(e.target.checked)}
                            />
                        </div>

                        <h3 className="subsection-title">Compact Mode</h3>
                        <div className="setting-item-toggle">
                            <label>Compact Artist Cards</label>
                            <input
                                type="checkbox"
                                checked={cardCompactArtist}
                                onChange={(e) => setCardCompactArtist(e.target.checked)}
                            />
                        </div>
                        <div className="setting-item-toggle">
                            <label>Compact Album Cards</label>
                            <input
                                type="checkbox"
                                checked={cardCompactAlbum}
                                onChange={(e) => setCardCompactAlbum(e.target.checked)}
                            />
                        </div>
                    </div>
                );

            case 'playback':
                return (
                    <div className="settings-section">
                        <h2 className="section-title">Playback</h2>

                        <div className="setting-item">
                            <label>Audio Quality</label>
                            <select value={audioQuality} onChange={(e) => setAudioQuality(e.target.value as any)}>
                                <option value="LOW">Low (96kbps)</option>
                                <option value="HIGH">High (320kbps)</option>
                                <option value="LOSSLESS">Lossless (FLAC)</option>
                                <option value="HI_RES_LOSSLESS">Hi-Res Lossless</option>
                            </select>
                        </div>

                        <div className="setting-item-toggle">
                            <label>Gapless Playback (Best Effort)</label>
                            <input
                                type="checkbox"
                                checked={gapless}
                                onChange={(e) => setGapless(e.target.checked)}
                            />
                        </div>

                        <h3 className="subsection-title">ReplayGain</h3>
                        <div className="setting-item">
                            <label>Mode</label>
                            <select value={replayGainMode} onChange={(e) => setReplayGainMode(e.target.value as any)}>
                                <option value="off">Off</option>
                                <option value="track">Track (Recommended)</option>
                                <option value="album">Album</option>
                            </select>
                        </div>
                        <div className="setting-item">
                            <label>Pre-Amp (dB)</label>
                            <input
                                type="number"
                                value={replayGainPreamp}
                                onChange={(e) => setReplayGainPreamp(Number(e.target.value))}
                                step="0.5"
                                min="-20"
                                max="20"
                            />
                        </div>
                    </div>
                );

            case 'downloads':
                return (
                    <div className="settings-section">
                        <h2 className="section-title">Downloads</h2>

                        <div className="setting-item">
                            <label>Download Quality</label>
                            <select value={downloadQuality} onChange={(e) => setDownloadQuality(e.target.value as any)}>
                                <option value="LOW">Low</option>
                                <option value="HIGH">High</option>
                                <option value="LOSSLESS">Lossless</option>
                                <option value="HI_RES_LOSSLESS">Hi-Res Lossless</option>
                            </select>
                        </div>

                        <div className="setting-item-toggle">
                            <label>Force Individual Downloads (Disable Zip)</label>
                            <input
                                type="checkbox"
                                checked={forceIndividualDownloads}
                                onChange={(e) => setForceIndividualDownloads(e.target.checked)}
                            />
                        </div>

                        <h3 className="subsection-title">Templates</h3>
                        <div className="setting-item">
                            <label>Filename Template</label>
                            <input
                                type="text"
                                value={filenameTemplate}
                                onChange={(e) => setFilenameTemplate(e.target.value)}
                                placeholder="{trackNumber} - {artist} - {title}"
                            />
                            <small className="help-text">Available: {'{trackNumber}, {artist}, {title}, {album}'}</small>
                        </div>
                        <div className="setting-item">
                            <label>Zip Folder Template</label>
                            <input
                                type="text"
                                value={zipFolderTemplate}
                                onChange={(e) => setZipFolderTemplate(e.target.value)}
                                placeholder="{albumTitle} - {albumArtist}"
                            />
                            <small className="help-text">Available: {'{albumTitle}, {albumArtist}, {year}'}</small>
                        </div>
                    </div>
                );

            case 'lyrics':
                return (
                    <div className="settings-section">
                        <h2 className="section-title">Lyrics</h2>
                        <div className="setting-item-toggle">
                            <label>Download .lrc files</label>
                            <input
                                type="checkbox"
                                checked={downloadLyrics}
                                onChange={(e) => setDownloadLyrics(e.target.checked)}
                            />
                        </div>
                        <div className="setting-item-toggle">
                            <label>Romaji Mode (Japanese to Latin)</label>
                            <input
                                type="checkbox"
                                checked={romajiMode}
                                onChange={(e) => setRomajiMode(e.target.checked)}
                            />
                        </div>
                    </div>
                );

            case 'advanced':
                return (
                    <div className="settings-section">
                        <h2 className="section-title">Advanced</h2>

                        <div className="subsection">
                            <h3 className="subsection-title">Last.fm</h3>
                            <div className="setting-card">
                                <div className="setting-info">
                                    <span className="setting-name">Last.fm Integration</span>
                                    <span className="setting-desc">
                                        {sessionKey ? `Connected as ${username}` : 'Connect your account to scrobble music'}
                                    </span>
                                </div>
                                <button className={`btn ${sessionKey ? 'btn-danger' : 'btn-primary'}`} onClick={handleLastFMConnect}>
                                    {sessionKey ? 'Disconnect' : 'Connect Last.fm'}
                                </button>
                            </div>
                            {sessionKey && (
                                <div className="setting-item-toggle">
                                    <label>Love on Like</label>
                                    <input
                                        type="checkbox"
                                        checked={loveOnLike}
                                        onChange={(e) => setLoveOnLike(e.target.checked)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="subsection">
                            <h3 className="subsection-title">Library Backup</h3>
                            <div className="button-group">
                                <button className="btn btn-secondary" onClick={handleExportLibrary}>
                                    <Save size={16} /> Export Library (JSON)
                                </button>
                                <label className="btn btn-secondary cursor-pointer">
                                    <Database size={16} /> Import Library
                                    <input type="file" accept=".json" onChange={handleImportLibrary} style={{ display: 'none' }} />
                                </label>
                            </div>
                        </div>

                        <div className="subsection">
                            <h3 className="subsection-title">Playlist Import</h3>
                            <button className="btn btn-secondary" onClick={() => setIsImportModalOpen(true)}>
                                <Type size={16} /> Import from CSV
                            </button>
                        </div>

                        <div className="subsection danger-zone">
                            <h3 className="subsection-title text-red">Danger Zone</h3>
                            <button className="btn btn-danger" onClick={async () => {
                                if (confirm('Are you sure? This will delete all local library data.')) {
                                    await db.clear();
                                    window.location.reload();
                                }
                            }}>
                                <AlertTriangle size={16} /> Clear Local Database
                            </button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="settings-page">
            <h1 className="page-title">Settings</h1>

            <div className="settings-layout">
                <nav className="settings-sidebar">
                    <button className={activeTab === 'general' ? 'active' : ''} onClick={() => setActiveTab('general')}>
                        <Laptop size={18} /> General
                    </button>
                    <button className={activeTab === 'playback' ? 'active' : ''} onClick={() => setActiveTab('playback')}>
                        <Music size={18} /> Playback
                    </button>
                    <button className={activeTab === 'downloads' ? 'active' : ''} onClick={() => setActiveTab('downloads')}>
                        <Download size={18} /> Downloads
                    </button>
                    <button className={activeTab === 'lyrics' ? 'active' : ''} onClick={() => setActiveTab('lyrics')}>
                        <Type size={18} /> Lyrics
                    </button>
                    <button className={activeTab === 'advanced' ? 'active' : ''} onClick={() => setActiveTab('advanced')}>
                        <Settings size={18} /> Advanced
                    </button>
                </nav>

                <main className="settings-content">
                    {renderTabContent()}
                </main>
            </div>

            <ImportPlaylistModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImportComplete={async (name, tracks) => {
                    await db.createPlaylist(name, tracks);
                    setIsImportModalOpen(false);
                    alert('Playlist imported!');
                }}
            />

            <style>{`
                .settings-page {
                    padding: var(--space-6);
                    max-width: 1000px;
                    margin: 0 auto;
                }
                .settings-layout {
                    display: grid;
                    grid-template-columns: 200px 1fr;
                    gap: var(--space-8);
                    margin-top: var(--space-6);
                }
                .settings-sidebar {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-2);
                }
                .settings-sidebar button {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    padding: var(--space-3) var(--space-4);
                    background: transparent;
                    border: none;
                    color: var(--muted-foreground);
                    cursor: pointer;
                    text-align: left;
                    border-radius: var(--radius-md);
                    font-weight: var(--font-medium);
                    transition: all 0.2s;
                }
                .settings-sidebar button:hover {
                    background: var(--secondary);
                    color: var(--foreground);
                }
                .settings-sidebar button.active {
                    background: var(--primary);
                    color: var(--primary-foreground);
                }
                .settings-section {
                    background: var(--card);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: var(--space-6);
                }
                .section-title {
                    margin-bottom: var(--space-6);
                    font-size: var(--text-xl);
                    font-weight: var(--font-bold);
                    border-bottom: 1px solid var(--border);
                    padding-bottom: var(--space-4);
                }
                .subsection {
                    margin-top: var(--space-8);
                }
                .subsection-title {
                    font-size: var(--text-lg);
                    font-weight: var(--font-semibold);
                    margin-bottom: var(--space-4);
                    color: var(--foreground);
                }
                .setting-item {
                    margin-bottom: var(--space-4);
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-2);
                }
                .setting-item label {
                    font-weight: var(--font-medium);
                    font-size: var(--text-sm);
                }
                .setting-item select, .setting-item input[type="text"], .setting-item input[type="number"] {
                    padding: var(--space-2) var(--space-3);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border);
                    background: var(--background);
                    color: var(--foreground);
                }
                .setting-item-toggle {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--space-3) 0;
                    border-bottom: 1px solid var(--border);
                }
                .setting-item-toggle:last-child {
                    border-bottom: none;
                }
                .setting-card {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: var(--secondary);
                    padding: var(--space-4);
                    border-radius: var(--radius-md);
                    margin-bottom: var(--space-4);
                }
                .setting-info {
                    display: flex;
                    flex-direction: column;
                }
                .setting-name {
                    font-weight: var(--font-bold);
                }
                .setting-desc {
                    font-size: var(--text-xs);
                    color: var(--muted-foreground);
                }
                .button-group {
                    display: flex;
                    gap: var(--space-3);
                }
                .btn {
                    display: inline-flex;
                    align-items: center;
                    gap: var(--space-2);
                    padding: var(--space-2) var(--space-4);
                    border-radius: var(--radius-md);
                    font-weight: var(--font-medium);
                    cursor: pointer;
                    border: none;
                    font-size: var(--text-sm);
                }
                .btn-primary {
                    background: var(--primary);
                    color: var(--primary-foreground);
                }
                .btn-secondary {
                    background: var(--secondary);
                    color: var(--secondary-foreground);
                }
                .btn-danger {
                    background: #ef4444;
                    color: white;
                }
                .help-text {
                    font-size: var(--text-xs);
                    color: var(--muted-foreground);
                    margin-top: 4px;
                }
                .text-red { color: #ef4444; }
                .cursor-pointer { cursor: pointer; }
            `}</style>
        </div>
    );
}
