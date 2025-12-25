import { Route } from '../types';
import { TimeSlot } from '../../time-slots/types';
import { Clock, Eye, EyeOff } from 'lucide-react';
import { Table, ActionButtons } from '../../../shared';

interface RoutesTableProps {
    routes: Route[];
    cities: Array<{ id: string; name: string }>;
    timeSlots: TimeSlot[];
    stops: Array<{ id: string; name: string }>;
    onEdit: (route: Route) => void;
    onDelete: (id: number) => void;
    onToggleHold: (id: number) => void;
}

const formatTime = (time: string): string => {
    if (time.includes('AM') || time.includes('PM')) {
        return time;
    }
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
};

export const RoutesTable = ({
    routes,
    cities,
    timeSlots,
    stops,
    onEdit,
    onDelete,
    onToggleHold
}: RoutesTableProps) => {
    const getCityName = (cityId: string) => {
        return cities.find(c => c.id === cityId)?.name || cityId;
    };

    // Get all stops for a city (automatically included)
    const getStopsForCity = (cityId: string) => {
        const cityPrefix = cityId.substring(0, 3);
        return stops.filter(s => s.id.startsWith(cityPrefix));
    };

    const getTimeSlotInfo = (timeSlotIds: string[]) => {
        const slotInfo = timeSlotIds.map(id => {
            // Check if it's a custom slot (starts with 'custom_')
            if (id.startsWith('custom_')) {
                return { label: 'Custom', isCustom: true };
            }
            // Find in default slots
            const slot = timeSlots.find(ts => ts.id === id);
            if (slot) {
                return {
                    label: `${formatTime(slot.time)} - ${slot.dayOfWeek}`,
                    isCustom: false
                };
            }
            return null;
        }).filter(Boolean);
        
        const defaultCount = slotInfo.filter(s => !s?.isCustom).length;
        const customCount = slotInfo.filter(s => s?.isCustom).length;
        
        return { defaultCount, customCount, total: timeSlotIds.length };
    };

    const headers = [
        { content: 'Route', align: 'left' as const },
        { content: 'Bus Type', align: 'left' as const },
        { content: 'Capacity', align: 'left' as const },
        { content: 'Time Slots', align: 'left' as const },
        { content: 'Stops', align: 'left' as const },
        { content: 'Status', align: 'left' as const },
        { content: 'Actions', align: 'right' as const },
    ];

    const rows = routes.map((route) => {
        const slotInfo = getTimeSlotInfo(route.timeSlotIds);
        const cityStops = getStopsForCity(route.cityId);

        return {
            key: route.id,
            cells: [
                <div key="route">
                    <span className="text-sm font-medium text-gray-900">
                        {route.direction === 'from-giki' ? 'From GIKI' : 'To GIKI'} → {getCityName(route.cityId)}
                    </span>
                </div>,
                <span key="busType" className={`text-sm font-medium ${
                    route.busType === 'Student' ? 'text-blue-600' : 'text-green-600'
                }`}>
                    {route.busType}
                </span>,
                <span key="capacity" className="text-sm text-gray-900">{route.capacity} tickets</span>,
                <div key="timeSlots" className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-sm text-gray-600">
                        {slotInfo.total} slot{slotInfo.total !== 1 ? 's' : ''}
                        {slotInfo.customCount > 0 && (
                            <span className="text-primary ml-1">
                                ({slotInfo.customCount} custom)
                            </span>
                        )}
                    </span>
                </div>,
                <span key="stops" className="text-sm text-gray-600" title={cityStops.map(s => s.name).join(', ')}>
                    {cityStops.length} stop{cityStops.length !== 1 ? 's' : ''} (all)
                </span>,
                route.isHeld ? (
                    <span key="status-held" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <EyeOff className="w-3 h-3 mr-1" />
                        Held
                    </span>
                ) : (
                    <span key="status-live" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Eye className="w-3 h-3 mr-1" />
                        Live
                    </span>
                ),
                <ActionButtons
                    key="actions"
                    onEdit={() => onEdit(route)}
                    onDelete={() => onDelete(route.id)}
                    onToggle={() => onToggleHold(route.id)}
                    isActive={!route.isHeld}
                    showToggle={true}
                    activeLabel="Hold Route"
                    inactiveLabel="Make Live"
                />,
            ],
        };
    });

    return (
        <Table
            headers={headers}
            rows={rows}
            emptyMessage="No routes found. Add your first route to get started."
        />
    );
};

