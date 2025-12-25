export interface Route {
    id: number;
    direction: 'from-giki' | 'to-giki';
    cityId: string;
    busType: 'Student' | 'Employee';
    capacity: number; // Total tickets available
    timeSlotIds: string[]; // Selected time slot IDs (default + custom)
    isHeld: boolean; // If true, route is not live yet
    createdAt?: string;
    updatedAt?: string;
}
