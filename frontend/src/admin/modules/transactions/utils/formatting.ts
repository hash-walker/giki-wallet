export const formatCurrency = (amount: number): string => {
    return `RS ${amount.toLocaleString()}`;
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
    return formatInTimeZone(parseAsZoned(dateString), TIMEZONE, 'h:mm a');
};

export const formatDateTime = (dateString: string): string => {
    return `${formatDate(dateString)} ${formatTime(dateString)}`;
};

