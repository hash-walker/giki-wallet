import { Select } from '@/shared/components/ui/Select';
import { City } from '../types';

interface RoundTripCitySelectorProps {
    cities: City[];
    selectedCityId: string | null;
    onCityChange: (cityId: string | null) => void;
}

export const RoundTripCitySelector = ({
    cities,
    selectedCityId,
    onCityChange
}: RoundTripCitySelectorProps) => {
    return (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Select City (for both directions)
            </label>
            <Select
                options={cities.map(c => ({ value: c.id, label: c.name }))}
                value={selectedCityId}
                onChange={onCityChange}
                placeholder="Select City"
            />
        </div>
    );
};

