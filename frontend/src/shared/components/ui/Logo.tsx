import { Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
    subText?: string;
    className?: string;
}

export const Logo = ({ subText, className }: LogoProps) => {
    return (
        <div className={cn("flex items-center gap-2.5 group select-none", className)}>
            <div className="relative w-9 h-9 flex items-center justify-center">
                <div className="absolute inset-0 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors" />
                <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-all duration-300">
                    <Wallet className="w-5 h-5 drop-shadow-sm" />
                </div>
            </div>
            <div className="flex flex-col items-start leading-none gap-0.5">
                <span className="font-bold text-xl text-gray-900 tracking-tight">
                    GIKI <span className="text-primary font-extrabold">Wallet</span>
                </span>
                {subText && (
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-medium ml-px">
                        {subText}
                    </span>
                )}
            </div>
        </div>
    );
};
