import { useState, useMemo } from 'react';
import { Table, PageHeader, TableWrapper } from '../../shared';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from './HistoryBadge';
import { formatDate } from '../utils/formatting';
import { Download } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

// Historical route data (routes from previous weeks)
interface RouteHistory {
    id: number;
    routeName: string;
    direction: 'from-giki' | 'to-giki';
    cityId: string;
    cityName: string;
    busType: 'Student' | 'Employee';
    capacity: number;
    timeSlots: string[];
    isHeld: boolean;
    weekStart: string; // ISO date
    weekEnd: string; // ISO date
    createdAt: string;
    updatedAt: string;
}

export const RoutesHistory = () => {
    // Mock data - replace with API calls
    const [routes] = useState<RouteHistory[]>([
        {
            id: 1,
            routeName: 'GIKI to Peshawar',
            direction: 'to-giki',
            cityId: 'peshawar',
            cityName: 'Peshawar',
            busType: 'Student',
            capacity: 40,
            timeSlots: ['14:00', '06:00'],
            isHeld: false,
            weekStart: new Date(Date.now() - 604800000 * 2).toISOString().split('T')[0], // 2 weeks ago
            weekEnd: new Date(Date.now() - 604800000 * 2 + 6 * 86400000).toISOString().split('T')[0],
            createdAt: new Date(Date.now() - 604800000 * 2).toISOString(),
            updatedAt: new Date(Date.now() - 604800000 * 2).toISOString(),
        },
        {
            id: 2,
            routeName: 'GIKI to Islamabad',
            direction: 'from-giki',
            cityId: 'islamabad',
            cityName: 'Islamabad',
            busType: 'Employee',
            capacity: 30,
            timeSlots: ['19:00'],
            isHeld: true,
            weekStart: new Date(Date.now() - 604800000).toISOString().split('T')[0], // 1 week ago
            weekEnd: new Date(Date.now() - 604800000 + 6 * 86400000).toISOString().split('T')[0],
            createdAt: new Date(Date.now() - 604800000).toISOString(),
            updatedAt: new Date(Date.now() - 604800000).toISOString(),
        },
    ]);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterDirection, setFilterDirection] = useState<string>('all');
    const [filterBusType, setFilterBusType] = useState<string>('all');
    const [filterCity, setFilterCity] = useState<string>('all');

    const filteredRoutes = useMemo(() => {
        return routes.filter((route) => {
            const matchesSearch =
                route.cityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                route.routeName.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesDirection = filterDirection === 'all' || route.direction === filterDirection;
            const matchesBusType = filterBusType === 'all' || route.busType === filterBusType;
            const matchesCity = filterCity === 'all' || route.cityId === filterCity;

            return matchesSearch && matchesDirection && matchesBusType && matchesCity;
        });
    }, [routes, searchTerm, filterDirection, filterBusType, filterCity]);

    const headers = [
        { content: 'Week', align: 'left' as const },
        { content: 'Route', align: 'left' as const },
        { content: 'Bus Type', align: 'left' as const },
        { content: 'Capacity', align: 'left' as const },
        { content: 'Time Slots', align: 'left' as const },
        { content: 'Status', align: 'left' as const },
        { content: 'Created', align: 'left' as const },
    ];

    const rows = filteredRoutes.map((route) => ({
        key: route.id,
        cells: [
            <div key="week">
                <div className="text-sm font-medium text-gray-900">
                    {formatDate(route.weekStart)} - {formatDate(route.weekEnd)}
                </div>
            </div>,
            <div key="route">
                <div className="text-sm font-medium text-gray-900">
                    {route.direction === 'from-giki' ? 'From GIKI' : 'To GIKI'} → {route.cityName}
                </div>
            </div>,
            <Badge key="busType" type="busType" value={route.busType} />,
            <div key="capacity" className="text-sm text-gray-900">{route.capacity} tickets</div>,
            <div key="timeSlots" className="text-sm text-gray-600">
                {route.timeSlots.length} slot{route.timeSlots.length !== 1 ? 's' : ''}
            </div>,
            <Badge key="status" type="status" value={route.isHeld ? 'held' : 'live'} />,
            <div key="created" className="text-sm text-gray-600">{formatDate(route.createdAt)}</div>,
        ],
    }));

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Search by city or route name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                    />
                </div>
                <div className="w-full md:w-48">
                    <Select
                        value={filterDirection}
                        onChange={(value) => setFilterDirection(value)}
                        options={[
                            { value: 'all', label: 'All Directions' },
                            { value: 'from-giki', label: 'From GIKI' },
                            { value: 'to-giki', label: 'To GIKI' },
                        ]}
                        placeholder="Direction"
                    />
                </div>
                <div className="w-full md:w-48">
                    <Select
                        value={filterBusType}
                        onChange={(value) => setFilterBusType(value)}
                        options={[
                            { value: 'all', label: 'All Types' },
                            { value: 'Student', label: 'Student' },
                            { value: 'Employee', label: 'Employee' },
                        ]}
                        placeholder="Bus Type"
                    />
                </div>
            </div>

            {/* Table */}
            <TableWrapper count={filteredRoutes.length} itemName="route">
                <Table headers={headers} rows={rows} emptyMessage="No route history found." />
            </TableWrapper>
        </div>
    );
};

