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
        <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    {/* Round Trip Toggle - Compact */}
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all",
                        isRoundTrip 
                            ? "bg-blue-100 border border-blue-300" 
                            : "bg-gray-100 border border-gray-200"
                    )}>
                        <span className={cn(
                            "text-xs font-medium",
                            isRoundTrip ? "text-blue-900" : "text-gray-700"
                        )}>
                            Round Trip {isRoundTrip && "✓"}
                        </span>
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
                        <div className="flex bg-gray-100 p-0.5 rounded-lg">
                            <button
                                onClick={() => onDirectionChange('OUTBOUND')}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${direction === 'OUTBOUND' ? 'bg-white text-primary' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                From GIKI
                            </button>
                            <button
                                onClick={() => onDirectionChange('INBOUND')}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${direction === 'INBOUND' ? 'bg-white text-primary' : 'text-gray-600 hover:text-gray-900'}`}
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
