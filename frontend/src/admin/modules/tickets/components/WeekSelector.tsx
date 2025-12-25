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
        <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousWeek}
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div>
                        <div className="text-sm font-semibold text-gray-900">{weekRange}</div>
                        <div className="text-xs text-gray-500">Current Week</div>
                    </div>
                </div>
                
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextWeek}
                >
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
            
            <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
            >
                Today
            </Button>
        </div>
    );
};

