import { ReactNode } from 'react';
import { Card } from './Card';

interface TableProps {
    headers: Array<{ content: ReactNode; align?: 'left' | 'right' | 'center' }>;
    rows: Array<{ key: string | number; cells: ReactNode[] }>;
    emptyMessage?: string;
    emptyAction?: ReactNode;
}

export const Table = ({ headers, rows, emptyMessage, emptyAction }: TableProps) => {
    if (rows.length === 0) {
        return (
            <Card>
                <div className="text-center py-12">
                    <p className="text-gray-500">{emptyMessage || 'No items found.'}</p>
                    {emptyAction && <div className="mt-4">{emptyAction}</div>}
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                {headers.map((header, index) => (
                                    <th
                                        key={index}
                                        className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap ${
                                            header.align === 'right' ? 'text-right' :
                                            header.align === 'center' ? 'text-center' :
                                            'text-left'
                                        }`}
                                    >
                                        {header.content}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr
                                    key={row.key}
                                    className="border-b border-gray-100 hover:bg-gray-50"
                                >
                                    {row.cells.map((cell, index) => (
                                        <td
                                            key={index}
                                            className={`py-3 px-3 sm:px-4 whitespace-nowrap ${
                                                headers[index]?.align === 'right' ? 'text-right' :
                                                headers[index]?.align === 'center' ? 'text-center' :
                                                'text-left'
                                            }`}
                                        >
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Card>
    );
};

