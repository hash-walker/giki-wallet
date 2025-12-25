import { useState } from 'react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/gik-logo.svg';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
    onMyBookingsClick?: () => void;
    onSignInClick?: () => void;
}

export const Navbar = ({ onMyBookingsClick, onSignInClick }: NavbarProps) => {
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

    return (
        <>
            <header className="bg-primary text-white sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 md:px-6 flex justify-between items-center h-14 md:h-16">
                    {/* LOGO */}
                    <a href="#" className="flex items-center">
                        <img
                            src={logo}
                            alt="GIKI Logo"
                            className="h-10 md:h-12 w-auto object-contain"
                        />
                    </a>

                    {/* Mobile Menu Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden text-white hover:bg-white/10"
                        onClick={() => setIsMobileMenuOpen(true)}
                    >
                        <Menu className="h-5 w-5" />
                    </Button>

                    {/* DESKTOP NAV */}
                    <nav className="hidden md:flex items-center gap-6">
                        <a 
                            href="#" 
                            onClick={handleMyBookingsClick}
                            className="text-white/80 hover:text-white text-sm font-medium transition-colors cursor-pointer"
                        >
                            My Bookings
                        </a>
                        <Button
                            size="sm"
                            className="font-medium bg-white text-primary hover:bg-white/90"
                            onClick={handleSignInClick}
                        >
                            Sign In
                        </Button>
                    </nav>
                </div>
            </header>

            {/* MOBILE MENU */}
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
        </>
    );
};
