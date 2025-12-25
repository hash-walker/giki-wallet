import { Button } from '@/shared/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface WeekSelectorProps {
    currentWeek: Date;
    onWeekChange: (date: Date) => void;
    weekRange: string;
}

export const WeekSelector = ({ currentWeek, onWeekChange, weekRange }: WeekSelectorProps) => {
    const handlePreviousWeek = () => {
        const newDate = new Date(currentWeek);
        newDate.setDate(newDate.getDate() - 7);
        onWeekChange(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(currentWeek);
        newDate.setDate(newDate.getDate() + 7);
        onWeekChange(newDate);
    };

    const handleToday = () => {
        onWeekChange(new Date());
    };

    return (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousWeek}
                    className="flex-shrink-0"
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-center sm:justify-start">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
                    <div className="text-center sm:text-left min-w-0">
                        <div className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{weekRange}</div>
                        <div className="text-xs text-gray-500 hidden sm:block">Current Week</div>
                    </div>
                </div>
                
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextWeek}
                    className="flex-shrink-0"
                >
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
            
            <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="w-full sm:w-auto"
            >
                Today
            </Button>
        </div>
    );
};

