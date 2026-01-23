
import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
    Home,
    Search,
    Library,
    Clock,
    Settings,
    User,
    Info,
    Download,
    Flame,
    Music,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { db, type UserPlaylist } from '../../lib/db';
import './Sidebar.css';

interface NavItem {
    path: string;
    label: string;
    icon: React.ReactNode;
}

const mainNav: NavItem[] = [
    { path: '/', label: 'Home', icon: <Home size={20} /> },
    { path: '/search', label: 'Search', icon: <Search size={20} /> },
    { path: '/library', label: 'Library', icon: <Library size={20} /> },
    { path: '/recent', label: 'Recent', icon: <Clock size={20} /> },
];

const secondaryNav: NavItem[] = [
    { path: '/downloads', label: 'Downloads', icon: <Download size={20} /> },
    { path: '/settings', label: 'Settings', icon: <Settings size={20} /> },
    { path: '/account', label: 'Account', icon: <User size={20} /> },
    { path: '/about', label: 'About', icon: <Info size={20} /> },
];

export function Sidebar() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);

    useEffect(() => {
        // Initial fetch
        db.getPlaylists().then(setPlaylists);

        // Simple polling for now
        const interval = setInterval(() => {
            db.getPlaylists().then(pl => {
                if (pl.length !== playlists.length || JSON.stringify(pl) !== JSON.stringify(playlists)) {
                    setPlaylists(pl);
                }
            });
        }, 2000);

        return () => clearInterval(interval);
    }, [playlists]);

    return (
        <aside className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''}`}>
            <div className="sidebar-content">
                {/* Logo */}
                <NavLink to="/" className="sidebar-logo">
                    <div className="logo-icon">
                        <Flame size={24} strokeWidth={2.5} />
                    </div>
                    {!isCollapsed && <span className="logo-text">HiFyre</span>}
                </NavLink>

                {/* Main Navigation */}
                <nav className="sidebar-nav">
                    <ul className="nav-list">
                        {mainNav.map((item) => (
                            <li key={item.path}>
                                <NavLink
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `nav-item ${isActive ? 'active' : ''}`
                                    }
                                    title={isCollapsed ? item.label : undefined}
                                >
                                    <span className="nav-icon">{item.icon}</span>
                                    {!isCollapsed && <span className="nav-label">{item.label}</span>}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Playlists */}
                {!isCollapsed && (
                    <div className="sidebar-section">
                        <h3 className="section-title" style={{
                            padding: '0 var(--space-4)',
                            marginBottom: 'var(--space-2)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            color: 'var(--muted)',
                            letterSpacing: '0.05em',
                            marginTop: 'var(--space-4)'
                        }}>
                            Playlists
                        </h3>
                        <nav className="sidebar-nav playlists">
                            <ul className="nav-list">
                                {playlists.map(playlist => (
                                    <li key={playlist.id}>
                                        <NavLink
                                            to={`/playlist/${playlist.id}`}
                                            className={({ isActive }) =>
                                                `nav-item ${isActive ? 'active' : ''}`
                                            }
                                        >
                                            <span className="nav-icon"><Music size={18} /></span>
                                            <span className="nav-label" style={{ fontSize: '0.9rem' }}>{playlist.name}</span>
                                        </NavLink>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </div>
                )}

                {/* Spacer */}
                <div className="sidebar-spacer" />

                {/* Secondary Navigation */}
                <nav className="sidebar-nav secondary">
                    <ul className="nav-list">
                        {secondaryNav.map((item) => (
                            <li key={item.path}>
                                <NavLink
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `nav-item ${isActive ? 'active' : ''}`
                                    }
                                    title={isCollapsed ? item.label : undefined}
                                >
                                    <span className="nav-icon">{item.icon}</span>
                                    {!isCollapsed && <span className="nav-label">{item.label}</span>}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Collapse Toggle */}
                <button
                    className="sidebar-toggle"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>
        </aside>
    );
}
