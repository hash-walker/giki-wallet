import { Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TicketData, getRefundBadge, getStatusColor, getTicketCategoryBadge } from '../../utils/ticketHelpers';

interface TicketCardProps {
    ticket: TicketData;
}

export const TicketCard = ({ ticket }: TicketCardProps) => {
    const refundBadge = getRefundBadge(ticket);
    const categoryBadge = getTicketCategoryBadge(ticket);

    return (
        <div className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all bg-white">
            {/* Icon */}
            <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                ticket.busType === 'Student' ? "bg-green-50" : "bg-blue-50"
            )}>
                <Ticket className={cn(
                    "w-5 h-5",
                    ticket.busType === 'Student' ? "text-green-600" : "text-blue-600"
                )} />
            </div>

            {/* Ticket Details */}
            <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        {/* Serial Number and Ticket Number - Prominent */}
                        <div className="flex items-center gap-4 mb-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-500">Serial:</span>
                                <span className="text-lg font-bold text-gray-900">
                                    #{ticket.serialNumber}
                                </span>
                                {ticket.routeSerial && (
                                    <span className="text-sm text-gray-500">({ticket.routeSerial})</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-500">Ticket:</span>
                                <span className="text-lg font-bold font-mono text-primary bg-primary/10 px-3 py-1 rounded-md">
                                    {ticket.ticketNumber}
                                </span>
                            </div>
                        </div>
                        
                        {/* Route Direction */}
                        <p className="text-base font-bold text-gray-900 mb-2">
                            {ticket.fromLocation} → {ticket.toLocation}
                        </p>
                        
                        {/* Pickup or Drop Location based on direction */}
                        {ticket.direction === 'to-giki' && ticket.pickupLocation && (
                            <p className="text-sm text-gray-600 mb-2">
                                <span className="font-medium">Pickup:</span> {ticket.pickupLocation}
                            </p>
                        )}
                        {ticket.direction === 'from-giki' && ticket.dropLocation && (
                            <p className="text-sm text-gray-600 mb-2">
                                <span className="font-medium">Drop:</span> {ticket.dropLocation}
                            </p>
                        )}
                        
                        {/* Time */}
                        <p className="text-sm text-gray-600 mb-2">
                            {ticket.date} • {ticket.time}
                        </p>
                        
                        {/* Passenger Info - Based on isSelf */}
                        <div className="mt-2 space-y-1">
                            {ticket.isSelf ? (
                                <p className="text-sm font-medium text-gray-900">{ticket.fullName}</p>
                            ) : (
                                <>
                                    <p className="text-sm font-medium text-gray-900">{ticket.relativeName}</p>
                                    {ticket.relativeRelation && (
                                        <p className="text-xs text-gray-500">Relation: {ticket.relativeRelation}</p>
                                    )}
                                    {ticket.fullName && (
                                        <p className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded inline-block mt-1">
                                            Family of {ticket.fullName}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                        
                        {/* Refund Information */}
                        {refundBadge && (
                            <div className="mt-2">
                                <span className={cn(
                                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                    refundBadge.className
                                )}>
                                    {refundBadge.label}
                                </span>
                                {ticket.refundInfo?.amount && (
                                    <p className="text-xs text-gray-600 mt-1">
                                        Amount: PKR {ticket.refundInfo.amount}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-2">
                        <span className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap",
                            getStatusColor(ticket.status)
                        )}>
                            {ticket.status}
                        </span>
                        {categoryBadge && (
                            <span className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                                categoryBadge.className
                            )}>
                                {categoryBadge.label}
                            </span>
                        )}
                    </div>
                </div>
                
                {/* Cancel Button */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                    {ticket.canCancel ? (
                        <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                            Cancel Ticket
                        </button>
                    ) : (
                        <span className="text-sm text-gray-500">Cannot cancel now</span>
                    )}
                </div>
            </div>
        </div>
    );
};

