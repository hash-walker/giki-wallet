import { Switch } from '@/shared/components/ui/switch';

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
    // Dynamic Quota Guard:
    // A Round Trip requires 2 tickets (1 Outbound + 1 Inbound).
    // If the user has less than 2 tickets remaining in TOTAL, they cannot possibly book a round trip.
    // We sum up the remaining quota from both directions (since they share the same weekly limit pool usually, 
    // or at least we need 1 in each bucket if they were separate, but for simplicity/safety we check total).

    // Actually, in the backend 'GetQuotaRule', the limit is per direction usually, but often shared context.
    // Let's look at the schema: quotaResponseSchema has outbound and inbound.
    // If a user has 0 outbound remaining, they can't book round trip starting outbound.
    // If a user has 0 inbound remaining, they can't book round trip returning inbound.
    // So strictly: (quota.outbound.remaining >= 1 && quota.inbound.remaining >= 1).

    const canBookRoundTrip = quota
        ? (quota.outbound.remaining >= 1 && quota.inbound.remaining >= 1)
        : true; // Default to true if loading or undefined to avoid premature locking? Or false for safety? 
    // Let's default true so we don't flash disabled on load.

    const disabledRoundTrip = !canBookRoundTrip;
    return (
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">Direction</h2>
                    <p className="text-xs text-slate-500">Where are you starting from?</p>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                    {/* Round Trip Toggle */}
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">Round Trip</span>
                            <span className="text-[10px] text-slate-400">Book both ways</span>
                        </div>
                        <div title={disabledRoundTrip ? "Insufficient quota for Round Trip (Requires 1 Outbound + 1 Inbound)" : undefined}>
                            <Switch
                                checked={isRoundTrip}
                                onCheckedChange={onRoundTripChange}
                                disabled={disabledRoundTrip}
                            />
                        </div>
                    </div>

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
                </div>
            </div>
        </div>
    );
}
