import { Switch } from '@/shared/components/ui/switch';

interface TransportBookingModeSelectorProps {
    direction: 'Outbound' | 'Inbound';
    onDirectionChange: (direction: 'Outbound' | 'Inbound') => void;
    isRoundTrip: boolean;
    onRoundTripChange: (enabled: boolean) => void;
}

export function TransportBookingModeSelector({
    direction,
    onDirectionChange,
    isRoundTrip,
    onRoundTripChange
}: TransportBookingModeSelectorProps) {
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
                        <Switch
                            checked={isRoundTrip}
                            onCheckedChange={onRoundTripChange}
                        />
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => onDirectionChange('Outbound')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${direction === 'Outbound' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            From GIKI
                        </button>
                        <button
                            onClick={() => onDirectionChange('Inbound')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${direction === 'Inbound' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            To GIKI
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
