import { ReactNode } from 'react';
import { AdminNavbar } from '@/shared/components/layout';
import { LayoutDashboard, Bus, Users, Settings, Clock, Receipt, Ticket, History, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/authStore';
import { toast } from '@/lib/toast';

interface AdminLayoutProps {
    children: ReactNode;
}

// Organized navigation: Operations (Routes, Time Slots, Tickets) grouped together,
// then Management (Users, Transactions), then History, then Settings
const adminNavItems = [
    // Operations Group
    { path: '/admin/trips', label: 'Trips', icon: Bus }, // Replaces "Routes" conceptually for day-to-day
    { path: '/admin/tickets', label: 'Tickets', icon: Ticket },
    // Management Group
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/transactions', label: 'Transactions', icon: Receipt },
    { path: '/admin/gateway-transactions', label: 'Gateway Txns', icon: Receipt },
    { path: '/admin/logs', label: 'System Logs', icon: Shield },
    { path: '/admin/system', label: 'System Status', icon: Settings },
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
                '/admin/trips',
                '/admin/users',
                '/admin/transactions',
                '/admin/gateway-transactions',
                '/admin/tickets',
                '/admin/system',
                '/admin/logs',
                '/admin/settings',
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
