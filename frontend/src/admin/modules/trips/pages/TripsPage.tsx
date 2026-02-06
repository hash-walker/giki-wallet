import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import {
    Plus,
    Pencil,
    Trash2,
    Download,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Info,
    CheckSquare,
    Square,
    MoreVertical,
    Ban,
    Loader2,
    Search,
    Clock,
    MapPin
} from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/button';
import { WeekSelector } from '@/admin/shared/components/WeekSelector';
import { useTripCreateStore } from '../store';
import { cn } from '@/lib/utils';
import { TripResponse, Route } from '../types';
import { DeleteTripModal } from '../components/DeleteTripModal';
import { EditTripModal } from '../components/EditTripModal';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Modal } from '@/shared/components/ui/Modal';
import { toast } from 'sonner';
import { TripService } from '../service';

const DESKTOP_FILTERS = [
    { id: 'ALL', label: 'All Trips', color: 'bg-gray-100 text-gray-800' },
    { id: 'OPEN', label: 'Open', color: 'bg-green-100 text-green-800' },
    { id: 'SCHEDULED', label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
    { id: 'CLOSED', label: 'Closed', color: 'bg-gray-100 text-gray-800' },
    { id: 'FULL', label: 'Full', color: 'bg-orange-100 text-orange-800' },
    { id: 'CANCELLED', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

const BUS_TYPE_FILTERS = [
    { id: 'ALL', label: 'All Types' },
    { id: 'STUDENT', label: 'Student' },
    { id: 'EMPLOYEE', label: 'Employee' },
];

export const TripsPage = () => {
    const navigate = useNavigate();
    const {
        trips,
        isLoadingTrips,
        fetchTrips,
        routes,
        fetchRoutes,
        deleteTrip,
        isDeletingTrip,
        updateTripManualStatus,
        batchUpdateTripManualStatus,
        cancelTrip,
        setEditingTrip,
        setDuplicateTemplate
    } = useTripCreateStore();

    const [currentWeek, setCurrentWeek] = useState(new Date());
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [tripToProcess, setTripToProcess] = useState<TripResponse | null>(null);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [busTypeFilter, setBusTypeFilter] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRouteId, setSelectedRouteId] = useState('ALL');
    const [selectedTime, setSelectedTime] = useState('ALL');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        void fetchRoutes();
    }, [fetchRoutes]);

    useEffect(() => {
        const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
        void fetchTrips(weekStart, weekEnd);
    }, [currentWeek, fetchTrips]);

    const normalizedTrips = Array.isArray(trips) ? trips : [];

    const availableTimes = useMemo(() => {
        const times = new Set<string>();
        normalizedTrips.forEach((trip: TripResponse) => {
            const time = format(new Date(trip.departure_time), 'HH:mm');
            times.add(time);
        });
        return Array.from(times).sort();
    }, [normalizedTrips]);

    const filteredTrips = useMemo(() => {
        return trips.filter((trip: TripResponse) => {
            const matchesStatus = statusFilter === 'ALL' || trip.status === statusFilter;
            const matchesBusType = busTypeFilter === 'ALL' || trip.bus_type.toUpperCase() === busTypeFilter;
            const matchesRoute = selectedRouteId === 'ALL' || trip.route_id === selectedRouteId;

            const tripTime = format(new Date(trip.departure_time), 'HH:mm');
            const matchesTime = selectedTime === 'ALL' || tripTime === selectedTime;

            const matchesSearch = searchTerm === '' ||
                trip.route_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                trip.bus_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                trip.direction.toLowerCase().includes(searchTerm.toLowerCase());

            return matchesStatus && matchesBusType && matchesRoute && matchesTime && matchesSearch;
        });
    }, [trips, statusFilter, busTypeFilter, selectedRouteId, selectedTime, searchTerm]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN': return 'bg-green-100 text-green-800 border-green-200';
            case 'FULL': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'SCHEDULED': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'CLOSED': return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-50 text-gray-600 border-gray-200';
        }
    };

    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekRange = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredTrips.length && filteredTrips.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredTrips.map(t => t.id)));
        }
    };

    const toggleSelectOne = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleBatchAction = async (action: 'OPEN' | 'CLOSED' | 'CANCEL' | 'EXPORT') => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;

        if (action === 'CANCEL') {
            if (window.confirm(`Are you sure you want to cancel ${ids.length} trips? This will refund all tickets!`)) {
                for (const id of ids) {
                    await cancelTrip(id);
                }
                setSelectedIds(new Set());
            }
        } else if (action === 'EXPORT') {
            try {
                setIsExporting(true);
                const blob = await TripService.exportTrips(ids);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `trip-manifests-${format(new Date(), 'yyyyMMdd')}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                toast.success('Manifests exported successfully');
                setSelectedIds(new Set());
            } catch (error) {
                console.error(error);
                toast.error('Failed to export manifests');
            } finally {
                setIsExporting(false);
            }
        } else {
            await batchUpdateTripManualStatus(ids, action);
            setSelectedIds(new Set());
        }
    };

    const handleDeleteClick = (trip: TripResponse) => {
        setTripToProcess(trip);
        setDeleteModalOpen(true);
    };

    const handleCancelClick = (trip: TripResponse) => {
        setTripToProcess(trip);
        setCancelModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (tripToProcess) {
            const success = await deleteTrip(tripToProcess.id);
            if (success) {
                setDeleteModalOpen(false);
                setTripToProcess(null);
            }
        }
    };

    const handleCancelConfirm = async () => {
        if (tripToProcess) {
            const success = await cancelTrip(tripToProcess.id);
            if (success) {
                setCancelModalOpen(false);
                setTripToProcess(null);
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Trips Management</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Dynamic trip status and bulk management operations.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => navigate('/admin/trips/new')}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Trip
                    </Button>
                </div>
            </div>

            <WeekSelector
                currentWeek={currentWeek}
                onWeekChange={setCurrentWeek}
                weekRange={weekRange}
            />

            <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm transition-all duration-300">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Secondary Filters: Search, Route, Time */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
                        <div className="relative flex-1 w-full sm:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search route, type, direction..."
                                className="pl-9 h-10 w-full bg-gray-50/50 border-gray-200 focus:bg-white transition-all"
                                value={searchTerm}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="w-full sm:w-64">
                            <Select
                                value={selectedRouteId}
                                onChange={setSelectedRouteId}
                                options={[
                                    { value: 'ALL', label: 'All Routes' },
                                    ...routes.map((r: Route) => ({ value: r.route_id, label: r.route_name }))
                                ]}
                                placeholder="Select Route"
                            />
                        </div>

                        <div className="w-full sm:w-48">
                            <Select
                                value={selectedTime}
                                onChange={setSelectedTime}
                                options={[
                                    { value: 'ALL', label: 'All Times' },
                                    ...availableTimes.map((t: string) => ({ value: t, label: format(new Date(`2000-01-01T${t}:00`), 'hh:mm a') }))
                                ]}
                                placeholder="Departure Time"
                            />
                        </div>
                    </div>
                </div>

                <div className="h-px bg-gray-100" />

                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex bg-gray-100 p-1 rounded-lg w-fit transition-all shadow-inner">
                            {DESKTOP_FILTERS.map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => {
                                        setStatusFilter(filter.id);
                                        setSelectedIds(new Set());
                                    }}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                                        statusFilter === filter.id
                                            ? "bg-white text-gray-900 shadow-sm scale-[1.02]"
                                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                                    )}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex bg-gray-100 p-1 rounded-lg w-fit transition-all shadow-inner">
                            {BUS_TYPE_FILTERS.map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => {
                                        setBusTypeFilter(filter.id);
                                        setSelectedIds(new Set());
                                    }}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                                        busTypeFilter === filter.id
                                            ? "bg-white text-gray-900 shadow-sm scale-[1.02]"
                                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                                    )}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300 z-10">
                            <span className="text-sm font-medium text-gray-600 mr-2">
                                {selectedIds.size} selected
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBatchAction('OPEN')}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Force Open
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBatchAction('CLOSED')}
                                className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                            >
                                <XCircle className="w-4 h-4 mr-1" />
                                Force Close
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBatchAction('CANCEL')}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                                <Ban className="w-4 h-4 mr-1" />
                                Cancel
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBatchAction('EXPORT')}
                                disabled={isExporting}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                                {isExporting ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4 mr-1" />
                                )}
                                Export Manifests
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white border rounded-xl shadow-sm overflow-hidden min-h-[400px]">
                {isLoadingTrips ? (
                    <div className="p-12 flex flex-col items-center justify-center text-gray-400 h-[400px]">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-6"></div>
                        <p className="animate-pulse">Fetching latest trip schedules...</p>
                    </div>
                ) : filteredTrips.length === 0 ? (
                    <div className="p-12 text-center h-[400px] flex flex-col items-center justify-center">
                        <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <Info className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">No trips found</h3>
                        <p className="text-gray-500 mt-2 mb-8 max-w-sm mx-auto">
                            We couldn't find any {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} trips for this period.
                        </p>
                        <Button variant="outline" onClick={() => setStatusFilter('ALL')} className="rounded-full px-8">
                            View All Trips
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b">
                                <tr>
                                    <th className="px-4 py-4 w-10">
                                        <button onClick={toggleSelectAll} className="p-1.5 hover:bg-gray-200 rounded-md transition-colors">
                                            {selectedIds.size === filteredTrips.length ? (
                                                <CheckSquare className="w-4 h-4 text-primary" />
                                            ) : (
                                                <Square className="w-4 h-4 text-gray-400" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 uppercase tracking-wider text-[11px]">Status</th>
                                    <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Route</th>
                                    <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Departure</th>
                                    <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Seats Management</th>
                                    <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Base Price</th>
                                    <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Fleet Details</th>
                                    <th className="px-6 py-4 text-right uppercase tracking-wider text-[11px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredTrips.map((trip) => {
                                    const bookings = trip.total_capacity - trip.available_seats;
                                    const isCancelled = trip.status === 'CANCELLED';
                                    const isFull = trip.status === 'FULL';

                                    return (
                                        <tr key={trip.id} className={cn(
                                            "hover:bg-gray-50/80 transition-colors group",
                                            selectedIds.has(trip.id) && "bg-primary/[0.03] hover:bg-primary/[0.05]"
                                        )}>
                                            <td className="px-4 py-4">
                                                <button
                                                    onClick={() => toggleSelectOne(trip.id)}
                                                    className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
                                                >
                                                    {selectedIds.has(trip.id) ? (
                                                        <CheckSquare className="w-4 h-4 text-primary" />
                                                    ) : (
                                                        <Square className="w-4 h-4 text-gray-400" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className={cn(
                                                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border w-fit shadow-sm",
                                                        getStatusColor(trip.status)
                                                    )}>
                                                        {trip.status}
                                                    </span>
                                                    {trip.manual_status && (
                                                        <span className="text-[9px] text-gray-400 font-medium bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 w-fit">
                                                            OVERRIDE: {trip.manual_status}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-gray-900">
                                                {trip.route_name}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">
                                                        {new Date(trip.departure_time).toLocaleDateString('en-PK', {
                                                            timeZone: 'Asia/Karachi',
                                                            weekday: 'short',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </span>
                                                    <span className="text-xs text-gray-400 mt-0.5">
                                                        {new Date(trip.departure_time).toLocaleTimeString('en-PK', {
                                                            timeZone: 'Asia/Karachi',
                                                            hour: 'numeric',
                                                            minute: '2-digit',
                                                            hour12: true
                                                        })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center justify-between text-[11px] font-medium">
                                                        <span className={isFull ? "text-orange-600" : "text-gray-500"}>
                                                            {bookings} Booked
                                                        </span>
                                                        <span className="text-gray-400">
                                                            {trip.total_capacity} Capacity
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                                                        <div
                                                            className={cn(
                                                                "h-full rounded-full transition-all duration-500",
                                                                isFull ? "bg-orange-500" : "bg-primary shadow-[0_0_8px_-2px_rgba(var(--primary),0.5)]"
                                                            )}
                                                            style={{ width: `${(bookings / trip.total_capacity) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-700 font-bold">
                                                <span className="text-[10px] text-gray-400 mr-1 font-normal underline decoration-primary/30">G-BUX</span>
                                                {trip.base_price.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 text-xs">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium bg-gray-50 px-2 py-0.5 rounded border w-fit">{trip.bus_type}</span>
                                                    <span className="text-[10px] text-gray-400 uppercase tracking-tighter ml-1 font-bold">{trip.direction}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-gray-100 rounded-full">
                                                            <MoreVertical className="h-4 w-4 text-gray-400" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl border-gray-200">
                                                        <DropdownMenuItem
                                                            onClick={() => setEditingTrip(trip)}
                                                            className="rounded-md"
                                                        >
                                                            <Pencil className="w-4 h-4 mr-3 text-gray-400" />
                                                            Edit Trip Schedule
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setDuplicateTemplate(trip);
                                                                navigate('/admin/trips/new');
                                                            }}
                                                            className="rounded-md"
                                                        >
                                                            <Plus className="w-4 h-4 mr-3 text-gray-400" />
                                                            Duplicate Trip
                                                        </DropdownMenuItem>

                                                        {!isCancelled && (
                                                            <>
                                                                <div className="h-px bg-gray-100 my-1.5" />
                                                                <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                                    Manual Overrides
                                                                </div>
                                                                {trip.manual_status !== 'OPEN' && (
                                                                    <DropdownMenuItem onClick={() => updateTripManualStatus(trip.id, 'OPEN')} className="rounded-md">
                                                                        <CheckCircle2 className="w-4 h-4 mr-3 text-green-500" />
                                                                        Force Open Trip
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {trip.manual_status !== 'CLOSED' && (
                                                                    <DropdownMenuItem onClick={() => updateTripManualStatus(trip.id, 'CLOSED')} className="rounded-md">
                                                                        <XCircle className="w-4 h-4 mr-3 text-gray-500" />
                                                                        Force Close Trip
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {trip.manual_status && (
                                                                    <DropdownMenuItem onClick={() => updateTripManualStatus(trip.id, null)} className="rounded-md">
                                                                        <AlertCircle className="w-4 h-4 mr-3 text-blue-500" />
                                                                        Restore Auto-Logic
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <div className="h-px bg-gray-100 my-1.5" />
                                                                <DropdownMenuItem
                                                                    onClick={() => handleCancelClick(trip)}
                                                                    className="text-red-600 rounded-md focus:bg-red-50 focus:text-red-700 font-semibold"
                                                                >
                                                                    <Ban className="w-4 h-4 mr-3" />
                                                                    Cancel Trip & Refund
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}

                                                        {bookings === 0 && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleDeleteClick(trip)}
                                                                className="text-red-900 rounded-md focus:bg-red-100 focus:text-red-950"
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-3 opacity-50" />
                                                                Permanent Delete
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {tripToProcess && (
                <DeleteTripModal
                    isOpen={deleteModalOpen}
                    tripName={tripToProcess.route_name}
                    departureTime={new Date(tripToProcess.departure_time).toLocaleString('en-PK', {
                        timeZone: 'Asia/Karachi',
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    }).replace(',', ' •')}
                    onClose={() => {
                        setDeleteModalOpen(false);
                        setTripToProcess(null);
                    }}
                    onConfirm={handleDeleteConfirm}
                    isDeleting={isDeletingTrip}
                />
            )}

            {tripToProcess && (
                <Modal
                    isOpen={cancelModalOpen}
                    onClose={() => {
                        setCancelModalOpen(false);
                        setTripToProcess(null);
                    }}
                    title="Critical Action: Trip Cancellation"
                >
                    <div className="text-center p-2">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 mb-8 border-4 border-white shadow-sm">
                            <Ban className="h-10 w-10 text-red-600 animate-pulse" />
                        </div>

                        <h3 className="text-2xl font-extrabold text-gray-900 mb-2">
                            Cancel Trip & Refund?
                        </h3>
                        <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto">
                            This trip has active bookings. Immediate action is required to notify and compensate users.
                        </p>

                        <div className="bg-orange-50/50 border border-orange-200/50 rounded-2xl p-6 mb-8 text-left backdrop-blur-sm">
                            <h4 className="text-xs font-bold text-orange-900 flex items-center mb-4 uppercase tracking-widest">
                                <AlertCircle className="w-4 h-4 mr-2 text-orange-600" />
                                Automated Consequences
                            </h4>
                            <ul className="space-y-3">
                                {[
                                    "All confirmed tickets will be immediately cancelled",
                                    "Full refunds will be credited to student wallets",
                                    "Trip status set to CANCELLED (Visible to users)",
                                    "This action is permanent and logged for audit"
                                ].map((step, i) => (
                                    <li key={i} className="flex items-start text-sm text-orange-800/80">
                                        <div className="h-1.5 w-1.5 rounded-full bg-orange-400 mt-1.5 mr-3 shrink-0" />
                                        {step}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 mb-8 flex items-center justify-between border border-gray-100">
                            <div className="text-left">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Target Trip</p>
                                <p className="font-bold text-gray-900">{tripToProcess.route_name}</p>
                            </div>
                            <div className="text-right text-sm text-gray-500">
                                {new Date(tripToProcess.departure_time).toLocaleString('en-PK', {
                                    timeZone: 'Asia/Karachi',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setCancelModalOpen(false);
                                    setTripToProcess(null);
                                }}
                                className="h-12 rounded-xl border-gray-200"
                            >
                                Nevermind
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleCancelConfirm}
                                className="h-12 rounded-xl bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200"
                            >
                                Confirm Cancellation
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
            <EditTripModal />
        </div>
    );
};
