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
        userType: z.enum(['student', 'employee']),
        fullName: z.string().optional(),
        email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
        phoneNumber: phoneSchema,
        password: z.string().min(1, 'Password is required'),
        confirmPassword: z.string().optional(),
    })
    .superRefine((data, ctx) => {
        if (data.userType === 'student') {
            if (!data.fullName || !data.fullName.trim()) {
                ctx.addIssue({ code: 'custom', path: ['fullName'], message: 'Full name is required' });
            }
            if (extractStudentRegIdFromEmail(data.email) === null) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['email'],
                    message: 'Student email must look like u2022661@giki.edu.pk',
                });
            }
            if (!data.confirmPassword || !data.confirmPassword.trim()) {
                ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Confirm password is required' });
            } else if (data.password !== data.confirmPassword) {
                ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match' });
            }
        }
    });

export type SignUpFormData = z.infer<typeof signUpSchema>;


