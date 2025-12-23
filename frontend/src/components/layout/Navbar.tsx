import { useState } from 'react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/gik-logo.svg';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';

export const Navbar = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
                        <a href="#" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                            My Bookings
                        </a>
                        <Button
                            size="sm"
                            className="font-medium bg-white text-primary hover:bg-white/90"
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
                        "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
                        isMobileMenuOpen ? "opacity-100" : "opacity-0"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                />

                {/* Drawer */}
                <nav className={cn(
                    "absolute right-0 top-0 h-full w-64 bg-white p-6 shadow-xl transition-transform duration-300 ease-in-out",
                    isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
                )}>
                    {/* Close Button */}
                    <div className="flex justify-between items-center mb-8">
                        <span className="font-semibold text-primary text-lg">Menu</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-500 hover:bg-gray-100"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="flex flex-col gap-2">
                        <a 
                            href="#" 
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                        >
                            My Bookings
                        </a>
                        <a 
                            href="#" 
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                        >
                            Sign In
                        </a>
                        <div className="border-t border-gray-100 my-2" />
                        <a 
                            href="#" 
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="px-4 py-3 text-red-500 hover:bg-red-50 rounded-lg font-medium transition-colors"
                        >
                            Logout
                        </a>
                    </div>
                </nav>
            </div>
        </>
    );
};
