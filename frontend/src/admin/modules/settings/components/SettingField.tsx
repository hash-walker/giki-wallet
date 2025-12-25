import { ReactNode } from 'react';

interface SettingFieldProps {
    label: string;
    description?: string;
    children: ReactNode;
    required?: boolean;
}

export const SettingField = ({ label, description, children, required }: SettingFieldProps) => {
    return (
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 py-4 border-b border-gray-200 last:border-0">
            <div className="flex-1">
                <label className="block text-sm font-medium text-gray-900">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {description && (
                    <p className="text-sm text-gray-500 mt-1">{description}</p>
                )}
            </div>
            <div className="w-full md:w-64">
                {children}
            </div>
        </div>
    );
};

