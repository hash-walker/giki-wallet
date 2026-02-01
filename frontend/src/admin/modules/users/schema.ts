import { z } from 'zod';

export const userRoleSchema = z.enum(['student', 'employee', 'admin']);

export const userSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone_number: z.string().optional().nullable(),
    is_active: z.boolean(),
    is_verified: z.boolean(),
    user_type: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
});

export const updateUserStatusSchema = z.object({
    is_active: z.boolean(),
});

export type User = z.infer<typeof userSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type UpdateUserStatus = z.infer<typeof updateUserStatusSchema>;

export interface UsersPaginationResponse {
    data: User[];
    total_count: number;
    page: number;
    page_size: number;
}

