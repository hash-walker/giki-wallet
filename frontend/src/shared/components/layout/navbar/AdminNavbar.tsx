import { Link, useLocation } from 'react-router-dom';
import { BaseNavbar } from './BaseNavbar';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { LogOut } from 'lucide-react';

export interface NavItem {
    path: string;
    label: string;
    icon?: LucideIcon;
}

interface AdminNavbarProps {
    navItems: NavItem[];
    onLogout?: () => void;
}

export const AdminNavbar = ({ navItems, onLogout }: AdminNavbarProps) => {
    const location = useLocation();

    const navContent = (
        <>
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                            isActive
                                ? 'bg-white/20 text-white'
                                : 'text-white/80 hover:text-white hover:bg-white/10'
                        )}
                    >
                        {Icon && <Icon className="w-4 h-4" />}
                        <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                );
            })}
        </>
    );

    const rightActions = onLogout ? (
        <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-white hover:bg-white/10"
        >
            <LogOut className="w-4 h-4 mr-2" />
            <span className="hidden md:inline">Logout</span>
        </Button>
    ) : undefined;

    return (
        <BaseNavbar
            logoLink="/admin"
            logoText="Admin Panel"
            navContent={navContent}
            rightActions={rightActions}
            maxWidth="wide"
        />
    );
};

