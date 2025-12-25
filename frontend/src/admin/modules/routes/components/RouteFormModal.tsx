import { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/Select';
import { Route } from '../types';
import { TimeSlot } from '../../time-slots/types';
import { X, Plus, Calendar, Clock } from 'lucide-react';

interface RouteFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (route: Omit<Route, 'id'>) => void;
    route?: Route;
    cities: Array<{ id: string; name: string }>;
    timeSlots: TimeSlot[]; // All available time slots (default + custom)
    stops: Array<{ id: string; name: string }>;
}

interface CustomSlot {
    id: string;
    date: string;
    time: string;
}

export const RouteFormModal = ({
    isOpen,
    onClose,
    onSubmit,
    route,
    cities,
    timeSlots,
    stops
}: RouteFormModalProps) => {
    const [direction, setDirection] = useState<'from-giki' | 'to-giki'>('from-giki');
    const [cityId, setCityId] = useState<string>('');
    const [busType, setBusType] = useState<'Student' | 'Employee'>('Student');
    const [capacity, setCapacity] = useState<string>('40');
    const [selectedTimeSlotIds, setSelectedTimeSlotIds] = useState<string[]>([]);
    const [customSlots, setCustomSlots] = useState<CustomSlot[]>([]);
    const [isHeld, setIsHeld] = useState(false);
    const [showCustomSlotForm, setShowCustomSlotForm] = useState(false);
    const [customDate, setCustomDate] = useState('');
    const [customTime, setCustomTime] = useState('');

    // Get all stops for selected city (automatically included)
    const availableStops = stops.filter(stop => {
        if (!cityId) return false;
        const cityPrefix = cityId.substring(0, 3);
        return stop.id.startsWith(cityPrefix);
    });

    // Get default/recurring time slots (active ones) - memoized to prevent infinite loops
    const defaultTimeSlots = useMemo(() => 
        timeSlots.filter(ts => !ts.isCustom && ts.isActive),
        [timeSlots]
    );

    // Track if form has been initialized to prevent re-initialization
    const isInitialized = useRef(false);

    useEffect(() => {
        // Only initialize when modal opens
        if (!isOpen) {
            isInitialized.current = false;
            return;
        }

        // Only initialize once when modal opens
        if (!isInitialized.current) {
            if (route) {
                setDirection(route.direction);
                setCityId(route.cityId);
                setBusType(route.busType);
                setCapacity(route.capacity.toString());
                
                // Separate default slots from custom slots
                const routeSlotIds = route.timeSlotIds || [];
                const defaultSlotIds = routeSlotIds.filter(id => !id.startsWith('custom_'));
                const customSlotIds = routeSlotIds.filter(id => id.startsWith('custom_'));
                
                setSelectedTimeSlotIds(defaultSlotIds);
                // For custom slots, we only have IDs, so we'll need to reconstruct them
                // For now, just track the IDs - in a real app, you'd fetch the full custom slot data
                setCustomSlots(customSlotIds.map(id => ({
                    id,
                    date: '', // Would need to fetch from API
                    time: '', // Would need to fetch from API
                })));
                setIsHeld(route.isHeld);
            } else {
                // Reset form for new route
                setDirection('from-giki');
                setCityId('');
                setBusType('Student');
                setCapacity('40');
                // Pre-select all default time slots
                setSelectedTimeSlotIds(defaultTimeSlots.map(ts => ts.id));
                setCustomSlots([]);
                setIsHeld(true); // Routes are held by default
            }
            isInitialized.current = true;
        }
    }, [isOpen, route, defaultTimeSlots]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!cityId) {
            alert('Please select a city');
            return;
        }
        
        if (selectedTimeSlotIds.length === 0 && customSlots.length === 0) {
            alert('Please select at least one time slot');
            return;
        }

        // Combine default slot IDs with custom slot IDs
        const allTimeSlotIds = [
            ...selectedTimeSlotIds,
            ...customSlots.map(cs => cs.id)
        ];

        onSubmit({
            direction,
            cityId,
            busType,
            capacity: parseInt(capacity) || 0,
            timeSlotIds: allTimeSlotIds,
            isHeld,
        });
    };

    const toggleDefaultTimeSlot = (slotId: string) => {
        setSelectedTimeSlotIds(prev =>
            prev.includes(slotId)
                ? prev.filter(id => id !== slotId)
                : [...prev, slotId]
        );
    };

    const handleAddCustomSlot = () => {
        if (!customDate || !customTime) {
            alert('Please select both date and time');
            return;
        }

        const customSlotId = `custom_${Date.now()}`;
        setCustomSlots([...customSlots, {
            id: customSlotId,
            date: customDate,
            time: customTime,
        }]);
        
        setCustomDate('');
        setCustomTime('');
        setShowCustomSlotForm(false);
    };

    const handleRemoveCustomSlot = (slotId: string) => {
        setCustomSlots(customSlots.filter(cs => cs.id !== slotId));
    };

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

    const formatDate = (date: string): string => {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={route ? 'Edit Route' : 'Add New Route'}
            size="lg"
            footer={
                <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                        {route ? 'Update Route' : 'Add Route'}
                    </Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Direction */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Direction *
                    </label>
                    <Select
                        value={direction}
                        onChange={(value) => setDirection(value as 'from-giki' | 'to-giki')}
                        options={[
                            { value: 'from-giki', label: 'From GIKI' },
                            { value: 'to-giki', label: 'To GIKI' },
                        ]}
                        placeholder="Select direction"
                    />
                </div>

                {/* City */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Destination City *
                    </label>
                    <Select
                        value={cityId}
                        onChange={(value) => setCityId(value)}
                        options={cities.map(city => ({
                            value: city.id,
                            label: city.name,
                        }))}
                        placeholder="Select a city"
                    />
                    {cityId && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-900">
                                <span className="font-semibold">Route:</span> {direction === 'from-giki' ? 'From GIKI' : 'To GIKI'} → {cities.find(c => c.id === cityId)?.name}
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                                All {availableStops.length} stops for this city will be automatically included
                            </p>
                        </div>
                    )}
                </div>

                {/* Bus Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bus Type *
                    </label>
                    <Select
                        value={busType}
                        onChange={(value) => setBusType(value as 'Student' | 'Employee')}
                        options={[
                            { value: 'Student', label: 'Student' },
                            { value: 'Employee', label: 'Employee' },
                        ]}
                        placeholder="Select bus type"
                    />
                </div>

                {/* Capacity */}
                <div>
                    <Input
                        label="Total Capacity (Tickets) *"
                        type="number"
                        min="1"
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        placeholder="e.g., 40"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Total number of tickets available for this route (shared across all time slots)
                    </p>
                </div>

                {/* Default Time Slots */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Time Slots (Recurring Weekly)
                    </label>
                    <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                        {defaultTimeSlots.length === 0 ? (
                            <p className="text-sm text-gray-500">No default time slots available. Add them in Time Slots management.</p>
                        ) : (
                            <div className="space-y-2">
                                {defaultTimeSlots.map(slot => (
                                    <label
                                        key={slot.id}
                                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedTimeSlotIds.includes(slot.id)}
                                            onChange={() => toggleDefaultTimeSlot(slot.id)}
                                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                        />
                                        <div className="flex items-center gap-2 flex-1">
                                            <Clock className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-700">
                                                {formatTime(slot.time)} - {slot.dayOfWeek}
                                            </span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                    {selectedTimeSlotIds.length > 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                            {selectedTimeSlotIds.length} default slot{selectedTimeSlotIds.length !== 1 ? 's' : ''} selected
                        </p>
                    )}
                </div>

                {/* Custom Time Slots */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Custom Time Slots (One-Time)
                        </label>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowCustomSlotForm(!showCustomSlotForm)}
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Custom Slot
                        </Button>
                    </div>

                    {/* Custom Slot Form */}
                    {showCustomSlotForm && (
                        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Date *
                                    </label>
                                    <Input
                                        type="date"
                                        value={customDate}
                                        onChange={(e) => setCustomDate(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Time *
                                    </label>
                                    <Input
                                        type="time"
                                        value={customTime}
                                        onChange={(e) => setCustomTime(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleAddCustomSlot}
                                    className="flex-1"
                                >
                                    Add
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setShowCustomSlotForm(false);
                                        setCustomDate('');
                                        setCustomTime('');
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Custom Slots List */}
                    {customSlots.length > 0 && (
                        <div className="space-y-2">
                            {customSlots.map(customSlot => (
                                <div
                                    key={customSlot.id}
                                    className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg"
                                >
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-medium text-gray-900">
                                            {formatTime(customSlot.time)} - {formatDate(customSlot.date)}
                                        </span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveCustomSlot(customSlot.id)}
                                        className="h-8 w-8 text-red-600 hover:text-red-700"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info: Routes are held by default */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                        <span className="font-semibold">Note:</span> New routes are held by default and won't be visible to users until you make them live from the routes table.
                    </p>
                </div>
            </form>
        </Modal>
    );
};

