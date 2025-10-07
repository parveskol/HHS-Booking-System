import React, { useState, useEffect, useContext } from 'react';
import { Booking, PaymentStatus, BookingStatus, BookingType } from '../types';
import { Clock, CheckCircle, XCircle, AlertCircle, Calendar, RefreshCw, Search, Eye } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import useCustomerTracking from '../hooks/useCustomerTracking';
import { supabase } from '../supabaseClient';

/**
 * Parses a 'YYYY-MM-DD' string into a Date object in the local timezone.
 * This avoids timezone issues where new Date('YYYY-MM-DD') is treated as UTC.
 */
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  // Month is 0-indexed in JavaScript Dates, so subtract 1.
  return new Date(year, month - 1, day);
};

const BookingTrackerCard: React.FC<{
  booking: Booking & { isRequest: boolean };
}> = ({ booking }) => {
  const isPaid = booking.payment_status === PaymentStatus.PAID;
  const isPending = booking.status === BookingStatus.PENDING;
  const isRequest = booking.isRequest;

  // Get tracking status with more detailed information
  const getTrackingStatus = () => {
    if (isRequest) {
      switch (booking.status) {
        case BookingStatus.PENDING:
          return {
            status: 'Under Review',
            description: 'Your booking request is being reviewed by our team',
            color: 'yellow',
            icon: '⏳'
          };
        case BookingStatus.APPROVED:
          return {
            status: 'Approved',
            description: 'Your booking request has been approved! Please complete payment to confirm.',
            color: 'blue',
            icon: '✅'
          };
        case BookingStatus.REJECTED:
          return {
            status: 'Not Approved',
            description: 'Unfortunately, your booking request could not be accommodated at this time.',
            color: 'red',
            icon: '❌'
          };
        case BookingStatus.CONFIRMED:
          return {
            status: 'Confirmed',
            description: 'Your booking is confirmed and active! This slot is now reserved for you.',
            color: 'green',
            icon: '🎉'
          };
        default:
          return {
            status: 'Unknown',
            description: 'Status update pending',
            color: 'gray',
            icon: '❓'
          };
      }
    } else {
      // For actual bookings
      switch (booking.status) {
        case BookingStatus.CONFIRMED:
          return {
            status: 'Confirmed Booking',
            description: 'Your booking is confirmed and the slot is reserved for you',
            color: 'green',
            icon: '🏆'
          };
        case BookingStatus.APPROVED:
          return {
            status: 'Payment Pending',
            description: 'Your booking is approved. Please complete payment to confirm.',
            color: 'blue',
            icon: '💳'
          };
        default:
          return {
            status: 'Booking Status',
            description: 'Booking status update',
            color: 'gray',
            icon: '📅'
          };
      }
    }
  };

  const trackingStatus = getTrackingStatus();

  const getStatusIcon = () => {
    switch (booking.status) {
      case BookingStatus.PENDING:
        return <Clock size={20} className="text-yellow-500" />;
      case BookingStatus.APPROVED:
        return <CheckCircle size={20} className="text-blue-500" />;
      case BookingStatus.CONFIRMED:
        return <CheckCircle size={20} className="text-green-500" />;
      default:
        return <XCircle size={20} className="text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (booking.status) {
      case BookingStatus.PENDING:
        return 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case BookingStatus.APPROVED:
        return 'border-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case BookingStatus.CONFIRMED:
        return 'border-green-400 bg-green-50 dark:bg-green-900/20';
      default:
        return 'border-red-400 bg-red-50 dark:bg-red-900/20';
    }
  };

  return (
    <div className={`p-4 rounded-lg shadow-sm border-l-4 ${getStatusColor()} transition-all duration-200 hover:shadow-md`}>
      {/* Header with Tracking Token */}
      <div className="flex justify-between items-start mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 truncate text-base">
              {booking.event_type || (Array.isArray(booking.net_number) ? booking.net_number.map(net => `Net ${net}`).join(', ') : `Net ${booking.net_number}`)}
            </h3>
            {isRequest && (
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300">
                REQUEST
              </span>
            )}
          </div>

          {/* Prominent Tracking Token */}
          {booking.request_number && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 mb-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">TRACKING TOKEN</p>
                  <p className="text-sm font-mono font-bold text-blue-800 dark:text-blue-300">
                    #{booking.request_number}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                    trackingStatus.color === 'yellow'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                      : trackingStatus.color === 'blue'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      : trackingStatus.color === 'green'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300'
                  }`}>
                    <span>{trackingStatus.icon}</span>
                    {trackingStatus.status}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Tracking Status */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-3">
        <div className="flex items-start gap-2">
          <span className="text-lg">{trackingStatus.icon}</span>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
              {trackingStatus.status}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {trackingStatus.description}
            </p>
          </div>
        </div>
      </div>

      {/* Booking Details */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-500" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">
              {parseLocalDate(booking.date).toLocaleDateString('en-GB')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-gray-500" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Time</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">
              {booking.booking_type === 'full_day' ? 'Full Day' : booking.slots?.join(', ')}
            </p>
          </div>
        </div>
      </div>

      {/* Amount */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount:</span>
          <span className="text-lg font-bold text-gray-800 dark:text-gray-200">
            ₹{booking.payment_amount.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">Payment Status:</span>
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
            isPaid
              ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
          }`}>
            {booking.payment_status}
          </span>
        </div>
      </div>

      {/* Live Update Indicator */}
      <div className="mt-3 flex items-center justify-center">
        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="font-medium">Live Tracking Active</span>
        </div>
      </div>
    </div>
  );
};

