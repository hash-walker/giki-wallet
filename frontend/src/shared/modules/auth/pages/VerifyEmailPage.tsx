import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/shared/stores/authStore';
import { Button } from '@/shared/components/ui/button';

export const VerifyEmailPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { verifyAndLogin, isLoading } = useAuthStore();

    const token = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return (params.get('token') || '').trim();
    }, [location.search]);

    useEffect(() => {
        if (!token) return;
        void (async () => {
            try {
                await verifyAndLogin(token);
                toast.success('Email verified. You are signed in.');
                navigate('/', { replace: true });
            } catch (e) {
                const msg = e instanceof Error ? e.message : 'Verification failed.';
                toast.error(msg);
            }
        })();
    }, [navigate, token, verifyAndLogin]);

    return (
        <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
                <h1 className="text-2xl font-bold text-gray-900">Verify email</h1>
                <p className="text-sm text-gray-600 mt-2">
                    {token
                        ? isLoading
                            ? 'Verifying...'
                            : 'If you are not redirected automatically, click below.'
                        : 'Missing verification token.'}
                </p>

                <div className="mt-6">
                    <Button
                        className="w-full font-semibold"
                        disabled={!token || isLoading}
                        onClick={async () => {
                            if (!token) return;
                            await verifyAndLogin(token);
                            toast.success('Email verified. You are signed in.');
                            navigate('/', { replace: true });
                        }}
                    >
                        {isLoading ? 'Verifying...' : 'Continue'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

