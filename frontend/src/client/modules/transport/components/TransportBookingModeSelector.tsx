interface TransportBookingModeSelectorProps {
    direction: 'Outbound' | 'Inbound';
    onDirectionChange: (direction: 'Outbound' | 'Inbound') => void;
}

export function TransportBookingModeSelector({
    direction,
    onDirectionChange
}: TransportBookingModeSelectorProps) {
    return (
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">Direction</h2>
                    <p className="text-xs text-slate-500">Where are you starting from?</p>
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
    );
}
