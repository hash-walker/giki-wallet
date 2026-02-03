import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ClientLayout } from '@/client/layout/ClientLayout';
import { AdminLayout, TicketsPage as AdminTicketsPage, UsersPage, TransactionsPage, GatewayTransactionsPage, HistoryPage, CreateTripPage, TripsPage, WorkerStatusPage } from '@/admin';
import { AdminProtectedRoute } from '@/admin/components/AdminProtectedRoute';
import { HomePage } from '@/client/pages/HomePage';
import { TransportPage } from '@/client/modules/transport/pages/TransportPage';
import TopUpPage from '@/client/modules/wallet/pages/TopUpPage';
import PaymentResultPage from '@/client/modules/wallet/pages/PaymentResultPage';

import { TicketsPage } from '@/client/modules/transport/pages/TicketsPage';
import BookingConfirmationPage from '@/client/modules/transport/pages/BookingConfirmationPage';
import PassengerDetailsPage from '@/client/modules/transport/pages/PassengerDetailsPage';
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
        path: '/admin/signin',
        element: (
            <AuthLayout>
                <SignInPage />
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
            {
                path: 'confirm',
                element: <BookingConfirmationPage />,
            },
            {
                path: 'passengers',
                element: <PassengerDetailsPage />,
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
        path: '/payment',
        element: (
            <ClientLayout>
                <RequireAuth />
            </ClientLayout>
        ),
        children: [
            { path: 'success', element: <PaymentResultPage /> },
            { path: 'failed', element: <PaymentResultPage /> },
            { path: 'error', element: <PaymentResultPage /> },
            { path: 'pending', element: <PaymentResultPage /> },
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
                <AdminProtectedRoute />
            </AdminLayout>
        ),
        children: [
            {
                path: '/admin',
                index: true,
                element: <Navigate to="/admin/tickets" replace />,
            },
            {
                path: '/admin/trips',
                element: <TripsPage />,
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
                path: '/admin/gateway-transactions',
                element: <GatewayTransactionsPage />,
            },
            {
                path: '/admin/history',
                element: <HistoryPage />,
            },
            {
                path: '/admin/trips/new',
                element: <CreateTripPage />,
            },
            {
                path: '/admin/system',
                element: <WorkerStatusPage />,
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