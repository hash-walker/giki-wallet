import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { WeekSelector } from '@/admin/shared/components/WeekSelector';
import { useTripCreateStore } from '../store';
import { cn } from '@/lib/utils';
import { TripResponse } from '../types';
import { DeleteTripModal } from '../components/DeleteTripModal';
import { ExportTripsModal } from '../components/ExportTripsModal';

export const TripsPage = () => {
    const navigate = useNavigate();
    const { trips, isLoadingTrips, fetchTrips, deleteTrip, isDeletingTrip } = useTripCreateStore();

    const [currentWeek, setCurrentWeek] = useState(new Date());
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [tripToDelete, setTripToDelete] = useState<TripResponse | null>(null);

    useEffect(() => {
        const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
        fetchTrips(weekStart, weekEnd);
    }, [currentWeek, fetchTrips]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN': return 'bg-green-100 text-green-800';
            case 'FULL': return 'bg-orange-100 text-orange-800';
            case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
            case 'CLOSED': return 'bg-gray-100 text-gray-800';
            case 'CANCELLED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekRange = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;

    const handleDeleteClick = (trip: TripResponse) => {
        setTripToDelete(trip);
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (tripToDelete) {
            const success = await deleteTrip(tripToDelete.id);
            if (success) {
                setDeleteModalOpen(false);
                setTripToDelete(null);
            }
        }
    };

    const handleEditClick = (tripId: string) => {
        navigate(`/admin/trips/${tripId}/edit`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Trips Management</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        View and manage upcoming transport trips.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/admin/trips/history')}>
                        History
                    </Button>
                    <Button variant="outline" onClick={() => setExportModalOpen(true)}>
                        <Download className="w-4 h-4 mr-2" />
                        Export Data
                    </Button>
                    <Button onClick={() => navigate('/admin/trips/new')}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Trip
                    </Button>
                </div>
            </div>

            {/* Week Filter */}
            <WeekSelector
                currentWeek={currentWeek}
                onWeekChange={setCurrentWeek}
                weekRange={weekRange}
            />

            {/* Trips List */}
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                {isLoadingTrips ? (
                    <div className="p-8 text-center text-gray-500">Loading trips...</div>
                ) : trips.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Plus className="w-6 h-6 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No trips found</h3>
                        <p className="text-gray-500 mt-1 mb-6">Get started by creating your first trip.</p>
                        <Button onClick={() => navigate('/admin/trips/new')}>
                            Create Trip
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                                <tr>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Route</th>
                                    <th className="px-6 py-4">Departure</th>
                                    <th className="px-6 py-4">Available / Total</th>
                                    <th className="px-6 py-4">Price</th>
                                    <th className="px-6 py-4">Bus Type</th>
                                    <th className="px-6 py-4">Direction</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {trips.map((trip) => (
                                    <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide",
                                                getStatusColor(trip.status)
                                            )}>
                                                {trip.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {trip.route_name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {format(new Date(trip.departure_time), 'EEE, MMM d • h:mm a')}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <span className="font-semibold">{trip.available_seats}</span>
                                            <span className="text-gray-400 mx-1">/</span>
                                            <span className="text-gray-500">{trip.total_capacity}</span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {trip.base_price.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {trip.bus_type}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {trip.direction}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Edit button - to be implemented
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditClick(trip.id)}
                                                >
                                                    <Pencil className="w-4 h-4 mr-1" />
                                                    Edit
                                                </Button>
                                                */}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteClick(trip)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-1" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {tripToDelete && (
                <DeleteTripModal
                    isOpen={deleteModalOpen}
                    tripName={tripToDelete.route_name}
                    departureTime={format(new Date(tripToDelete.departure_time), 'EEE, MMM d • h:mm a')}
                    onClose={() => {
                        setDeleteModalOpen(false);
                        setTripToDelete(null);
                    }}
                    onConfirm={handleDeleteConfirm}
                    isDeleting={isDeletingTrip}
                />
            )}

            <ExportTripsModal
                isOpen={exportModalOpen}
                onClose={() => setExportModalOpen(false)}
            />
        </div>
    );
};
