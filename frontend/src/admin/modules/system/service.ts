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
