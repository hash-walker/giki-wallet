import { Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TicketData, getRefundBadge, getStatusColor, getTicketCategoryBadge } from '../utils/ticketHelpers';

interface TicketCardProps {
    ticket: TicketData;
}

export const TicketCard = ({ ticket }: TicketCardProps) => {
    const refundBadge = getRefundBadge(ticket);
    const categoryBadge = getTicketCategoryBadge(ticket);

    return (
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white hover:shadow-md transition-all duration-300 group">
            <div className="p-5">
                <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm transition-colors",
                        ticket.busType === 'Student' ? "bg-green-50 group-hover:bg-green-100" : "bg-blue-50 group-hover:bg-blue-100"
                    )}>
                        <Ticket className={cn(
                            "w-6 h-6",
                            ticket.busType === 'Student' ? "text-green-600" : "text-blue-600"
                        )} />
                    </div>

                    {/* Ticket Details */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                {/* Route Direction */}
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-base font-bold text-gray-900">
                                        {ticket.fromLocation} → {ticket.toLocation}
                                    </h3>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border",
                                        getStatusColor(ticket.status)
                                    )}>
                                        {ticket.status}
                                    </span>
                                </div>

                                {/* Serial & Ticket Number */}
                                <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                                    <span className="bg-gray-100 px-2 py-0.5 rounded-md font-mono text-xs font-medium">#{ticket.serialNumber}</span>
                                    <span className="font-mono font-bold text-primary">T-{ticket.ticketNumber}</span>
                                </div>

                                {/* Time & Date */}
                                <div className="flex flex-wrap gap-y-1 gap-x-4 text-sm text-gray-700 mb-3">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                        {ticket.date}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                        {ticket.time}
                                    </span>
                                </div>

                                {/* Pickup/Drop */}
                                {(ticket.pickupLocation || ticket.dropLocation) && (
                                    <div className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2 mb-3 inline-block">
                                        <span className="font-semibold text-gray-900 mr-1">
                                            {ticket.direction === 'to-giki' ? 'Pickup:' : 'Drop:'}
                                        </span>
                                        {ticket.direction === 'to-giki' ? ticket.pickupLocation : ticket.dropLocation}
                                    </div>
                                )}

                                {/* Passenger Info */}
                                <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium text-gray-900">
                                        {ticket.isSelf ? ticket.fullName : ticket.relativeName}
                                    </div>
                                    {!ticket.isSelf && (
                                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                            {ticket.relativeRelation}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50/50 px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <div>
                    {refundBadge && (
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                refundBadge?.className
                            )}>
                                {refundBadge?.label}
                            </span>
                            {ticket.refundInfo?.amount && (
                                <span className="text-xs text-gray-500">Rs. {ticket.refundInfo.amount}</span>
                            )}
                        </div>
                    )}
                </div>
                <div>
                    {ticket.canCancel ? (
                        <button className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline transition-all">
                            Cancel Booking
                        </button>
                    ) : (
                        <span className="text-xs text-gray-400 italic">Non-cancellable</span>
                    )}
                </div>
            </div>
        </div>
    );
};

