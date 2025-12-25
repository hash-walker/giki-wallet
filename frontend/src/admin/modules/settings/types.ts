export interface SystemSettings {
    // General Settings
    systemName: string;
    contactEmail: string;
    supportPhone: string;
    maintenanceMode: boolean;
    
    // Booking Settings
    maxAdvanceBookingDays: number;
    requireBookingConfirmation: boolean;
    allowCancellation: boolean;
    cancellationHoursBeforeTrip: number;
    allowRefunds: boolean;
    
    // Payment Settings
    minimumTopUpAmount: number;
    maximumTransferAmount: number;
    paymentGatewayEnabled: boolean;
    
    // Notification Settings
    emailNotificationsEnabled: boolean;
    smsNotificationsEnabled: boolean;
    bookingConfirmationEmail: boolean;
    
    // System Settings
    timezone: string;
    dateFormat: string;
    currency: string;
}

