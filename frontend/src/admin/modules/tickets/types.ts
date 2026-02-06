// Ticket types for admin module
export interface AdminTicket {
    ticket_id: string;
    serial_no: number;
    ticket_code: string;
    user_name: string;
    user_email: string;
    route_name: string;
    direction: 'from-giki' | 'to-giki';
    pickup_location: string;
    dropoff_location: string;
    departure_time: string; // ISO datetime
    status: 'CONFIRMED' | 'CANCELLED' | 'CANCELLED_BY_ADMIN' | 'PENDING' | 'DELETED';
    bus_type: 'STUDENT' | 'EMPLOYEE';
    passenger_name: string;
    passenger_relation: string;
    booking_time: string; // ISO datetime
    status_updated_at?: string; // ISO datetime
    price: number;
    refund_amount?: number;
}

export interface WeeklyStats {
    student_count: number;
    employee_count: number;
    total_confirmed: number;
}

export interface AdminTicketPaginationResponse {
    data: AdminTicket[];
    total_count: number;
    page: number;
    page_size: number;
    stats?: WeeklyStats;
}

