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
                    "mx-auto px-4 md:px-6 flex justify-between items-center h-14 md:h-16",
                    maxWidth === 'wide' ? 'max-w-7xl' : 'max-w-5xl'
                )}>
                    {/* LOGO */}
                    <Link to={logoLink} className="flex items-center gap-3">
                        <img
                            src={logo}
                            alt="GIKI Logo"
                            className="h-10 md:h-12 w-auto object-contain"
                        />
                        {logoText && (
                            <span className="font-semibold text-lg">{logoText}</span>
                        )}
                    </Link>

                    {/* Mobile Menu Button */}
                    {mobileMenu && onMobileMenuToggle && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden text-white hover:bg-white/10"
                            onClick={onMobileMenuToggle}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                    )}

                    {/* DESKTOP NAV */}
                    {navContent && (
                        <nav className="hidden md:flex items-center gap-1">
                            {navContent}
                        </nav>
                    )}

                    {/* Right Side Actions */}
                    {rightActions && (
                        <div className="hidden md:flex items-center">
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

