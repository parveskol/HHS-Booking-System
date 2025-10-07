import React, { useState, useEffect, useMemo } from 'react';
import { BookingType, PaymentStatus, BookingStatus } from '../types';
import { TIME_SLOTS, NET_TIME_SLOTS } from '../constants';
import { X, Send, Loader2 } from 'lucide-react';

interface CustomerBookingRequestModalProps {
   isOpen: boolean;
   onClose: () => void;
   date: Date | null;
   system: 'ground' | 'net';
   onSubmitRequest: (requestData: any) => Promise<any>;
   user: { name: string; email?: string } | null;
   bookings: any[]; // Add bookings prop to check availability
   onBookingUpdate?: () => Promise<void>;
 }

const CustomerBookingRequestModal: React.FC<CustomerBookingRequestModalProps> = ({
   isOpen,
   onClose,
   date,
   system,
   onSubmitRequest,
   user,
   bookings,
   onBookingUpdate
 }) => {
  const [formData, setFormData] = useState({
    customer_name: user?.name || '',
    customer_contact: '',
    customer_email: user?.email || '',
    event_type: '',
    notes: '',
    booking_type: BookingType.SLOT,
    slots: [] as string[],
    net_number: [],
    payment_amount: undefined as number | undefined,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notesLetterCount, setNotesLetterCount] = useState(0);
  const [submittedRequestNumber, setSubmittedRequestNumber] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [formValidationError, setFormValidationError] = useState<string>('');

  const currentSlots = system === 'ground' ? TIME_SLOTS : NET_TIME_SLOTS;

  // Get bookings for the selected date for availability checking
  const bookingsOnSelectedDate = useMemo(() => {
    if (!date || !bookings) return [];
    const dateStr = toLocalDateString(date);
    return bookings.filter(b => b.date === dateStr);
  }, [date, bookings]);

  const isSlotBooked = (slot: string) => {
    return bookingsOnSelectedDate.some(b =>
      b.booking_type === BookingType.SLOT &&
      b.status === BookingStatus.CONFIRMED &&
      b.slots?.includes(slot)
    );
  };

  const hasConfirmedSlotBookings = useMemo(() =>
    bookingsOnSelectedDate.some(b =>
      b.booking_type === BookingType.SLOT &&
      b.status === BookingStatus.CONFIRMED
    ), [bookingsOnSelectedDate]);

  const isAnotherFullDayBooked = useMemo(() =>
    bookingsOnSelectedDate.some(b =>
      b.booking_type === BookingType.FULL_DAY
    ), [bookingsOnSelectedDate]);

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateName = (name: string): string | null => {
    const words = name.trim().split(/\s+/).filter(word => word.length > 0);
    if (words.length > 5) {
      return 'Name should not exceed 5 words';
    }
    return null;
  };

  const validateContact = (contact: string): string | null => {
    const digitsOnly = contact.replace(/\D/g, '');
    if (contact.trim() === '') {
      return 'Contact number is required';
    }
    if (digitsOnly.length === 0) {
      return 'Contact number must contain only numbers';
    }
    if (digitsOnly.length < 10) {
      return 'Contact number must be at least 10 digits';
    }
    if (digitsOnly.length > 10) {
      return 'Contact number should not exceed 10 digits';
    }
    return null;
  };

  const validateEventType = (eventType: string): string | null => {
    const words = eventType.trim().split(/\s+/).filter(word => word.length > 0);
    if (words.length > 1) {
      return 'Event type should be one word only';
    }
    return null;
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    // Validate customer name
    if (formData.customer_name) {
      const nameError = validateName(formData.customer_name);
      if (nameError) errors.customer_name = nameError;
    }

    // Validate contact number
    if (formData.customer_contact) {
      const contactError = validateContact(formData.customer_contact);
      if (contactError) errors.customer_contact = contactError;
    }

    // Validate email
    if (formData.customer_email) {
      const emailError = validateEmail(formData.customer_email) ? null : 'Please enter a valid email address';
      if (emailError) errors.customer_email = emailError;
    }

    // Validate event type
    if (formData.event_type) {
      const eventError = validateEventType(formData.event_type);
      if (eventError) errors.event_type = eventError;
    }

    // Validate booking timing selection
    if (formData.booking_type === BookingType.SLOT && formData.slots.length === 0) {
      errors.booking_timing = 'Please select at least one time slot';
    }

    // Validate net selection for net system
    if (system === 'net' && formData.net_number.length === 0) {
      errors.net_selection = 'Please select at least one net';
    }

    setValidationErrors(errors);

    const hasErrors = Object.keys(errors).length > 0;
    if (hasErrors) {
      setFormValidationError('Please fix the errors above before submitting.');
    } else {
      setFormValidationError('');
    }

    return !hasErrors;
  };

  useEffect(() => {
    if (isOpen && date) {
      console.log('📝 CustomerBookingRequestModal: Setting up form with user data:', {
        userName: user?.name,
        userEmail: user?.email,
        date: date.toISOString(),
        system
      });

      // Reset success state when modal opens
      setShowSuccess(false);
      setSubmittedRequestNumber(null);
      setFormValidationError('');

      setFormData(prev => ({
        ...prev,
        customer_name: user?.name || '',
        customer_email: user?.email || '',
        booking_type: BookingType.SLOT,
        slots: [],
        net_number: [] as string[],
      }));
    }
  }, [isOpen, date, system, user]);

  if (!isOpen || !date) return null;

  // Show success screen with request number
  if (showSuccess && submittedRequestNumber) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 animate-fadeIn">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-xs mx-2">
          <div className="p-3 text-center">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-green-800 dark:text-green-300 mb-2">Submitted Successfully!</h2>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2 mb-2">
              <p className="text-green-800 dark:text-green-300 text-xs font-semibold mb-1">
                Booking request submitted successfully!
              </p>
              <p className="text-green-700 dark:text-green-400 text-xs">
                Our team will review and respond soon.
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 mb-2">
              <div className="bg-white dark:bg-gray-800 rounded p-1.5 mb-1 border border-blue-200 dark:border-blue-700">
                <p className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold tracking-wider">
                  {submittedRequestNumber}
                </p>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                📋 Save this tracking number
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2 mb-2">
              <div className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
                <div className="flex items-center">
                  <span className="w-1 h-1 bg-amber-500 rounded-full mr-1 flex-shrink-0"></span>
                  Review within 24 hours
                </div>
                <div className="flex items-center">
                  <span className="w-1 h-1 bg-amber-500 rounded-full mr-1 flex-shrink-0"></span>
                  Notification on approval/rejection
                </div>
                <div className="flex items-center">
                  <span className="w-1 h-1 bg-amber-500 rounded-full mr-1 flex-shrink-0"></span>
                  Track in "Track Bookings"
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowSuccess(false);
                setSubmittedRequestNumber(null);
                onClose();
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-semibold text-sm transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              ✓ Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'notes') {
      const letters = value.length;
      setNotesLetterCount(letters);
    }

    // Validation
    let error = null;
    if (name === 'customer_name' && value) {
      error = validateName(value);
    } else if (name === 'customer_contact' && value) {
      error = validateContact(value);
    } else if (name === 'customer_email' && value) {
      error = validateEmail(value) ? null : 'Please enter a valid email address';
    } else if (name === 'event_type' && value) {
      error = validateEventType(value);
    }

    setValidationErrors(prev => ({
      ...prev,
      [name]: error
    }));

    setFormData(prev => ({
      ...prev,
      [name]: name === 'payment_amount' ? (value ? parseFloat(value) || undefined : undefined) : value
    }));
  };

  const handleSlotSelection = (slot: string) => {
    setFormData(prev => {
      const newSlots = prev.slots.includes(slot)
        ? prev.slots.filter(s => s !== slot)
        : [...prev.slots, slot];
      return { ...prev, slots: newSlots, booking_type: BookingType.SLOT };
    });
  };

  const handleFullDaySelection = () => {
    setFormData(prev => ({ ...prev, slots: [], booking_type: BookingType.FULL_DAY }));
  };

  const handleNetSelection = (netNumber: string) => {
    setFormData(prev => {
      const newNetNumbers = prev.net_number.includes(netNumber)
        ? prev.net_number.filter(n => n !== netNumber)
        : [...prev.net_number, netNumber];
      return { ...prev, net_number: newNetNumbers };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    // Check network connectivity
    if (!navigator.onLine) {
      setFormValidationError('No internet connection. Please check your network and try again.');
      return;
    }

    setIsSubmitting(true);
    setFormValidationError(''); // Clear any previous errors

    try {
        // Normalize customer data before submission
        const normalizedFormData = {
          ...formData,
          customer_name: formData.customer_name.trim().replace(/\s+/g, ' '),
          customer_email: formData.customer_email.trim().toLowerCase(),
          customer_contact: formData.customer_contact.trim()
        };

        const requestData = {
          ...normalizedFormData,
          date: date.toISOString().split('T')[0],
          system: system,
          status: 'pending', // Request status
          submitted_at: new Date().toISOString(),
          payment_status: PaymentStatus.UNPAID, // Default payment status
          payment_amount: formData.payment_amount || 0, // Use form value or default to 0
        };

        // Submit request and get the response which includes the request number
        console.log(`📤 Submitting booking request for ${requestData.customer_name} (${requestData.customer_email})`);
        console.log('📋 Request data:', requestData);
        const response = await onSubmitRequest(requestData);

       // Get the actual request number from the response
       const actualRequestNumber = response && response[0] ? response[0].request_number : null;

       if (!actualRequestNumber) {
         throw new Error('Request submitted but no tracking number was generated');
       }

       console.log(`✅ Request submitted successfully. Tracking number: ${actualRequestNumber}`);

       // Show success screen with the actual request number
       setSubmittedRequestNumber(actualRequestNumber);
       setShowSuccess(true);

       // Trigger data refresh after successful booking request
       if (onBookingUpdate) {
           try {
               await onBookingUpdate();
           } catch (error) {
               console.error('❌ Error refreshing data after booking request:', error);
           }
       }
     } catch (error) {
       console.error("Failed to submit booking request:", error);

       // Show specific error message to user
       let errorMessage = 'Failed to submit booking request. Please try again.';

       if (error instanceof Error) {
         if (error.message.includes('duplicate')) {
           errorMessage = 'A similar request already exists. Please check your existing requests.';
         } else if (error.message.includes('constraint')) {
           errorMessage = 'Invalid request data. Please check all fields and try again.';
         } else if (error.message.includes('network') || error.message.includes('fetch')) {
           errorMessage = 'Network error. Please check your connection and try again.';
         } else if (error.message.includes('required')) {
           errorMessage = 'Please fill in all required fields correctly.';
         } else if (error.message.includes('Access denied')) {
           errorMessage = 'Access denied. Please log in again.';
         } else if (error.message.includes('already in progress')) {
           errorMessage = 'Request submission already in progress. Please wait.';
         }
       }

       setFormValidationError(errorMessage);
     } finally {
       setIsSubmitting(false);
     }
   };

  const toLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-1 sm:p-2 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-[95vw] sm:max-w-md md:max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-3 border-b dark:border-gray-700">
          <h2 className="text-base sm:text-lg font-bold text-brand-dark dark:text-white pr-2">
            Request Booking - {date.toLocaleDateString('en-GB', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            })}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0 touch-manipulation"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3 overflow-y-auto">
          {formValidationError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-700 dark:text-red-300 text-sm">{formValidationError}</p>
            </div>
          )}
          <div>
            <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Booking Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {system === 'ground' && (
                <button
                  type="button"
                  onClick={handleFullDaySelection}
                  disabled={hasConfirmedSlotBookings}
                  className={`p-2.5 rounded text-center transition-all text-sm ${
                    formData.booking_type === BookingType.FULL_DAY
                      ? 'bg-brand-blue text-white ring-2 ring-brand-orange'
                      : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
                  } ${
                    hasConfirmedSlotBookings
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Full Day Booking
                  {hasConfirmedSlotBookings && <span className="block text-xs">Unavailable</span>}
                </button>
              )}

              <div className={`col-span-full ${system === 'ground' ? '' : 'md:col-span-2'}`}>
                <p className="mb-1.5 text-sm font-medium text-gray-600 dark:text-gray-400">Available Slots</p>
                {validationErrors.booking_timing && (
                  <p className="text-red-500 text-xs mb-2">{validationErrors.booking_timing}</p>
                )}
                <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-1.5 ${formData.slots.length === 0 ? 'ring-2 ring-red-300 dark:ring-red-600 rounded-lg p-2' : ''}`}>
                  {currentSlots.map(slot => {
                    const booked = isSlotBooked(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => handleSlotSelection(slot)}
                        disabled={booked || isAnotherFullDayBooked}
                        className={`p-2 sm:p-1.5 rounded text-xs sm:text-sm transition-all flex flex-col items-center justify-center min-h-[44px] touch-manipulation ${
                          formData.slots.includes(slot)
                            ? 'bg-brand-blue text-white ring-2 ring-brand-orange'
                            : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
                        } ${
                          booked || isAnotherFullDayBooked
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95'
                        }`}
                      >
                        <span className="font-medium">{slot}</span>
                        {booked && <span className="block text-xs leading-tight mt-0.5">(Booked)</span>}
                      </button>
                    );
                  })}
                  {formData.slots.length === 0 && (
                    <div className="col-span-full text-center py-2">
                      <p className="text-xs text-red-500 dark:text-red-400">⚠️ Please select at least one time slot</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pt-2 sm:pt-3 border-t dark:border-gray-700">
            <div>
              <input
                name="customer_name"
                value={formData.customer_name}
                onChange={handleInputChange}
                type="text"
                placeholder="Your Name"
                className="p-2 sm:p-1.5 border rounded bg-gray-100 dark:bg-gray-600 dark:border-gray-500 text-gray-600 dark:text-gray-400 cursor-not-allowed w-full text-sm"
                readOnly
                required
              />
              {validationErrors.customer_name && <p className="text-red-500 text-xs mt-1">{validationErrors.customer_name}</p>}
            </div>
            <div>
              <input
                name="customer_contact"
                value={formData.customer_contact}
                onChange={handleInputChange}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                placeholder="Contact Number"
                className={`p-2 sm:p-1.5 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition w-full text-sm touch-manipulation ${validationErrors.customer_contact ? 'border-red-500' : ''}`}
                required
              />
              {validationErrors.customer_contact && <p className="text-red-500 text-xs mt-1">{validationErrors.customer_contact}</p>}
            </div>
            <div>
              <input
                name="customer_email"
                value={formData.customer_email}
                onChange={handleInputChange}
                type="email"
                placeholder="Email Address"
                className="p-2 sm:p-1.5 border rounded bg-gray-100 dark:bg-gray-600 dark:border-gray-500 text-gray-600 dark:text-gray-400 cursor-not-allowed w-full text-sm"
                readOnly
              />
              {validationErrors.customer_email && <p className="text-red-500 text-xs mt-1">{validationErrors.customer_email}</p>}
            </div>
            {system === 'ground' ? (
              <div>
                <input
                  name="event_type"
                  value={formData.event_type}
                  onChange={handleInputChange}
                  type="text"
                  placeholder="Sport / Event Type"
                  className={`p-2 sm:p-1.5 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition w-full text-sm touch-manipulation ${validationErrors.event_type ? 'border-red-500' : ''}`}
                  required
                />
                {validationErrors.event_type && <p className="text-red-500 text-xs mt-1">{validationErrors.event_type}</p>}
              </div>
            ) : (
              <div>
                <p className="mb-1.5 text-sm font-medium text-gray-600 dark:text-gray-400">Select Nets</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleNetSelection('1')}
                    className={`p-2.5 rounded text-center transition-all text-sm ${
                      formData.net_number.includes('1')
                        ? 'bg-brand-blue text-white ring-2 ring-brand-orange'
                        : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Concrete Net 1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNetSelection('2')}
                    className={`p-2.5 rounded text-center transition-all text-sm ${
                      formData.net_number.includes('2')
                        ? 'bg-brand-blue text-white ring-2 ring-brand-orange'
                        : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Concrete Net 2
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNetSelection('3')}
                    className={`p-2.5 rounded text-center transition-all text-sm ${
                      formData.net_number.includes('3')
                        ? 'bg-brand-blue text-white ring-2 ring-brand-orange'
                        : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Astro Net 1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNetSelection('4')}
                    className={`p-2.5 rounded text-center transition-all text-sm ${
                      formData.net_number.includes('4')
                        ? 'bg-brand-blue text-white ring-2 ring-brand-orange'
                        : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Astro Net 2
                  </button>
                </div>
                {validationErrors.net_selection && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.net_selection}</p>
                )}
              </div>
            )}
            <input
              name="payment_amount"
              value={formData.payment_amount || ''}
              onChange={handleInputChange}
              type="number"
              step="0.01"
              min="0"
              placeholder="Expected Amount"
              className="p-2 sm:p-1.5 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition w-full text-sm touch-manipulation"
            />
          </div>

          <div className="pt-2 sm:pt-3">
            <div className="flex justify-between items-center mb-1 sm:mb-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Notes
              </label>
              <span className={`text-xs ${notesLetterCount > 100 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                {notesLetterCount}/100
              </span>
            </div>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Notes..."
              maxLength={notesLetterCount > 100 ? undefined : 100}
              className={`p-1.5 sm:p-2 border rounded w-full h-16 sm:h-20 bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition text-sm ${
                notesLetterCount > 100 ? 'border-red-500' : ''
              }`}
            />
            {notesLetterCount > 100 && (
              <p className="text-red-500 text-xs mt-1">
                Letter limit exceeded
              </p>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5">
            <p className="text-xs text-blue-800 dark:text-blue-300">
              <strong>Note:</strong> This is a booking request that will be reviewed by our management team.
              You'll receive a notification once your request is approved or declined.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-end items-center gap-2 sm:gap-3 pt-2 sm:pt-3 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 px-3 py-2 sm:px-3 sm:py-1.5 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors touch-manipulation min-h-[44px] sm:min-h-[36px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Object.keys(validationErrors).length > 0}
              className="w-full sm:w-auto bg-brand-orange text-white px-3 py-2 sm:px-3 sm:py-1.5 rounded-lg text-sm hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 touch-manipulation min-h-[44px] sm:min-h-[36px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin flex-shrink-0" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send size={14} className="flex-shrink-0" />
                  <span>Submit Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerBookingRequestModal;