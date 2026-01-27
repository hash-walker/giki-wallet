import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ClientLayout } from '@/client/layout/ClientLayout';
import { AdminLayout, AdminDashboard, RoutesPage, TimeSlotsPage, TicketsPage as AdminTicketsPage, UsersPage, SettingsPage, TransactionsPage, HistoryPage } from '@/admin';
import { HomePage } from '@/client/pages/HomePage';
import { TransportPage } from '@/client/modules/transport/pages/TransportPage';
import { TopUpPage } from '@/client/modules/wallet/pages/TopUpPage';

import { TicketsPage } from '@/client/modules/booking/pages/TicketsPage';
import { AccountPage } from '@/shared/modules/auth/pages/AccountPage';
import { Toaster } from '@/shared/components/ui/sonner';
import { AuthLayout, SignInPage, SignUpPage, VerifyEmailPage } from '@/shared/modules/auth';
import { useAuthStore } from '@/shared/stores/authStore';

const router = createBrowserRouter([
    {
        path: '/auth/sign-in',
        element: (
            <AuthLayout>
                <SignInPage />
            </AuthLayout>
        ),
    },
    {
        path: '/auth/sign-up',
        element: (
            <AuthLayout>
                <SignUpPage />
            </AuthLayout>
        ),
    },
    {
        path: '/auth/verify',
        element: (
            <AuthLayout>
                <VerifyEmailPage />
            </AuthLayout>
        ),
    },
    {
        path: '/verify',
        element: (
            <AuthLayout>
                <VerifyEmailPage />
            </AuthLayout>
        ),
    },
    {
        path: '/',
        element: (
            <ClientLayout>
                <HomePage />
            </ClientLayout>
        ),
    },
    {
        path: '/transport',
        element: (
            <ClientLayout>
                <TransportPage />
            </ClientLayout>
        ),
    },
    {
        path: '/top-up',
        element: (
            <ClientLayout>
                <TopUpPage />
            </ClientLayout>
        ),
    },
    {
        path: '/tickets',
        element: (
            <ClientLayout>
                <TicketsPage />
            </ClientLayout>
        ),
    },
    {
        path: '/account',
        element: (
            <ClientLayout>
                <AccountPage />
            </ClientLayout>
        ),
    },
    {
        path: '/admin',
        element: (
            <AdminLayout>
                <AdminDashboard />
            </AdminLayout>
        ),
    },
    {
        path: '/admin/routes',
        element: (
            <AdminLayout>
                <RoutesPage />
            </AdminLayout>
        ),
    },
    {
        path: '/admin/time-slots',
        element: (
            <AdminLayout>
                <TimeSlotsPage />
            </AdminLayout>
        ),
    },
    {
        path: '/admin/tickets',
        element: (
            <AdminLayout>
                <AdminTicketsPage />
            </AdminLayout>
        ),
    },
    {
        path: '/admin/users',
        element: (
            <AdminLayout>
                <UsersPage />
            </AdminLayout>
        ),
    },
    {
        path: '/admin/transactions',
        element: (
            <AdminLayout>
                <TransactionsPage />
            </AdminLayout>
        ),
    },
    {
        path: '/admin/history',
        element: (
            <AdminLayout>
                <HistoryPage />
            </AdminLayout>
        ),
    },
    {
        path: '/admin/settings',
        element: (
            <AdminLayout>
                <SettingsPage />
            </AdminLayout>
        ),
    },
    {
        path: '*',
        element: <Navigate to="/" replace />,
    },
]);

function App() {
    const { loadMe } = useAuthStore();

    useEffect(() => {
        void loadMe();
    }, [loadMe]);

    return (
        <>
            <RouterProvider router={router} />
            <Toaster />
        </>
    );
}

export default App;