const CustomerBookingTracker: React.FC = () => {
  const { user } = useContext(AppContext);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const {
    trackingData,
    isLoading,
    error,
    loadTrackingData,
    getAllItems,
    getStats
  } = useCustomerTracking(user);

  const filteredItems = getAllItems();
  const stats = getStats();

  // Update timestamp when data changes
  useEffect(() => {
    if (trackingData) {
      setLastUpdate(new Date());
    }
  }, [trackingData]);

  // If no user is logged in, show error
  if (!user) {
    return (
      <div className="space-y-6 animate-slideInUp">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Advanced Booking Tracker</h2>
          <p className="text-gray-600 dark:text-gray-400">Track the status of all your booking requests with real-time updates</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">⚠️ Please log in to view your bookings.</p>
        </div>
      </div>
    );
  }

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <div className="space-y-4 animate-slideInUp">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">🔄 Advanced Booking Tracker</h2>
            <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-700 dark:text-green-400 font-semibold">LIVE</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Loading your booking requests with real-time tracking...
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw size={14} className="animate-spin" />
            <p className="text-sm text-blue-700 dark:text-blue-300">Loading your bookings...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if there's an error (but don't show for session creation errors)
  if (error && !error.includes('customer session')) {
    return (
      <div className="space-y-4 animate-slideInUp">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Advanced Booking Tracker</h2>
          <p className="text-gray-600 dark:text-gray-400">Track your booking requests in real-time</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} className="text-red-500" />
            <p className="text-red-700 dark:text-red-300 font-medium">Error Loading Data</p>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={loadTrackingData}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slideInUp">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Advanced Booking Tracker</h2>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Live</span>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Monitor your booking requests with real-time updates</p>

        {/* User Info */}
        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p><strong>Customer:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
          </div>
        </div>
      </div>


      {/* Summary Stats - Compact Single Row */}
      <div className="flex gap-1 overflow-x-auto">
        <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 text-center flex-1 min-w-0">
          <p className="text-sm sm:text-base font-bold text-gray-700 dark:text-gray-300 leading-tight">{stats.total}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">Total</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md px-2 py-1.5 text-center flex-1 min-w-0">
          <p className="text-sm sm:text-base font-bold text-yellow-700 dark:text-yellow-300 leading-tight">{stats.pending}</p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 leading-tight">Pending</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md px-2 py-1.5 text-center flex-1 min-w-0">
          <p className="text-sm sm:text-base font-bold text-blue-700 dark:text-blue-300 leading-tight">{stats.approved}</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 leading-tight">Approved</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md px-2 py-1.5 text-center flex-1 min-w-0">
          <p className="text-sm sm:text-base font-bold text-green-700 dark:text-green-300 leading-tight">{stats.confirmed}</p>
          <p className="text-xs text-green-600 dark:text-green-400 leading-tight">Confirmed</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md px-2 py-1.5 text-center flex-1 min-w-0">
          <p className="text-sm sm:text-base font-bold text-red-700 dark:text-red-300 leading-tight">{stats.rejected}</p>
          <p className="text-xs text-red-600 dark:text-red-400 leading-tight">Rejected</p>
        </div>
      </div>


      {/* Booking Cards */}
      <div className="space-y-3">
        {filteredItems.length > 0 ? (
          filteredItems.map(booking => (
            <BookingTrackerCard
              key={booking.id}
              booking={booking}
            />
          ))
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar size={18} className="text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">
              No Bookings Yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              You haven't made any booking requests yet. Use the 'Book Now' tab to submit a request and get your tracking token!
            </p>

          </div>
        )}
      </div>

      {/* Last Update Info */}
      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
        Last updated: {lastUpdate.toLocaleTimeString()}
      </div>
    </div>
  );
};

export default CustomerBookingTracker;