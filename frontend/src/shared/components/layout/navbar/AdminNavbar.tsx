import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BaseNavbar } from './BaseNavbar';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon, LogOut, X } from 'lucide-react';

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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleNavClick = () => {
        setIsMobileMenuOpen(false);
    };

    const handleLogout = () => {
        onLogout?.();
        setIsMobileMenuOpen(false);
    };

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
                            "flex items-center gap-1.5 xl:gap-2 px-2 xl:px-4 py-2 rounded-lg transition-colors whitespace-nowrap",
                            isActive
                                ? 'bg-white/20 text-white'
                                : 'text-white/80 hover:text-white hover:bg-white/10'
                        )}
                    >
                        {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                        <span className="text-xs xl:text-sm font-medium">{item.label}</span>
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
            <LogOut className="w-4 h-4 xl:mr-2" />
            <span className="hidden xl:inline">Logout</span>
        </Button>
    ) : undefined;

    const mobileMenu = (
        <div className={cn(
            "lg:hidden fixed inset-0 z-50 transition-all duration-300",
            isMobileMenuOpen ? "visible" : "invisible delay-300"
        )}>
            {/* Backdrop */}
            <div
                className={cn(
                    "absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
                    isMobileMenuOpen ? "opacity-100" : "opacity-0"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <nav className={cn(
                "absolute right-0 top-0 h-full w-80 bg-white shadow-xl transition-transform duration-300 ease-in-out flex flex-col",
                isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
            )}>
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <span className="font-bold text-primary text-lg">Admin Menu</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Nav Links */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;
                            
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={handleNavClick}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors",
                                        isActive
                                            ? "bg-primary text-white"
                                            : "text-gray-700 hover:bg-gray-50"
                                    )}
                                >
                                    {Icon && <Icon className="w-5 h-5" />}
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Footer with Logout */}
                {onLogout && (
                    <div className="p-4 border-t border-gray-200">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleLogout}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                )}
            </nav>
        </div>
    );

    return (
        <BaseNavbar
            logoLink="/admin"
            logoText="Admin Panel"
            navContent={navContent}
            rightActions={rightActions}
            mobileMenu={mobileMenu}
            onMobileMenuToggle={() => setIsMobileMenuOpen(true)}
            maxWidth="wide"
        />
    );
};

