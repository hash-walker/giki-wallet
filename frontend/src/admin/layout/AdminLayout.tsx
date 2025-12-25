import { ReactNode } from 'react';
import { AdminNavbar } from '@/shared/components/layout';
import { LayoutDashboard, Bus, Users, Settings, Clock, Receipt } from 'lucide-react';

interface AdminLayoutProps {
    children: ReactNode;
}

const adminNavItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/routes', label: 'Routes', icon: Bus },
    { path: '/admin/time-slots', label: 'Time Slots', icon: Clock },
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/transactions', label: 'Transactions', icon: Receipt },
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
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
                {children}
            </main>
        </div>
    );
};
