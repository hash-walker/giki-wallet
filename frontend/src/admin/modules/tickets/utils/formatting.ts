export const formatCurrency = (amount: number): string => {
    return `RS ${amount.toLocaleString()}`;
};

export const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

export const formatTime = (timeString: string): string => {
    // If time is already formatted (e.g., "9:00 AM"), return as is
    if (timeString.includes('AM') || timeString.includes('PM')) {
        return timeString;
    }
    
    // Otherwise format from 24-hour format
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
};

export const formatDateTime = (dateString: string, timeString: string): string => {
    return `${formatDate(dateString)} ${formatTime(timeString)}`;
};

