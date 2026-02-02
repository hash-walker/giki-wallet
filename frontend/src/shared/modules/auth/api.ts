import { apiClient } from '@/lib/axios';

export type SignUpPayload = {
    name: string;
    email: string;
    phone_number: string;
    password: string;
    user_type: 'STUDENT' | 'EMPLOYEE';
    reg_id: string; // Required for students, empty string for employees
};

export type SignInPayload = {
    email: string;
    password: string;
};

// Backend Response Types
export type AuthResponse = {
    id: string;
    name: string;
    email: string;
    phone_number?: string;
    user_type: 'STUDENT' | 'EMPLOYEE' | 'SUPER_ADMIN' | 'TRANSPORT_ADMIN' | 'FINANCE_ADMIN';
    auth?: {
        access_token: string;
        refresh_token: string;
        expires_at: number;
    };
};

/**
 * Register a new user
 */
export async function signUp(payload: SignUpPayload) {
    const res = await apiClient.post<AuthResponse>('/auth/register', payload);
    return res.data;
}

/**
 * Sign in existing user
 */
export async function signIn(payload: SignInPayload) {
    const res = await apiClient.post<AuthResponse>('/auth/signin', payload);
    return res.data;
}

/**
 * Get current signed-in user (Bearer auth)
 */
export async function getMe() {
    const res = await apiClient.get<AuthResponse>('/auth/me');
    return res.data;
}

/**
 * Verify email token and sign in
 */
export async function verifyEmail(token: string) {
    const res = await apiClient.get<AuthResponse>('/auth/verify', { params: { token } });
    return res.data;
}

/**
 * Sign out current user (stateless; client clears token)
 */
export async function signOut() {
    await apiClient.post('/auth/signout');
}
