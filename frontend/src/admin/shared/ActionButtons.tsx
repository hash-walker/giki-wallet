import { Button } from '@/shared/components/ui/button';
import { Edit, Trash2, Eye, EyeOff } from 'lucide-react';

interface ActionButtonsProps {
    onEdit?: () => void;
    onDelete?: () => void;
    onToggle?: () => void;
    isActive?: boolean;
    activeLabel?: string;
    inactiveLabel?: string;
    showToggle?: boolean;
}

export const ActionButtons = ({
    onEdit,
    onDelete,
    onToggle,
    isActive,
    activeLabel = 'Activate',
    inactiveLabel = 'Deactivate',
    showToggle = false
}: ActionButtonsProps) => {
    return (
        <div className="flex items-center justify-end gap-1 sm:gap-2">
            {showToggle && onToggle && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    className="h-8 w-8"
                    title={isActive ? inactiveLabel : activeLabel}
                >
                    {isActive ? (
                        <EyeOff className="w-4 h-4 text-yellow-600" />
                    ) : (
                        <Eye className="w-4 h-4 text-green-600" />
                    )}
                </Button>
            )}
            {onEdit && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onEdit}
                    className="h-8 w-8"
                >
                    <Edit className="w-4 h-4" />
                </Button>
            )}
            {onDelete && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDelete}
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            )}
        </div>
    );
};

