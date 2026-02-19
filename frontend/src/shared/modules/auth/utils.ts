export type AuthUserType = 'STUDENT' | 'EMPLOYEE';

export function extractStudentRegIdFromEmail(email: string): string | null {
    const normalized = email.trim().toLowerCase();
    // Match uXXXXXXX or gcsXXXX, gcvXXXX, geeXXXX, gemXXXX
    const match = normalized.match(/^(u\d+|gcs\d+|gcv\d+|gee\d+|gem\d+)@giki\.edu\.pk$/);
    return match?.[1] ?? null;
}

export function normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
}


