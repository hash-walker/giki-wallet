import { ReactNode } from 'react';
import { AdminNavbar } from '@/shared/components/layout';
import { LayoutDashboard, Bus, Users, Settings, Clock, Receipt, Ticket, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/authStore';
import { toast } from '@/lib/toast';

interface AdminLayoutProps {
    children: ReactNode;
}

// Organized navigation: Operations (Routes, Time Slots, Tickets) grouped together,
// then Management (Users, Transactions), then History, then Settings
const adminNavItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    // Operations Group
    { path: '/admin/trips', label: 'Trips', icon: Bus }, // Replaces "Routes" conceptually for day-to-day
    { path: '/admin/routes', label: 'Roadmap', icon: Bus }, // Renaming Routes to Roadmap or keeping as "Routes Management"
    { path: '/admin/time-slots', label: 'Time Slots', icon: Clock },
    { path: '/admin/tickets', label: 'Tickets', icon: Ticket },
    // Management Group
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/transactions', label: 'Transactions', icon: Receipt },
    { path: '/admin/gateway-transactions', label: 'Gateway Txns', icon: Receipt },
    // History
    { path: '/admin/history', label: 'History', icon: History },
    // Settings
    { path: '/admin/settings', label: 'Settings', icon: Settings },
];

export const AdminLayout = ({ children }: AdminLayoutProps) => {
    const navigate = useNavigate();
    const { user, signOut } = useAuthStore();

    const handleLogout = () => {
        signOut();
        toast.success('Signed out');
        navigate('/auth/sign-in?redirect=/admin', { replace: true });
    };

    // Filter nav items based on user role
    const filteredNavItems = adminNavItems.filter(item => {
        if (!user) return true;

        if (user.user_type === 'TRANSPORT_ADMIN') {
            const allowedPaths = [
                '/admin',
                '/admin/trips',
                '/admin/users',
                '/admin/transactions',
            ];
            return allowedPaths.includes(item.path);
        }

        return true;
    });

    return (
        <div className="min-h-screen bg-gray-50">
            <AdminNavbar
                navItems={filteredNavItems}
                onLogout={handleLogout}
            />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 md:py-8">
                {children}
            </main>
        </div>
    );
};
