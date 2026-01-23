// Auth Page - Sign In / Sign Up

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Flame, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import './AuthPage.css';

type AuthMode = 'signin' | 'signup' | 'reset';

export function AuthPage() {
    const [mode, setMode] = useState<AuthMode>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const { signIn, signUp, resetPassword } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        let result;

        try {
            if (mode === 'signin') {
                result = await signIn(email, password);
                if (result.success) {
                    navigate('/');
                }
            } else if (mode === 'signup') {
                result = await signUp(email, password);
                if (result.success) {
                    setMessage('Account created successfully! Redirecting...');
                    // Short delay to let user see the message and allow AuthContext to update
                    setTimeout(() => {
                        navigate('/');
                    }, 1500);
                }
            } else {
                result = await resetPassword(email);
                if (result.success) {
                    setMessage('Password reset email sent. Check your inbox.');
                }
            }

            if (result && !result.success && result.error) {
                setError(result.error);
                setLoading(false); // Stop loading only on error or stay loading if redirecting
            } else if (mode === 'reset') {
                setLoading(false);
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                {/* Logo */}
                <div className="auth-logo">
                    <Flame size={40} strokeWidth={2.5} />
                    <span>HiFyre</span>
                </div>

                {/* Header */}
                <div className="auth-header">
                    <h1>
                        {mode === 'signin' && 'Welcome back'}
                        {mode === 'signup' && 'Create an account'}
                        {mode === 'reset' && 'Reset password'}
                    </h1>
                    <p>
                        {mode === 'signin' && 'Sign in to continue to HiFyre'}
                        {mode === 'signup' && 'Start your high-fidelity journey'}
                        {mode === 'reset' && 'We\'ll send you a reset link'}
                    </p>
                </div>

                {/* Form */}
                <form className="auth-form" onSubmit={handleSubmit}>
                    {error && <div className="auth-error">{error}</div>}
                    {message && <div className="auth-message">{message}</div>}

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <div className="input-wrapper">
                            <Mail size={18} className="input-icon" />
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    {mode !== 'reset' && (
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div className="input-wrapper">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                                />
                            </div>
                        </div>
                    )}

                    <button type="submit" className="auth-submit" disabled={loading}>
                        {loading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <>
                                {mode === 'signin' && 'Sign In'}
                                {mode === 'signup' && 'Create Account'}
                                {mode === 'reset' && 'Send Reset Email'}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                {/* Footer Links */}
                <div className="auth-footer">
                    {mode === 'signin' && (
                        <>
                            <button
                                className="auth-link"
                                onClick={() => setMode('reset')}
                            >
                                Forgot password?
                            </button>
                            <span className="auth-divider">•</span>
                            <button
                                className="auth-link"
                                onClick={() => setMode('signup')}
                            >
                                Create account
                            </button>
                        </>
                    )}
                    {mode === 'signup' && (
                        <button
                            className="auth-link"
                            onClick={() => setMode('signin')}
                        >
                            Already have an account? Sign in
                        </button>
                    )}
                    {mode === 'reset' && (
                        <button
                            className="auth-link"
                            onClick={() => setMode('signin')}
                        >
                            Back to sign in
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
