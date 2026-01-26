import { Button } from '@/shared/components/ui/button';
import { Modal } from '@/shared/components/ui/Modal';
import { Select } from '@/shared/components/ui/Select';

export interface TripSummary {
    route: string | null;
    when: string;
    pickup: string;
    dropoff: string;
    seats: number;
    priceEach: number;
}

export interface Passenger {
    name: string;
    relation: 'SELF' | 'SPOUSE' | 'CHILD';
}

export type HeldSeat = {
    hold_id: string;
    expires_at: string;
};

interface BookingConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    confirming: boolean;
    onConfirm: () => void;
    outboundSummary: TripSummary | null;
    returnSummary: TripSummary | null;
    outboundHolds: HeldSeat[];
    returnHolds: HeldSeat[];
    passengers: Record<string, Passenger>;
    setPassengers: React.Dispatch<React.SetStateAction<Record<string, Passenger>>>;
}

export function BookingConfirmationModal({
    isOpen,
    onClose,
    confirming,
    onConfirm,
    outboundSummary,
    returnSummary,
    outboundHolds,
    returnHolds,
    passengers,
    setPassengers,
}: BookingConfirmationModalProps) {
    const allHolds = [...outboundHolds, ...returnHolds];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Confirm booking"
            footer={
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="flex-1 rounded-full border-gray-200"
                        disabled={confirming}
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button className="flex-1 font-semibold rounded-full shadow-lg shadow-primary/20" disabled={confirming} onClick={onConfirm}>
                        {confirming ? 'Confirming…' : 'Confirm'}
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                {outboundSummary && (
                    <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50">
                        <p className="font-semibold text-gray-900">Outbound</p>
                        <p className="text-sm text-gray-700 mt-1">{outboundSummary.route}</p>
                        <p className="text-xs text-gray-600 mt-1">
                            {outboundSummary.when} · {outboundSummary.pickup} → {outboundSummary.dropoff} · {outboundSummary.seats}{' '}
                            seat(s)
                        </p>
                    </div>
                )}

                {returnSummary && (
                    <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50">
                        <p className="font-semibold text-gray-900">Return</p>
                        <p className="text-sm text-gray-700 mt-1">{returnSummary.route}</p>
                        <p className="text-xs text-gray-600 mt-1">
                            {returnSummary.when} · {returnSummary.pickup} → {returnSummary.dropoff} · {returnSummary.seats} seat(s)
                        </p>
                    </div>
                )}

                <div className="border-t pt-4">
                    <p className="text-sm font-semibold text-gray-900 mb-2">Passenger details</p>
                    <div className="space-y-3">
                        {allHolds.map((h, idx) => {
                            const p = passengers[h.hold_id] || { name: '', relation: 'SELF' as const };
                            return (
                                <div key={h.hold_id} className="p-3 rounded-xl border border-gray-200">
                                    <p className="text-xs font-semibold text-gray-600 mb-2">Seat {idx + 1}</p>
                                    <input
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="Passenger name"
                                        value={p.name}
                                        onChange={(e) =>
                                            setPassengers((prev) => ({
                                                ...prev,
                                                [h.hold_id]: { ...p, name: e.target.value },
                                            }))
                                        }
                                    />
                                    <div className="mt-2">
                                        <Select
                                            options={[
                                                { value: 'SELF', label: 'Self' },
                                                { value: 'SPOUSE', label: 'Spouse' },
                                                { value: 'CHILD', label: 'Child' },
                                            ]}
                                            value={p.relation}
                                            onChange={(v) =>
                                                setPassengers((prev) => ({
                                                    ...prev,
                                                    [h.hold_id]: { ...p, relation: v as Passenger['relation'] },
                                                }))
                                            }
                                            placeholder="Relation"
                                            showLabel={false}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
