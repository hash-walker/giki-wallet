import { ReactNode } from 'react';

interface TableWrapperProps {
    count: number;
    itemName?: string;
    children: ReactNode;
}

export const TableWrapper = ({ count, itemName = 'item', children }: TableWrapperProps) => {
    return (
        <div className="bg-white rounded-lg overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <p className="text-xs sm:text-sm text-gray-600">
                    Showing <span className="font-semibold text-gray-900">{count}</span> {itemName}{count !== 1 ? 's' : ''}
                </p>
            </div>
            {children}
        </div>
    );
};

