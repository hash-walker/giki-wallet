import { Route } from '../types';
import { TimeSlot } from '../../time-slots/types';
import { Clock, Eye, EyeOff } from 'lucide-react';
import { Card } from '../../shared/Card';
import { ActionButtons } from '../../shared/ActionButtons';

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

    if (routes.length === 0) {
        return (
            <Card>
                <div className="text-center py-12">
                    <p className="text-gray-500">No routes found. Add your first route to get started.</p>
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Route</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Bus Type</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Capacity</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Time Slots</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Stops</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {routes.map((route) => (
                            <tr key={route.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4">
                                    <div>
                                        <span className="text-sm font-medium text-gray-900">
                                            {route.direction === 'from-giki' ? 'From GIKI' : 'To GIKI'} → {getCityName(route.cityId)}
                                        </span>
                                    </div>
                                </td>
                                <td className="py-3 px-4">
                                    <span className={`text-sm font-medium ${
                                        route.busType === 'Student' ? 'text-blue-600' : 'text-green-600'
                                    }`}>
                                        {route.busType}
                                    </span>
                                </td>
                                <td className="py-3 px-4">
                                    <span className="text-sm text-gray-900">{route.capacity} tickets</span>
                                </td>
                                <td className="py-3 px-4">
                                    {(() => {
                                        const slotInfo = getTimeSlotInfo(route.timeSlotIds);
                                        return (
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-gray-400" />
                                                <span className="text-sm text-gray-600">
                                                    {slotInfo.total} slot{slotInfo.total !== 1 ? 's' : ''}
                                                    {slotInfo.customCount > 0 && (
                                                        <span className="text-primary ml-1">
                                                            ({slotInfo.customCount} custom)
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </td>
                                <td className="py-3 px-4">
                                    {(() => {
                                        const cityStops = getStopsForCity(route.cityId);
                                        return (
                                            <span className="text-sm text-gray-600" title={cityStops.map(s => s.name).join(', ')}>
                                                {cityStops.length} stop{cityStops.length !== 1 ? 's' : ''} (all)
                                            </span>
                                        );
                                    })()}
                                </td>
                                <td className="py-3 px-4">
                                    {route.isHeld ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                            <EyeOff className="w-3 h-3 mr-1" />
                                            Held
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            <Eye className="w-3 h-3 mr-1" />
                                            Live
                                        </span>
                                    )}
                                </td>
                                <td className="py-3 px-4">
                                    <ActionButtons
                                        onEdit={() => onEdit(route)}
                                        onDelete={() => onDelete(route.id)}
                                        onToggle={() => onToggleHold(route.id)}
                                        isActive={!route.isHeld}
                                        showToggle={true}
                                        activeLabel="Hold Route"
                                        inactiveLabel="Make Live"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

