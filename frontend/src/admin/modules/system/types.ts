export interface SystemAuditLog {
    id: string;
    action: string;
    actor_id?: string;
    actor_name?: string;
    actor_email?: string;
    target_id?: string;
    target_name?: string;
    target_email?: string;
    details: any;
    ip_address: string;
    user_agent: string;
    status: 'SUCCESS' | 'FAILURE';
    created_at: string;
}

export interface SystemAuditLogsResponse {
    data: SystemAuditLog[];
    meta: {
        current_page: number;
        page_size: number;
        total_items: number;
        total_pages: number;
    };
}

export interface SystemAuditLogFilters {
    page?: number;
    page_size?: number;
}
