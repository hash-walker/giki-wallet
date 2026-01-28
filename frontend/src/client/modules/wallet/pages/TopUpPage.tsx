
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/Input';
import { PaymentMethodSelector } from '../components/PaymentMethodSelector';
import { toast } from '@/lib/toast';
import { topUp } from '../api';
import { TopUpRequest } from '../types';
import JazzCashPayment from '../components/JazzCashPayment';

type PaymentMethod = 'jazzcash' | 'card';

const TopUpPage = () => {
    const navigate = useNavigate();
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('jazzcash');
    const [amount, setAmount] = useState<string>('');
    const [mobileNumber, setMobileNumber] = useState<string>('');
    const [cnicLastSix, setCnicLastSix] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const handleCardPayment = async () => {
        if (!amount) {
            toast.error('Please enter an amount');
            return;
        }

        setIsLoading(true);
        try {
            const request: TopUpRequest = {
                idempotency_key: crypto.randomUUID(),
                amount: parseFloat(amount),
                method: 'CARD'
            };

            const result = await topUp(request);

            if (result.redirect) {
                toast.info('Redirecting to payment gateway...');
                window.location.href = result.redirect;
            } else {
                toast.error('Failed to get payment page. Please try again.');
            }
        } catch (error) {
            console.error('Payment error:', error);
            const err = error as { response?: { data?: { message?: string } } };
            const errorMessage = err.response?.data?.message || 'Payment failed. Please try again.';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
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

                {/* Account Details Form (Shared or specific based on UX) */}
                <div className="space-y-4 mb-6">
                    <div className="mb-2">
                        <Input
                            label="Amount (RS)"
                            type="number"
                            min="1"
                            step="1"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter amount"
                            className="bg-gray-50 border-gray-200"
                        />
                    </div>

                    {paymentMethod === 'jazzcash' && (
                        <>
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
                        </>
                    )}
                </div>

                {/* Payment Content */}
                {paymentMethod === 'jazzcash' ? (
                    <JazzCashPayment
                        amount={parseFloat(amount) || 0}
                        phoneNumber={mobileNumber}
                        cnicLast6={cnicLastSix}
                    />
                ) : (
                    <div className="space-y-6">
                        <Button
                            onClick={handleCardPayment}
                            disabled={isLoading || !amount}
                            className="w-full font-semibold text-base py-6 rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all mt-4"
                        >
                            {isLoading ? 'Processing...' : 'Proceed to Payment Gateway'}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
export default TopUpPage
