// Auth Context - React context for real Firebase authentication

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
    signIn,
    signUp,
    signOut,
    resetPassword,
    subscribeToAuthState
} from '../services/firebase';
import type { User } from 'firebase/auth';
import { db } from '../lib/db';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: typeof signIn;
    signUp: typeof signUp;
    signOut: typeof signOut;
    resetPassword: typeof resetPassword;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);



    // Subscribe to Firebase auth state changes
    useEffect(() => {
        const unsubscribe = subscribeToAuthState((user) => {
            setUser(user);
            // Sync DB user context
            if (user) {
                db.setUserId(user.uid);
            } else {
                db.setUserId('anonymous');
            }
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    const value: AuthContextType = {
        user,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
