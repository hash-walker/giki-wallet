export type BusType = 'Employee' | 'Student';
export type RouteStatus = 'available' | 'full' | 'held';
export type RouteDirection = 'from-giki' | 'to-giki';

export interface City {
    id: string;
    name: string;
}

export interface TimeSlot {
    id: string;
    time: string;
    date: string;
}

export interface Stop {
    id: string;
    name: string;
}

export interface Schedule {
    id: number;
    cityId: string;
    timeSlotId: string;
    stopId: string;
    bus_type: BusType;
    tickets: number;
    status: RouteStatus;
    is_held: boolean;
}

export interface BookingData {
    cities: City[];
    timeSlots: TimeSlot[];
    stops: Stop[];
    schedules: Schedule[];
}

export interface BookingSelection {
    cityId: string | null;
    timeSlotId: string | null;
    stopId: string | null;
    ticketCount: number;
}
