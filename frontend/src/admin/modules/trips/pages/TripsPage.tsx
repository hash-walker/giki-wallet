import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/Input';
import { useTripCreateStore } from '../store';
import { cn } from '@/lib/utils';
import { TripResponse } from '../types';

export const TripsPage = () => {
    const navigate = useNavigate();
    const { trips, isLoadingTrips, fetchTrips } = useTripCreateStore();

    useEffect(() => {
        fetchTrips();
    }, [fetchTrips]);

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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Trips Management</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        View and manage upcoming transport trips.
                    </p>
                </div>
                <Button onClick={() => navigate('/admin/trips/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Trip
                </Button>
            </div>

            {/* Filter Bar (Placeholder for now) */}
            <div className="flex items-center gap-3 p-4 bg-white border rounded-lg shadow-sm">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search trips..."
                        className="pl-9 h-10"
                    />
                </div>
                <Button variant="outline" size="sm" className="hidden sm:flex">
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                </Button>
            </div>

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
                                    <tr key={trip.trip_id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide",
                                                getStatusColor(trip.booking_status)
                                            )}>
                                                {trip.booking_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {trip.route_name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {format(new Date(trip.departure_time), 'EEE, MMM d • HH:mm')}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <span className="font-semibold">{trip.available_seats}</span>
                                            <span className="text-gray-400 mx-1">/</span>
                                            <span className="text-gray-400">
                                                {/* Total capacity logic isn't directly exposed in this DTO, 
                                                    but Available + Sold would be Total. 
                                                    Or we can just show available for now. 
                                                */}
                                                -
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            ${trip.price.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {trip.bus_type}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {trip.direction}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="sm">
                                                Edit
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
