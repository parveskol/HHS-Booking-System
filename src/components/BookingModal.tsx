import React, { useState, useContext, useEffect, useMemo } from 'react';
import { AppContext, BookingSystem } from '../context/AppContext';
import { Booking, BookingType, PaymentStatus, UserRole, BookingStatus } from '../types';
import { TIME_SLOTS, NET_TIME_SLOTS } from '../constants';
import { X, Plus, Edit, Trash2, Loader2 } from 'lucide-react';

interface BookingModalProps {
     isOpen: boolean;
     onClose: () => void;
     date: Date | null;
     booking: Booking | null;
     system: BookingSystem;
     onBookingUpdate?: () => Promise<void>;
 }

/**
 * Converts a Date object to a 'YYYY-MM-DD' string in the local timezone.
 * This avoids timezone conversion issues that occur with toISOString().
 * @param date The date to convert.
 * @returns The formatted date string.
 */
const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose, date, booking, system, onBookingUpdate }) => {
    const { user, bookings, addBooking, updateBooking, deleteBooking } = useContext(AppContext);
    
    type FormData = Omit<Booking, 'id' | 'created_at'>;

    const initialFormState: FormData = {
        date: date ? toLocalDateString(date) : '',
        booking_type: BookingType.SLOT,
        slots: [],
        customer_name: '',
        customer_contact: '',
        customer_email: '',
        event_type: '',
        notes: '',
        payment_status: PaymentStatus.UNPAID,
        payment_amount: undefined,
        net_number: [] as string[],
        system: system,
        status: BookingStatus.CONFIRMED,
    };

    const [formData, setFormData] = useState<FormData>(initialFormState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [notesLetterCount, setNotesLetterCount] = useState(0);
    const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

    const isEditing = !!booking;
    
    useEffect(() => {
        if (isOpen && date) {
            setFormData({
                date: toLocalDateString(date),
                booking_type: booking?.booking_type || BookingType.SLOT,
                slots: booking?.slots || [],
                customer_name: booking?.customer_name || '',
                customer_contact: booking?.customer_contact || '',
                customer_email: booking?.customer_email || '',
                event_type: booking?.event_type || '',
                notes: booking?.notes || '',
                payment_status: booking?.payment_status || PaymentStatus.UNPAID,
                payment_amount: booking?.payment_amount,
                net_number: booking?.net_number || [],
                system: system,
                status: booking?.status || BookingStatus.CONFIRMED,
            });
        }
    }, [isOpen, date, booking, system]);

    const activeBookings = useMemo(() => bookings[system], [bookings, system]);
    const currentSlots = useMemo(() => system === 'ground' ? TIME_SLOTS : NET_TIME_SLOTS, [system]);

    const bookingsOnSelectedDate = useMemo(() => {
        if (!date) return [];
        const dateStr = toLocalDateString(date);
        return activeBookings.filter(b => b.date === dateStr);
    }, [date, activeBookings]);

    const isSlotBooked = (slot: string) => {
        return bookingsOnSelectedDate.some(b =>
            b.id !== booking?.id &&
            b.booking_type === BookingType.SLOT &&
            b.status === BookingStatus.CONFIRMED &&
            b.slots?.includes(slot)
        );
    };
    
    const isAnotherFullDayBooked = useMemo(() => 
        bookingsOnSelectedDate.some(b => 
            b.id !== booking?.id && 
            b.booking_type === BookingType.FULL_DAY
        ), [bookingsOnSelectedDate, booking]);

    const isDayOccupiedByOtherBookings = useMemo(() =>
        bookingsOnSelectedDate.some(b => b.id !== booking?.id),
        [bookingsOnSelectedDate, booking]);

    const hasConfirmedSlotBookings = useMemo(() =>
        bookingsOnSelectedDate.some(b =>
            b.id !== booking?.id &&
            b.booking_type === BookingType.SLOT &&
            b.status === BookingStatus.CONFIRMED
        ), [bookingsOnSelectedDate, booking]);

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


    if (!isOpen || !date) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        // Handle letter count for notes field
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
            const newSlots = prev.slots?.includes(slot)
                ? prev.slots.filter(s => s !== slot)
                : [...(prev.slots || []), slot];
            return { ...prev, slots: newSlots, booking_type: BookingType.SLOT };
        });
    };
    const handleFullDaySelection = () => { setFormData(prev => ({...prev, slots: [], booking_type: BookingType.FULL_DAY})); };

    const handleNetSelection = (netNumber: string) => {
        setFormData(prev => {
            const currentNetNumbers = Array.isArray(prev.net_number) ? prev.net_number : [];
            const newNetNumbers = currentNetNumbers.includes(netNumber)
                ? currentNetNumbers.filter(n => n !== netNumber)
                : [...currentNetNumbers, netNumber];
            return { ...prev, net_number: newNetNumbers };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (booking) {
                // Ensure we have the correct ID and created_at for updates
                const updatedBooking = {
                    ...formData,
                    id: booking.id,
                    created_at: booking.created_at
                };

                await updateBooking(updatedBooking, system);
            } else {
                await addBooking(formData, system);
            }
            onClose();

            // Trigger data refresh after successful booking operation
            if (onBookingUpdate) {
                try {
                    await onBookingUpdate();
                } catch (error) {
                    console.error('❌ Error refreshing data after booking update:', error);
                }
            }
        } catch (error) {
            console.error("Failed to save booking:", error);
            alert(`Failed to save booking: ${error.message}. Please try again.`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async () => {
        if (booking && window.confirm(`⚠️ PERMANENT DELETION WARNING ⚠️

Are you sure you want to delete this booking?

This will:
• Permanently delete the booking from the database
• Remove all associated data and records
• Cannot be undone or recovered

Customer: ${booking.customer_name}
Date: ${new Date(booking.date).toLocaleDateString('en-GB')}
Time: ${booking.booking_type === 'full_day' ? 'Full Day' : booking.slots?.join(', ')}

Click "OK" to permanently delete this booking, or "Cancel" to keep it.`)) {
            setIsDeleting(true);
            try {
                await deleteBooking(booking.id, system);
                onClose();
            } catch (error) {
                console.error("Failed to delete booking:", error);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-[95vw] sm:max-w-md md:max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-2 sm:p-3 border-b dark:border-gray-700">
                    <h2 className="text-sm sm:text-lg font-bold text-brand-dark dark:text-white">
                        {isEditing ? 'Edit' : 'New'} - {date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"><X size={16} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-2 sm:p-4 space-y-2 sm:space-y-3 overflow-y-auto">
                    {!isEditing && (
                      <div>
                         <h3 className="font-semibold mb-1.5 sm:mb-2 text-sm sm:text-base text-gray-800 dark:text-gray-200">Booking Type</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                            {system === 'ground' && (
                                <button type="button" onClick={handleFullDaySelection} disabled={hasConfirmedSlotBookings}
                                     className={`p-2.5 rounded text-center transition-all text-sm ${formData.booking_type === BookingType.FULL_DAY ? 'bg-brand-blue text-white ring-2 ring-brand-orange' : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300'} ${hasConfirmedSlotBookings ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                                     Full Day Booking
                                     {hasConfirmedSlotBookings && <span className="block text-xs">Unavailable</span>}
                                 </button>
                             )}

                            <div className={`col-span-full ${system === 'ground' ? '' : 'md:col-span-2'}`}>
                               <p className="mb-1 sm:mb-1.5 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Available Slots</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 sm:gap-1.5">
                                     {currentSlots.map(slot => {
                                         const booked = isSlotBooked(slot);
                                         return (
                                             <button key={slot} type="button" onClick={() => handleSlotSelection(slot)} disabled={booked || isAnotherFullDayBooked}
                                                 className={`p-1 sm:p-1.5 rounded text-xs transition-all flex flex-col items-center justify-center ${formData.slots?.includes(slot) ? 'bg-brand-blue text-white ring-1 ring-brand-orange' : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300'} ${booked || isAnotherFullDayBooked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                                                 <span className="text-xs sm:text-sm">{slot}</span>
                                                 {booked && <span className="block text-xs leading-tight">(Booked)</span>}
                                             </button>
                                         );
                                     })}
                                 </div>
                             </div>
                         </div>
                       </div>
                     )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pt-2 sm:pt-3 border-t dark:border-gray-700">
                         <div>
                             <input name="customer_name" value={formData.customer_name} onChange={handleInputChange} type="text" placeholder="Customer Name" className={`p-1.5 sm:p-2 text-sm border rounded bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition ${validationErrors.customer_name ? 'border-red-500' : ''}`} required />
                             {validationErrors.customer_name && <p className="text-red-500 text-xs mt-1">{validationErrors.customer_name}</p>}
                         </div>
                         <div>
                             <input name="customer_contact" value={formData.customer_contact} onChange={handleInputChange} type="tel" placeholder="Contact Number" className={`p-1.5 sm:p-2 text-sm border rounded bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition ${validationErrors.customer_contact ? 'border-red-500' : ''}`} required />
                             {validationErrors.customer_contact && <p className="text-red-500 text-xs mt-1">{validationErrors.customer_contact}</p>}
                         </div>
                         <div>
                             <input name="customer_email" value={formData.customer_email} type="email" onChange={handleInputChange} placeholder="Email Address" className={`p-1.5 sm:p-2 text-sm border rounded bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition ${validationErrors.customer_email ? 'border-red-500' : ''}`} />
                             {validationErrors.customer_email && <p className="text-red-500 text-xs mt-1">{validationErrors.customer_email}</p>}
                         </div>
                         {system === 'ground' ? (
                             <div>
                                 <input name="event_type" value={formData.event_type} onChange={handleInputChange} type="text" placeholder="Sport / Event Type" className={`p-1.5 sm:p-2 text-sm border rounded bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition ${validationErrors.event_type ? 'border-red-500' : ''}`} required />
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
                                             (formData.net_number || []).includes('1')
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
                                             (formData.net_number || []).includes('2')
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
                                             (formData.net_number || []).includes('3')
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
                                             (formData.net_number || []).includes('4')
                                                 ? 'bg-brand-blue text-white ring-2 ring-brand-orange'
                                                 : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                         }`}
                                     >
                                         Astro Net 2
                                     </button>
                                 </div>
                             </div>
                         )}
                         <select name="payment_status" value={formData.payment_status} onChange={handleInputChange} className="p-1.5 sm:p-2 text-sm border rounded bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition">
                             <option value={PaymentStatus.UNPAID}>Unpaid</option>
                             <option value={PaymentStatus.PAID}>Paid</option>
                         </select>
                         <input name="payment_amount" value={formData.payment_amount || ''} onChange={handleInputChange} type="number" step="0.01" min="0" placeholder="Payment Amount" className="p-1.5 sm:p-2 text-sm border rounded bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition" required />
                     </div>
                    <div className="pt-2 sm:pt-3">
                        <div className="flex justify-between items-center mb-1 sm:mb-1.5">
                            <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                            <span className={`text-xs ${notesLetterCount > 100 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                               {notesLetterCount}/100
                           </span>
                        </div>
                        <textarea
                            name="notes"
                            value={formData.notes || ''}
                            onChange={handleInputChange}
                            placeholder="Notes..."
                            maxLength={notesLetterCount > 100 ? undefined : 100}
                            className={`p-1.5 sm:p-2 border rounded w-full h-16 sm:h-20 bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition text-xs sm:text-sm ${notesLetterCount > 100 ? 'border-red-500' : ''}`}
                        />
                        {notesLetterCount > 100 && (
                            <p className="text-red-500 text-xs mt-1">Letter limit exceeded</p>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-2 pt-2 sm:pt-3 border-t dark:border-gray-700">
                        <div>
                        {isEditing && user?.role === UserRole.ADMIN && (
                            <button type="button" onClick={handleDelete} disabled={isDeleting || isSubmitting} className="w-full sm:w-auto bg-red-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs sm:text-sm hover:bg-red-700 transition-colors flex items-center justify-center space-x-1 sm:space-x-1.5 disabled:opacity-50">
                                {isDeleting ? <><Loader2 size={12} className="animate-spin flex-shrink-0" /><span>Deleting...</span></> : <><Trash2 size={12} className="flex-shrink-0" /><span>Delete</span></>}
                            </button>
                        )}
                        </div>
                        <div className="flex flex-col-reverse sm:flex-row w-full sm:w-auto gap-2">
                            <button type="button" onClick={onClose} className="w-full sm:w-auto bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs sm:text-sm hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Cancel</button>
                            {(user?.role === UserRole.ADMIN || (user?.role === UserRole.CUSTOMER && isEditing && booking?.customer_email === user.email)) && (
                                <button type="submit" disabled={isSubmitting || isDeleting} className="w-full sm:w-auto bg-brand-orange text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs sm:text-sm hover:bg-orange-600 transition-colors flex items-center justify-center space-x-1 sm:space-x-1.5 disabled:opacity-50">
                                    {isSubmitting ? <><Loader2 size={12} className="animate-spin flex-shrink-0" /><span>Saving...</span></>
                                      : isEditing ? <><Edit size={12} className="flex-shrink-0" /><span>Update</span></>
                                      : <><Plus size={12} className="flex-shrink-0" /><span>Create</span></>
                                    }
                                </button>
                            )}

                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BookingModal;