import { City, TimeSlot, Stop, Schedule, BookingData } from '../types';

// Cities available for transport
export const CITIES: City[] = [
    { id: 'islamabad', name: 'Islamabad' },
    { id: 'rawalpindi', name: 'Rawalpindi' },
    { id: 'lahore', name: 'Lahore' },
    { id: 'peshawar', name: 'Peshawar' },
];

// Time slots - these are available based on city selection
export const TIME_SLOTS: TimeSlot[] = [
    { id: 'ts1', time: '2:00 PM', date: 'Fri, Dec 26' },
    { id: 'ts2', time: '2:30 PM', date: 'Fri, Dec 26' },
    { id: 'ts3', time: '6:00 AM', date: 'Sat, Dec 27' },
    { id: 'ts4', time: '7:00 PM', date: 'Sun, Dec 28' },
    { id: 'ts5', time: '6:00 AM', date: 'Mon, Dec 29' },
];

// Stops - these are specific to cities
export const STOPS: Stop[] = [
    // Islamabad stops
    { id: 'isl_f6', name: 'F-6 Markaz' },
    { id: 'isl_f7', name: 'F-7 Markaz' },
    { id: 'isl_f10', name: 'F-10 Markaz' },
    { id: 'isl_blue', name: 'Blue Area' },
    // Rawalpindi stops
    { id: 'rwp_saddar', name: 'Saddar' },
    { id: 'rwp_faizabad', name: 'Faizabad' },
    { id: 'rwp_6th', name: '6th Road' },
    { id: 'rwp_committee', name: 'Committee Chowk' },
    // Lahore stops
    { id: 'lhr_liberty', name: 'Liberty Market' },
    { id: 'lhr_gulberg', name: 'Gulberg' },
    { id: 'lhr_model', name: 'Model Town' },
    // Peshawar stops
    { id: 'psh_hayat', name: 'Hayatabad' },
    { id: 'psh_uni', name: 'University Town' },
    { id: 'psh_saddar', name: 'Saddar' },
];

// Schedules - the actual availability for each combination
// FROM GIKI schedules
export const FROM_GIKI_SCHEDULES: Schedule[] = [
    // Islamabad
    { id: 1, cityId: 'islamabad', timeSlotId: 'ts1', stopId: 'isl_f6', bus_type: 'Employee', tickets: 12, status: 'available', is_held: false },
    { id: 2, cityId: 'islamabad', timeSlotId: 'ts1', stopId: 'isl_f7', bus_type: 'Employee', tickets: 8, status: 'available', is_held: false },
    { id: 3, cityId: 'islamabad', timeSlotId: 'ts1', stopId: 'isl_blue', bus_type: 'Employee', tickets: 5, status: 'available', is_held: false },
    { id: 4, cityId: 'islamabad', timeSlotId: 'ts3', stopId: 'isl_f6', bus_type: 'Student', tickets: 15, status: 'available', is_held: false },
    { id: 5, cityId: 'islamabad', timeSlotId: 'ts4', stopId: 'isl_f10', bus_type: 'Student', tickets: 0, status: 'full', is_held: false },
    // Rawalpindi
    { id: 6, cityId: 'rawalpindi', timeSlotId: 'ts1', stopId: 'rwp_saddar', bus_type: 'Employee', tickets: 10, status: 'available', is_held: false },
    { id: 7, cityId: 'rawalpindi', timeSlotId: 'ts2', stopId: 'rwp_faizabad', bus_type: 'Student', tickets: 6, status: 'available', is_held: false },
    { id: 8, cityId: 'rawalpindi', timeSlotId: 'ts5', stopId: 'rwp_6th', bus_type: 'Employee', tickets: 4, status: 'available', is_held: false },
    // Lahore
    { id: 9, cityId: 'lahore', timeSlotId: 'ts2', stopId: 'lhr_liberty', bus_type: 'Student', tickets: 20, status: 'available', is_held: false },
    { id: 10, cityId: 'lahore', timeSlotId: 'ts4', stopId: 'lhr_gulberg', bus_type: 'Employee', tickets: 0, status: 'full', is_held: true },
    // Peshawar
    { id: 11, cityId: 'peshawar', timeSlotId: 'ts3', stopId: 'psh_hayat', bus_type: 'Student', tickets: 18, status: 'available', is_held: false },
    { id: 12, cityId: 'peshawar', timeSlotId: 'ts5', stopId: 'psh_uni', bus_type: 'Employee', tickets: 7, status: 'available', is_held: false },
];

// TO GIKI schedules
export const TO_GIKI_SCHEDULES: Schedule[] = [
    // Islamabad
    { id: 101, cityId: 'islamabad', timeSlotId: 'ts4', stopId: 'isl_f6', bus_type: 'Student', tickets: 0, status: 'full', is_held: true },
    { id: 102, cityId: 'islamabad', timeSlotId: 'ts4', stopId: 'isl_f7', bus_type: 'Student', tickets: 3, status: 'available', is_held: false },
    { id: 103, cityId: 'islamabad', timeSlotId: 'ts3', stopId: 'isl_blue', bus_type: 'Employee', tickets: 10, status: 'available', is_held: false },
    // Rawalpindi
    { id: 104, cityId: 'rawalpindi', timeSlotId: 'ts5', stopId: 'rwp_saddar', bus_type: 'Employee', tickets: 8, status: 'available', is_held: false },
    { id: 105, cityId: 'rawalpindi', timeSlotId: 'ts1', stopId: 'rwp_faizabad', bus_type: 'Student', tickets: 5, status: 'available', is_held: false },
    // Lahore  
    { id: 106, cityId: 'lahore', timeSlotId: 'ts4', stopId: 'lhr_model', bus_type: 'Employee', tickets: 12, status: 'available', is_held: false },
    // Peshawar
    { id: 107, cityId: 'peshawar', timeSlotId: 'ts5', stopId: 'psh_saddar', bus_type: 'Student', tickets: 15, status: 'available', is_held: false },
];

// Helper function to get booking data for a direction
export const getBookingData = (direction: 'from-giki' | 'to-giki'): BookingData => {
    return {
        cities: CITIES,
        timeSlots: TIME_SLOTS,
        stops: STOPS,
        schedules: direction === 'from-giki' ? FROM_GIKI_SCHEDULES : TO_GIKI_SCHEDULES,
    };
};

// Helper to get available time slots for a city based on schedules
export const getAvailableTimeSlotsForCity = (
    cityId: string,
    schedules: Schedule[],
    timeSlots: TimeSlot[]
): TimeSlot[] => {
    const availableTimeSlotIds = [...new Set(
        schedules
            .filter(s => s.cityId === cityId)
            .map(s => s.timeSlotId)
    )];
    return timeSlots.filter(ts => availableTimeSlotIds.includes(ts.id));
};

// Helper to get available stops for a city+timeSlot combination
export const getAvailableStopsForCityAndTime = (
    cityId: string,
    timeSlotId: string,
    schedules: Schedule[],
    stops: Stop[]
): Stop[] => {
    const availableStopIds = schedules
        .filter(s => s.cityId === cityId && s.timeSlotId === timeSlotId)
        .map(s => s.stopId);
    return stops.filter(stop => availableStopIds.includes(stop.id));
};

// Helper to get schedule for a specific combination
export const getScheduleForSelection = (
    cityId: string,
    timeSlotId: string,
    stopId: string,
    schedules: Schedule[]
): Schedule | undefined => {
    return schedules.find(
        s => s.cityId === cityId && s.timeSlotId === timeSlotId && s.stopId === stopId
    );
};
