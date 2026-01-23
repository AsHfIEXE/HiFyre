// Firebase configuration for HiFyre
// IMPORTANT: Replace these values with your new Firebase project config

import { initializeApp } from 'firebase/app';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    sendPasswordResetEmail,
    onAuthStateChanged,
    type User
} from 'firebase/auth';
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc
} from 'firebase/firestore';

// TODO: Replace with your new Firebase project config
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ============================================
// AUTH FUNCTIONS - Email/Password Only
// ============================================

export interface AuthResult {
    success: boolean;
    user?: User;
    error?: string;
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string): Promise<AuthResult> {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // Create user document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            email: userCredential.user.email,
            createdAt: new Date().toISOString(),
            settings: {
                theme: 'midnight',
                quality: 'HI_RES_LOSSLESS'
            }
        });

        return { success: true, user: userCredential.user };
    } catch (error: any) {
        return {
            success: false,
            error: getAuthErrorMessage(error.code)
        };
    }
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error: any) {
        console.error("Sign in error:", error);
        return {
            success: false,
            error: getAuthErrorMessage(error.code)
        };
    }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
    await firebaseSignOut(auth);
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<AuthResult> {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true };
    } catch (error: any) {
        return {
            success: false,
            error: getAuthErrorMessage(error.code)
        };
    }
}

/**
 * Subscribe to auth state changes
 */
export function subscribeToAuthState(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
}

// ============================================
// USER DATA FUNCTIONS
// ============================================

/**
 * Get user data from Firestore
 */
export async function getUserData(userId: string) {
    try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
    } catch (e) {
        console.error("Error fetching user data:", e);
        return null;
    }
}

/**
 * Update user settings
 */
export async function updateUserSettings(userId: string, settings: Record<string, any>) {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, { settings });
}

/**
 * Sync all user data to Firestore
 */
export async function syncUserData(userId: string, data: {
    favorites: {
        tracks: any[];
        albums: any[];
        artists: any[];
        playlists: any[];
    };
    playlists: any[]; // User created playlists
    history: any[]; // User history
}) {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, { ...data, lastSynced: new Date().toISOString() });
}

/**
 * Get full user data
 */
export async function getFullUserData(userId: string) {
    const userData = await getUserData(userId);
    return userData || {
        favorites: {
            tracks: [],
            albums: [],
            artists: [],
            playlists: []
        },
        playlists: [],
        history: []
    };
}

// ============================================
// HELPERS
// ============================================

function getAuthErrorMessage(code: string): string {
    switch (code) {
        case 'auth/email-already-in-use':
            return 'This email is already registered. Try signing in instead.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/weak-password':
            return 'Password must be at least 6 characters.';
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/too-many-requests':
            return 'Too many attempts. Please try again later.';
        case 'auth/invalid-credential':
            return 'Invalid email or password.';
        case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
            return 'Invalid API Configuration. Please check your settings.';
        default:
            return `An error occurred (${code}). Please try again.`;
    }
}
