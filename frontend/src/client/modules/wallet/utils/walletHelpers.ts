// Helper functions for schema-related operations

// Email validation
export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Date formatting (shared with booking module)
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Asia/Karachi';

function parseAsZoned(iso: string) {
    if (!iso) return new Date();
    return new Date(iso);
}

// Date formatting (shared with booking module)
export const formatDate = (dateString: string): string => {
    const now = new Date();
    const todayZoned = toZonedTime(now, TIMEZONE);

    // Parse input as Karachi time directly
    // This avoids browser timezone interference if input is naive
    const txDate = parseAsZoned(dateString);
    const transactionDateZoned = toZonedTime(txDate, TIMEZONE);

    const isToday =
        todayZoned.getFullYear() === transactionDateZoned.getFullYear() &&
        todayZoned.getMonth() === transactionDateZoned.getMonth() &&
        todayZoned.getDate() === transactionDateZoned.getDate();

    if (isToday) {
        return 'Today';
    }

    return formatInTimeZone(txDate, TIMEZONE, 'MMM d, yyyy');
};

export const formatTime = (dateString: string): string => {
    return formatInTimeZone(parseAsZoned(dateString), TIMEZONE, 'h:mm a');
};

// Group transactions by date
export const groupTransactionsByDate = <T extends { date: string }>(transactions: T[]) => {
    const grouped: Record<string, T[]> = {};

    transactions.forEach(transaction => {
        if (!grouped[transaction.date]) {
            grouped[transaction.date] = [];
        }
        grouped[transaction.date].push(transaction);
    });

    // Sort dates in descending order (most recent first)
    const sortedDates = Object.keys(grouped).sort((a, b) =>
        new Date(b).getTime() - new Date(a).getTime()
    );

    return sortedDates.map(date => ({
        date,
        transactions: grouped[date]
    }));
};

