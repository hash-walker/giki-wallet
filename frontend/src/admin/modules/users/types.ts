export interface User {
    id: number;
    email: string;
    name: string;
    phone?: string;
    role: 'student' | 'employee' | 'admin';
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export type UserRole = 'student' | 'employee' | 'admin';

