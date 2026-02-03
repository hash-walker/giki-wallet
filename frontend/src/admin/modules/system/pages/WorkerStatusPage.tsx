import { useState, useEffect } from 'react';
import { getWorkerStatus, WorkerStatus } from '../service';
import { Activity, CheckCircle, XCircle, Clock, RefreshCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { toast } from 'sonner';

export const WorkerStatusPage = () => {
    const [status, setStatus] = useState<WorkerStatus | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const data = await getWorkerStatus();
            setStatus(data);
        } catch (e) {
            toast.error('Failed to fetch worker status');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // 30s refresh
        return () => clearInterval(interval);
    }, []);

    if (loading && !status) {
        return <div className="p-8 text-center text-gray-500">Loading system status...</div>;
    }

    const stats = status?.stats;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
                    <p className="text-gray-500">Monitor background worker and job queues</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchStatus}
                    disabled={loading}
                    className="flex items-center gap-2"
                >
                    <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className={status?.is_alive ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30'}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center justify-between">
                            Worker Status
                            {status?.is_alive ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${status?.is_alive ? 'text-green-700' : 'text-red-700'}`}>
                            {status?.is_alive ? 'Healthy' : 'Disconnected'}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Last beat: {status?.last_heartbeat ? new Date(status.last_heartbeat).toLocaleTimeString() : 'Never'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Pending Jobs
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{stats?.pending_count || 0}</div>
                        <p className="text-xs text-gray-500 mt-1">Waiting in queue</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Processing
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats?.processing_count || 0}</div>
                        <p className="text-xs text-gray-500 mt-1">Active workers</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <XCircle className="w-4 h-4" />
                            Failed Jobs
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${stats?.failed_count ? 'text-red-600' : 'text-gray-900'}`}>
                            {stats?.failed_count || 0}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Requiring attention</p>
                    </CardContent>
                </Card>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                    <h4 className="text-sm font-semibold text-blue-900">Background Processing Insights</h4>
                    <p className="text-sm text-blue-800 mt-1">
                        Completed <strong>{stats?.completed_last_hour || 0}</strong> jobs in the last hour.
                        The worker is processing <strong>10</strong> parallel streams (Go routines) for email and trip management.
                    </p>
                </div>
            </div>
        </div>
    );
};
