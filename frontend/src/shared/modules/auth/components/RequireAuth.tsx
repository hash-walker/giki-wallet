import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/authStore';

export const RequireAuth = () => {
    const { user, initialized } = useAuthStore();
    const location = useLocation();

    if (!initialized) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!user) {
        // Redirect them to the /auth/sign-in page, but save the current location they were
        // trying to go to when they were redirected. This allows us to send them
        // along to that page after they login, which is a nicer user experience.
        return <Navigate to="/auth/sign-in" state={{ from: location }} replace />;
    }

    return <Outlet />;
};
