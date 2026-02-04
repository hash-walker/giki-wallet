import { Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
    subText?: string;
    className?: string;
}

export const Logo = ({ subText, className }: LogoProps) => {
    return (
        <div className={cn("flex items-center gap-3 group select-none", className)}>
            <div className="relative w-10 h-10 flex items-center justify-center">
                <div className="absolute inset-0 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors" />
                <div className="relative w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-sm group-hover:scale-110 transition-all duration-300">
                    <img
                        src="/logo_new.png"
                        alt="GIKI Wallet Logo"
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>
            <div className="flex flex-col items-start leading-none">
                <span className="font-black text-2xl text-gray-900 tracking-tighter">
                    GIKI <span className="text-primary tracking-normal">Wallet</span>
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
