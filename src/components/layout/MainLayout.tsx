// Main Layout Component - Wraps app with sidebar and player

import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { PlayerBar } from './PlayerBar';
import { Loader2 } from 'lucide-react';
import './MainLayout.css';

export function MainLayout() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="layout-loading">
                <Loader2 size={40} className="animate-spin" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <Outlet />
            </main>
            <PlayerBar />
        </div>
    );
}
