import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useTripCreateStore } from '../store';
import { cn } from '@/lib/utils';
import { PaginationControl } from '@/admin/shared/components/PaginationControl';

export const TripHistoryPage = () => {
    const navigate = useNavigate();
    const { deletedTrips, isLoadingDeletedTrips, fetchDeletedTripsHistory, deletedTripsPagination } = useTripCreateStore();

    useEffect(() => {
        fetchDeletedTripsHistory(1);
    }, [fetchDeletedTripsHistory]);

    const handlePageChange = (page: number) => {
        fetchDeletedTripsHistory(page);
    };

    const totalPages = Math.ceil(deletedTripsPagination.totalCount / deletedTripsPagination.pageSize);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DELETED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/trips')} className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Trip History</h1>
                    </div>
                    <p className="text-sm text-gray-500 ml-10">
                        View history of deleted trips.
                    </p>
                </div>
            </div>

            {/* Trips List */}
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col">
                {isLoadingDeletedTrips ? (
                    <div className="p-8 text-center text-gray-500">Loading history...</div>
                ) : deletedTrips.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        No deleted trips found in history.
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col">
                        <div className="p-4 border-b">
                            <PaginationControl
                                currentPage={deletedTripsPagination.page}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                            />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                                    <tr>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Route</th>
                                        <th className="px-6 py-4">Departure</th>
                                        <th className="px-6 py-4">Deleted At</th>
                                        <th className="px-6 py-4">Capacity</th>
                                        <th className="px-6 py-4">Bus Type</th>
                                        <th className="px-6 py-4">Direction</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {deletedTrips.map((trip) => (
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
                                                {trip.deleted_at ? format(new Date(trip.deleted_at), 'MMM d, yyyy • h:mm a') : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {trip.total_capacity}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {trip.bus_type}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {trip.direction}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>


                    </div>
                )}
            </div>
        </div>
    );
};
