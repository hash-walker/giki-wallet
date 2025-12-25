import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    className
}: ModalProps) => {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'md:w-[400px]',
        md: 'md:w-[500px]',
        lg: 'md:w-[600px]'
    };

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
                "absolute inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full",
                sizeClasses[size],
                "md:max-h-[90vh] bg-white rounded-t-3xl md:rounded-2xl shadow-xl transition-transform duration-300 ease-in-out flex flex-col",
                isOpen ? "translate-y-0" : "translate-y-full md:translate-y-0 md:scale-95",
                className
            )}>
                {/* Header */}
                {title && (
                    <div className="flex justify-between items-center p-6 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
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
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-6 border-t border-gray-200">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

