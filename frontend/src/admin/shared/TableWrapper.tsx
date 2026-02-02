import { ReactNode } from 'react';

interface TableWrapperProps {
    count: number;
    itemName?: string;
    children: ReactNode;
    isLoading?: boolean;
    page?: number;
    pageSize?: number;
}

export const TableWrapper = ({ count, itemName = 'item', children, isLoading = false, page, pageSize }: TableWrapperProps) => {
    const start = page && pageSize ? (page - 1) * pageSize + 1 : 1;
    const end = page && pageSize ? Math.min(page * pageSize, count) : count;

    return (
        <div className="bg-white rounded-lg overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <p className="text-xs sm:text-sm text-gray-600">
                    {isLoading ? (
                        <span className="animate-pulse">Loading {itemName}s...</span>
                    ) : (
                        <>
                            Showing <span className="font-semibold text-gray-900">
                                {page && pageSize && count > 0 ? `${start}-${end} of ` : ''}{count}
                            </span> {itemName}{count !== 1 ? 's' : ''}
                        </>
                    )}
                </p>
            </div>
            {children}
        </div>
    );
};

