// Helper functions for booking-related operations

export const getCityName = (
    cityId: string | null,
    cities: Array<{ id: string; name: string }>
): string => {
    return cities.find(c => c.id === cityId)?.name || 'N/A';
};

export const getTimeSlot = (
    timeSlotId: string | null,
    timeSlots: Array<{ id: string; date: string; time: string }>
): string => {
    const slot = timeSlots.find(t => t.id === timeSlotId);
    return slot ? `${slot.date} - ${slot.time}` : 'N/A';
};

export const getStopName = (
    stopId: string | null,
    stops: Array<{ id: string; name: string }>
): string => {
    return stops.find(s => s.id === stopId)?.name || 'N/A';
};

// CNIC validation and formatting
export const validateCNIC = (cnic: string): boolean => {
    // CNIC format: 12345-1234567-1 (14 characters with dashes)
    const cnicPattern = /^\d{5}-\d{7}-\d{1}$/;
    return cnicPattern.test(cnic);
};

export const formatCNIC = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as 12345-1234567-1
    if (digits.length <= 5) {
        return digits;
    } else if (digits.length <= 12) {
        return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    } else {
        return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
    }
};

