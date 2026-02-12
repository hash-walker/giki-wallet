import { Switch } from '@/shared/components/ui/switch';
import { cn } from '@/lib/utils';

interface TransportBookingModeSelectorProps {
    direction: 'OUTBOUND' | 'INBOUND';
    onDirectionChange: (direction: 'OUTBOUND' | 'INBOUND') => void;
    isRoundTrip: boolean;
    onRoundTripChange: (enabled: boolean) => void;
    quota: { outbound: { remaining: number }; inbound: { remaining: number } } | null;
}

export function TransportBookingModeSelector({
    direction,
    onDirectionChange,
    isRoundTrip,
    onRoundTripChange,
    quota
}: TransportBookingModeSelectorProps) {

    const canBookRoundTrip = quota
        ? (quota.outbound.remaining >= 1 && quota.inbound.remaining >= 1)
        : true;

    const disabledRoundTrip = !canBookRoundTrip;
    return (
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">Direction</h2>
                    <p className="text-xs text-slate-500">Where are you starting from?</p>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                    {/* Round Trip Toggle - Highlighted when active */}
                    <div className={cn(
                        "flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300",
                        isRoundTrip 
                            ? "bg-blue-100 border-2 border-blue-300 shadow-md" 
                            : "bg-slate-50 border border-slate-100"
                    )}>
                        <div className="flex flex-col">
                            <span className={cn(
                                "text-xs font-bold",
                                isRoundTrip ? "text-blue-900" : "text-slate-700"
                            )}>
                                Round Trip {isRoundTrip && "✓"}
                            </span>
                            <span className={cn(
                                "text-[10px]",
                                isRoundTrip ? "text-blue-600" : "text-slate-400"
                            )}>
                                Book both ways
                            </span>
                        </div>
                        <div title={disabledRoundTrip ? "Insufficient quota for Round Trip (Requires 1 Outbound + 1 Inbound)" : undefined}>
                            <Switch
                                checked={isRoundTrip}
                                onCheckedChange={onRoundTripChange}
                                disabled={disabledRoundTrip && !isRoundTrip}
                            />
                        </div>
                    </div>

                    {/* Hide direction toggle when in round-trip mode (both sections are visible) */}
                    {!isRoundTrip && (
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                                onClick={() => onDirectionChange('OUTBOUND')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${direction === 'OUTBOUND' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                From GIKI
                            </button>
                            <button
                                onClick={() => onDirectionChange('INBOUND')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${direction === 'INBOUND' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                To GIKI
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
