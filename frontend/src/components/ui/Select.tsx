interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    options: SelectOption[];
    value: string | null;
    onChange: (value: string) => void;
    placeholder: string;
    disabledPlaceholder?: string;
    label?: string;
    className?: string;
    disabled?: boolean;
    showLabel?: boolean;
}

export const Select = ({
    options,
    value,
    onChange,
    placeholder,
    disabledPlaceholder,
    label,
    className = "",
    disabled = false,
    showLabel = true
}: SelectProps) => {
    const displayPlaceholder = disabled && disabledPlaceholder ? disabledPlaceholder : placeholder;

    return (
        <div className={className}>
            {showLabel && label && (
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block md:hidden">
                    {label}
                </label>
            )}
            <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled || options.length === 0}
                aria-label={label || placeholder}
            >
                <option value="" disabled>{displayPlaceholder}</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

