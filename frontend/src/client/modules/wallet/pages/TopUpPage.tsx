
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/Input';
import { PaymentMethodSelector } from '../components/PaymentMethodSelector';
import { toast } from '@/lib/toast';

type PaymentMethod = 'jazzcash' | 'card';

export const TopUpPage = () => {
    const navigate = useNavigate();
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('jazzcash');
    const [amount, setAmount] = useState<string>('');
    const [mobileNumber, setMobileNumber] = useState<string>('');
    const [cnicLastSix, setCnicLastSix] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const handleJazzcashPayment = async () => {
        if (!amount || !mobileNumber || !cnicLastSix) {
            toast.error('Please fill in all fields');
            return;
        }

        if (cnicLastSix.length !== 6) {
            toast.error('CNIC last 6 digits must be exactly 6 digits');
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
            toast.success('Payment request sent to Jazzcash');
            // Navigate back to wallet
            navigate('/');
        } catch (error) {
            console.error('Payment error:', error);
            toast.error('Payment failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCardPayment = () => {
        if (!amount) {
            toast.error('Please enter an amount');
            return;
        }
        // TODO: Redirect to external payment gateway
        console.log('Redirecting to payment gateway with amount:', amount);
        toast.info('Redirecting to payment gateway...');
        navigate('/');
    };

    return (
        <div className="max-w-xl mx-auto pt-6 pb-20 md:pb-6">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-2xl font-bold text-gray-900">Top Up Wallet</h1>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                {/* Payment Method Selection */}
                <PaymentMethodSelector
                    paymentMethod={paymentMethod}
                    onPaymentMethodChange={setPaymentMethod}
                />

                {/* Amount Input */}
                <div className="mb-6">
                    <Input
                        label="Amount (RS)"
                        type="number"
                        min="1"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="bg-gray-50 border-gray-200"
                    />
                </div>

                {/* Jazzcash Form */}
                {paymentMethod === 'jazzcash' && (
                    <div className="space-y-4 mb-8">
                        <Input
                            label="Mobile Number"
                            type="tel"
                            value={mobileNumber}
                            onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                            placeholder="03XX-XXXXXXX"
                            maxLength={11}
                            className="bg-gray-50 border-gray-200"
                        />

                        <Input
                            label="Last 6 Digits of CNIC"
                            type="text"
                            value={cnicLastSix}
                            onChange={(e) => setCnicLastSix(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="XXXXXX"
                            maxLength={6}
                            className="bg-gray-50 border-gray-200"
                        />
                    </div>
                )}

                <Button
                    onClick={paymentMethod === 'jazzcash' ? handleJazzcashPayment : handleCardPayment}
                    disabled={isLoading || !amount}
                    className="w-full font-semibold text-base py-6 rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all mt-4"
                >
                    {isLoading ? 'Processing...' : paymentMethod === 'jazzcash' ? 'Pay with Jazzcash' : 'Proceed to Payment Gateway'}
                </Button>
            </div>
        </div>
    );
};
