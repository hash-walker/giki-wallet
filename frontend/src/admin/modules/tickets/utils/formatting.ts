export const formatCurrency = (amount: number): string => {
    return `RS ${(amount / 100).toLocaleString()}`;
};

import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Asia/Karachi';

function parseAsZoned(iso: string) {
    if (!iso) return new Date();
    return new Date(iso);
}

export const formatDate = (dateString: string): string => {
    return formatInTimeZone(parseAsZoned(dateString), TIMEZONE, 'MMM d, yyyy');
};

export const formatTime = (dateString: string): string => {
    // Check if it's already a formatted string 
    if (dateString.includes('AM') || dateString.includes('PM')) {
        return dateString;
    }

    try {
        return formatInTimeZone(dateString, TIMEZONE, 'h:mm a');
    } catch {
        return dateString;
    }
};

export const formatDateTime = (dateString: string, timeString: string): string => {
    return `${formatDate(dateString)} ${formatTime(timeString)}`;
};

