import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { signUp, signIn, type SignUpPayload, type SignInPayload, type AuthResponse } from '@/shared/modules/auth/api';

export type AuthUserType = 'student' | 'employee';

export type AuthUser = {
    id: string;
    name: string;
    email: string;
    phone_number?: string | null;
    user_type: AuthUserType;
    created_at?: string;
    updated_at?: string;
};

type AuthState = {
    token: string | null;
    user: AuthUser | null;
    isLoading: boolean;
    error: string | null;

    setToken: (token: string | null) => void;
    signOut: () => void;

    registerUser: (input: SignUpPayload) => Promise<AuthUser>;
    login: (input: SignInPayload) => Promise<void>;
};

function getApiErrorMessage(err: unknown): string {
    if (typeof err !== 'object' || err === null) return 'Something went wrong';
    const maybeAxios = err as {
        response?: { data?: { error?: unknown; message?: unknown } };
        message?: unknown;
    };
    const msg =
        maybeAxios.response?.data?.error ||
        maybeAxios.response?.data?.message ||
        maybeAxios.message;
    return typeof msg === 'string' && msg.trim() ? msg : 'Something went wrong';
}

function mapAuthResponseToUser(data: AuthResponse): AuthUser {
    return {
        id: data.id,
        name: data.name,
        email: data.email,
        user_type: data.user_type,
    };
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: localStorage.getItem('auth_token'),
            user: null,
            isLoading: false,
            error: null,

            setToken: (token) => {
                if (token) localStorage.setItem('auth_token', token);
                else localStorage.removeItem('auth_token');
                set({ token });
            },

            signOut: () => {
                localStorage.removeItem('auth_token');
                set({ token: null, user: null, error: null, isLoading: false });
            },

            registerUser: async (input) => {
                set({ isLoading: true, error: null });
                try {
                    const data = await signUp(input);
                    const user = mapAuthResponseToUser(data);

                    set({ user, isLoading: false });
                    return user;
                } catch (e) {
                    const message = getApiErrorMessage(e);
                    set({ error: message, isLoading: false });
                    throw new Error(message);
                }
            },

            login: async (input) => {
                set({ isLoading: true, error: null });
                try {
                    const data = await signIn(input);

                    // Backend response structure: { ..., auth: { access_token: "..." }, ... }
                    // Also handles legacy/fallback structure if needed
                    const token = data.auth?.access_token || data.token;

                    if (!token) throw new Error("No token received");

                    localStorage.setItem('auth_token', token);

                    const user = mapAuthResponseToUser(data);
                    set({ token: token, user: user, isLoading: false, error: null });
                } catch (e) {
                    const message = getApiErrorMessage(e);
                    set({ error: message, isLoading: false });
                    throw new Error(message);
                }
            },
        }),
        {
            name: 'giki-wallet-auth',
            partialize: (state) => ({ token: state.token, user: state.user }),
        }
    )
);
