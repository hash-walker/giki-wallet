interface TransportBookingModeSelectorProps {
    roundTrip: boolean;
    onToggle: (isRoundTrip: boolean) => void;
}

export function TransportBookingModeSelector({ roundTrip, onToggle }: TransportBookingModeSelectorProps) {
    return (
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
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
        </div>
    );
}
