import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TransferPageProps {
    onBack?: () => void;
}

export const TransferPage = ({ onBack }: TransferPageProps) => {
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
            // Reset form
            setAmount('');
            setEmail('');
        } catch (error) {
            console.error('Transfer error:', error);
            alert('Transfer failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-start p-4 md:p-6 w-full">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={onBack || (() => window.history.back())}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <h1 className="text-2xl md:text-3xl font-bold text-primary">Transfer Money</h1>
                </div>

                {/* Form */}
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

                {/* Transfer Button */}
                <div className="mt-8">
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

