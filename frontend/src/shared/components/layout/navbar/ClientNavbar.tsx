import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { Logo } from '@/shared/components/ui/Logo';
import { Button } from '@/shared/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

interface ClientNavbarProps {
    onMyBookingsClick?: () => void;
    onMyAccountClick?: () => void;
    onSignInClick?: () => void;
    onSignUpClick?: () => void;
    onLogoutClick?: () => void;
    isAuthenticated: boolean;
}

export const ClientNavbar = ({
    onMyBookingsClick,
    onMyAccountClick,
    onSignInClick,
    onSignUpClick,
    onLogoutClick,
    isAuthenticated,
}: ClientNavbarProps) => {
    const navigate = useNavigate();

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-gray-200/50 bg-white/80 backdrop-blur-xl transition-all shadow-sm">
            <div className="max-w-5xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2.5 group focus:outline-none"
                    aria-label="Go to home"
                >
                    <Logo />
                </button>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-1 mr-2">
                        <Button
                            variant="ghost"
                            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100/50 rounded-full h-9 px-4 text-sm font-medium"
                            onClick={() => navigate('/about')}
                        >
                            About
                        </Button>
                    </div>
                    {isAuthenticated ? (
                        <>
                            <div className="hidden md:flex items-center gap-2 mr-2">
                                <Button
                                    variant="ghost"
                                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100/50 rounded-full h-9 px-4 text-sm font-medium"
                                    onClick={onMyBookingsClick}
                                >
                                    My Tickets
                                </Button>
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 rounded-full bg-gray-100/50 text-gray-700 hover:bg-gray-100 border border-gray-200/50 shadow-sm transition-all"
                                    >
                                        <User className="w-5 h-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 mt-2 rounded-2xl p-2 border-gray-200 shadow-xl bg-white/95 backdrop-blur-sm">
                                    <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Account
                                    </DropdownMenuLabel>
                                    <DropdownMenuItem onClick={onMyAccountClick} className="rounded-lg cursor-pointer font-medium text-gray-700 hover:bg-gray-50">
                                        Profile settings
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={onMyBookingsClick} className="rounded-lg md:hidden cursor-pointer font-medium text-gray-700 hover:bg-gray-50">
                                        My Tickets
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => navigate('/about')} className="rounded-lg md:hidden cursor-pointer font-medium text-gray-700 hover:bg-gray-50">
                                        About Us
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="my-1 bg-gray-100" />
                                    <DropdownMenuItem
                                        onClick={onLogoutClick}
                                        className="text-red-600 focus:text-red-700 focus:bg-red-50 rounded-lg cursor-pointer font-medium"
                                    >
                                        Sign out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                className="hidden sm:flex text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full font-medium"
                                onClick={onSignInClick}
                            >
                                Sign in
                            </Button>
                            <Button
                                className="bg-primary text-white hover:bg-primary/90 rounded-full font-semibold shadow-md shadow-primary/20 border-0"
                                onClick={onSignUpClick}
                            >
                                Sign up
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};
