import { useState, useMemo } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Plus } from 'lucide-react';
import { RoutesTable } from '../components/RoutesTable';
import { RouteFormModal } from '../components/RouteFormModal';
import { Route } from '../types';
import { TimeSlot } from '../../time-slots/types';
import { CITIES, STOPS } from '@/client/modules/booking/data/mockRoutes';
import { toast } from '@/lib/toast';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { PageHeader, WeekSelector, getWeekStart, getWeekEnd, formatWeekRange, isDateInWeek, TableWrapper } from '../../../shared';

export const RoutesPage = () => {
    // Current week state - defaults to current week
    const [currentWeek, setCurrentWeek] = useState<Date>(new Date());

    // Mock time slots - replace with API call
    const [timeSlots] = useState<TimeSlot[]>([
        {
            id: 'ts1',
            time: '14:00', // 2:00 PM
            dayOfWeek: 'Friday',
            isCustom: false,
            isActive: true,
        },
        {
            id: 'ts2',
            time: '06:00', // 6:00 AM
            dayOfWeek: 'Saturday',
            isCustom: false,
            isActive: true,
        },
        {
            id: 'ts3',
            time: '19:00', // 7:00 PM
            dayOfWeek: 'Sunday',
            isCustom: false,
            isActive: true,
        },
    ]);

    // Calculate current week range
    const weekStart = getWeekStart(currentWeek);
    const weekEnd = getWeekEnd(currentWeek);
    const weekRange = formatWeekRange(currentWeek);

    // Mock data - replace with API calls
    // Example routes for demonstration - set weekStart/weekEnd for current week
    const [routes, setRoutes] = useState<Route[]>(() => {
        const ws = getWeekStart(new Date());
        const we = getWeekEnd(new Date());
        return [
            {
                id: 1,
                direction: 'from-giki',
                cityId: 'peshawar',
                busType: 'Student',
                capacity: 40,
                timeSlotIds: ['ts1', 'ts2'],
                isHeld: false,
                weekStart: ws.toISOString().split('T')[0],
                weekEnd: we.toISOString().split('T')[0],
            },
            {
                id: 2,
                direction: 'to-giki',
                cityId: 'islamabad',
                busType: 'Employee',
                capacity: 30,
                timeSlotIds: ['ts3'],
                isHeld: true,
                weekStart: ws.toISOString().split('T')[0],
                weekEnd: we.toISOString().split('T')[0],
            },
        ];
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRoute, setEditingRoute] = useState<Route | undefined>();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDirection, setFilterDirection] = useState<string>('all');
    const [filterCity, setFilterCity] = useState<string>('all');
    const [filterBusType, setFilterBusType] = useState<string>('all');

    const handleAddRoute = () => {
        setEditingRoute(undefined);
        setIsModalOpen(true);
    };

    const handleEditRoute = (route: Route) => {
        setEditingRoute(route);
        setIsModalOpen(true);
    };

    const handleDeleteRoute = (id: number) => {
        if (window.confirm('Are you sure you want to delete this route?')) {
            setRoutes(routes.filter(r => r.id !== id));
            toast.success('Route deleted successfully');
        }
    };

    const handleToggleHold = (id: number) => {
        setRoutes(routes.map(r => 
            r.id === id ? { ...r, isHeld: !r.isHeld } : r
        ));
        const route = routes.find(r => r.id === id);
        toast.success(route?.isHeld ? 'Route is now live' : 'Route is now held');
    };

    const handleSubmitRoute = (routeData: Omit<Route, 'id'>) => {
        // Set weekStart and weekEnd for the route based on current week
        const ws = getWeekStart(currentWeek);
        const we = getWeekEnd(currentWeek);
        const routeWithWeek = {
            ...routeData,
            weekStart: ws.toISOString().split('T')[0],
            weekEnd: we.toISOString().split('T')[0],
        };

        if (editingRoute) {
            // Update existing route
            setRoutes(routes.map(r => 
                r.id === editingRoute.id 
                    ? { ...routeWithWeek, id: editingRoute.id }
                    : r
            ));
            toast.success('Route updated successfully');
        } else {
            // Add new route
            const newId = Math.max(...routes.map(r => r.id), 0) + 1;
            setRoutes([...routes, { ...routeWithWeek, id: newId }]);
            toast.success('Route added successfully');
        }
        setIsModalOpen(false);
        setEditingRoute(undefined);
    };

    // Helper functions - defined before use
    const getCityName = (cityId: string) => {
        return CITIES.find(c => c.id === cityId)?.name || cityId;
    };

    // Filter routes by current week and other filters
    const filteredRoutes = useMemo(() => {
        return routes.filter(route => {
            // Week filter - only show routes for the selected week
            if (route.weekStart && route.weekEnd) {
                const routeWeekStart = new Date(route.weekStart);
                const routeWeekEnd = new Date(route.weekEnd);
                if (!isDateInWeek(routeWeekStart, weekStart, weekEnd) && 
                    !isDateInWeek(routeWeekEnd, weekStart, weekEnd)) {
                    // Check if routes overlap with current week
                    const overlaps = (routeWeekStart <= weekEnd && routeWeekEnd >= weekStart);
                    if (!overlaps) return false;
                }
            }
            
            const matchesSearch = 
                getCityName(route.cityId).toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesDirection = filterDirection === 'all' || route.direction === filterDirection;
            const matchesCity = filterCity === 'all' || route.cityId === filterCity;
            const matchesBusType = filterBusType === 'all' || route.busType === filterBusType;

            return matchesSearch && matchesDirection && matchesCity && matchesBusType;
        });
    }, [routes, weekStart, weekEnd, searchTerm, filterDirection, filterCity, filterBusType]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Routes Management"
                description="Manage bus routes and schedules"
                action={
                    <Button onClick={handleAddRoute}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Route
                    </Button>
                }
            />

            {/* Week Selector */}
            <WeekSelector
                currentWeek={currentWeek}
                onWeekChange={setCurrentWeek}
                weekRange={weekRange}
            />

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Search by city..."
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
                        placeholder="Filter by direction"
                    />
                </div>
                <div className="w-full md:w-48">
                    <Select
                        value={filterCity}
                        onChange={(value) => setFilterCity(value)}
                        options={[
                            { value: 'all', label: 'All Cities' },
                            ...CITIES.map(city => ({
                                value: city.id,
                                label: city.name,
                            })),
                        ]}
                        placeholder="Filter by city"
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
                        placeholder="Filter by type"
                    />
                </div>
            </div>

            {/* Routes Table */}
            <TableWrapper count={filteredRoutes.length} itemName="route">
                <RoutesTable
                    routes={filteredRoutes}
                    cities={CITIES}
                    timeSlots={timeSlots}
                    stops={STOPS}
                    onEdit={handleEditRoute}
                    onDelete={handleDeleteRoute}
                    onToggleHold={handleToggleHold}
                />
            </TableWrapper>

            {/* Route Form Modal */}
            <RouteFormModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingRoute(undefined);
                }}
                onSubmit={handleSubmitRoute}
                route={editingRoute}
                cities={CITIES}
                timeSlots={timeSlots}
                stops={STOPS}
            />
        </div>
    );
};

