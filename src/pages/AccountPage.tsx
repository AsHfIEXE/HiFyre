// Account Page

import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';

export function AccountPage() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/auth');
    };

    if (!user) {
        return (
            <div className="account-page">
                <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-6)' }}>
                    Account
                </h1>
                <button
                    onClick={() => navigate('/auth')}
                    style={{
                        padding: 'var(--space-3) var(--space-6)',
                        background: 'var(--accent)',
                        color: 'var(--foreground)',
                        borderRadius: 'var(--radius-lg)',
                        fontWeight: 'var(--font-medium)'
                    }}
                >
                    Sign In
                </button>
            </div>
        );
    }

    return (
        <div className="account-page">
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-6)' }}>
                Account
            </h1>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
                padding: 'var(--space-6)',
                background: 'var(--card)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--border)',
                maxWidth: 500,
                marginBottom: 'var(--space-6)'
            }}>
                <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--accent-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent)'
                }}>
                    <User size={28} />
                </div>
                <div>
                    <p style={{ fontWeight: 'var(--font-medium)' }}>{user.email}</p>
                    <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>Free account</p>
                </div>
            </div>

            <button
                onClick={handleSignOut}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'transparent',
                    color: 'var(--error)',
                    border: '1px solid var(--error)',
                    borderRadius: 'var(--radius-lg)',
                    fontWeight: 'var(--font-medium)'
                }}
            >
                <LogOut size={18} />
                Sign Out
            </button>
        </div>
    );
}
