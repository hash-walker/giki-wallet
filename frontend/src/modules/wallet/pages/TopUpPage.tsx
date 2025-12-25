import { useState } from 'react';
import { ArrowLeft, CreditCard, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PaymentMethod = 'jazzcash' | 'card';

interface TopUpPageProps {
    onBack?: () => void;
}

export const TopUpPage = ({ onBack }: TopUpPageProps) => {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('jazzcash');
    const [amount, setAmount] = useState<string>('');
    const [mobileNumber, setMobileNumber] = useState<string>('');
    const [cnicLastSix, setCnicLastSix] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const handleJazzcashPayment = async () => {
        if (!amount || !mobileNumber || !cnicLastSix) {
            alert('Please fill in all fields');
            return;
        }
        
        if (cnicLastSix.length !== 6) {
            alert('CNIC last 6 digits must be exactly 6 digits');
            return;
        }

        setIsLoading(true);
        try {
            // TODO: Send request to Jazzcash API
            console.log('Jazzcash payment request:', {
                mobileNumber,
                cnicLastSix,
                amount: parseFloat(amount)
            });
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            alert('Payment request sent to Jazzcash');
        } catch (error) {
            console.error('Payment error:', error);
            alert('Payment failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCardPayment = () => {
        if (!amount) {
            alert('Please enter an amount');
            return;
        }
        // TODO: Redirect to external payment gateway
        console.log('Redirecting to payment gateway with amount:', amount);
        alert('Redirecting to payment gateway...');
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
                    <h1 className="text-2xl md:text-3xl font-bold text-primary">Top Up Wallet</h1>
                </div>

            {/* Payment Method Selection */}
            <div className="mb-6">
                <label className="text-sm font-semibold text-gray-700 mb-3 block">Payment Method</label>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <button
                        onClick={() => setPaymentMethod('jazzcash')}
                        className={cn(
                            "p-4 md:p-6 rounded-xl border-2 transition-all w-full shadow-sm",
                            paymentMethod === 'jazzcash'
                                ? "border-primary bg-primary/5 shadow-md"
                                : "border-gray-200 bg-white hover:border-primary/50 hover:shadow-md"
                        )}
                    >
                        <div className="flex flex-col items-center gap-3">
                            <div className={cn(
                                "w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all",
                                paymentMethod === 'jazzcash' 
                                    ? "bg-primary text-white shadow-lg scale-105" 
                                    : "bg-gray-100 text-gray-600"
                            )}>
                                <Smartphone className="w-6 h-6 md:w-8 md:h-8" />
                            </div>
                            <div className="text-center w-full">
                                <p className="font-semibold text-gray-900 text-sm md:text-base">Jazzcash Wallet</p>
                                <p className="text-xs text-gray-500 mt-0.5">Mobile & CNIC</p>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => setPaymentMethod('card')}
                        className={cn(
                            "p-4 md:p-6 rounded-xl border-2 transition-all w-full shadow-sm",
                            paymentMethod === 'card'
                                ? "border-primary bg-primary/5 shadow-md"
                                : "border-gray-200 bg-white hover:border-primary/50 hover:shadow-md"
                        )}
                    >
                        <div className="flex flex-col items-center gap-3">
                            <div className={cn(
                                "w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all",
                                paymentMethod === 'card' 
                                    ? "bg-primary text-white shadow-lg scale-105" 
                                    : "bg-gray-100 text-gray-600"
                            )}>
                                <CreditCard className="w-6 h-6 md:w-8 md:h-8" />
                            </div>
                            <div className="text-center w-full">
                                <p className="font-semibold text-gray-900 text-sm md:text-base">Debit Card</p>
                                <p className="text-xs text-gray-500 mt-0.5">External Gateway</p>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            {/* Amount Input */}
            <div className="mb-6">
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
                    placeholder="Enter amount"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-primary focus:border-transparent text-base transition-colors"
                />
            </div>

            {/* Jazzcash Form */}
            {paymentMethod === 'jazzcash' && (
                <div className="space-y-4 mb-6">
                    <div>
                        <label htmlFor="mobile" className="text-sm font-semibold text-gray-700 mb-2 block">
                            Mobile Number
                        </label>
                        <input
                            id="mobile"
                            type="tel"
                            value={mobileNumber}
                            onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                            placeholder="03XX-XXXXXXX"
                            maxLength={11}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-primary focus:border-transparent text-base transition-colors"
                        />
                    </div>

                    <div>
                        <label htmlFor="cnic" className="text-sm font-semibold text-gray-700 mb-2 block">
                            Last 6 Digits of CNIC
                        </label>
                        <input
                            id="cnic"
                            type="text"
                            value={cnicLastSix}
                            onChange={(e) => setCnicLastSix(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="XXXXXX"
                            maxLength={6}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-primary focus:border-transparent text-base transition-colors"
                        />
                    </div>
                </div>
            )}

            {/* Payment Button */}
            <div className="mt-8">
                <Button
                    onClick={paymentMethod === 'jazzcash' ? handleJazzcashPayment : handleCardPayment}
                    disabled={isLoading || !amount}
                    className="w-full font-semibold text-base md:text-lg py-5 md:py-6 shadow-md hover:shadow-lg transition-all"
                >
                    {isLoading ? 'Processing...' : paymentMethod === 'jazzcash' ? 'Pay with Jazzcash' : 'Proceed to Payment Gateway'}
                </Button>
            </div>
            </div>
        </div>
    );
};

