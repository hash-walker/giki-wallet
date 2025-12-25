// Helper functions for week calculations

export const getWeekStart = (date: Date = new Date()): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
};

export const getWeekEnd = (date: Date = new Date()): Date => {
    const weekStart = getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return weekEnd;
};

export const getWeekDates = (date: Date = new Date()): Date[] => {
    const weekStart = getWeekStart(date);
    const dates: Date[] = [];
    
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(weekStart);
        currentDate.setDate(currentDate.getDate() + i);
        dates.push(currentDate);
    }
    
    return dates;
};

export const formatWeekRange = (date: Date = new Date()): string => {
    const weekStart = getWeekStart(date);
    const weekEnd = getWeekEnd(date);
    
    const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    return `${startStr} - ${endStr}`;
};

export const isDateInWeek = (date: Date, weekStart: Date, weekEnd: Date): boolean => {
    return date >= weekStart && date <= weekEnd;
};

export const getDayName = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
};

export const formatDateShort = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

