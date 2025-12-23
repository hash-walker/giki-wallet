export const PageHeader = () => {
    return (
        <div className="border-b pb-4">
            {/* Mobile: Stacked layout */}
            <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
                <h1 className="text-2xl md:text-3xl font-bold text-primary">Bus Schedules</h1>
                <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" aria-label="Employee bus type" />
                        <span className="text-gray-600">Employee</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500" aria-label="Student bus type" />
                        <span className="text-gray-600">Student</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
