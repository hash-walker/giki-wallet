import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';

interface TicketFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    status: string;
    onStatusChange: (value: string) => void;
    category: string;
    onCategoryChange: (value: string) => void;
    busType: string;
    onBusTypeChange: (value: string) => void;
}

export const TicketFilters = ({
    searchTerm,
    onSearchChange,
    busType,
    onBusTypeChange,
}: TicketFiltersProps) => {
    return (
        <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
                <Input
                    placeholder="Search by ticket code, passenger, user..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full"
                />
            </div>
            <div className="w-full md:w-64">
                <Select
                    value={busType}
                    onChange={(value) => onBusTypeChange(value)}
                    options={[
                        { value: 'all', label: 'All Bus Types' },
                        { value: 'Student', label: 'Student' },
                        { value: 'Employee', label: 'Employee' },
                    ]}
                    placeholder="Bus Type"
                />
            </div>
        </div>
    );
};
