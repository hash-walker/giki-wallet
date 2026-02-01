import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader, TableWrapper, PaginationControl } from '../../../shared';
import { TicketsTable } from '../components/TicketsTable';
import { AdminTicket } from '../types';
import { getAdminTicketHistory } from '../service';
import { History, Download } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/Input';
import { toast } from 'sonner';

export const TicketHistoryPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [tickets, setTickets] = useState<AdminTicket[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(100);
    const [totalCount, setTotalCount] = useState(0);

    const fetchHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await getAdminTicketHistory(
                currentPage,
                pageSize
            );
            setTickets(response.data);
            setTotalCount(response.total_count);
        } catch (error) {
            console.error('Failed to fetch ticket history:', error);
            toast.error('Failed to load ticket history');
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, pageSize]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const filteredTickets = useMemo(() => {
        if (!searchTerm) return tickets;

        return tickets.filter((ticket) => {
            const matchesSearch =
                ticket.ticket_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.passenger_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.user_email.toLowerCase().includes(searchTerm.toLowerCase());

            return matchesSearch;
        });
    }, [tickets, searchTerm]);

    const handleExport = () => {
        console.log('Export ticket history');
        toast.info('Export functionality coming soon');
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Tickets History"
                description="View cancelled and deleted tickets"
                action={
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2" />
                        Export History
                    </Button>
                }
            />

            {/* Simple Search */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <div className="flex-1">
                    <div className="relative">
                        <History className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search history by ticket code, passenger..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
            </div>

            {/* Tickets Table */}
            <TableWrapper count={totalCount} itemName="historical ticket" isLoading={isLoading}>
                <div className="mb-4">
                    <PaginationControl
                        currentPage={currentPage}
                        totalPages={Math.ceil(totalCount / pageSize)}
                        onPageChange={setCurrentPage}
                    />
                </div>
                <TicketsTable tickets={filteredTickets} />
            </TableWrapper>
        </div>
    );
};
