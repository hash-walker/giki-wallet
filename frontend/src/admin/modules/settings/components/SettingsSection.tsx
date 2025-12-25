import { ReactNode } from 'react';
import { Card } from '../../../shared';

interface SettingsSectionProps {
    title: string;
    description?: string;
    children: ReactNode;
}

export const SettingsSection = ({ title, description, children }: SettingsSectionProps) => {
    return (
        <Card>
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                {description && (
                    <p className="text-sm text-gray-600 mt-1">{description}</p>
                )}
            </div>
            <div className="space-y-4">
                {children}
            </div>
        </Card>
    );
};

