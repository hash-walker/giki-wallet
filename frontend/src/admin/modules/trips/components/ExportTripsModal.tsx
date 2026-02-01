import { useState, useEffect } from 'react';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { Download, Check, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Modal } from '@/shared/components/ui/Modal';
import { WeekSelector } from '@/admin/shared/components/WeekSelector';
import { TripService } from '../service';
import { Route } from '../types';

interface ExportTripsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ExportTripsModal = ({ isOpen, onClose }: ExportTripsModalProps) => {
    const [currentWeek, setCurrentWeek] = useState(new Date());
    const [routes, setRoutes] = useState<Route[]>([]);
    const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([]);
    const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadRoutes();
        }
    }, [isOpen]);

    const loadRoutes = async () => {
        try {
            setIsLoadingRoutes(true);
            const data = await TripService.getAllRoutes();
            setRoutes(data);
            // Default select all
            setSelectedRouteIds(data.map(r => r.route_id));
        } catch (error) {
            console.error('Failed to load routes', error);
        } finally {
            setIsLoadingRoutes(false);
        }
    };

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

            const blob = await TripService.exportTrips(weekStart, weekEnd, selectedRouteIds);

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `trips-export-${format(weekStart, 'yyyyMMdd')}-${format(weekEnd, 'yyyyMMdd')}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            onClose();
        } catch (error) {
            console.error('Export failed', error);
        } finally {
            setIsExporting(false);
        }
    };

    const toggleRoute = (routeId: string) => {
        setSelectedRouteIds(prev =>
            prev.includes(routeId)
                ? prev.filter(id => id !== routeId)
                : [...prev, routeId]
        );
    };

    const toggleAll = () => {
        if (selectedRouteIds.length === routes.length) {
            setSelectedRouteIds([]);
        } else {
            setSelectedRouteIds(routes.map(r => r.route_id));
        }
    };

    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekRange = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Export Trip Data">
            <div className="space-y-6">
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Date Range</label>
                    <WeekSelector
                        currentWeek={currentWeek}
                        onWeekChange={setCurrentWeek}
                        weekRange={weekRange}
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Routes</label>
                        <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-blue-600"
                            onClick={toggleAll}
                        >
                            {selectedRouteIds.length === routes.length ? 'Deselect All' : 'Select All'}
                        </Button>
                    </div>

                    <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-1 bg-gray-50">
                        {isLoadingRoutes ? (
                            <div className="text-center py-4 text-gray-500 text-sm">Loading routes...</div>
                        ) : routes.length === 0 ? (
                            <div className="text-center py-4 text-gray-500 text-sm">No routes found</div>
                        ) : (
                            routes.map(route => (
                                <div
                                    key={route.route_id}
                                    className="flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer"
                                    onClick={() => toggleRoute(route.route_id)}
                                >
                                    <div className={`
                                        w-4 h-4 rounded border flex items-center justify-center transition-colors
                                        ${selectedRouteIds.includes(route.route_id)
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : 'border-gray-300 bg-white'}
                                    `}>
                                        {selectedRouteIds.includes(route.route_id) && <Check className="w-3 h-3" />}
                                    </div>
                                    <span className="text-sm text-gray-700">{route.route_name}</span>
                                </div>
                            ))
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        {selectedRouteIds.length} of {routes.length} routes selected
                    </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={onClose} disabled={isExporting}>
                        Cancel
                    </Button>
                    <Button onClick={handleExport} disabled={isExporting || selectedRouteIds.length === 0}>
                        {isExporting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-2" />
                                Export CSV
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
