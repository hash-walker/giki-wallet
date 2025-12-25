import { ReactNode } from 'react';

interface TableWrapperProps {
    count: number;
    itemName?: string;
    children: ReactNode;
}

export const TableWrapper = ({ count, itemName = 'item', children }: TableWrapperProps) => {
    return (
        <div className="bg-white rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
                <p className="text-sm text-gray-600">
                    Showing <span className="font-semibold text-gray-900">{count}</span> {itemName}{count !== 1 ? 's' : ''}
                </p>
            </div>
            {children}
        </div>
    );
};

