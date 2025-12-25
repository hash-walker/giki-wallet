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
    status,
    onStatusChange,
    category,
    onCategoryChange,
    busType,
    onBusTypeChange,
}: TicketFiltersProps) => {
    return (
        <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
                <Input
                    placeholder="Search by ticket number, passenger name, user email..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full"
                />
            </div>
            <div className="w-full md:w-48">
                <Select
                    value={status}
                    onChange={(value) => onStatusChange(value)}
                    options={[
                        { value: 'all', label: 'All Statuses' },
                        { value: 'confirmed', label: 'Confirmed' },
                        { value: 'pending', label: 'Pending' },
                        { value: 'cancelled', label: 'Cancelled' },
                    ]}
                    placeholder="Status"
                />
            </div>
            <div className="w-full md:w-48">
                <Select
                    value={category}
                    onChange={(value) => onCategoryChange(value)}
                    options={[
                        { value: 'all', label: 'All Categories' },
                        { value: 'employee', label: 'Employee' },
                        { value: 'family', label: 'Family' },
                        { value: 'student', label: 'Student' },
                    ]}
                    placeholder="Category"
                />
            </div>
            <div className="w-full md:w-48">
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

