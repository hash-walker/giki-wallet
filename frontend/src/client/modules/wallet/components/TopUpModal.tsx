import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { toast } from '@/lib/toast';

type PaymentMethod = 'jazzcash' | 'card';

interface TopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TopUpModal = ({ isOpen, onClose }: TopUpModalProps) => {
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
            // Close modal on success
            onClose();
            // Reset form
            setAmount('');
            setMobileNumber('');
            setCnicLastSix('');
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
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Top Up Wallet"
            footer={
                <Button
                    onClick={paymentMethod === 'jazzcash' ? handleJazzcashPayment : handleCardPayment}
                    disabled={isLoading || !amount}
                    className="w-full font-semibold text-base md:text-lg py-5 md:py-6 shadow-md hover:shadow-lg transition-all"
                >
                    {isLoading ? 'Processing...' : paymentMethod === 'jazzcash' ? 'Pay with Jazzcash' : 'Proceed to Payment Gateway'}
                </Button>
            }
        >
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
                />
            </div>

            {/* Jazzcash Form */}
            {paymentMethod === 'jazzcash' && (
                <div className="space-y-4 mb-6">
                    <Input
                        label="Mobile Number"
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="03XX-XXXXXXX"
                        maxLength={11}
                    />

                    <Input
                        label="Last 6 Digits of CNIC"
                        type="text"
                        value={cnicLastSix}
                        onChange={(e) => setCnicLastSix(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="XXXXXX"
                        maxLength={6}
                    />
                </div>
            )}
        </Modal>
    );
};

