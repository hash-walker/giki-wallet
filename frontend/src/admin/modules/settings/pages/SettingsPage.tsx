import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { PageHeader } from '../../../shared';
import { SettingsSection } from '../components/SettingsSection';
import { SettingField } from '../components/SettingField';
import { SystemSettings } from '../types';
import { toast } from '@/lib/toast';
import { Save } from 'lucide-react';

export const SettingsPage = () => {
    // Mock settings - replace with API call
    const [settings, setSettings] = useState<SystemSettings>({
        // General Settings
        systemName: 'GIKI Transport System',
        contactEmail: 'transport@giki.edu.pk',
        supportPhone: '+92 934 271856',
        maintenanceMode: false,
        
        // Booking Settings
        maxAdvanceBookingDays: 30,
        requireBookingConfirmation: true,
        allowCancellation: true,
        cancellationHoursBeforeTrip: 24,
        allowRefunds: true,
        
        // Payment Settings
        minimumTopUpAmount: 100,
        maximumTransferAmount: 5000,
        paymentGatewayEnabled: true,
        
        // Notification Settings
        emailNotificationsEnabled: true,
        smsNotificationsEnabled: false,
        bookingConfirmationEmail: true,
        
        // System Settings
        timezone: 'Asia/Karachi',
        dateFormat: 'DD/MM/YYYY',
        currency: 'PKR',
    });

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        // TODO: Replace with API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSaving(false);
        toast.success('Settings saved successfully');
    };

    const handleChange = <K extends keyof SystemSettings>(
        key: K,
        value: SystemSettings[K]
    ) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Settings"
                description="Manage system settings and configuration"
                action={
                    <Button onClick={handleSave} disabled={isSaving}>
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                }
            />

            {/* General Settings */}
            <SettingsSection
                title="General Settings"
                description="Basic system information and contact details"
            >
                <SettingField
                    label="System Name"
                    description="The name displayed to users"
                    required
                >
                    <Input
                        value={settings.systemName}
                        onChange={(e) => handleChange('systemName', e.target.value)}
                        placeholder="Enter system name"
                    />
                </SettingField>

                <SettingField
                    label="Contact Email"
                    description="Email address for support inquiries"
                    required
                >
                    <Input
                        type="email"
                        value={settings.contactEmail}
                        onChange={(e) => handleChange('contactEmail', e.target.value)}
                        placeholder="Enter contact email"
                    />
                </SettingField>

                <SettingField
                    label="Support Phone"
                    description="Phone number for support"
                >
                    <Input
                        type="tel"
                        value={settings.supportPhone}
                        onChange={(e) => handleChange('supportPhone', e.target.value)}
                        placeholder="Enter phone number"
                    />
                </SettingField>

                <SettingField
                    label="Maintenance Mode"
                    description="When enabled, users cannot access the system"
                >
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.maintenanceMode}
                            onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">
                            {settings.maintenanceMode ? 'Enabled' : 'Disabled'}
                        </span>
                    </label>
                </SettingField>
            </SettingsSection>

            {/* Booking Settings */}
            <SettingsSection
                title="Booking Settings"
                description="Configure booking rules and policies"
            >
                <SettingField
                    label="Maximum Advance Booking Days"
                    description="How many days in advance users can book"
                >
                    <Input
                        type="number"
                        min="1"
                        value={settings.maxAdvanceBookingDays}
                        onChange={(e) => handleChange('maxAdvanceBookingDays', parseInt(e.target.value) || 30)}
                    />
                </SettingField>

                <SettingField
                    label="Require Booking Confirmation"
                    description="Users must confirm before booking is finalized"
                >
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.requireBookingConfirmation}
                            onChange={(e) => handleChange('requireBookingConfirmation', e.target.checked)}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">
                            {settings.requireBookingConfirmation ? 'Required' : 'Not Required'}
                        </span>
                    </label>
                </SettingField>

                <SettingField
                    label="Allow Cancellation"
                    description="Users can cancel their bookings"
                >
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.allowCancellation}
                            onChange={(e) => handleChange('allowCancellation', e.target.checked)}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">
                            {settings.allowCancellation ? 'Allowed' : 'Not Allowed'}
                        </span>
                    </label>
                </SettingField>

                {settings.allowCancellation && (
                    <SettingField
                        label="Cancellation Hours Before Trip"
                        description="Minimum hours before trip for cancellation"
                    >
                        <Input
                            type="number"
                            min="1"
                            value={settings.cancellationHoursBeforeTrip}
                            onChange={(e) => handleChange('cancellationHoursBeforeTrip', parseInt(e.target.value) || 24)}
                        />
                    </SettingField>
                )}

                <SettingField
                    label="Allow Refunds"
                    description="Refund money for cancelled bookings"
                >
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.allowRefunds}
                            onChange={(e) => handleChange('allowRefunds', e.target.checked)}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">
                            {settings.allowRefunds ? 'Allowed' : 'Not Allowed'}
                        </span>
                    </label>
                </SettingField>
            </SettingsSection>

            {/* Payment Settings */}
            <SettingsSection
                title="Payment Settings"
                description="Configure payment limits and gateway"
            >
                <SettingField
                    label="Minimum Top-Up Amount"
                    description="Minimum amount users can add to wallet"
                >
                    <Input
                        type="number"
                        min="0"
                        value={settings.minimumTopUpAmount}
                        onChange={(e) => handleChange('minimumTopUpAmount', parseInt(e.target.value) || 100)}
                    />
                </SettingField>

                <SettingField
                    label="Maximum Transfer Amount"
                    description="Maximum amount users can transfer at once"
                >
                    <Input
                        type="number"
                        min="0"
                        value={settings.maximumTransferAmount}
                        onChange={(e) => handleChange('maximumTransferAmount', parseInt(e.target.value) || 5000)}
                    />
                </SettingField>

                <SettingField
                    label="Payment Gateway"
                    description="Enable external payment gateway integration"
                >
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.paymentGatewayEnabled}
                            onChange={(e) => handleChange('paymentGatewayEnabled', e.target.checked)}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">
                            {settings.paymentGatewayEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </label>
                </SettingField>
            </SettingsSection>

            {/* Notification Settings */}
            <SettingsSection
                title="Notification Settings"
                description="Configure email and SMS notifications"
            >
                <SettingField
                    label="Email Notifications"
                    description="Send notifications via email"
                >
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.emailNotificationsEnabled}
                            onChange={(e) => handleChange('emailNotificationsEnabled', e.target.checked)}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">
                            {settings.emailNotificationsEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </label>
                </SettingField>

                <SettingField
                    label="SMS Notifications"
                    description="Send notifications via SMS"
                >
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.smsNotificationsEnabled}
                            onChange={(e) => handleChange('smsNotificationsEnabled', e.target.checked)}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">
                            {settings.smsNotificationsEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </label>
                </SettingField>

                <SettingField
                    label="Booking Confirmation Email"
                    description="Send email when booking is confirmed"
                >
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.bookingConfirmationEmail}
                            onChange={(e) => handleChange('bookingConfirmationEmail', e.target.checked)}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">
                            {settings.bookingConfirmationEmail ? 'Enabled' : 'Disabled'}
                        </span>
                    </label>
                </SettingField>
            </SettingsSection>

            {/* System Settings */}
            <SettingsSection
                title="System Settings"
                description="System-wide configuration"
            >
                <SettingField
                    label="Timezone"
                    description="System timezone"
                >
                    <Select
                        value={settings.timezone}
                        onChange={(value) => handleChange('timezone', value)}
                        options={[
                            { value: 'Asia/Karachi', label: 'Asia/Karachi (PKT)' },
                            { value: 'UTC', label: 'UTC' },
                            { value: 'America/New_York', label: 'America/New_York (EST)' },
                        ]}
                        placeholder="Select timezone"
                    />
                </SettingField>

                <SettingField
                    label="Date Format"
                    description="How dates are displayed"
                >
                    <Select
                        value={settings.dateFormat}
                        onChange={(value) => handleChange('dateFormat', value)}
                        options={[
                            { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                            { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                            { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                        ]}
                        placeholder="Select date format"
                    />
                </SettingField>

                <SettingField
                    label="Currency"
                    description="System currency"
                >
                    <Select
                        value={settings.currency}
                        onChange={(value) => handleChange('currency', value)}
                        options={[
                            { value: 'PKR', label: 'PKR (Pakistani Rupee)' },
                            { value: 'USD', label: 'USD (US Dollar)' },
                            { value: 'EUR', label: 'EUR (Euro)' },
                        ]}
                        placeholder="Select currency"
                    />
                </SettingField>
            </SettingsSection>
        </div>
    );
};
