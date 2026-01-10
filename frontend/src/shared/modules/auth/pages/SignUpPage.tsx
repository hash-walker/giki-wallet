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
            userType: 'student',
            fullName: '',
            email: '',
            phoneNumber: '',
            password: '',
            confirmPassword: '',
        },
    });

    const userType = useWatch({ control, name: 'userType' });
    const email = useWatch({ control, name: 'email' });

    const studentRegId = useMemo(() => {
        if (userType !== 'student') return null;
        return extractStudentRegIdFromEmail(email);
    }, [email, userType]);

    const onSubmit = async (data: SignUpFormData) => {
        const regId = data.userType === 'student' ? extractStudentRegIdFromEmail(data.email) : '';
        
        if (data.userType === 'student' && !regId) {
            toast.error('Student email must look like u2022661@giki.edu.pk');
            return;
        }

        try {
            await registerUser({
                name: data.userType === 'student' ? (data.fullName || '').trim() : data.email.trim(),
                email: data.email.trim(),
                phone_number: data.phoneNumber.trim(),
                password: data.password,
                user_type: data.userType,
                reg_id: regId || '',
            });
            toast.success('Account created. Please sign in.');
            navigate('/auth/sign-in', { replace: true });
        } catch {
            toast.error('Sign up failed. Please try again.');
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
                        variant={userType === 'student' ? 'default' : 'outline'}
                        className="font-semibold"
                        onClick={() => setValue('userType', 'student', { shouldValidate: true })}
                    >
                        Student
                    </Button>
                    <Button
                        type="button"
                        variant={userType === 'employee' ? 'default' : 'outline'}
                        className="font-semibold"
                        onClick={() => setValue('userType', 'employee', { shouldValidate: true })}
                    >
                        Employee
                    </Button>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
                    {userType === 'student' && (
                        <Input
                            label="Full name"
                            placeholder="Your full name"
                            autoComplete="name"
                            {...register('fullName')}
                            error={errors.fullName?.message}
                        />
                    )}

                    <Input
                        label="Email"
                        type="email"
                        placeholder={userType === 'student' ? 'u2022661@giki.edu.pk' : 'you@company.com'}
                        autoComplete="email"
                        {...register('email')}
                        error={errors.email?.message}
                    />

                    {userType === 'student' && (
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

                    {userType === 'student' && (
                        <Input
                            label="Confirm password"
                            type="password"
                            placeholder="Re-enter your password"
                            autoComplete="new-password"
                            {...register('confirmPassword')}
                            error={errors.confirmPassword?.message}
                        />
                    )}

                    <Button className="w-full font-semibold" disabled={isSubmitting || isFormSubmitting} type="submit">
                        {isSubmitting || isFormSubmitting ? 'Creating account...' : 'Sign Up'}
                    </Button>
                </form>
            </div>
        </div>
    );
};


