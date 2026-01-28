import { Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TicketData, getRefundBadge, getStatusColor, getTicketCategoryBadge } from '../utils/ticketHelpers';

interface TicketCardProps {
    ticket: TicketData;
    onBuyClick?: (ticket: TicketData) => void;
}

export const TicketCard = ({ ticket, onBuyClick }: TicketCardProps) => {
    const refundBadge = getRefundBadge(ticket);
    const categoryBadge = getTicketCategoryBadge(ticket);

    return (
        <div className="relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white hover:shadow-xl transition-all duration-500 group">
            <div className="p-6">
                <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner transition-all duration-500 border",
                        ticket.busType === 'Student' ? "bg-accent/5 border-accent/10 group-hover:bg-accent/10" : "bg-primary/5 border-primary/10 group-hover:bg-primary/10"
                    )}>
                        <Ticket className={cn(
                            "w-7 h-7 stroke-[1.5]",
                            ticket.busType === 'Student' ? "text-accent" : "text-primary"
                        )} />
                    </div>

                    {/* Ticket Details */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                {/* Route Direction */}
                                <div className="flex flex-wrap items-center gap-2.5 mb-2">
                                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                                        {ticket.fromLocation} → {ticket.toLocation}
                                    </h3>
                                    <span className={cn(
                                        "px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm",
                                        getStatusColor(ticket.status)
                                    )}>
                                        {ticket.status}
                                    </span>
                                </div>

                                {/* Serial & Ticket Number */}
                                <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
                                    <span className="bg-slate-50 text-slate-400 px-2 py-1 rounded-lg font-mono text-[10px] font-bold border border-slate-100 shadow-sm">#{ticket.serialNumber}</span>
                                    <span className="font-mono font-black text-primary tracking-tighter text-base">TIC-{ticket.ticketNumber}</span>
                                </div>

                                {/* Time & Date */}
                                <div className="flex flex-wrap gap-y-2 gap-x-5 text-sm text-slate-600 mb-4 font-bold tracking-tight">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-accent/40" />
                                        {ticket.date}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-primary/40" />
                                        {ticket.time}
                                    </div>
                                </div>

                                {/* Pickup/Drop */}
                                {(ticket.pickupLocation || ticket.dropLocation) && (
                                    <div className="text-xs text-slate-500 bg-slate-50/50 rounded-2xl px-4 py-2.5 mb-4 inline-flex items-center gap-2 border border-slate-100/50 shadow-sm backdrop-blur-sm">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {ticket.direction === 'to-giki' ? 'Pickup' : 'Drop'}:
                                        </span>
                                        <span className="font-bold text-slate-900">
                                            {ticket.direction === 'to-giki' ? ticket.pickupLocation : ticket.dropLocation}
                                        </span>
                                    </div>
                                )}

                                {/* Passenger Info */}
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="text-sm font-bold text-slate-900 tracking-tight">
                                        {ticket.isSelf ? ticket.fullName : ticket.relativeName}
                                    </div>
                                    {!ticket.isSelf && (
                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.1em] bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/50">
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
            <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 backdrop-blur-sm">
                <div>
                    {refundBadge && (
                        <div className="flex items-center gap-3">
                            <span className={cn(
                                "inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm",
                                refundBadge?.className
                            )}>
                                {refundBadge?.label}
                            </span>
                            {ticket.refundInfo?.amount && (
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Rs. {ticket.refundInfo.amount}</span>
                            )}
                        </div>
                    )}
                </div>
                <div>
                    {ticket.canCancel ? (
                        <button className="h-10 px-5 rounded-xl bg-destructive/5 hover:bg-destructive/10 text-destructive text-[10px] font-black uppercase tracking-widest transition-all border border-destructive/10 shadow-sm hover:shadow-md hover:-translate-y-0.5">
                            Cancel Booking
                        </button>
                    ) : (
                        <button
                            className="h-10 px-5 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest transition-all border border-primary/10 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                            onClick={() => onBuyClick?.(ticket)}
                        >
                            Buy Ticket
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

