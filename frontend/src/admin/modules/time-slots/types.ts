export interface TimeSlot {
    id: string;
    time: string; // e.g., "2:00 PM"
    dayOfWeek: string; // e.g., "Friday", "Monday"
    isCustom: boolean; // true for one-time custom slots, false for recurring weekly slots
    customDate?: string; // For custom slots: specific date (e.g., "2024-12-26")
    isActive: boolean; // Can be disabled without deleting
}
