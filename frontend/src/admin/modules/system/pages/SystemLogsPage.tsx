import React, { useEffect, useState, useCallback } from 'react';
import { getSystemAuditLogs } from '../service';
import { SystemAuditLog } from '../types';
import { LogDetailsModal } from '../components/LogDetailsModal';
import { PageHeader, TableWrapper, Table, PaginationControl } from '@/admin/shared';
import { Button } from '@/shared/components/ui/button';
import { Eye, RefreshCw } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { toast } from '@/lib/toast';

export const SystemLogsPage: React.FC = () => {
    const [page, setPage] = useState(1);
    const pageSize = 20;
    const [selectedLog, setSelectedLog] = useState<SystemAuditLog | null>(null);

    const [logs, setLogs] = useState<SystemAuditLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getSystemAuditLogs({ page, page_size: pageSize });
            setLogs(res.data);
            setTotal(res.meta.total_items);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
            const errorMsg = error instanceof Error ? error.message : 'Failed to fetch audit logs';
            setError(errorMsg);
            toast.error(errorMsg);
            setLogs([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize]);

    useEffect(() => {
        void fetchLogs();
    }, [fetchLogs]);

    const totalPages = Math.ceil(total / pageSize);

    // Prepare headers for the Table component
    const headers = [
        { content: 'Time', align: 'left' as const },
        { content: 'Action', align: 'left' as const },
        { content: 'Status', align: 'left' as const },
        { content: 'Actor', align: 'left' as const },
        { content: 'Target', align: 'left' as const },
        { content: 'IP Address', align: 'left' as const },
        { content: 'Actions', align: 'right' as const },
    ];

    // Prepare rows for the Table component
    const rows = logs.map((log) => ({
        key: log.id,
        cells: [
            <span key="time" className="text-sm text-gray-600 font-medium">
                {formatInTimeZone(new Date(log.created_at), 'Asia/Karachi', 'MMM dd, HH:mm:ss')}
            </span>,
            <span key="action" className="text-sm font-semibold text-gray-800">
                {log.action}
            </span>,
            <span key="status">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {log.status}
                </span>
            </span>,
            <div key="actor">
                {log.actor_name ? (
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{log.actor_name}</span>
                        <span className="text-xs text-gray-500">{log.actor_email}</span>
                    </div>
                ) : (
                    <span className="text-sm text-gray-400 italic">System</span>
                )}
            </div>,
            <div key="target">
                {log.target_name ? (
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{log.target_name}</span>
                        <span className="text-xs text-gray-500">{log.target_email}</span>
                    </div>
                ) : (
                    <span className="text-sm text-gray-400">-</span>
                )}
            </div>,
            <span key="ip" className="text-sm font-mono text-gray-500">
                {log.ip_address}
            </span>,
            <div key="actions" className="text-right">
                <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)}>
                    <Eye className="h-4 w-4 text-gray-500" />
                </Button>
            </div>
        ]
    }));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <PageHeader
                    title="System Audit Logs"
                    description="View security events and user activity."
                />
                <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-700">
                        <strong>Error:</strong> {error}
                    </p>
                </div>
            )}

            <TableWrapper count={total} itemName="log" isLoading={loading}>
                {/* Pagination (Top) */}
                {total > pageSize && (
                    <div className="mb-4 flex justify-end">
                        <PaginationControl
                            currentPage={page}
                            totalPages={totalPages}
                            onPageChange={setPage}
                        />
                    </div>
                )}

                <Table
                    headers={headers}
                    rows={rows}
                    emptyMessage="No audit logs found."
                />

                {/* Pagination (Bottom) */}
                {total > pageSize && (
                    <div className="mt-4 flex justify-end">
                        <PaginationControl
                            currentPage={page}
                            totalPages={totalPages}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </TableWrapper>

            <LogDetailsModal
                log={selectedLog}
                open={!!selectedLog}
                onClose={() => setSelectedLog(null)}
            />
        </div>
    );
};
