import { ClientNavbar } from './navbar/ClientNavbar';
import { AdminNavbar } from './navbar/AdminNavbar';
import { LucideIcon } from 'lucide-react';

interface NavbarProps {
    variant?: 'client' | 'admin';
    // Client props
    onMyBookingsClick?: () => void;
    onSignInClick?: () => void;
    // Admin props
    navItems?: Array<{ path: string; label: string; icon?: LucideIcon }>;
    onLogout?: () => void;
}

/**
 * Main Navbar component - defaults to ClientNavbar
 * Use ClientNavbar or AdminNavbar directly for more control
 */
export const Navbar = ({
    variant = 'client',
    onMyBookingsClick,
    onSignInClick,
    navItems,
    onLogout,
}: NavbarProps) => {
    if (variant === 'admin' && navItems) {
        return <AdminNavbar navItems={navItems} onLogout={onLogout} />;
    }

    return (
        <ClientNavbar
            onMyBookingsClick={onMyBookingsClick}
            onSignInClick={onSignInClick}
        />
    );
};

