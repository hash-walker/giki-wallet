import { useState } from 'react';
import { BaseNavbar } from './BaseNavbar';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface ClientNavbarProps {
    onMyBookingsClick?: () => void;
    onSignInClick?: () => void;
}

export const ClientNavbar = ({ 
    onMyBookingsClick, 
    onSignInClick 
}: ClientNavbarProps) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleMyBookingsClick = (e: React.MouseEvent) => {
        e.preventDefault();
        onMyBookingsClick?.();
        setIsMobileMenuOpen(false);
    };

    const handleSignInClick = (e: React.MouseEvent) => {
        e.preventDefault();
        onSignInClick?.();
        setIsMobileMenuOpen(false);
    };

    const navContent = (
        <>
            <a 
                href="#" 
                onClick={handleMyBookingsClick}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-white/80 hover:text-white hover:bg-white/10 text-sm font-medium cursor-pointer"
            >
                My Bookings
            </a>
            <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 font-medium"
                onClick={handleSignInClick}
            >
                Sign In
            </Button>
        </>
    );

    const mobileMenu = (
        <div className={cn(
            "md:hidden fixed inset-0 z-50 transition-all duration-300",
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
                "absolute right-0 top-0 h-full w-72 bg-white shadow-xl transition-transform duration-300 ease-in-out flex flex-col",
                isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
            )}>
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <span className="font-bold text-primary text-lg">Menu</span>
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
                <div className="flex-1 p-4">
                    <div className="space-y-1">
                        <a 
                            href="#" 
                            onClick={handleMyBookingsClick}
                            className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition-colors"
                        >
                            My Bookings
                        </a>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200">
                    <Button
                        className="w-full font-semibold"
                        onClick={handleSignInClick}
                    >
                        Sign In
                    </Button>
                </div>
            </nav>
        </div>
    );

    return (
        <BaseNavbar
            logoLink="/"
            navContent={navContent}
            mobileMenu={mobileMenu}
            onMobileMenuToggle={() => setIsMobileMenuOpen(true)}
        />
    );
};

