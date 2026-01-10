import { normalizePhone } from './utils';

export type SignUpPayload = {
    name: string;
    email: string;
    phone_number: string;
    password: string;
    user_type: 'student' | 'employee';
    reg_id: string; // Required for students, empty string for employees
};

export type SignInPayload = {
    email: string;
    password: string;
};

/**
 * Temporary mock API.
 * Replace with `apiClient.post(...)` once backend auth endpoints are finalized.
 */
export async function signUp(payload: SignUpPayload) {
    console.log('signUp payload:', { ...payload, phone_number: normalizePhone(payload.phone_number) });
    await new Promise((r) => setTimeout(r, 800));
    return { ok: true };
}

export async function signIn(payload: SignInPayload) {
    console.log('signIn payload:', payload);
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true, token: 'mock_token' };
}


