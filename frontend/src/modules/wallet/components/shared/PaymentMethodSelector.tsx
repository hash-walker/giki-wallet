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
        <div className="mb-6">
            <label className="text-sm font-semibold text-gray-700 mb-3 block">Payment Method</label>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
                <button
                    onClick={() => onPaymentMethodChange('jazzcash')}
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
                    onClick={() => onPaymentMethodChange('card')}
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
    );
};

