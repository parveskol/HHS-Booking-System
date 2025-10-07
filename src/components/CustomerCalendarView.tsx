import React, { useState, useMemo, useContext } from 'react';
import { Booking, BookingType, BookingStatus, SpecialDate } from '../types';
import { TIME_SLOTS, NET_TIME_SLOTS } from '../constants';
import { ChevronLeft, ChevronRight, Plus, X, LayoutGrid, List } from 'lucide-react';
import { AppContext } from '../context/AppContext';

interface CustomerCalendarViewProps {
  bookings: Booking[];
  bookingRequests: Booking[];
  system: 'ground' | 'net';
  onBookingRequest?: (requestData: any) => Promise<any>;
}

type CalendarDisplayMode = 'grid' | 'list';

const CustomerCalendarView: React.FC<CustomerCalendarViewProps> = ({ bookings, bookingRequests, system, onBookingRequest }) => {
  const { user, specialDates } = useContext(AppContext);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [viewMode, setViewMode] = useState<CalendarDisplayMode>('grid'); // Default to grid view for customers
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [submittedRequestNumber, setSubmittedRequestNumber] = useState<string | null>(null);

  // Form state for booking request
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_contact: '',
    customer_email: '',
    event_type: '',
    net_number: [],
    booking_type: BookingType.SLOT,
    slots: [] as string[],
    notes: '',
    payment_status: 'Unpaid' as const,
    payment_amount: 0
  });
  const [notesLetterCount, setNotesLetterCount] = useState(0);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [formValidationError, setFormValidationError] = useState<string>('');

  const currentSlots = useMemo(() => system === 'ground' ? TIME_SLOTS : NET_TIME_SLOTS, [system]);

  // Helper functions for new availability rules
  const isWeekend = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  };

  const isSpecialDate = (date: Date): boolean => {
    const dateStr = toLocalDateString(date);

    return specialDates.some(sd => {
      // Check if special date is active
      if (!sd.is_active) return false;

      // Check single date (existing logic)
      if (sd.date === dateStr) return true;

      // Check date range (new logic)
      if (sd.start_date && sd.end_date) {
        const startDate = new Date(sd.start_date);
        const endDate = new Date(sd.end_date);
        const checkDate = new Date(dateStr);

        // Check if date falls within the range (inclusive)
        return checkDate >= startDate && checkDate <= endDate;
      }

      return false;
    });
  };

  const getAvailableSlotsForDate = (date: Date): string[] => {
    if (isWeekend(date) || isSpecialDate(date)) {
      // Weekends and special dates: all slots available for both systems
      return currentSlots;
    } else {
      // Weekdays: slots from 1:30pm onwards for both systems
      const afternoonSlots: string[] = [];

      if (system === 'ground') {
        // Ground Booking: look for 1:30 PM slot
        currentSlots.forEach(slot => {
          const startTime = slot.split(' - ')[0];
          if (startTime === '01:30 PM') {
            const startIndex = currentSlots.indexOf(slot);
            afternoonSlots.push(...currentSlots.slice(startIndex));
          }
        });
      } else {
        // Indoor Net Booking: look for 2:00 PM slot (first slot after 1:30 PM)
        currentSlots.forEach(slot => {
          const startTime = slot.split(' - ')[0];
          if (startTime === '02:00 PM') {
            const startIndex = currentSlots.indexOf(slot);
            afternoonSlots.push(...currentSlots.slice(startIndex));
          }
        });
      }

      return afternoonSlots;
    }
  };

  // Availability checking functions
  const hasConfirmedSlotBookings = (date: Date) => {
    const bookingsOnDate = getBookingsForDate(date);
    return bookingsOnDate.some(b =>
      b.booking_type === BookingType.SLOT &&
      b.status === BookingStatus.CONFIRMED
    );
  };

  const isAnotherFullDayBooked = (date: Date) => {
    const bookingsOnDate = getBookingsForDate(date);
    return bookingsOnDate.some(b =>
      b.booking_type === BookingType.FULL_DAY
    );
  };

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

  const handleNetSelection = (netNumber: string) => {
    setFormData(prev => {
      const newNetNumbers = prev.net_number.includes(netNumber)
        ? prev.net_number.filter(n => n !== netNumber)
        : [...prev.net_number, netNumber];
      return { ...prev, net_number: newNetNumbers };
    });
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

  const toLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    for (let i = 0; i < 42; i++) {
      days.push(new Date(startDate));
      startDate.setDate(startDate.getDate() + 1);
    }
    return days;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const isDateInPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const getBookingsForDate = (date: Date) => {
    const dateStr = toLocalDateString(date);
    const bookingsOnDate = bookings.filter(b => b.date === dateStr);
    return bookingsOnDate;
  };

  const isSlotAvailable = (date: Date, slot: string) => {
    // First check if the slot is available based on weekday/weekend rules
    const availableSlotsForDate = getAvailableSlotsForDate(date);
    const isSlotAllowedByRules = availableSlotsForDate.includes(slot);

    if (!isSlotAllowedByRules) {
      return false;
    }

    const bookingsOnDate = getBookingsForDate(date);
    const fullDayBooking = bookingsOnDate.find(b =>
      b.booking_type === BookingType.FULL_DAY &&
      b.status === 'confirmed'
    );
    if (fullDayBooking) {
      return false;
    }

    const bookedSlot = bookingsOnDate.find(b =>
      b.booking_type === BookingType.SLOT &&
      b.slots?.includes(slot) &&
      b.status === 'confirmed'
    );

    if (bookedSlot) {
      return false;
    }

    return true;
  };

  const isDayFullyBooked = (date: Date) => {
    const bookingsOnDate = getBookingsForDate(date);
    const fullDayBooking = bookingsOnDate.find(b =>
      b.booking_type === BookingType.FULL_DAY &&
      b.status === 'confirmed'
    );
    if (fullDayBooking) return true;

    // For weekends, check against all slots
    // For weekdays, only check against available slots (2pm onwards)
    const availableSlots = getAvailableSlotsForDate(date).filter(slot => isSlotAvailable(date, slot));
    return availableSlots.length === 0;
  };

  const getAvailabilityStatus = (date: Date) => {
    if (isDateInPast(date)) return 'past';
    if (isDayFullyBooked(date)) return 'booked';
    return 'available';
  };

  const handleDateClick = (date: Date) => {
    const status = getAvailabilityStatus(date);
    if (status === 'available' && !isDateInPast(date)) {
      setSelectedDate(date);
      setShowBookingModal(true);
    }
  };

  const handleBookingSubmit = async (formData: any) => {
    console.log('🚀 Starting booking submission process...');

    // Validate form before submission
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    console.log('✅ Form validation passed');

    if (onBookingRequest && selectedDate) {
      try {
        // Prepare request data, excluding empty event_type for Indoor Net Booking
        const baseRequestData = {
          ...formData,
          date: toLocalDateString(selectedDate),
          system: system,
          status: 'pending' as const,
          submitted_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };

        // For Indoor Net Booking, set a default event_type since it's not collected in the form
        const requestData = system === 'net'
          ? {
              ...baseRequestData,
              event_type: 'Indoor Net Practice'
            }
          : baseRequestData;

        console.log('📤 Submitting booking request:', requestData);

        // Call the parent component's booking request handler
        const response = await onBookingRequest(requestData);

        console.log('📥 Received response:', response);

        // Get the request number from the response
        const requestNumber = response && Array.isArray(response) && response[0] ? response[0].request_number : null;

        console.log('🎫 Extracted request number:', requestNumber);

        if (requestNumber) {
          console.log('✅ Request submitted successfully, showing success message');

          // Close the booking modal first
          setShowBookingModal(false);
          setSelectedDate(null);

          // Small delay to ensure modal closes before showing success message
          setTimeout(() => {
            setSubmittedRequestNumber(requestNumber);
            setShowSuccessMessage(true);
            console.log('🎉 Success message displayed with request number:', requestNumber);
          }, 100);

        } else {
          console.error('❌ No request number received in response:', response);
          throw new Error('Request submitted but no tracking number was generated');
        }

      } catch (error) {
        console.error('❌ Booking submission error:', error);
        setFormValidationError(`Failed to submit booking request: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.error('❌ Booking request handler not available');
      setFormValidationError('Booking request handler not available. Please try again.');
    }
  };

  const days = getDaysInMonth(currentDate);
  const today = new Date();

  const renderGridView = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
      <div className="grid grid-cols-7 text-center font-semibold text-gray-500 dark:text-gray-400 border-b dark:border-gray-700 pb-1 text-xs">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-0.5">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dateStr = toLocalDateString(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = day.toDateString() === today.toDateString();
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const availabilityStatus = getAvailabilityStatus(day);
          const bookingsOnDate = getBookingsForDate(day);

          return (
            <div
              key={index}
              onClick={() => handleDateClick(day)}
              className={`group border-r border-b dark:border-gray-700 p-0.5 flex flex-col relative min-h-[3rem] sm:min-h-[4rem] transition-all duration-200 ${
                isToday ? 'bg-brand-gold/20' : ''
              } ${
                availabilityStatus === 'available' && isCurrentMonth
                  ? 'hover:bg-brand-blue/10 cursor-pointer hover:scale-[1.02]'
                  : availabilityStatus === 'booked' && isCurrentMonth
                  ? 'cursor-not-allowed'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between w-full mb-0.5">
                <span className={`text-xs font-bold ${
                  isCurrentMonth ? ((isWeekend || isSpecialDate(day)) ? 'text-brand-orange' : 'text-gray-700 dark:text-gray-300') : 'text-gray-400 dark:text-gray-500'
                } ${availabilityStatus === 'available' ? 'text-brand-orange' : ''}`}>
                  {day.getDate()}
                </span>
                {availabilityStatus === 'available' && isCurrentMonth && (
                  <Plus size={8} className="text-brand-orange opacity-60" />
                )}
              </div>

              {availabilityStatus === 'available' && isCurrentMonth && (
                <div className="mt-auto text-xs text-green-600 dark:text-green-400 font-medium">
                  <span className="sm:hidden">✓</span>
                  <span className="hidden sm:inline">Available</span>
                </div>
              )}

              {availabilityStatus === 'booked' && isCurrentMonth && (
                <div className="mt-auto">
                  <div className="text-xs text-red-500 font-medium">
                    <span className="sm:hidden">✗</span>
                    <span className="hidden sm:inline">Booked</span>
                  </div>
                </div>
              )}

              {availabilityStatus === 'past' && (
                <div className="mt-auto text-xs text-gray-400">
                  <span className="sm:hidden">○</span>
                  <span className="hidden sm:inline">Past</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderListView = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
      <div className="p-2 sm:p-3 border-b dark:border-gray-700">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Available Dates</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Click on any available date to make a booking</p>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {days.filter(day => day && day.getMonth() === currentDate.getMonth()).map((day, index) => {
          const dateStr = toLocalDateString(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = day.toDateString() === today.toDateString();
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const availabilityStatus = getAvailabilityStatus(day);
          const bookingsOnDate = getBookingsForDate(day);

          if (!isCurrentMonth) return null;

          return (
            <div
              key={dateStr}
              onClick={() => handleDateClick(day)}
              className={`group border-b dark:border-gray-700 p-3 sm:p-4 transition-all duration-300 hover:shadow-sm ${
                isToday ? 'bg-brand-gold/10' : ''
              } ${
                availabilityStatus === 'available'
                  ? 'hover:bg-brand-blue/5 cursor-pointer bg-green-50/30 dark:bg-green-900/10 hover:scale-[1.01]'
                  : availabilityStatus === 'booked'
                  ? 'cursor-not-allowed bg-red-50/30 dark:bg-red-900/10'
                  : 'bg-gray-50/30 dark:bg-gray-800/50'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`font-bold text-sm sm:text-base ${
                      isToday ? 'text-brand-orange' : ((isWeekend || isSpecialDate(day)) ? 'text-brand-orange' : 'text-gray-800 dark:text-gray-200')
                    }`}>
                      {day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </span>
                    {isToday && (
                      <span className="px-2 py-0.5 bg-brand-orange text-white text-xs rounded-full font-medium animate-pulse">
                        Today
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <span className={`px-2 py-1 rounded-full font-medium transition-all ${
                      availabilityStatus === 'available'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : availabilityStatus === 'booked'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {availabilityStatus === 'available' ? '✓ Available' : availabilityStatus === 'booked' ? '✗ Booked' : '○ Past'}
                    </span>

                    {availabilityStatus === 'available' && (
                      <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        Click to book slots
                      </span>
                    )}

                    {availabilityStatus === 'booked' && (
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        No slots available
                      </span>
                    )}

                    {availabilityStatus === 'past' && (
                      <span className="text-gray-500 dark:text-gray-400">
                        Not available for booking
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {availabilityStatus === 'available' && (
                    <div className="h-7 w-7 bg-brand-orange text-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all transform hover:scale-110">
                      <Plus size={14} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-2 sm:space-y-3 animate-slideInUp">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-1 sm:mb-2 gap-1 sm:gap-2">
        <div className="text-base sm:text-lg lg:text-xl font-display font-bold text-brand-dark dark:text-white text-center sm:text-left">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>

        <div className="flex items-center space-x-0.5">
          <button onClick={handlePrevMonth} className="p-0.5 sm:p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <ChevronLeft size={14} className="sm:w-3 sm:h-3" />
          </button>
          <button onClick={handleToday} className="px-1.5 py-0.5 text-xs font-semibold rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            Today
          </button>
          <button onClick={handleNextMonth} className="p-0.5 sm:p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <ChevronRight size={14} className="sm:w-3 sm:h-3" />
          </button>
          <div className="ml-1 border-l dark:border-gray-600 pl-1 flex space-x-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-0.5 sm:p-1 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-brand-blue/10 text-brand-blue dark:bg-brand-blue-light/20 dark:text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <LayoutGrid size={12} className="sm:w-3 sm:h-3" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-0.5 sm:p-1 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-brand-blue/10 text-brand-blue dark:bg-brand-blue-light/20 dark:text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <List size={12} className="sm:w-3 sm:h-3" />
            </button>
          </div>
        </div>
      </div>


      {/* Conditional Rendering Based on View Mode */}
      {viewMode === 'grid' ? renderGridView() : renderListView()}


      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 sm:p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
          <h3 className="font-semibold text-blue-800 dark:text-blue-300 text-xs sm:text-sm">How to Book</h3>
        </div>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <li className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <span>Available dates are highlighted in green</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-red-600">✗</span>
            <span>Fully booked dates are marked in red</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-gray-500">○</span>
            <span>Past dates are not available for booking</span>
          </li>
          <li className="flex items-center gap-2">
            <Plus size={12} className="text-brand-orange" />
            <span>Click available dates to make a booking request</span>
          </li>
          <li className="flex items-center gap-2">
            <LayoutGrid size={12} className="text-blue-600" />
            <span>Use Grid view for traditional calendar layout</span>
          </li>
          <li className="flex items-center gap-2">
            <List size={12} className="text-blue-600" />
            <span>Use List view for easier mobile browsing</span>
          </li>
        </ul>
      </div>

      {/* Success Message Modal */}
      {showSuccessMessage && submittedRequestNumber && (
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
                  console.log('🔄 Closing success message and resetting state');
                  setShowSuccessMessage(false);
                  setSubmittedRequestNumber(null);
                  setShowBookingModal(false);
                  setSelectedDate(null);

                  // Reset form
                  setFormData({
                    customer_name: '',
                    customer_contact: '',
                    customer_email: '',
                    event_type: '',
                    net_number: [],
                    booking_type: BookingType.SLOT,
                    slots: [],
                    notes: '',
                    payment_status: 'Unpaid',
                    payment_amount: 0
                  });
                  setNotesLetterCount(0);
                  setValidationErrors({});
                  setFormValidationError('');
                  console.log('✅ All states reset successfully');
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-semibold text-sm transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                ✓ Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Request Modal */}
      {showBookingModal && selectedDate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-1 sm:p-2 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md md:max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-2 sm:p-3 border-b dark:border-gray-700">
              <h2 className="text-base sm:text-lg font-bold text-brand-dark dark:text-white">
                Request Booking - {selectedDate.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}
              </h2>
              <button onClick={() => setShowBookingModal(false)} className="p-0.5 sm:p-1 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
                <X size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleBookingSubmit(formData); }} className="p-2 sm:p-3 space-y-2 sm:space-y-3 overflow-y-auto">
              {formValidationError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2">
                  <p className="text-red-700 dark:text-red-300 text-xs sm:text-sm">{formValidationError}</p>
                </div>
              )}
              <div>
                <h3 className="font-semibold mb-1.5 sm:mb-2 text-gray-800 dark:text-gray-200 text-sm">Booking Type</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {system === 'ground' && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, booking_type: BookingType.FULL_DAY, slots: [] }))}
                      disabled={selectedDate ? (hasConfirmedSlotBookings(selectedDate) || (!isWeekend(selectedDate) && !isSpecialDate(selectedDate))) : false}
                      className={`p-2 rounded text-center transition-all text-xs sm:text-sm ${
                        formData.booking_type === BookingType.FULL_DAY
                          ? 'bg-brand-blue text-white ring-2 ring-brand-orange'
                          : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
                      } ${
                        selectedDate && (hasConfirmedSlotBookings(selectedDate) || (!isWeekend(selectedDate) && !isSpecialDate(selectedDate)))
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Full Day Booking
                      {selectedDate && hasConfirmedSlotBookings(selectedDate) && <span className="block text-xs">Unavailable</span>}
                      {selectedDate && !hasConfirmedSlotBookings(selectedDate) && !isWeekend(selectedDate) && !isSpecialDate(selectedDate) && <span className="block text-xs">Weekends & special dates only</span>}
                    </button>
                  )}

                  <div className={`col-span-full ${system === 'ground' ? '' : 'md:col-span-2'}`}>
                    <p className="mb-1 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Available Slots</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
                      {selectedDate && getAvailableSlotsForDate(selectedDate).map(slot => {
                        const booked = !isSlotAvailable(selectedDate, slot);
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => {
                              if (booked) return; // Don't allow selection of booked slots
                              const newSlots = formData.slots?.includes(slot)
                                ? formData.slots.filter(s => s !== slot)
                                : [...(formData.slots || []), slot];
                              setFormData(prev => ({
                                ...prev,
                                slots: newSlots,
                                booking_type: newSlots.length > 0 ? BookingType.SLOT : BookingType.FULL_DAY
                              }));
                            }}
                            disabled={booked}
                            className={`p-1 rounded text-xs transition-all flex items-center justify-center ${
                              formData.slots?.includes(slot)
                                ? 'bg-brand-blue text-white ring-1 ring-brand-orange'
                                : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
                            } ${
                              booked
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            <span>{slot}</span>
                            {booked && <span className="block text-xs">(Booked)</span>}
                          </button>
                        );
                      })}
                      {selectedDate && getAvailableSlotsForDate(selectedDate).length === 0 && (
                        <div className="col-span-full text-center text-gray-500 dark:text-gray-400 text-xs py-2">
                          No slots available for this date
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 pt-2 sm:pt-3 border-t dark:border-gray-700">
                <div>
                  <input
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => {
                      const value = e.target.value;
                      const error = validateName(value);
                      setValidationErrors(prev => ({ ...prev, customer_name: error || '' }));
                      setFormData(prev => ({ ...prev, customer_name: value }));
                    }}
                    type="text"
                    placeholder="Customer Name"
                    className={`p-1.5 sm:p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-transparent transition text-sm ${validationErrors.customer_name ? 'border-red-500' : ''}`}
                    required
                  />
                  {validationErrors.customer_name && <p className="text-red-500 text-xs mt-0.5">{validationErrors.customer_name}</p>}
                </div>
                <div>
                  <input
                    name="customer_contact"
                    value={formData.customer_contact}
                    onChange={(e) => {
                      const value = e.target.value;
                      const error = validateContact(value);
                      setValidationErrors(prev => ({ ...prev, customer_contact: error || '' }));
                      setFormData(prev => ({ ...prev, customer_contact: value }));
                    }}
                    type="tel"
                    placeholder="Contact Number"
                    className={`p-1.5 sm:p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-transparent transition text-sm ${validationErrors.customer_contact ? 'border-red-500' : ''}`}
                    required
                  />
                  {validationErrors.customer_contact && <p className="text-red-500 text-xs mt-0.5">{validationErrors.customer_contact}</p>}
                </div>
                <div>
                  <input
                    name="customer_email"
                    value={formData.customer_email}
                    onChange={(e) => {
                      const value = e.target.value;
                      const error = validateEmail(value) ? null : 'Please enter a valid email address';
                      setValidationErrors(prev => ({ ...prev, customer_email: error || '' }));
                      setFormData(prev => ({ ...prev, customer_email: value }));
                    }}
                    type="email"
                    placeholder="Email Address"
                    className={`p-1.5 sm:p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-transparent transition text-sm ${validationErrors.customer_email ? 'border-red-500' : ''}`}
                  />
                  {validationErrors.customer_email && <p className="text-red-500 text-xs mt-0.5">{validationErrors.customer_email}</p>}
                </div>
                {system === 'ground' ? (
                  <div>
                    <input
                      name="event_type"
                      value={formData.event_type}
                      onChange={(e) => {
                        const value = e.target.value;
                        const error = validateEventType(value);
                        setValidationErrors(prev => ({ ...prev, event_type: error || '' }));
                        setFormData(prev => ({ ...prev, event_type: value }));
                      }}
                      type="text"
                      placeholder="Sport / Event Type"
                      className={`p-1.5 sm:p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-transparent transition text-sm ${validationErrors.event_type ? 'border-red-500' : ''}`}
                      required
                    />
                    {validationErrors.event_type && <p className="text-red-500 text-xs mt-0.5">{validationErrors.event_type}</p>}
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
              </div>

              <div className="pt-2 sm:pt-3">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                  <span className={`text-xs ${notesLetterCount > 100 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                    {notesLetterCount}/100
                  </span>
                </div>
                <textarea
                  name="notes"
                  value={formData.notes || ''}
                  onChange={(e) => {
                    const letters = e.target.value.length;
                    setNotesLetterCount(letters);
                    setFormData(prev => ({ ...prev, notes: e.target.value }));
                  }}
                  placeholder="Notes..."
                  maxLength={notesLetterCount > 100 ? undefined : 100}
                  className={`p-1.5 sm:p-2 border rounded w-full h-16 sm:h-20 bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-transparent transition text-xs sm:text-sm ${notesLetterCount > 100 ? 'border-red-500' : ''}`}
                />
                {notesLetterCount > 100 && (
                  <p className="text-red-500 text-xs mt-0.5">Letter limit exceeded</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-1.5 sm:gap-2 pt-2 sm:pt-3 border-t dark:border-gray-700">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Your booking request will be sent to management for approval.
                </div>
                <div className="flex flex-col-reverse sm:flex-row w-full sm:w-auto gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    className="w-full sm:w-auto bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded text-xs sm:text-sm hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-brand-orange text-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded text-xs sm:text-sm hover:bg-orange-600 transition-colors"
                  >
                    Submit Request
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerCalendarView;