import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/axios';

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

type RegisterInput = {
    name: string;
    email: string;
    phone_number: string;
    password: string;
    user_type: 'student' | 'employee';
    reg_id: string; // Required for students, empty string for employees
};

type AuthState = {
    token: string | null;
    user: AuthUser | null;
    isLoading: boolean;
    error: string | null;

    setToken: (token: string | null) => void;
    signOut: () => void;

    registerUser: (input: RegisterInput) => Promise<AuthUser>;
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
                    const res = await apiClient.post<AuthUser>('/auth/register', {
                        name: input.name,
                        email: input.email,
                        user_type: input.user_type,
                        reg_id: input.reg_id,
                        password: input.password,
                        phone_number: input.phone_number,
                    });
                    set({ user: res.data, isLoading: false });
                    return res.data;
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


