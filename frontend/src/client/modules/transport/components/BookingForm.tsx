import { MapPin, ShieldCheck } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/Select';
import { Trip } from '../api';
import { buildStopOptions, filterDropoffOptions, isFromGIKI, isToGIKI, getStopById } from '../utils';

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

    const isOutbound = isFromGIKI(trip.stops);
    const isInbound = isToGIKI(trip.stops);

    const pickupStop = getStopById(trip.stops, pickupStopId);
    const dropoffStop = getStopById(trip.stops, dropoffStopId);

    const maxSeats = Math.max(1, Math.min(trip.available_seats, 5));
    const seatsOptions = Array.from({ length: maxSeats }, (_, i) => ({
        value: String(i + 1),
        label: `${i + 1} seat${i + 1 > 1 ? 's' : ''}`,
    }));

    return (
        <div className="mt-8 border-t border-slate-100 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 bg-slate-50/30 -mx-8 px-8 pb-8 -mb-8 rounded-b-[2rem]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                    <div className="flex items-center gap-2.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        Trip Route
                    </div>
                    <div className="space-y-4">
                        {isOutbound ? (
                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm ring-1 ring-slate-200/50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pickup (Fixed)</p>
                                    <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                        {pickupStop?.stop_name || 'GIKI'}
                                    </p>
                                </div>
                                <Select
                                    label="Select Dropoff Location"
                                    options={dropoffOptions}
                                    value={dropoffStopId}
                                    onChange={onDropoffChange}
                                    placeholder="Choose destination"
                                    className="bg-white border-slate-100 rounded-2xl h-14 font-bold shadow-sm"
                                />
                            </div>
                        ) : isInbound ? (
                            <div className="space-y-4">
                                <Select
                                    label="Select Pickup Location"
                                    options={stopOptions}
                                    value={pickupStopId}
                                    onChange={onPickupChange}
                                    placeholder="Choose pickup point"
                                    className="bg-white border-slate-100 rounded-2xl h-14 font-bold shadow-sm"
                                />
                                <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm ring-1 ring-slate-200/50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dropoff (Fixed)</p>
                                    <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        {dropoffStop?.stop_name || 'GIKI'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <Select
                                    label="Pickup"
                                    options={stopOptions}
                                    value={pickupStopId}
                                    onChange={onPickupChange}
                                    placeholder="Select pickup"
                                    className="bg-white border-slate-100 rounded-2xl h-14 font-bold shadow-sm"
                                />
                                <Select
                                    label="Dropoff"
                                    options={dropoffOptions}
                                    value={dropoffStopId}
                                    onChange={onDropoffChange}
                                    placeholder="Select dropoff"
                                    disabled={!pickupStopId}
                                    disabledPlaceholder="Select pickup first"
                                    className="bg-white border-slate-100 rounded-2xl h-14 font-bold shadow-sm"
                                />
                            </>
                        )}
                    </div>
                </div>

                <div className="md:col-span-1">
                    <div className="flex items-center gap-2.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        Passenger Info
                    </div>
                    <Select
                        label="Seat Selection"
                        options={seatsOptions}
                        value={String(seatCount)}
                        onChange={(v) => {
                            const n = Math.max(1, parseInt(v, 10) || 1);
                            onSeatCountChange(n);
                        }}
                        placeholder="Select seats"
                        className="bg-white border-slate-100 rounded-2xl h-14 font-bold shadow-sm"
                    />
                    <div className="mt-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                        <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest mb-1">Notice</p>
                        <p className="text-xs text-primary/80 font-bold leading-relaxed">
                            Max 5 seats allowed per booking.
                            Current availability: <span className="text-primary font-black uppercase tracking-widest ml-1">{trip.available_seats} spots</span>.
                        </p>
                    </div>
                </div>

                {/* Action buttons - align bottom */}
                <div className="md:col-span-1 flex items-end">
                    <div className="flex flex-col gap-3 w-full">
                        <Button
                            className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
                            disabled={primaryActionDisabled}
                            onClick={onPrimaryAction}
                        >
                            {primaryActionLabel}
                        </Button>
                        {secondaryActionLabel && (
                            <Button
                                variant="outline"
                                onClick={onSecondaryAction}
                                className="w-full h-12 rounded-2xl border-slate-200 font-bold text-xs text-slate-500 hover:bg-slate-50 transition-all duration-300 uppercase tracking-widest"
                            >
                                {secondaryActionLabel}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
