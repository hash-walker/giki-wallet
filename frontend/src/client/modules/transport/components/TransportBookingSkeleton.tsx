export const TransportBookingSkeleton = () => {
    return (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 relative">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-gray-50/50 to-transparent z-10" />

            {/* Desktop View Skeleton */}
            <div className="hidden md:flex py-6 px-5 items-center gap-4">
                {/* 3 Select Inputs */}
                {[1, 2, 3].map((i) => (
                    <div key={i} className="w-[18%]">
                        <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                ))}

                {/* Badge Area */}
                <div className="w-[12%] flex justify-center">
                    <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
                </div>

                {/* Availability */}
                <div className="w-[10%] flex justify-center">
                    <div className="h-4 w-12 bg-gray-100 rounded animate-pulse" />
                </div>

                {/* Ticket Count */}
                <div className="w-[8%] flex justify-center">
                    <div className="h-10 w-12 bg-gray-100 rounded-lg animate-pulse" />
                </div>

                {/* Button */}
                <div className="w-[16%]">
                    <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
                </div>
            </div>

            {/* Mobile View Skeleton */}
            <div className="block md:hidden p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-1">
                        <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                        <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                ))}
                <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse mt-4" />
            </div>
        </div>
    );
};
