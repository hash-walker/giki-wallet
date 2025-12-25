// Ticket types for admin module
export interface AdminTicket {
    id: string;
    serialNumber: number;
    ticketNumber: string;
    userId: number;
    userName: string;
    userEmail: string;
    routeId: number;
    routeName: string;
    direction: 'from-giki' | 'to-giki';
    cityId: string;
    cityName: string;
    stopId: string;
    stopName: string;
    travelDate: string; // ISO date format
    time: string;
    status: 'confirmed' | 'pending' | 'cancelled';
    busType: 'Student' | 'Employee';
    ticketCategory: 'employee' | 'family' | 'student';
    isSelf: boolean;
    passengerName: string;
    passengerCNIC?: string;
    relation?: string;
    price: number;
    bookedAt: string; // ISO datetime
    cancelledAt?: string; // ISO datetime
    refundAmount?: number;
}

