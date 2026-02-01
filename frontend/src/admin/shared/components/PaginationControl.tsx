import { Button } from '@/shared/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export const PaginationControl = ({ currentPage, totalPages, onPageChange, className }: PaginationControlProps & { className?: string }) => (
    <div className={`flex gap-4 items-center justify-center ${className || ''}`}>
        <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="flex items-center gap-1"
        >
            <ChevronLeft className="w-4 h-4" />
            Previous
        </Button>
        <div className="text-sm font-medium text-gray-700">
            Page {currentPage} of {Math.max(1, totalPages)}
        </div>
        <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="flex items-center gap-1"
        >
            Next
            <ChevronRight className="w-4 h-4" />
        </Button>
    </div>
);
