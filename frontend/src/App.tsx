import { Routes, Route, Navigate } from 'react-router-dom';
import { ClientLayout } from '@/client/layout/ClientLayout';
import { AdminLayout, AdminDashboard, RoutesPage, TimeSlotsPage, TicketsPage, UsersPage, SettingsPage, TransactionsPage, HistoryPage } from '@/admin';
import { HomePage } from '@/client/pages/HomePage';
import { Toaster } from '@/shared/components/ui/sonner';
import { AuthLayout, SignInPage, SignUpPage } from '@/shared/modules/auth';

function App() {
    return (
        <>
            <Routes>
                {/* Auth Routes */}
                <Route path="/auth/sign-in" element={<AuthLayout><SignInPage /></AuthLayout>} />
                <Route path="/auth/sign-up" element={<AuthLayout><SignUpPage /></AuthLayout>} />

                {/* Client Routes */}
                <Route path="/" element={<ClientLayout><HomePage /></ClientLayout>} />

                {/* Admin Routes */}
                <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
                {/* Operations Group: Routes, Time Slots, Tickets */}
                <Route path="/admin/routes" element={<AdminLayout><RoutesPage /></AdminLayout>} />
                <Route path="/admin/time-slots" element={<AdminLayout><TimeSlotsPage /></AdminLayout>} />
                <Route path="/admin/tickets" element={<AdminLayout><TicketsPage /></AdminLayout>} />
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