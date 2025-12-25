import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TransferModal = ({ isOpen, onClose }: TransferModalProps) => {
    const [amount, setAmount] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const handleTransfer = async () => {
        if (!amount || !email) {
            alert('Please fill in all fields');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address');
            return;
        }

        setIsLoading(true);
        try {
            // TODO: Send transfer request to API
            console.log('Transfer request:', {
                email,
                amount: parseFloat(amount)
            });
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            alert('Transfer request sent successfully');
            // Close modal and reset form
            onClose();
            setAmount('');
            setEmail('');
        } catch (error) {
            console.error('Transfer error:', error);
            alert('Transfer failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={cn(
            "fixed inset-0 z-50 transition-all duration-300",
            isOpen ? "visible" : "invisible delay-300"
        )}>
            {/* Backdrop */}
            <div
                className={cn(
                    "absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0"
                )}
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className={cn(
                "absolute inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[500px] md:max-h-[90vh] bg-white rounded-t-3xl md:rounded-2xl shadow-xl transition-transform duration-300 ease-in-out flex flex-col",
                isOpen ? "translate-y-0" : "translate-y-full md:translate-y-0 md:scale-95"
            )}>
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Transfer Money</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg h-8 w-8"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="amount" className="text-sm font-semibold text-gray-700 mb-2 block">
                                Amount (RS)
                            </label>
                            <input
                                id="amount"
                                type="number"
                                min="1"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Enter amount to transfer"
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-primary focus:border-transparent text-base transition-colors"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="text-sm font-semibold text-gray-700 mb-2 block">
                                Recipient Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="user@example.com"
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-primary focus:border-transparent text-base transition-colors"
                            />
                            <p className="text-xs text-gray-500 mt-1">Enter the email address of the user you want to transfer money to</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200">
                    <Button
                        onClick={handleTransfer}
                        disabled={isLoading || !amount || !email}
                        className="w-full font-semibold text-base md:text-lg py-5 md:py-6 shadow-md hover:shadow-lg transition-all"
                    >
                        {isLoading ? 'Processing...' : 'Transfer Money'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

