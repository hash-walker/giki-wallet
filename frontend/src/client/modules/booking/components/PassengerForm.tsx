import { formatCNIC } from '../utils/bookingHelpers';

type PassengerData = {
    name: string;
    cnic: string;
    relation: string;
};

interface PassengerFormProps {
    passenger: PassengerData;
    passengerIndex: number;
    tripIndex: number;
    onPassengerChange: (tripIndex: number, passengerIndex: number, field: keyof PassengerData, value: string) => void;
}

export const PassengerForm = ({
    passenger,
    passengerIndex,
    tripIndex,
    onPassengerChange
}: PassengerFormProps) => {
    return (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Passenger {passengerIndex + 1}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                    type="text"
                    value={passenger.name}
                    onChange={(e) => onPassengerChange(tripIndex, passengerIndex, 'name', e.target.value)}
                    placeholder="Full Name *"
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary text-sm"
                    required
                />
                <select
                    value={passenger.relation}
                    onChange={(e) => onPassengerChange(tripIndex, passengerIndex, 'relation', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary text-sm"
                    required
                >
                    <option value="">Relation *</option>
                    <option value="Child">Child</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                </select>
                <input
                    type="text"
                    value={passenger.cnic}
                    onChange={(e) => {
                        const formatted = formatCNIC(e.target.value);
                        onPassengerChange(tripIndex, passengerIndex, 'cnic', formatted);
                    }}
                    placeholder="CNIC (optional)"
                    maxLength={15}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary text-sm"
                />
            </div>
        </div>
    );
};

