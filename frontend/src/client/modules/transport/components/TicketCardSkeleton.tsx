import { cn } from "@/lib/utils";

export const TicketCardSkeleton = () => {
    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
            {/* Shimmer Effect */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-gray-50/50 to-transparent z-10" />

            {/* Header: Date & Status */}
            <div className="flex justify-between items-start mb-6">
                <div className="space-y-2">
                    <div className="h-4 w-24 bg-gray-100 rounded-md animate-pulse" />
                    <div className="h-8 w-16 bg-gray-100 rounded-lg animate-pulse" />
                </div>
                <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
            </div>

            {/* Route Info */}
            <div className="space-y-4 mb-6 relative">
                <div className="absolute left-[11px] top-3 bottom-3 w-[2px] bg-gray-50" />

                {/* Pickup */}
                <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-gray-100 shrink-0 animate-pulse" />
                    <div className="space-y-2 flex-1">
                        <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                        <div className="h-3 w-48 bg-gray-50 rounded animate-pulse" />
                    </div>
                </div>

                {/* Dropoff */}
                <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-gray-100 shrink-0 animate-pulse" />
                    <div className="space-y-2 flex-1">
                        <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                        <div className="h-3 w-40 bg-gray-50 rounded animate-pulse" />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                <div className="flex gap-2">
                    <div className="h-6 w-16 bg-gray-100 rounded-md animate-pulse" />
                    <div className="h-6 w-16 bg-gray-100 rounded-md animate-pulse" />
                </div>
                <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
            </div>
        </div>
    );
};
