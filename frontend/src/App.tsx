import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ClientLayout } from '@/client/layout/ClientLayout';
import { AdminLayout, AdminDashboard, RoutesPage, TimeSlotsPage, TicketsPage as AdminTicketsPage, UsersPage, SettingsPage, TransactionsPage, HistoryPage } from '@/admin';
import { HomePage } from '@/client/pages/HomePage';
import { TransportPage } from '@/client/modules/transport/pages/TransportPage';
import TopUpPage from '@/client/modules/wallet/pages/TopUpPage';

import { TicketsPage } from '@/client/modules/transport/pages/TicketsPage';
import { AccountPage } from '@/shared/modules/auth/pages/AccountPage';
import { Toaster } from '@/shared/components/ui/sonner';
import { AuthLayout, SignInPage, SignUpPage, VerifyEmailPage, RequireAuth } from '@/shared/modules/auth';
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
                <RequireAuth />
            </ClientLayout>
        ),
        children: [
            {
                index: true,
                element: <TransportPage />,
            },
        ],
    },
    {
        path: '/top-up',
        element: (
            <ClientLayout>
                <RequireAuth />
            </ClientLayout>
        ),
        children: [
            {
                index: true,
                element: <TopUpPage />,
            },
        ],
    },
    {
        path: '/tickets',
        element: (
            <ClientLayout>
                <RequireAuth />
            </ClientLayout>
        ),
        children: [
            {
                index: true,
                element: <TicketsPage />,
            },
        ],
    },
    {
        path: '/account',
        element: (
            <ClientLayout>
                <RequireAuth />
            </ClientLayout>
        ),
        children: [
            {
                index: true,
                element: <AccountPage />,
            },
        ],
    },
    {
        element: (
            <AdminLayout>
                <RequireAuth />
            </AdminLayout>
        ),
        children: [
            {
                path: '/admin',
                index: true,
                element: <AdminDashboard />,
            },
            {
                path: '/admin/routes',
                element: <RoutesPage />,
            },
            {
                path: '/admin/time-slots',
                element: <TimeSlotsPage />,
            },
            {
                path: '/admin/tickets',
                element: <AdminTicketsPage />,
            },
            {
                path: '/admin/users',
                element: <UsersPage />,
            },
            {
                path: '/admin/transactions',
                element: <TransactionsPage />,
            },
            {
                path: '/admin/history',
                element: <HistoryPage />,
            },
            {
                path: '/admin/settings',
                element: <SettingsPage />,
            },
        ],
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