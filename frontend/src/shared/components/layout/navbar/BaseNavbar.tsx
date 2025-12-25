import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import logo from '@/assets/gik-logo.svg';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';

interface BaseNavbarProps {
    logoLink: string;
    logoText?: string;
    navContent?: ReactNode;
    rightActions?: ReactNode;
    mobileMenu?: ReactNode;
    onMobileMenuToggle?: () => void;
    maxWidth?: 'default' | 'wide';
}

export const BaseNavbar = ({
    logoLink,
    logoText,
    navContent,
    rightActions,
    mobileMenu,
    onMobileMenuToggle,
    maxWidth = 'default'
}: BaseNavbarProps) => {
    return (
        <>
            <header className="bg-primary text-white sticky top-0 z-50">
                <div className={cn(
                    "mx-auto px-4 lg:px-6 flex justify-between items-center h-14 lg:h-16 gap-2",
                    maxWidth === 'wide' ? 'max-w-7xl' : 'max-w-5xl'
                )}>
                    {/* LOGO */}
                    <Link to={logoLink} className="flex items-center gap-2 lg:gap-3 min-w-0 flex-shrink-0">
                        <img
                            src={logo}
                            alt="GIKI Logo"
                            className="h-8 lg:h-10 xl:h-12 w-auto object-contain flex-shrink-0"
                        />
                        {logoText && (
                            <span className="font-semibold text-sm lg:text-base xl:text-lg truncate hidden xl:inline">{logoText}</span>
                        )}
                    </Link>

                    {/* Mobile Menu Button */}
                    {mobileMenu && onMobileMenuToggle && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden text-white hover:bg-white/10"
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

