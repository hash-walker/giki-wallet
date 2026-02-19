import { z } from 'zod';
import { extractStudentRegIdFromEmail, normalizePhone } from './utils';

const phoneSchema = z
    .string()
    .min(1, 'Phone number is required')
    .refine((val) => {
        const digits = normalizePhone(val);
        return digits.length === 10 || digits.length === 11;
    }, 'Phone number must be 10-11 digits');

export const signInSchema = z.object({
    email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
});

export type SignInFormData = z.infer<typeof signInSchema>;

export const signUpSchema = z
    .object({
        userType: z.enum(['STUDENT', 'EMPLOYEE']),
        name: z.string().optional(),
        email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
        phoneNumber: phoneSchema,
        password: z.string().min(1, 'Password is required'),
        confirmPassword: z.string().optional(),
    })
    .superRefine((data, ctx) => {
        // Name is required for both students and employees
        if (!data.name || !data.name.trim()) {
            ctx.addIssue({ code: 'custom', path: ['name'], message: 'Full name is required' });
        }

        // Confirm password is required for both students and employees
        if (!data.confirmPassword || !data.confirmPassword.trim()) {
            ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Confirm password is required' });
        } else if (data.password !== data.confirmPassword) {
            ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match' });
        }

        if (data.userType === 'STUDENT') {
            if (extractStudentRegIdFromEmail(data.email) === null) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['email'],
                    message: 'Student email must look like u2021000@giki.edu.pk or gcs2400@giki.edu.pk',
                });
            }
        }

        if (data.userType === 'EMPLOYEE') {
            if (extractStudentRegIdFromEmail(data.email) !== null) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['userType'],
                    message: 'Please signup as a student (Graduate students use student signup)',
                });
            }
        }
    });

export type SignUpFormData = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({
    email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
    .object({
        password: z.string().min(8, 'Password must be at least 8 characters'),
        confirmPassword: z.string().min(1, 'Please confirm your password'),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword'],
    });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;


