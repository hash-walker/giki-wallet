import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Logo } from '@/shared/components/ui/Logo';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';

interface BaseNavbarProps {
    logoLink: string;
    logoText?: string;
    customLogo?: ReactNode;
    navContent?: ReactNode;
    rightActions?: ReactNode;
    mobileMenu?: ReactNode;
    onMobileMenuToggle?: () => void;
    maxWidth?: 'default' | 'wide';
}

export const BaseNavbar = ({
    logoLink,
    logoText,
    customLogo,
    navContent,
    rightActions,
    mobileMenu,
    onMobileMenuToggle,
    maxWidth = 'default'
}: BaseNavbarProps) => {
    return (
        <>
            <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50">
                <div className={cn(
                    "mx-auto px-4 lg:px-6 flex justify-between items-center h-14 lg:h-16 gap-2",
                    maxWidth === 'wide' ? 'max-w-7xl' : 'max-w-5xl'
                )}>
                    {/* LOGO */}
                    <Link to={logoLink} className="flex items-center gap-2 lg:gap-3 min-w-0 flex-shrink-0 group focus:outline-none">
                        {customLogo ? (
                            customLogo
                        ) : (
                            <Logo subText={logoText} />
                        )}
                    </Link>

                    {/* Mobile Menu Button */}
                    {mobileMenu && onMobileMenuToggle && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden text-gray-600 hover:bg-gray-100"
                            onClick={onMobileMenuToggle}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                    )}

                    {/* DESKTOP NAV */}
                    {navContent && (
                        <nav className="hidden lg:flex items-center gap-1">
                            {navContent}
                        </nav>
                    )}

                    {/* Right Side Actions */}
                    {rightActions && (
                        <div className="hidden lg:flex items-center">
                            {rightActions}
                        </div>
                    )}
                </div>
            </header>

            {/* Mobile Menu */}
            {mobileMenu}
        </>
    );
};

