import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface DropdownContextValue {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DropdownContext = React.createContext<DropdownContextValue | undefined>(undefined);

export const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
            <div className="relative inline-block text-left" ref={containerRef}>
                {children}
            </div>
        </DropdownContext.Provider>
    );
};

export const DropdownMenuTrigger = ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => {
    const context = React.useContext(DropdownContext);
    if (!context) throw new Error('DropdownMenuTrigger must be used within DropdownMenu');

    const handleClick = (e: React.MouseEvent) => {
        // e.stopPropagation(); // Optional
        context.setIsOpen(!context.isOpen);
        if (React.isValidElement(children)) {
            const child = children as React.ReactElement<any>;
            if (child.props.onClick) {
                child.props.onClick(e);
            }
        }
    };

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<any>, {
            onClick: handleClick,
            'aria-expanded': context.isOpen,
        });
    }

    return (
        <button onClick={handleClick} className="flex items-center gap-1">
            {children} <ChevronDown className="w-4 h-4" />
        </button>
    );
};

export const DropdownMenuContent = ({
    children,
    className,
    align = 'center'
}: {
    children: React.ReactNode;
    className?: string;
    align?: 'start' | 'center' | 'end';
}) => {
    const context = React.useContext(DropdownContext);
    if (!context) throw new Error('DropdownMenuContent must be used within DropdownMenu');

    if (!context.isOpen) return null;

    const alignClass = {
        start: 'left-0',
        center: 'left-1/2 -translate-x-1/2',
        end: 'right-0',
    }[align];

    return (
        <div className={cn(
            "absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2",
            alignClass,
            className
        )}>
            {children}
        </div>
    );
};

export const DropdownMenuItem = ({
    children,
    className,
    onClick,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
    const context = React.useContext(DropdownContext);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
        context?.setIsOpen(false);
    };

    return (
        <button
            className={cn(
                "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 text-left",
                className
            )}
            onClick={handleClick}
            {...props}
        >
            {children}
        </button>
    );
};

export const DropdownMenuLabel = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    return (
        <div className={cn("px-2 py-1.5 text-sm font-semibold", className)}>
            {children}
        </div>
    );
};

export const DropdownMenuSeparator = ({ className }: { className?: string }) => {
    return <div className={cn("-mx-1 my-1 h-px bg-muted", className)} />;
};
