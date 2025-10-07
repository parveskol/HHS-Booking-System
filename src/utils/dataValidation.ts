import { Booking, BookingType, PaymentStatus, BookingStatus } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConflictResolution {
  strategy: 'server_wins' | 'client_wins' | 'merge' | 'manual';
  resolvedData?: any;
  conflicts?: string[];
}

// Validate booking data
export const validateBookingData = (booking: Partial<Booking>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  if (!booking.customer_name || booking.customer_name.trim().length === 0) {
    errors.push('Customer name is required');
  }

  if (!booking.customer_contact || booking.customer_contact.trim().length === 0) {
    errors.push('Customer contact is required');
  }

  if (!booking.date) {
    errors.push('Date is required');
  } else {
    // Validate date format and ensure it's not in the past
    const bookingDate = new Date(booking.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(bookingDate.getTime())) {
      errors.push('Invalid date format');
    } else if (bookingDate < today) {
      warnings.push('Booking date is in the past');
    }
  }

  if (!booking.booking_type || !Object.values(BookingType).includes(booking.booking_type)) {
    errors.push('Valid booking type is required');
  }

  if (!booking.event_type || booking.event_type.trim().length === 0) {
    errors.push('Event type is required');
  }

  if (!booking.payment_status || !Object.values(PaymentStatus).includes(booking.payment_status)) {
    errors.push('Valid payment status is required');
  }

  if (!booking.system || !['ground', 'net'].includes(booking.system)) {
    errors.push('Valid system (ground/net) is required');
  }

  if (!booking.status || !Object.values(BookingStatus).includes(booking.status)) {
    errors.push('Valid booking status is required');
  }

  // Payment amount validation
  if (booking.payment_amount !== undefined) {
    if (typeof booking.payment_amount !== 'number' || booking.payment_amount < 0) {
      errors.push('Payment amount must be a positive number');
    }
  }

  // Contact number validation
  if (booking.customer_contact) {
    const contactRegex = /^[6-9]\d{9}$/; // Indian mobile number format
    if (!contactRegex.test(booking.customer_contact.replace(/\s+/g, ''))) {
      warnings.push('Contact number format may be invalid');
    }
  }

  // Email validation
  if (booking.customer_email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(booking.customer_email)) {
      warnings.push('Email format may be invalid');
    }
  }

  // Net number validation for net bookings
  if (booking.system === 'net' && booking.net_number) {
    if (!['1', '2', '3', '4'].includes(booking.net_number)) {
      errors.push('Net number must be between 1 and 4');
    }
  }

  // Slot validation for slot bookings
  if (booking.booking_type === BookingType.SLOT && (!booking.slots || booking.slots.length === 0)) {
    errors.push('Time slots are required for slot bookings');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Validate booking request data
export const validateBookingRequestData = (request: Partial<Booking>): ValidationResult => {
  // Booking requests have similar validation but some fields are optional
  const baseValidation = validateBookingData(request);

  // For requests, some fields might be more lenient
  const requestSpecificErrors = baseValidation.errors.filter(error =>
    !error.includes('payment_status') &&
    !error.includes('booking status')
  );

  return {
    isValid: requestSpecificErrors.length === 0,
    errors: requestSpecificErrors,
    warnings: baseValidation.warnings
  };
};

// Check for data conflicts between local and server data
export const detectConflicts = (localData: Booking, serverData: Booking): string[] => {
  const conflicts: string[] = [];

  // Check for timestamp differences
  const localTime = new Date(localData.created_at || 0).getTime();
  const serverTime = new Date(serverData.created_at || 0).getTime();

  if (localTime !== serverTime) {
    conflicts.push('created_at');
  }

  // Check for status conflicts
  if (localData.status !== serverData.status) {
    conflicts.push('status');
  }

  // Check for payment status conflicts
  if (localData.payment_status !== serverData.payment_status) {
    conflicts.push('payment_status');
  }

  // Check for payment amount conflicts
  if (localData.payment_amount !== serverData.payment_amount) {
    conflicts.push('payment_amount');
  }

  return conflicts;
};

// Resolve conflicts using different strategies
export const resolveConflict = (
  localData: Booking,
  serverData: Booking,
  strategy: ConflictResolution['strategy']
): ConflictResolution => {
  const conflicts = detectConflicts(localData, serverData);

  if (conflicts.length === 0) {
    return {
      strategy: 'merge',
      resolvedData: serverData,
      conflicts: []
    };
  }

  switch (strategy) {
    case 'server_wins':
      return {
        strategy: 'server_wins',
        resolvedData: serverData,
        conflicts
      };

    case 'client_wins':
      return {
        strategy: 'client_wins',
        resolvedData: localData,
        conflicts
      };

    case 'merge':
      // Merge non-conflicting fields
      const merged = { ...serverData };

      // Keep server values for most fields, but preserve local notes if present
      if (localData.notes && !serverData.notes) {
        merged.notes = localData.notes;
      }

      return {
        strategy: 'merge',
        resolvedData: merged,
        conflicts
      };

    case 'manual':
    default:
      return {
        strategy: 'manual',
        conflicts,
        resolvedData: null
      };
  }
};

// Sanitize data before saving
export const sanitizeBookingData = (booking: Partial<Booking>): Partial<Booking> => {
  const sanitized = { ...booking };

  // Trim string fields
  if (sanitized.customer_name) sanitized.customer_name = sanitized.customer_name.trim();
  if (sanitized.customer_contact) sanitized.customer_contact = sanitized.customer_contact.trim();
  if (sanitized.customer_email) sanitized.customer_email = sanitized.customer_email.trim().toLowerCase();
  if (sanitized.event_type) sanitized.event_type = sanitized.event_type.trim();
  if (sanitized.notes) sanitized.notes = sanitized.notes.trim();
  if (sanitized.net_number) sanitized.net_number = sanitized.net_number.trim();

  // Ensure slots is an array
  if (sanitized.slots && !Array.isArray(sanitized.slots)) {
    sanitized.slots = [sanitized.slots];
  }

  // Remove empty strings and set to undefined
  Object.keys(sanitized).forEach(key => {
    const value = sanitized[key as keyof Booking];
    if (typeof value === 'string' && value.trim() === '') {
      (sanitized as any)[key] = undefined;
    }
  });

  return sanitized;
};

// Generate checksum for data integrity
export const generateChecksum = (data: any): string => {
  const str = JSON.stringify(data, Object.keys(data).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
};

// Verify data integrity
export const verifyDataIntegrity = (data: any, expectedChecksum: string): boolean => {
  const actualChecksum = generateChecksum(data);
  return actualChecksum === expectedChecksum;
};