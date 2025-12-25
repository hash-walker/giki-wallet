import { ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    description?: string;
    action?: ReactNode;
}

export const PageHeader = ({ title, description, action }: PageHeaderProps) => {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
                {description && (
                    <p className="text-sm sm:text-base text-gray-600 mt-1">{description}</p>
                )}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
        </div>
    );
};

