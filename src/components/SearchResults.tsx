import React from 'react';
import { Booking, BookingType, PaymentStatus } from '../types';
import { Calendar, Clock, Edit, Tag, User, Hash, DollarSign, CheckCircle, XCircle } from 'lucide-react';

interface SearchResultsProps {
  results: Booking[];
  onSelectBooking: (booking: Booking) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ results, onSelectBooking }) => {
  if (results.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-lg">No bookings found.</p>
        <p className="text-gray-400">Try searching by customer name, contact, or event type.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((booking, index) => (
        <div
          key={booking.id}
          onClick={() => onSelectBooking(booking)}
          className="bg-white rounded-lg shadow-md p-4 cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-brand-orange border-l-4 border-transparent animate-slideInUp"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <p className="font-bold text-lg text-brand-dark flex items-center gap-2">
                <User size={18} /> {booking.customer_name}
              </p>
              <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                <Tag size={16} className="text-gray-400" />
                {(() => {
                    const netDisplay = booking.net_number && (Array.isArray(booking.net_number) ? booking.net_number.length : booking.net_number)
                        ? (Array.isArray(booking.net_number)
                            ? booking.net_number.map(net => `Net ${net}`).join(', ')
                            : `Net ${booking.net_number}`)
                        : '';
                    return booking.event_type
                        ? `${booking.event_type}${netDisplay ? ` (${netDisplay})` : ''}`
                        : netDisplay || 'No details';
                })()}
              </p>
            </div>
            <div className="mt-2 sm:mt-0 flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold"
              style={{ 
                backgroundColor: booking.payment_status === PaymentStatus.PAID ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: booking.payment_status === PaymentStatus.PAID ? '#16a34a' : '#ef4444'
              }}
            >
              {booking.payment_status === PaymentStatus.PAID ? <CheckCircle size={16} /> : <XCircle size={16} />}
              <span>{booking.payment_status}</span>
            </div>
          </div>
          <div className="border-t my-3"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-brand-orange" />
              <span>{new Date(booking.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-brand-orange" />
              <span>{booking.booking_type === BookingType.FULL_DAY ? 'Full Day' : booking.slots?.join(', ')}</span>
            </div>
            <div className="flex items-center gap-2 font-semibold">
              <DollarSign size={16} className="text-brand-orange" />
              <span>{booking.payment_amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}</span>
            </div>
          </div>
          <div className="text-right text-xs text-gray-400 mt-2 flex items-center justify-end gap-1">
            Click to <Edit size={12} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default SearchResults;