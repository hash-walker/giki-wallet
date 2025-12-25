import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { validateEmail } from '../../utils/walletHelpers';

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

        if (!validateEmail(email)) {
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

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Transfer Money"
            footer={
                <Button
                    onClick={handleTransfer}
                    disabled={isLoading || !amount || !email}
                    className="w-full font-semibold text-base md:text-lg py-5 md:py-6 shadow-md hover:shadow-lg transition-all"
                >
                    {isLoading ? 'Processing...' : 'Transfer Money'}
                </Button>
            }
        >
            <div className="space-y-6">
                <Input
                    label="Amount (RS)"
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount to transfer"
                />

                <div>
                    <Input
                        label="Recipient Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@example.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter the email address of the user you want to transfer money to</p>
                </div>
            </div>
        </Modal>
    );
};

