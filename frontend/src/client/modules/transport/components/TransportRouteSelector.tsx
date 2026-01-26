import { Select } from '@/shared/components/ui/Select';
import { TransportRoute } from '../api';

interface TransportRouteSelectorProps {
    routes: TransportRoute[];
    routesLoading: boolean;
    selectedRouteId: string | null;
    onSelectRoute: (id: string) => void;
    returnRouteId: string | null;
    onSelectReturnRoute: (id: string) => void;
    stage: 'select_outbound' | 'select_return';
    roundTrip: boolean;
    onToggleRoundTrip: () => void;
}

export function TransportRouteSelector({
    routes,
    routesLoading,
    selectedRouteId,
    onSelectRoute,
    returnRouteId,
    onSelectReturnRoute,
    stage,
    roundTrip,
    onToggleRoundTrip,
}: TransportRouteSelectorProps) {

    const routeOptions = routes.map((r) => ({ value: r.route_id, label: r.route_name }));

    return (
        <div className="bg-white border border-gray-200 rounded-3xl p-5 md:p-6 shadow-sm mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {!routesLoading && routes.length === 0 && (
                <div className="mb-4 p-4 rounded-xl border border-yellow-200 bg-yellow-50 text-yellow-900 text-sm">
                    No transport routes are configured yet.
                </div>
            )}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-[240px] flex-1">
                    <Select
                        label="Trip"
                        options={routeOptions}
                        value={stage === 'select_outbound' ? selectedRouteId : returnRouteId}
                        onChange={(v) => {
                            if (stage === 'select_outbound') onSelectRoute(v);
                            else onSelectReturnRoute(v);
                        }}
                        placeholder={routesLoading ? 'Loading routes…' : 'Select your trip'}
                        disabled={routesLoading || routes.length === 0}
                        showLabel={true}
                    />
                </div>

                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">Round trip</label>
                    <button
                        type="button"
                        className={`w-11 h-6 rounded-full transition-colors ${roundTrip ? 'bg-accent shadow-sm' : 'bg-gray-300'}`}
                        onClick={onToggleRoundTrip}
                        aria-label="Toggle round trip"
                    >
                        <span
                            className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${roundTrip ? 'translate-x-5' : 'translate-x-1'}`}
                        />
                    </button>
                </div>
            </div>
        </div>
    );
}
