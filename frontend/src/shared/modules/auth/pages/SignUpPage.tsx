import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/Input';
import { toast } from '@/lib/toast';
import { extractStudentRegIdFromEmail } from '../utils';
import { useAuthStore } from '@/shared/stores/authStore';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema, type SignUpFormData } from '../validators';

export const SignUpPage = () => {
    const navigate = useNavigate();
    const { registerUser, isLoading } = useAuthStore();

    const isSubmitting = isLoading;

    const {
        register,
        handleSubmit,
        setValue,
        control,
        formState: { errors, isSubmitting: isFormSubmitting },
    } = useForm<SignUpFormData>({
        resolver: zodResolver(signUpSchema),
        mode: 'onTouched',
        reValidateMode: 'onChange',
        defaultValues: {
            userType: 'STUDENT',
            name: '',
            email: '',
            phoneNumber: '',
            password: '',
            confirmPassword: '',
        },
    });

    const userType = useWatch({ control, name: 'userType' });
    const email = useWatch({ control, name: 'email' });

    const studentRegId = useMemo(() => {
        if (userType !== 'STUDENT') return null;
        return extractStudentRegIdFromEmail(email);
    }, [email, userType]);

    const onSubmit = async (data: SignUpFormData) => {
        const regId = data.userType === 'STUDENT' ? extractStudentRegIdFromEmail(data.email) : '';

        if (data.userType === 'STUDENT' && !regId) {
            toast.error('Student email must look like u2022661@giki.edu.pk');
            return;
        }

        try {
            await registerUser({
                name: (data.name || '').trim(),
                email: data.email.trim(),
                phone_number: data.phoneNumber.trim(),
                password: data.password,
                user_type: data.userType,
                reg_id: regId || '',
            });
            if (data.userType === 'STUDENT') {
                toast.success('Account created. Please check your email to verify, then sign in.');
            } else {
                toast.success('Account created. Your account may require approval before you can sign in.');
            }
            navigate('/auth/sign-in', { replace: true });
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Sign up failed. Please try again.';
            toast.error(msg);
        }
    };

    return (
        <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
                <div className="space-y-2 mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
                    <p className="text-sm text-gray-600">
                        Already have an account?{' '}
                        <Link className="text-primary font-semibold hover:underline" to="/auth/sign-in">
                            Sign in
                        </Link>
                    </p>
                </div>

                {/* User type switch */}
                <div className="grid grid-cols-2 gap-2 mb-6">
                    <Button
                        type="button"
                        variant={userType === 'STUDENT' ? 'default' : 'outline'}
                        className="font-semibold"
                        onClick={() => setValue('userType', 'STUDENT', { shouldValidate: true })}
                    >
                        Student
                    </Button>
                    <Button
                        type="button"
                        variant={userType === 'EMPLOYEE' ? 'default' : 'outline'}
                        className="font-semibold"
                        onClick={() => setValue('userType', 'EMPLOYEE', { shouldValidate: true })}
                    >
                        Employee
                    </Button>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
                    <Input
                        label="Full name"
                        placeholder="Your full name e.g Hamza Faraz"
                        autoComplete="name"
                        {...register('name')}
                        error={errors.name?.message}
                    />

                    <Input
                        label="Email"
                        type="email"
                        placeholder={userType === 'STUDENT' ? 'u2022661@giki.edu.pk' : 'u2022661@giki.edu.pk'}
                        autoComplete="email"
                        {...register('email')}
                        error={errors.email?.message}
                    />

                    {userType === 'STUDENT' && (
                        <div className="text-xs text-gray-600 -mt-2">
                            Reg ID:{' '}
                            <span className="font-semibold text-gray-900">
                                {studentRegId ?? '—'}
                            </span>
                            <span className="text-gray-500"> (extracted from email)</span>
                        </div>
                    )}

                    <Input
                        label="Phone number"
                        type="tel"
                        placeholder="03XX-XXXXXXX"
                        autoComplete="tel"
                        {...register('phoneNumber')}
                        error={errors.phoneNumber?.message}
                    />

                    <Input
                        label="Password"
                        type="password"
                        placeholder="Create a password"
                        autoComplete="new-password"
                        {...register('password')}
                        error={errors.password?.message}
                    />

                    <Input
                        label="Confirm password"
                        type="password"
                        placeholder="Re-enter your password"
                        autoComplete="new-password"
                        {...register('confirmPassword')}
                        error={errors.confirmPassword?.message}
                    />

                    <Button className="w-full font-semibold" disabled={isSubmitting || isFormSubmitting} type="submit">
                        {isSubmitting || isFormSubmitting ? 'Creating account...' : 'Sign Up'}
                    </Button>
                </form>
            </div>
        </div>
    );
};


