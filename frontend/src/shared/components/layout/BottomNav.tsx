
import { Home, Ticket, User, Wallet } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';



export const BottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Determine active state
    // Simple logic: if path is /transport, Tickets is active? Or use 'onMyBookingsClick' as a modal?
    // Current app uses Modals for Tickets and Account.
    // Let's assume standard routes for improved "App" feel if possible, but user just asked for "design it like mobile app".
    // Since Tickets/Account are modals in `ClientLayout`, we treat them as actions.
    // 'Home' is '/', 'Transport' is '/transport'.

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-gray-200 pb-safe pt-2 px-6 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between max-w-sm mx-auto h-16">
                <button
                    onClick={() => navigate('/')}
                    className={cn(
                        "flex flex-col items-center gap-1 transition-colors duration-200",
                        isActive('/') ? "text-primary" : "text-gray-400 hover:text-gray-600"
                    )}
                >
                    <div className={cn(
                        "p-1.5 rounded-xl transition-all",
                        isActive('/') ? "bg-primary/10" : "bg-transparent"
                    )}>
                        <Home className={cn("w-6 h-6", isActive('/') && "fill-current")} />
                    </div>
                    {/* <span className="text-[10px] font-medium">Home</span> */}
                </button>

                <button
                    onClick={() => navigate('/transport')}
                    className={cn(
                        "flex flex-col items-center gap-1 transition-colors duration-200",
                        isActive('/transport') ? "text-primary" : "text-gray-400 hover:text-gray-600"
                    )}
                >
                    <div className={cn(
                        "p-1.5 rounded-xl transition-all",
                        isActive('/transport') ? "bg-primary/10" : "bg-transparent"
                    )}>
                        {/* Swapped Bus for a more generic 'Ticket' or 'Commute' icon if desired, but user hated "Bus" wording. Let's keep icon simple. */}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={cn("w-6 h-6", isActive('/transport') && "fill-current")}
                        >
                            <rect width="16" height="16" x="4" y="4" rx="2" />
                            <path d="M12 15h.01" />
                        </svg>
                    </div>
                </button>

                {/* Center "Action" Button for Wallet/Pay? Or just keep these 4? 
                    Let's use Wallet Page as a route if it existed, but Wallet is on Home.
                    Let's make "My Tickets" a primary tab action.
                */}

                <button
                    onClick={() => navigate('/tickets')}
                    className={cn(
                        "flex flex-col items-center gap-1 transition-colors duration-200",
                        isActive('/tickets') ? "text-primary" : "text-gray-400 hover:text-gray-600"
                    )}
                >
                    <div className={cn(
                        "p-1.5 rounded-xl transition-all",
                        isActive('/tickets') ? "bg-primary/10" : "bg-transparent"
                    )}>
                        <Ticket className={cn("w-6 h-6", isActive('/tickets') && "fill-current")} />
                    </div>
                </button>

                <button
                    onClick={() => navigate('/account')}
                    className={cn(
                        "flex flex-col items-center gap-1 transition-colors duration-200",
                        isActive('/account') ? "text-primary" : "text-gray-400 hover:text-gray-600"
                    )}
                >
                    <div className={cn(
                        "p-1.5 rounded-xl transition-all",
                        isActive('/account') ? "bg-primary/10" : "bg-transparent"
                    )}>
                        <User className={cn("w-6 h-6", isActive('/account') && "fill-current")} />
                    </div>
                </button>
            </div>
        </div>
    );
};
