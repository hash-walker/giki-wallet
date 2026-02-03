import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/Input';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/shared/stores/authStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema, type SignInFormData } from '../validators';

export const SignInPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isLoading } = useAuthStore();

    const redirectTo = useMemo(() => {
        // 1. Check for 'from' state passed by protection components
        const from = (location.state as any)?.from?.pathname;
        if (from) return from;

        // 2. Check for 'redirect' query parameter
        const params = new URLSearchParams(location.search);
        const queryRedirect = params.get('redirect');
        if (queryRedirect) return queryRedirect;

        // 3. Fallback: If we are on the admin sign-in page, default to admin dashboard
        if (location.pathname.startsWith('/admin')) {
            return '/admin';
        }

        return '/';
    }, [location.search, location.state, location.pathname]);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignInFormData>({
        resolver: zodResolver(signInSchema),
        mode: 'onTouched',
        reValidateMode: 'onChange',
        defaultValues: { email: '', password: '' },
    });

    const isSubmitting = isLoading;

    const onSubmit = async (data: SignInFormData) => {
        try {
            await login({ email: data.email.trim(), password: data.password });
            toast.success('Signed in');
            navigate(redirectTo, { replace: true });
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Sign in failed. Please try again.';
            toast.error(msg);
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
                    <div className="space-y-1">
                        <Input
                            label="Password"
                            type="password"
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            {...register('password')}
                            error={errors.password?.message}
                        />
                        <div className="text-right">
                            <Link
                                className="text-xs text-primary hover:underline font-medium"
                                to="/auth/forgot-password"
                            >
                                Forgot password?
                            </Link>
                        </div>
                    </div>

                    <Button className="w-full font-semibold" disabled={isSubmitting} type="submit">
                        {isSubmitting ? 'Signing in...' : 'Sign In'}
                    </Button>
                </form>
            </div>
        </div>
    );
};


