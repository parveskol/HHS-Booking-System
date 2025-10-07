import React, { useState, useEffect } from 'react';
import { BookingType, PaymentStatus, UserRole } from '../types';
import { TIME_SLOTS, NET_TIME_SLOTS } from '../constants';
import { X, Send, Loader2, AlertTriangle } from 'lucide-react';

interface BookingRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date | null;
    system: 'ground' | 'net';
    onSubmitRequest: (requestData: any) => Promise<any>;
    userRole?: UserRole;
    onBookingUpdate?: () => Promise<void>;
    booking?: any; // For editing existing booking requests
  }

const BookingRequestModal: React.FC<BookingRequestModalProps> = ({
    isOpen,
    onClose,
    date,
    system,
    onSubmitRequest,
    userRole,
    onBookingUpdate,
    booking
  }) => {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_contact: '',
    customer_email: '',
    event_type: '',
    notes: '',
    booking_type: BookingType.SLOT,
    slots: [] as string[],
    net_number: [] as string[],
    payment_status: PaymentStatus.UNPAID,
    payment_amount: undefined as any,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
   const [notesLetterCount, setNotesLetterCount] = useState(0);
   const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
   const [formValidationError, setFormValidationError] = useState<string>('');

  const currentSlots = system === 'ground' ? TIME_SLOTS : NET_TIME_SLOTS;

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
      if (booking) {
        // Editing existing booking request - load the data
        console.log('📝 BookingRequestModal: Loading existing booking request for editing:', booking);
        setFormData({
          customer_name: booking.customer_name || '',
          customer_contact: booking.customer_contact || '',
          customer_email: booking.customer_email || '',
          event_type: booking.event_type || '',
          notes: booking.notes || '',
          booking_type: booking.booking_type || BookingType.SLOT,
          slots: booking.slots || [],
          net_number: Array.isArray(booking.net_number) ? booking.net_number : (booking.net_number ? [booking.net_number] : []),
          payment_status: booking.payment_status || PaymentStatus.UNPAID,
          payment_amount: booking.payment_amount,
        });
        setNotesLetterCount(booking.notes ? booking.notes.length : 0);
      } else {
        // Creating new booking request - reset form
        setFormData({
          customer_name: '',
          customer_contact: '',
          customer_email: '',
          event_type: '',
          notes: '',
          booking_type: BookingType.SLOT,
          slots: [],
          net_number: [] as string[],
          payment_status: PaymentStatus.UNPAID,
          payment_amount: undefined,
        });
        setNotesLetterCount(0);
      }
    }
  }, [isOpen, date, system, booking]);

  // Only allow admin users to access this modal
  if (userRole !== UserRole.ADMIN) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
            <h2 className="text-xl font-bold text-brand-dark dark:text-white flex items-center space-x-2">
              <AlertTriangle className="text-red-500" size={24} />
              <span>Access Denied</span>
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <X />
            </button>
          </div>
          <div className="p-6">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-300">
                <strong>Access Restricted:</strong> This feature is only available to administrators.
                Please contact your administrator if you need assistance.
              </p>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={onClose}
                className="bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isOpen || !date) return null;

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
      [name]: name === 'payment_amount' ? (value ? parseFloat(value) || 0 : 0) : value
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
      const baseRequestData = {
        ...formData,
        date: date?.toISOString().split('T')[0],
        system: system,
        submitted_at: new Date().toISOString(),
      };

      if (booking) {
        // Updating existing booking request
        console.log('📝 Updating existing booking request:', booking.id);
        const updateData = {
          ...baseRequestData,
          id: booking.id,
          request_number: booking.request_number,
          status: booking.status,
          created_at: booking.created_at,
        };

        await onSubmitRequest(updateData);
      } else {
        // Creating new booking request
        console.log('📝 Creating new booking request');
        const requestData = {
          ...baseRequestData,
          status: 'pending', // Request status
        };

        await onSubmitRequest(requestData);
      }

      onClose();

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md md:max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold text-brand-dark dark:text-white">
            {booking ? 'Edit' : 'Request'} Booking {booking ? '- ' + date?.toLocaleDateString('en-GB', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            }) : 'for ' + date?.toLocaleDateString('en-GB', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {formValidationError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-700 dark:text-red-300 text-sm">{formValidationError}</p>
            </div>
          )}
          <div>
            <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Booking Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {system === 'ground' && (
                <button
                  type="button"
                  onClick={handleFullDaySelection}
                  className={`p-3 rounded text-center transition-all ${
                    formData.booking_type === BookingType.FULL_DAY
                      ? 'bg-brand-blue text-white ring-2 ring-brand-orange'
                      : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Full Day Booking
                </button>
              )}

              <div className={`col-span-full ${system === 'ground' ? '' : 'md:col-span-2'}`}>
                <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Available Slots</p>
                {validationErrors.booking_timing && (
                  <p className="text-red-500 text-xs mb-2">{validationErrors.booking_timing}</p>
                )}
                <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 ${formData.slots.length === 0 ? 'ring-2 ring-red-300 dark:ring-red-600 rounded-lg p-2' : ''}`}>
                  {currentSlots.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => handleSlotSelection(slot)}
                      className={`p-2 rounded text-sm transition-all flex items-center justify-center space-x-2 ${
                        formData.slots.includes(slot)
                          ? 'bg-brand-blue text-white ring-2 ring-brand-orange'
                          : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span>{slot}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t dark:border-gray-700">
            <input
              name="customer_name"
              value={formData.customer_name}
              onChange={handleInputChange}
              type="text"
              placeholder="Your Name"
              className={`p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition ${validationErrors.customer_name ? 'border-red-500' : ''}`}
              required
            />
            {validationErrors.customer_name && <p className="text-red-500 text-xs mt-1">{validationErrors.customer_name}</p>}
            <input
              name="customer_contact"
              value={formData.customer_contact}
              onChange={handleInputChange}
              type="tel"
              placeholder="Contact Number"
              className={`p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition ${validationErrors.customer_contact ? 'border-red-500' : ''}`}
              required
            />
            {validationErrors.customer_contact && <p className="text-red-500 text-xs mt-1">{validationErrors.customer_contact}</p>}
            <input
              name="customer_email"
              value={formData.customer_email}
              type="email"
              onChange={handleInputChange}
              placeholder="Email Address"
              className={`p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition ${validationErrors.customer_email ? 'border-red-500' : ''}`}
            />
            {validationErrors.customer_email && <p className="text-red-500 text-xs mt-1">{validationErrors.customer_email}</p>}
            {system === 'ground' ? (
              <>
                <input
                  name="event_type"
                  value={formData.event_type}
                  onChange={handleInputChange}
                  type="text"
                  placeholder="Sport / Event Type"
                  className={`p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition ${validationErrors.event_type ? 'border-red-500' : ''}`}
                  required
                />
                {validationErrors.event_type && <p className="text-red-500 text-xs mt-1">{validationErrors.event_type}</p>}
              </>
            ) : (
              <div>
                <p className="mb-1.5 text-sm font-medium text-gray-600 dark:text-gray-400">Select Nets</p>
                {validationErrors.net_selection && (
                  <p className="text-red-500 text-xs mb-2">{validationErrors.net_selection}</p>
                )}
                <div className={`grid grid-cols-2 gap-2 ${formData.net_number.length === 0 ? 'ring-2 ring-red-300 dark:ring-red-600 rounded-lg p-2' : ''}`}>
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
              </div>
            )}
            <select
              name="payment_status"
              value={formData.payment_status}
              onChange={handleInputChange}
              className="p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition"
            >
              <option value={PaymentStatus.UNPAID}>Pay Later</option>
              <option value={PaymentStatus.PAID}>Pay Now</option>
            </select>
            <input
              name="payment_amount"
              value={formData.payment_amount || ''}
              onChange={handleInputChange}
              type="number"
              step="0.01"
              min="0"
              placeholder="Expected Amount"
              className="p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition"
            />
          </div>

          <div className="pt-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Notes / Special Requests
              </label>
              <span className={`text-xs ${notesLetterCount > 100 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                {notesLetterCount}/100
              </span>
            </div>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Any special requests or notes..."
              maxLength={notesLetterCount > 100 ? undefined : 100}
              className={`p-2 border rounded w-full h-24 bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition ${
                notesLetterCount > 100 ? 'border-red-500' : ''
              }`}
            />
            {notesLetterCount > 100 && (
              <p className="text-red-500 text-xs mt-1">
                Letter limit exceeded. Please keep notes under 100 letters.
              </p>
            )}
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              <strong>Note:</strong> This is a booking request that will be reviewed by our management team.
              You'll receive a notification once your request is approved or declined.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-end items-center gap-3 pt-4 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Object.keys(validationErrors).length > 0}
              className="w-full sm:w-auto bg-brand-orange text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>{booking ? 'Update' : 'Submit Request'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingRequestModal;