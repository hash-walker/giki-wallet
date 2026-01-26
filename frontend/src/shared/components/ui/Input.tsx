import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    labelClassName?: string;
    error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, labelClassName, error, className, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className={cn("block text-sm font-medium text-gray-700 mb-1.5", labelClassName)}>
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    className={cn(
                        "w-full border border-gray-300 rounded-lg px-4 py-3 bg-white",
                        "focus:ring-2 focus:ring-primary focus:border-transparent",
                        "text-base transition-colors",
                        "disabled:bg-gray-100 disabled:cursor-not-allowed",
                        error && "border-red-300 focus:ring-red-500",
                        className
                    )}
                    {...props}
                />
                {error && (
                    <p className="mt-1.5 text-sm text-red-600">{error}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

