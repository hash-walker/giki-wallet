import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Plus, Edit, Trash2, Calendar, Clock } from 'lucide-react';
import { Card } from '../../../shared';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { TimeSlot } from '../types';
import { toast } from '@/lib/toast';

const DAYS_OF_WEEK = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
];

// Helper function to format time from HH:MM to 12-hour format (currently unused, kept for future use)
// const formatTime = (time: string): string => {
//     // If already in 12-hour format, return as is
//     if (time.includes('AM') || time.includes('PM')) {
//         return time;
//     }
//     
//     // Convert HH:MM to 12-hour format
//     const [hours, minutes] = time.split(':');
//     const hour = parseInt(hours);
//     const ampm = hour >= 12 ? 'PM' : 'AM';
//     const hour12 = hour % 12 || 12;
//     return `${hour12}:${minutes} ${ampm}`;
// };

export const TimeSlotsPage = () => {
    // Mock data - replace with API calls
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
        {
            id: 'ts1',
            time: '2:00 PM',
            dayOfWeek: 'Friday',
            isCustom: false,
            isActive: true,
        },
        {
            id: 'ts2',
            time: '6:00 AM',
            dayOfWeek: 'Saturday',
            isCustom: false,
            isActive: true,
        },
        {
            id: 'ts3',
            time: '7:00 PM',
            dayOfWeek: 'Sunday',
            isCustom: false,
            isActive: true,
        },
    ]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSlot, setEditingSlot] = useState<TimeSlot | undefined>();
    const [time, setTime] = useState('');
    const [dayOfWeek, setDayOfWeek] = useState('');
    const [isCustom, setIsCustom] = useState(false);
    const [customDate, setCustomDate] = useState('');
    const [isActive, setIsActive] = useState(true);

    const handleAddSlot = () => {
        setEditingSlot(undefined);
        setTime('');
        setDayOfWeek('');
        setIsCustom(false);
        setCustomDate('');
        setIsActive(true);
        setIsModalOpen(true);
    };

    const handleEditSlot = (slot: TimeSlot) => {
        setEditingSlot(slot);
        setTime(slot.time);
        setDayOfWeek(slot.dayOfWeek);
        setIsCustom(slot.isCustom);
        setCustomDate(slot.customDate || '');
        setIsActive(slot.isActive);
        setIsModalOpen(true);
    };

    const handleDeleteSlot = (id: string) => {
        if (window.confirm('Are you sure you want to delete this time slot?')) {
            setTimeSlots(timeSlots.filter(s => s.id !== id));
            toast.success('Time slot deleted successfully');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!time) {
            alert('Please enter a time');
            return;
        }
        
        if (!isCustom && !dayOfWeek) {
            alert('Please select a day of week for recurring slots');
            return;
        }
        
        if (isCustom && !customDate) {
            alert('Please select a date for custom slots');
            return;
        }

        const slotData: Omit<TimeSlot, 'id'> = {
            time,
            dayOfWeek: isCustom ? '' : dayOfWeek,
            isCustom,
            customDate: isCustom ? customDate : undefined,
            isActive,
        };

        if (editingSlot) {
            setTimeSlots(timeSlots.map(s => 
                s.id === editingSlot.id ? { ...slotData, id: editingSlot.id } : s
            ));
            toast.success('Time slot updated successfully');
        } else {
            const newId = `ts${Date.now()}`;
            setTimeSlots([...timeSlots, { ...slotData, id: newId }]);
            toast.success('Time slot added successfully');
        }
        
        setIsModalOpen(false);
        setEditingSlot(undefined);
    };

    const recurringSlots = timeSlots.filter(s => !s.isCustom && s.isActive);
    const customSlots = timeSlots.filter(s => s.isCustom);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Time Slots Management</h1>
                    <p className="text-gray-600 mt-1">Manage recurring weekly slots and custom one-time slots</p>
                </div>
                <Button onClick={handleAddSlot}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Time Slot
                </Button>
            </div>

            {/* Recurring Weekly Slots */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Recurring Weekly Slots
                </h2>
                <Card>
                    {recurringSlots.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No recurring slots. Add weekly slots that repeat every week.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {recurringSlots.map(slot => (
                                <div
                                    key={slot.id}
                                    className="p-4 border border-gray-200 rounded-lg hover:border-primary/50 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <span className="font-semibold text-gray-900">{slot.time}</span>
                                            </div>
                                            <p className="text-sm text-gray-600">{slot.dayOfWeek}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEditSlot(slot)}
                                                className="h-8 w-8"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteSlot(slot.id)}
                                                className="h-8 w-8 text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Custom One-Time Slots */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Custom One-Time Slots
                </h2>
                <Card>
                    {customSlots.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No custom slots. Add one-time slots for special dates.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {customSlots.map(slot => (
                                <div
                                    key={slot.id}
                                    className="p-4 border border-gray-200 rounded-lg hover:border-primary/50 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <span className="font-semibold text-gray-900">{slot.time}</span>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                {slot.customDate ? new Date(slot.customDate).toLocaleDateString() : 'No date'}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEditSlot(slot)}
                                                className="h-8 w-8"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteSlot(slot.id)}
                                                className="h-8 w-8 text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Time Slot Form Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingSlot(undefined);
                }}
                title={editingSlot ? 'Edit Time Slot' : 'Add Time Slot'}
                size="md"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit}>
                            {editingSlot ? 'Update' : 'Add'} Time Slot
                        </Button>
                    </div>
                }
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Time *
                        </label>
                        <Input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Select the time for this slot (e.g., 14:00 for 2:00 PM)
                        </p>
                    </div>

                    <div className="flex items-center gap-2 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <input
                            type="checkbox"
                            id="isCustom"
                            checked={isCustom}
                            onChange={(e) => setIsCustom(e.target.checked)}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <label htmlFor="isCustom" className="text-sm font-medium text-gray-700 cursor-pointer">
                            This is a custom one-time slot (not recurring weekly)
                        </label>
                    </div>

                    {!isCustom ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Day of Week *
                            </label>
                            <Select
                                value={dayOfWeek}
                                onChange={(value) => setDayOfWeek(value)}
                                options={DAYS_OF_WEEK.map(day => ({
                                    value: day,
                                    label: day,
                                }))}
                                placeholder="Select day of week"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                This slot will repeat every week on the selected day
                            </p>
                        </div>
                    ) : (
                        <div>
                            <Input
                                label="Custom Date *"
                                type="date"
                                value={customDate}
                                onChange={(e) => setCustomDate(e.target.value)}
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                This is a one-time slot for a specific date
                            </p>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
                            Active (visible to users)
                        </label>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

