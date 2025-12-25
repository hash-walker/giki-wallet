// Helper functions for ticket-related operations

export interface TicketData {
    id: string;
    serialNumber: number;
    ticketNumber: string;
    routeSerial?: string;
    direction: 'from-giki' | 'to-giki';
    fromLocation: string;
    toLocation: string;
    pickupLocation?: string;
    dropLocation?: string;
    date: string;
    time: string;
    status: 'confirmed' | 'pending' | 'cancelled';
    busType: 'Student' | 'Employee';
    ticketCategory: 'employee' | 'family' | 'student';
    isSelf: boolean;
    fullName?: string;
    relativeName?: string;
    relativeRelation?: string;
    canCancel: boolean;
    refundInfo?: {
        status: 'success' | 'pending' | 'failed';
        amount?: number;
        responseMessage?: string;
        processedAt?: string;
    };
    paymentInfo?: {
        status: string;
        refundAmount?: number;
        refundedAt?: string;
    };
    txnRefNo?: string;
}

export const formatDate = (dateString: string): string => {
    const today = new Date();
    const ticketDate = new Date(dateString);
    const todayStr = today.toISOString().split('T')[0];
    
    if (dateString === todayStr) {
        return 'Today';
    }
    
    return ticketDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

export const getStatusColor = (status: TicketData['status']) => {
    switch (status) {
        case 'confirmed':
            return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'pending':
            return 'bg-yellow-50 text-yellow-700 border-yellow-200';
        case 'cancelled':
            return 'bg-red-50 text-red-700 border-red-200';
    }
};

export const getTicketCategoryBadge = (ticket: TicketData) => {
    if (ticket.ticketCategory === 'family') {
        return {
            label: 'Family Ticket',
            className: 'bg-blue-100 text-blue-800'
        };
    } else if (ticket.ticketCategory === 'employee') {
        // If employee ticket on student bus, show as Student Ticket
        if (ticket.busType === 'Student') {
            return {
                label: 'Student Ticket',
                className: 'bg-green-100 text-green-800'
            };
        } else {
            return {
                label: 'Employee Ticket',
                className: 'bg-purple-100 text-purple-800'
            };
        }
    } else if (ticket.ticketCategory === 'student') {
        return {
            label: 'Student Ticket',
            className: 'bg-green-100 text-green-800'
        };
    }
    return null;
};

export const getRefundBadge = (ticket: TicketData) => {
    if (ticket.refundInfo) {
        const status = ticket.refundInfo.status;
        if (status === 'success') {
            return { label: 'Refunded', className: 'bg-green-100 text-green-800' };
        } else if (status === 'pending') {
            return { label: 'Refund Pending', className: 'bg-yellow-100 text-yellow-800' };
        } else if (status === 'failed') {
            return { label: 'Refund Failed', className: 'bg-red-100 text-red-800' };
        }
    } else if (ticket.paymentInfo) {
        if (ticket.paymentInfo.status === 'refunded') {
            return { label: 'Refunded', className: 'bg-green-100 text-green-800' };
        } else if (ticket.paymentInfo.status === 'refund_failed') {
            return { label: 'Refund Failed', className: 'bg-red-100 text-red-800' };
        }
    }
    return null;
};

// Group tickets by direction, then by date
export const groupTicketsByDirectionAndDate = (tickets: TicketData[]) => {
    // First group by direction
    const byDirection: Record<'from-giki' | 'to-giki', TicketData[]> = {
        'from-giki': [],
        'to-giki': []
    };
    
    tickets.forEach(ticket => {
        byDirection[ticket.direction].push(ticket);
    });
    
    // Then group each direction by date
    const result: Array<{
        direction: 'from-giki' | 'to-giki';
        dateGroups: Array<{ date: string; tickets: TicketData[] }>;
    }> = [];
    
    (['from-giki', 'to-giki'] as const).forEach(direction => {
        const directionTickets = byDirection[direction];
        if (directionTickets.length === 0) return;
        
        const grouped: Record<string, TicketData[]> = {};
        directionTickets.forEach(ticket => {
            if (!grouped[ticket.date]) {
                grouped[ticket.date] = [];
            }
            grouped[ticket.date].push(ticket);
        });
        
        // Sort dates in descending order (most recent first)
        const sortedDates = Object.keys(grouped).sort((a, b) => 
            new Date(b).getTime() - new Date(a).getTime()
        );
        
        result.push({
            direction,
            dateGroups: sortedDates.map(date => ({
                date,
                tickets: grouped[date]
            }))
        });
    });
    
    return result;
};

