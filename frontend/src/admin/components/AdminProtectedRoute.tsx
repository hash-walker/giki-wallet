import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/authStore';
import { toast } from '@/lib/toast';
import { useEffect, useRef } from 'react';

export const AdminProtectedRoute = () => {
    const { user, initialized } = useAuthStore();
    const location = useLocation();
    const toastShownRef = useRef(false);

    // Reset toast shown flag when location changes
    useEffect(() => {
        toastShownRef.current = false;
    }, [location.pathname]);

    if (!initialized) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    // 1. Not logged in -> Redirect to Admin Sign In
    if (!user) {
        return <Navigate to="/admin/signin" state={{ from: location }} replace />;
    }

    const isAdmin = ['SUPER_ADMIN', 'TRANSPORT_ADMIN', 'FINANCE_ADMIN'].includes(user.user_type);

    // 2. Logged in but not Admin -> Show Toast & Redirect to Admin Sign In
    if (!isAdmin) {
        // Use a ref to prevent double-toasting in strict mode
        if (!toastShownRef.current) {
            toast.error("Access Denied: You are not authorized as Admin. Please sign in with an Admin account.");
            toastShownRef.current = true;
        }

        // Redirect to sign in, letting them sign in as a different user
        return <Navigate to="/admin/signin" state={{ from: location }} replace />;
    }

    // 3. Authorized Admin -> Render Content
    return <Outlet />;
};
