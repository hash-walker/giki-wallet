import { useEffect, lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Toaster } from '@/shared/components/ui/sonner';
import { useAuthStore } from '@/shared/stores/authStore';

// Layout components (Keep static as they are small and always needed)
import { ClientLayout } from '@/client/layout/ClientLayout';
import { AdminLayout } from '@/admin';
import { AuthLayout, RequireAuth } from '@/shared/modules/auth';
import { AdminProtectedRoute } from '@/admin/components/AdminProtectedRoute';

// Admin Lazy loaded components
const AdminTicketsPage = lazy(() => import('@/admin').then(m => ({ default: m.TicketsPage })));
const UsersPage = lazy(() => import('@/admin').then(m => ({ default: m.UsersPage })));
const TransactionsPage = lazy(() => import('@/admin').then(m => ({ default: m.TransactionsPage })));
const GatewayTransactionsPage = lazy(() => import('@/admin').then(m => ({ default: m.GatewayTransactionsPage })));
const HistoryPage = lazy(() => import('@/admin').then(m => ({ default: m.HistoryPage })));
const CreateTripPage = lazy(() => import('@/admin').then(m => ({ default: m.CreateTripPage })));
const TripsPage = lazy(() => import('@/admin').then(m => ({ default: m.TripsPage })));
const WorkerStatusPage = lazy(() => import('@/admin').then(m => ({ default: m.WorkerStatusPage })));
const SystemLogsPage = lazy(() => import('@/admin').then(m => ({ default: m.SystemLogsPage })));
const SettingsPage = lazy(() => import('@/admin').then(m => ({ default: m.SettingsPage })));

// Client Lazy loaded components
const HomePage = lazy(() => import('@/client/pages/HomePage').then(m => ({ default: m.HomePage })));
const TransportPage = lazy(() => import('@/client/modules/transport/pages/TransportPage').then(m => ({ default: m.TransportPage })));
const TopUpPage = lazy(() => import('@/client/modules/wallet/pages/TopUpPage'));
const PaymentResultPage = lazy(() => import('@/client/modules/wallet/pages/PaymentResultPage'));
const TicketsPage = lazy(() => import('@/client/modules/transport/pages/TicketsPage').then(m => ({ default: m.TicketsPage })));
const BookingConfirmationPage = lazy(() => import('@/client/modules/transport/pages/BookingConfirmationPage'));
const PassengerDetailsPage = lazy(() => import('@/client/modules/transport/pages/PassengerDetailsPage'));

// Shared Lazy loaded components
const AccountPage = lazy(() => import('@/shared/modules/auth/pages/AccountPage').then(m => ({ default: m.AccountPage })));
const SignInPage = lazy(() => import('@/shared/modules/auth').then(m => ({ default: m.SignInPage })));
const SignUpPage = lazy(() => import('@/shared/modules/auth').then(m => ({ default: m.SignUpPage })));
const VerifyEmailPage = lazy(() => import('@/shared/modules/auth').then(m => ({ default: m.VerifyEmailPage })));
const ForgotPasswordPage = lazy(() => import('@/shared/modules/auth').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/shared/modules/auth').then(m => ({ default: m.ResetPasswordPage })));

const SuspenseLayout = ({ children }: { children: React.ReactNode }) => (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>}>
        {children}
    </Suspense>
);

const router = createBrowserRouter([
    {
        path: '/auth/sign-in',
        element: (
            <AuthLayout>
                <SuspenseLayout>
                    <SignInPage />
                </SuspenseLayout>
            </AuthLayout>
        ),
    },
    {
        path: '/auth/sign-up',
        element: (
            <AuthLayout>
                <SuspenseLayout>
                    <SignUpPage />
                </SuspenseLayout>
            </AuthLayout>
        ),
    },
    {
        path: '/auth/verify',
        element: (
            <AuthLayout>
                <SuspenseLayout>
                    <VerifyEmailPage />
                </SuspenseLayout>
            </AuthLayout>
        ),
    },
    {
        path: '/auth/forgot-password',
        element: (
            <AuthLayout>
                <SuspenseLayout>
                    <ForgotPasswordPage />
                </SuspenseLayout>
            </AuthLayout>
        ),
    },
    {
        path: '/auth/reset-password',
        element: (
            <AuthLayout>
                <SuspenseLayout>
                    <ResetPasswordPage />
                </SuspenseLayout>
            </AuthLayout>
        ),
    },
    {
        path: '/reset-password',
        element: (
            <AuthLayout>
                <SuspenseLayout>
                    <ResetPasswordPage />
                </SuspenseLayout>
            </AuthLayout>
        ),
    },
    {
        path: '/verify',
        element: (
            <AuthLayout>
                <SuspenseLayout>
                    <VerifyEmailPage />
                </SuspenseLayout>
            </AuthLayout>
        ),
    },
    {
        path: '/admin/signin',
        element: (
            <AuthLayout>
                <SuspenseLayout>
                    <SignInPage />
                </SuspenseLayout>
            </AuthLayout>
        ),
    },
    {
        path: '/',
        element: (
            <ClientLayout>
                <SuspenseLayout>
                    <HomePage />
                </SuspenseLayout>
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
                element: <SuspenseLayout><TransportPage /></SuspenseLayout>,
            },
            {
                path: 'confirm',
                element: <SuspenseLayout><BookingConfirmationPage /></SuspenseLayout>,
            },
            {
                path: 'passengers',
                element: <SuspenseLayout><PassengerDetailsPage /></SuspenseLayout>,
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
                element: <SuspenseLayout><TopUpPage /></SuspenseLayout>,
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
            { path: 'success', element: <SuspenseLayout><PaymentResultPage /></SuspenseLayout> },
            { path: 'failed', element: <SuspenseLayout><PaymentResultPage /></SuspenseLayout> },
            { path: 'error', element: <SuspenseLayout><PaymentResultPage /></SuspenseLayout> },
            { path: 'pending', element: <SuspenseLayout><PaymentResultPage /></SuspenseLayout> },
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
                element: <SuspenseLayout><TicketsPage /></SuspenseLayout>,
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
                element: <SuspenseLayout><AccountPage /></SuspenseLayout>,
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
                element: <SuspenseLayout><TripsPage /></SuspenseLayout>,
            },
            {
                path: '/admin/tickets',
                element: <SuspenseLayout><AdminTicketsPage /></SuspenseLayout>,
            },

            {
                path: '/admin/users',
                element: <SuspenseLayout><UsersPage /></SuspenseLayout>,
            },
            {
                path: '/admin/transactions',
                element: <SuspenseLayout><TransactionsPage /></SuspenseLayout>,
            },
            {
                path: '/admin/gateway-transactions',
                element: <SuspenseLayout><GatewayTransactionsPage /></SuspenseLayout>,
            },
            {
                path: '/admin/history',
                element: <SuspenseLayout><HistoryPage /></SuspenseLayout>,
            },
            {
                path: '/admin/trips/new',
                element: <SuspenseLayout><CreateTripPage /></SuspenseLayout>,
            },
            {
                path: '/admin/system',
                element: <SuspenseLayout><WorkerStatusPage /></SuspenseLayout>,
            },
            {
                path: '/admin/logs',
                element: <SuspenseLayout><SystemLogsPage /></SuspenseLayout>,
            },
            {
                path: '/admin/settings',
                element: <SuspenseLayout><SettingsPage /></SuspenseLayout>,
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