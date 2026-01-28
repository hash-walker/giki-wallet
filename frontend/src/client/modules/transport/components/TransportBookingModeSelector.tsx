interface TransportBookingModeSelectorProps {
    roundTrip: boolean;
    onToggle: (isRoundTrip: boolean) => void;
    direction: 'from-giki' | 'to-giki';
    onDirectionChange: (direction: 'from-giki' | 'to-giki') => void;
}

export function TransportBookingModeSelector({
    roundTrip,
    onToggle,
    direction,
    onDirectionChange
}: TransportBookingModeSelectorProps) {
    return (
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">Booking Mode</h2>
                    <p className="text-xs text-slate-500">Choose between one-way or round-trip</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => onToggle(false)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${!roundTrip ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        One Way
                    </button>
                    <button
                        onClick={() => onToggle(true)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${roundTrip ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Round Trip
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">Direction</h2>
                    <p className="text-xs text-slate-500">Where are you starting from?</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => onDirectionChange('from-giki')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${direction === 'from-giki' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        From GIKI
                    </button>
                    <button
                        onClick={() => onDirectionChange('to-giki')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${direction === 'to-giki' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        To GIKI
                    </button>
                </div>
            </div>
        </div>
    );
}
