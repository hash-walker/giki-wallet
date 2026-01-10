export type AuthUserType = 'student' | 'employee';

export function extractStudentRegIdFromEmail(email: string): string | null {
    const normalized = email.trim().toLowerCase();
    const match = normalized.match(/^u(\d+)@giki\.edu\.pk$/);
    return match?.[1] ?? null;
}

export function normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
}


