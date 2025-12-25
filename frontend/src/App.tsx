import { Routes, Route, Navigate } from 'react-router-dom';
import { ClientLayout } from '@/client/layout/ClientLayout';
import { AdminLayout, AdminDashboard, RoutesPage, TimeSlotsPage, UsersPage, SettingsPage } from '@/admin';
import { HomePage } from '@/client/pages/HomePage';

function App() {
    return (
        <Routes>
            {/* Client Routes */}
            <Route path="/" element={<ClientLayout><HomePage /></ClientLayout>} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
            <Route path="/admin/routes" element={<AdminLayout><RoutesPage /></AdminLayout>} />
            <Route path="/admin/time-slots" element={<AdminLayout><TimeSlotsPage /></AdminLayout>} />
            <Route path="/admin/users" element={<AdminLayout><UsersPage /></AdminLayout>} />
            <Route path="/admin/settings" element={<AdminLayout><SettingsPage /></AdminLayout>} />

            {/* Redirect unknown routes to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;