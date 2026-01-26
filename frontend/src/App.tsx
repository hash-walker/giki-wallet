import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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

function App() {
    const { loadMe } = useAuthStore();

    useEffect(() => {
        void loadMe();
    }, [loadMe]);

    return (
        <>
            <Routes>
                {/* Auth Routes */}
                <Route path="/auth/sign-in" element={<AuthLayout><SignInPage /></AuthLayout>} />
                <Route path="/auth/sign-up" element={<AuthLayout><SignUpPage /></AuthLayout>} />
                <Route path="/auth/verify" element={<AuthLayout><VerifyEmailPage /></AuthLayout>} />
                {/* Backward-compatible verification link (production-style) */}
                <Route path="/verify" element={<AuthLayout><VerifyEmailPage /></AuthLayout>} />

                {/* Client Routes */}
                <Route path="/" element={<ClientLayout><HomePage /></ClientLayout>} />
                <Route path="/transport" element={<ClientLayout><TransportPage /></ClientLayout>} />
                <Route path="/top-up" element={<ClientLayout><TopUpPage /></ClientLayout>} />

                <Route path="/tickets" element={<ClientLayout><TicketsPage /></ClientLayout>} />
                <Route path="/account" element={<ClientLayout><AccountPage /></ClientLayout>} />

                {/* Admin Routes */}
                <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
                {/* Operations Group: Routes, Time Slots, Tickets */}
                <Route path="/admin/routes" element={<AdminLayout><RoutesPage /></AdminLayout>} />
                <Route path="/admin/time-slots" element={<AdminLayout><TimeSlotsPage /></AdminLayout>} />
                <Route path="/admin/tickets" element={<AdminLayout><AdminTicketsPage /></AdminLayout>} />
                {/* Management Group: Users, Transactions */}
                <Route path="/admin/users" element={<AdminLayout><UsersPage /></AdminLayout>} />
                <Route path="/admin/transactions" element={<AdminLayout><TransactionsPage /></AdminLayout>} />
                {/* History */}
                <Route path="/admin/history" element={<AdminLayout><HistoryPage /></AdminLayout>} />
                {/* Settings */}
                <Route path="/admin/settings" element={<AdminLayout><SettingsPage /></AdminLayout>} />

                {/* Redirect unknown routes to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            <Toaster />
        </>
    );
}

export default App;