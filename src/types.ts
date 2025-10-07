
export enum UserRole {
    ADMIN = 'admin',
    MANAGEMENT = 'management',
    CUSTOMER = 'customer'
}

export interface User {
    id: string;
    name: string;
    email?: string;
    role: UserRole;
}

export enum BookingType {
    SLOT = 'slot',
    FULL_DAY = 'full_day'
}

export enum PaymentStatus {
    PAID = 'Paid',
    UNPAID = 'Unpaid'
}

export enum BookingStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    CONFIRMED = 'confirmed'
}

export interface Booking {
    id: number;
    created_at: string;
    request_number?: string; // Unique request number for booking requests
    date: string; // YYYY-MM-DD
    booking_type: BookingType;
    slots?: string[];
    net_number?: string | string[];
    customer_name: string;
    customer_contact: string;
    customer_email: string;
    event_type: string;
    notes?: string;
    payment_status: PaymentStatus;
    payment_amount: number;
    system: 'ground' | 'net';
    status: BookingStatus;
    submitted_at?: string; // For booking requests
}

export interface Holiday {
    date: string;
    name: string;
}

export interface SpecialDate {
    id: number;
    date?: string; // Single date (for backward compatibility)
    start_date?: string; // Start date for date ranges
    end_date?: string; // End date for date ranges
    description?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    created_by?: string;
}