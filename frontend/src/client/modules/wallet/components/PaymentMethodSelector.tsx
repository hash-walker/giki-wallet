import { CreditCard, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

type PaymentMethod = 'jazzcash' | 'card';

interface PaymentMethodSelectorProps {
    paymentMethod: PaymentMethod;
    onPaymentMethodChange: (method: PaymentMethod) => void;
}

export const PaymentMethodSelector = ({
    paymentMethod,
    onPaymentMethodChange
}: PaymentMethodSelectorProps) => {
    return (
        <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={() => onPaymentMethodChange('jazzcash')}
                    className={cn(
                        "p-3 rounded-lg border-2 transition-all w-full",
                        paymentMethod === 'jazzcash'
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 bg-white hover:border-primary/50"
                    )}
                >
                    <div className="flex flex-col items-center gap-2">
                        <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            paymentMethod === 'jazzcash' 
                                ? "bg-primary text-white" 
                                : "bg-gray-100 text-gray-600"
                        )}>
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <p className="font-medium text-gray-900 text-sm">JazzCash</p>
                    </div>
                </button>

                <button
                    onClick={() => onPaymentMethodChange('card')}
                    className={cn(
                        "p-3 rounded-lg border-2 transition-all w-full",
                        paymentMethod === 'card'
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 bg-white hover:border-primary/50"
                    )}
                >
                    <div className="flex flex-col items-center gap-2">
                        <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            paymentMethod === 'card' 
                                ? "bg-primary text-white" 
                                : "bg-gray-100 text-gray-600"
                        )}>
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <p className="font-medium text-gray-900 text-sm">Card</p>
                    </div>
                </button>
            </div>
        </div>
    );
};

