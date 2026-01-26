import { Trip } from '../api';
import { formatDateTime, statusBadge } from '../utils';

interface TripListProps {
    trips: Trip[];
    loading: boolean;
    selectedTripId: string | null;
    onSelectTrip: (id: string) => void;
}

export function TripList({ trips, loading, selectedTripId, onSelectTrip }: TripListProps) {
    if (loading) {
        return <div className="text-sm text-gray-600">Loading trips…</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-backwards">
            {trips.map((t) => {
                const isSelected = selectedTripId === t.trip_id;
                const badge = statusBadge(t.booking_status);
                return (
                    <button
                        key={t.trip_id}
                        type="button"
                        onClick={() => onSelectTrip(t.trip_id)}
                        className={`text-left border rounded-2xl p-4 transition-all duration-300 relative group overflow-hidden ${isSelected
                                ? 'border-primary/50 shadow-lg shadow-primary/10 bg-primary/5 ring-1 ring-primary/20'
                                : 'border-gray-100/60 hover:border-gray-300 hover:shadow-md bg-white hover:-translate-y-0.5'
                            }`}
                    >
                        {isSelected && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                        )}
                        <div className="flex items-start justify-between gap-3 relative z-10">
                            <div>
                                <p className="font-bold text-lg text-gray-900">{formatDateTime(t.departure_time)}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="px-2 py-0.5 rounded-md bg-gray-100 text-xs font-medium text-gray-600 border border-gray-200">
                                        {t.available_seats} seats left
                                    </div>
                                    <div className="px-2 py-0.5 rounded-md bg-blue-50 text-xs font-bold text-blue-700 border border-blue-100">
                                        Rs {Math.round(t.price)}
                                    </div>
                                </div>
                                {t.booking_status === 'LOCKED' && (
                                    <p className="text-xs text-amber-600 font-medium mt-2 bg-amber-50 inline-block px-2 py-1 rounded">
                                        Opens at {formatDateTime(t.opens_at)}
                                    </p>
                                )}
                            </div>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-sm tracking-wide ${badge.cls}`}>{badge.label}</span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
