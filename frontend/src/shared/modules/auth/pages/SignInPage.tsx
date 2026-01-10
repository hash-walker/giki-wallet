import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/Input';
import { toast } from '@/lib/toast';
import { signIn } from '../api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema, type SignInFormData } from '../validators';

export const SignInPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const redirectTo = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return params.get('redirect') || '/';
    }, [location.search]);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignInFormData>({
        resolver: zodResolver(signInSchema),
        mode: 'onTouched',
        reValidateMode: 'onChange',
        defaultValues: { email: '', password: '' },
    });

    const onSubmit = async (data: SignInFormData) => {
        try {
            const res = await signIn({ email: data.email.trim(), password: data.password });
            if (res?.token) {
                localStorage.setItem('auth_token', res.token);
            }
            toast.success('Signed in');
            navigate(redirectTo, { replace: true });
        } catch {
            toast.error('Sign in failed. Please try again.');
        }
    };

    return (
        <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
                <div className="space-y-2 mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Sign In</h1>
                    <p className="text-sm text-gray-600">
                        New here?{' '}
                        <Link className="text-primary font-semibold hover:underline" to="/auth/sign-up">
                            Create an account
                        </Link>
                    </p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
                    <Input
                        label="Email"
                        type="email"
                        placeholder="you@giki.edu.pk"
                        autoComplete="email"
                        {...register('email')}
                        error={errors.email?.message}
                    />
                    <Input
                        label="Password"
                        type="password"
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        {...register('password')}
                        error={errors.password?.message}
                    />

                    <Button className="w-full font-semibold" disabled={isSubmitting} type="submit">
                        {isSubmitting ? 'Signing in...' : 'Sign In'}
                    </Button>
                </form>
            </div>
        </div>
    );
};


