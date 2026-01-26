import { MapPin, ShieldCheck } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/Select';
import { Trip } from '../api';
import { buildStopOptions, filterDropoffOptions } from '../utils';

interface BookingFormProps {
    trip: Trip;
    pickupStopId: string | null;
    onPickupChange: (id: string) => void;
    dropoffStopId: string | null;
    onDropoffChange: (id: string) => void;
    seatCount: number;
    onSeatCountChange: (count: number) => void;
    primaryActionLabel: string;
    onPrimaryAction: () => void;
    primaryActionDisabled: boolean;
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
}

export function BookingForm({
    trip,
    pickupStopId,
    onPickupChange,
    dropoffStopId,
    onDropoffChange,
    seatCount,
    onSeatCountChange,
    primaryActionLabel,
    onPrimaryAction,
    primaryActionDisabled,
    secondaryActionLabel,
    onSecondaryAction,
}: BookingFormProps) {
    const stopOptions = buildStopOptions(trip.stops);
    const dropoffOptions = filterDropoffOptions(trip.stops, pickupStopId);

    const maxSeats = Math.max(1, Math.min(trip.available_seats, 5));
    const seatsOptions = Array.from({ length: maxSeats }, (_, i) => ({
        value: String(i + 1),
        label: `${i + 1} seat${i + 1 > 1 ? 's' : ''}`,
    }));

    return (
        <div className="mt-6 border-t border-gray-100 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-gray-50/50 -mx-6 px-6 pb-6 -mb-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                        <MapPin className="w-4 h-4 text-primary" />
                        Stops
                    </div>
                    <div className="space-y-3">
                        <Select
                            label="Pickup"
                            options={stopOptions}
                            value={pickupStopId}
                            onChange={onPickupChange}
                            placeholder="Select pickup"
                            className="bg-white border-gray-200"
                        />
                        <Select
                            label="Dropoff"
                            options={dropoffOptions}
                            value={dropoffStopId}
                            onChange={onDropoffChange}
                            placeholder="Select dropoff"
                            disabled={!pickupStopId}
                            disabledPlaceholder="Select pickup first"
                            className="bg-white border-gray-200"
                        />
                    </div>
                </div>

                <div className="md:col-span-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        Seats
                    </div>
                    <Select
                        label="Count"
                        options={seatsOptions}
                        value={String(seatCount)}
                        onChange={(v) => {
                            const n = Math.max(1, parseInt(v, 10) || 1);
                            onSeatCountChange(n);
                        }}
                        placeholder="Select seats"
                        className="bg-white border-gray-200"
                    />
                    <p className="text-xs text-gray-500 mt-2 ml-1">
                        Max 5 shown (Available: {trip.available_seats})
                    </p>
                </div>

                {/* Action buttons - align bottom */}
                <div className="md:col-span-1 flex items-end">
                    <div className="grid grid-cols-2 gap-3 w-full">
                        {secondaryActionLabel && (
                            <Button
                                variant="outline"
                                onClick={onSecondaryAction}
                                className="w-full rounded-full border-gray-200 hover:bg-white hover:text-gray-900 bg-white"
                            >
                                {secondaryActionLabel}
                            </Button>
                        )}
                        <Button
                            className={`w-full rounded-full font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all ${!secondaryActionLabel ? 'col-span-2' : ''}`}
                            disabled={primaryActionDisabled}
                            onClick={onPrimaryAction}
                        >
                            {primaryActionLabel}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
