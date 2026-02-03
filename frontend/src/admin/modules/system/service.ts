import api from '@/lib/axios';

export interface WorkerStats {
    pending_count: number;
    processing_count: number;
    failed_count: number;
    completed_last_hour: number;
}

export interface WorkerStatus {
    last_heartbeat: string;
    is_alive: boolean;
    stats: WorkerStats;
}

export const getWorkerStatus = async (): Promise<WorkerStatus> => {
    const resp = await api.get('/admin/worker/status');
    return resp.data;
};

import { SystemAuditLogFilters, SystemAuditLogsResponse } from "./types";

export const getSystemAuditLogs = async (filters: SystemAuditLogFilters): Promise<SystemAuditLogsResponse> => {
    const query = new URLSearchParams();
    if (filters.page) query.append("page", filters.page.toString());
    if (filters.page_size) query.append("page_size", filters.page_size.toString());

    const response = await api.get(`/admin/audit-logs?${query.toString()}`);
    return response.data;
};
