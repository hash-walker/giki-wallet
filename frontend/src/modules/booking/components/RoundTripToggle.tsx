interface RoundTripToggleProps {
    isEnabled: boolean;
    onToggle: (enabled: boolean) => void;
}

export const RoundTripToggle = ({ isEnabled, onToggle }: RoundTripToggleProps) => {
    return (
        <div className="mt-4 mb-2 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-800">Round trip booking</span>
                <span className="text-xs text-gray-500">
                    {isEnabled 
                        ? "Select city once, then choose times and locations for both directions."
                        : "Select trips for both directions, then confirm together."}
                </span>
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={isEnabled}
                    onChange={(e) => onToggle(e.target.checked)}
                />
                Enable
            </label>
        </div>
    );
};

