import { ReactNode } from 'react';
import { AdminNavbar } from '@/shared/components/layout';
import { LayoutDashboard, Bus, Users, Settings, Clock, Receipt, Ticket, History } from 'lucide-react';

interface AdminLayoutProps {
    children: ReactNode;
}

// Organized navigation: Operations (Routes, Time Slots, Tickets) grouped together,
// then Management (Users, Transactions), then History, then Settings
const adminNavItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    // Operations Group
    { path: '/admin/routes', label: 'Routes', icon: Bus },
    { path: '/admin/time-slots', label: 'Time Slots', icon: Clock },
    { path: '/admin/tickets', label: 'Tickets', icon: Ticket },
    // Management Group
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/transactions', label: 'Transactions', icon: Receipt },
    // History
    { path: '/admin/history', label: 'History', icon: History },
    // Settings
    { path: '/admin/settings', label: 'Settings', icon: Settings },
];

export const AdminLayout = ({ children }: AdminLayoutProps) => {
    const handleLogout = () => {
        // TODO: Implement logout
        console.log('Logout clicked');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <AdminNavbar
                navItems={adminNavItems}
                onLogout={handleLogout}
            />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 md:py-8">
                {children}
            </main>
        </div>
    );
};
