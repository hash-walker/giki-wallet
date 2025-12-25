import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';

interface SignInModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSignInSuccess?: () => void;
}

export const SignInModal = ({ isOpen, onClose, onSignInSuccess }: SignInModalProps) => {
    const handleOutlookLogin = async () => {
        // TODO: Implement Outlook OAuth login
        console.log('Login with Outlook clicked');
        // This would typically redirect to Outlook OAuth or open a popup
        // For now, simulate successful login
        try {
            // Simulate OAuth flow
            await new Promise(resolve => setTimeout(resolve, 500));
            onClose();
            // Open My Account modal after successful sign in
            onSignInSuccess?.();
        } catch (error) {
            console.error('Sign in error:', error);
            alert('Sign in failed. Please try again.');
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Sign In"
        >
            <div className="flex flex-col items-center justify-center space-y-6 py-8">
                <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">Welcome Back</h3>
                    <p className="text-sm text-gray-600">Sign in to access your account and manage your bookings</p>
                </div>
                
                <Button
                    onClick={handleOutlookLogin}
                    className="w-full font-semibold bg-[#0078D4] hover:bg-[#006CBE] text-white h-12 md:h-14 text-base md:text-lg flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all py-5 md:py-6"
                >
                    <svg 
                        className="w-5 h-5 md:w-6 md:h-6" 
                        viewBox="0 0 23 23" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path 
                            d="M11.5 0C5.15 0 0 5.15 0 11.5S5.15 23 11.5 23 23 17.85 23 11.5 17.85 0 11.5 0Z" 
                            fill="currentColor"
                        />
                        <path 
                            d="M11.5 2C6.26 2 2 6.26 2 11.5S6.26 21 11.5 21 21 16.74 21 11.5 16.74 2 11.5 2Z" 
                            fill="#fff"
                        />
                        <path 
                            d="M11.5 4C7.36 4 4 7.36 4 11.5S7.36 19 11.5 19 19 15.64 19 11.5 15.64 4 11.5 4Z" 
                            fill="currentColor"
                        />
                        <path 
                            d="M11.5 6C8.46 6 6 8.46 6 11.5S8.46 17 11.5 17 17 14.54 17 11.5 14.54 6 11.5 6Z" 
                            fill="#fff"
                        />
                    </svg>
                    Login with Outlook
                </Button>
            </div>
        </Modal>
    );
};

