import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Booking, PaymentStatus, BookingStatus, BookingType } from '../types';
import { Clock, CheckCircle, XCircle, AlertCircle, Calendar, RefreshCw, Search, Eye } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import useCustomerTracking from '../hooks/useCustomerTracking';
import { supabase } from '../supabaseClient';

interface CustomerBookingTrackerProps {
  bookings?: Booking[];
  bookingRequests?: Booking[];
}

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

  const getStatusText = () => {
    switch (booking.status) {
      case BookingStatus.PENDING:
        return 'Pending Approval';
      case BookingStatus.APPROVED:
        return 'Approved';
      case BookingStatus.CONFIRMED:
        return 'Confirmed';
      default:
        return 'Rejected';
    }
  };

  const getNextStep = () => {
    switch (booking.status) {
      case BookingStatus.PENDING:
        return 'Waiting for management approval';
      case BookingStatus.APPROVED:
        return 'Payment required to confirm booking';
      case BookingStatus.CONFIRMED:
        return 'Booking confirmed - see you then!';
      default:
        return 'Booking request was not approved';
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

      {/* Notes Section */}
      {booking.notes && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-0.5">📝</span>
              <div className="flex-1">
                <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">Notes:</p>
                <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
                  {booking.notes}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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

const CustomerBookingTracker: React.FC<CustomerBookingTrackerProps> = ({
  bookings,
  bookingRequests
}) => {
  const { user, isLoading } = useContext(AppContext);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [userBookingsAndRequests, setUserBookingsAndRequests] = useState<(Booking & { isRequest: boolean })[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Direct database query for user's requests and bookings
  const loadUserData = async () => {
    if (!user) return;

    setIsLoadingData(true);
    try {
      // Build filter conditions for requests with normalization
      const requestFilters = [];
      if (user.email) {
        const normalizedEmail = user.email.toLowerCase().trim();
        // Use ilike for case-insensitive partial matching
        requestFilters.push(`customer_email.ilike.%${normalizedEmail}%`);
      }
      if (user.name) {
        const normalizedName = user.name.toLowerCase().trim();
        // Use ilike for case-insensitive partial matching
        requestFilters.push(`customer_name.ilike.%${normalizedName}%`);
      }

      // Build filter conditions for bookings with normalization
      const bookingFilters = [];
      if (user.email) {
        const normalizedEmail = user.email.toLowerCase().trim();
        // Use ilike for case-insensitive partial matching
        bookingFilters.push(`customer_email.ilike.%${normalizedEmail}%`);
      }
      if (user.name) {
        const normalizedName = user.name.toLowerCase().trim();
        // Use ilike for case-insensitive partial matching
        bookingFilters.push(`customer_name.ilike.%${normalizedName}%`);
      }

      console.log('🔍 Loading user data for:', {
        name: user.name,
        email: user.email,
        userObject: user,
        requestFilters: requestFilters,
        bookingFilters: bookingFilters
      });

      let requestsData = [];
      let bookingsData = [];

      // Query booking requests directly from database
      if (requestFilters.length > 0) {
        const { data: requests, error: requestsError } = await supabase
          .from('booking_requests')
          .select('*')
          .or(requestFilters.join(','))
          .order('created_at', { ascending: false });

        if (requestsError) {
          console.error('❌ Error loading requests:', requestsError);
        } else {
          requestsData = requests || [];
          console.log('✅ Loaded requests:', requestsData);
        }
      }

      // Query bookings directly from database
      if (bookingFilters.length > 0) {
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('*')
          .or(bookingFilters.join(','))
          .order('created_at', { ascending: false });

        if (bookingsError) {
          console.error('❌ Error loading bookings:', bookingsError);
        } else {
          bookingsData = bookings || [];
          console.log('✅ Loaded bookings:', bookingsData);
        }
      }

      // Additional client-side filtering as backup
      const userRequests = (requestsData || []).map(r => ({
        ...r,
        isRequest: true
      })).filter(r => {
        const matchesEmail = user.email ? r.customer_email === user.email : true;
        const matchesName = user.name ? r.customer_name === user.name : true;
        return matchesEmail && matchesName;
      });

      const userBookings = (bookingsData || []).map(b => ({
        ...b,
        isRequest: false
      })).filter(b => {
        const matchesEmail = user.email ? b.customer_email === user.email : true;
        const matchesName = user.name ? b.customer_name === user.name : true;
        return matchesEmail && matchesName;
      });

      const allItems = [...userRequests, ...userBookings];

      // Sort by date (newest first)
      allItems.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });

      console.log('📊 Combined user data:', {
        user: { name: user.name, email: user.email },
        requests: userRequests.length,
        bookings: userBookings.length,
        total: allItems.length,
        requestItems: userRequests.map(r => ({
          id: r.id,
          request_number: r.request_number,
          customer_name: r.customer_name,
          customer_email: r.customer_email,
          status: r.status
        })),
        bookingItems: userBookings.map(b => ({
          id: b.id,
          customer_name: b.customer_name,
          customer_email: b.customer_email,
          status: b.status
        }))
      });

      setUserBookingsAndRequests(allItems);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('❌ Error in loadUserData:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Load user data when component mounts or user changes
  useEffect(() => {
    loadUserData();
  }, [user]);

  // Set up real-time subscriptions for live updates
  useEffect(() => {
    if (!user) return;

    console.log('🔌 Setting up real-time subscriptions for user:', {
      name: user.name,
      email: user.email
    });

    // Create unique channel names based on user
    const userChannelSuffix = user.email || user.name;
    const requestsChannelName = `user-requests-${userChannelSuffix}`;
    const bookingsChannelName = `user-bookings-${userChannelSuffix}`;

    // Subscribe to booking_requests table with proper filtering
    const requestsChannel = supabase
      .channel(requestsChannelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'booking_requests'
      }, (payload) => {
        console.log('📡 Real-time request update:', payload);

        // Double-check that this update is for the current user with enhanced matching
        const record = payload.new || payload.old;
        if (record && typeof record === 'object') {
          const normalizeText = (text: string) => {
            return text.toLowerCase().trim().replace(/\s+/g, ' ');
          };

          const normalizedUserEmail = user.email ? normalizeText(user.email) : '';
          const normalizedUserName = user.name ? normalizeText(user.name) : '';
          const recordEmail = (record as any).customer_email || '';
          const recordName = (record as any).customer_name || '';

          const isForCurrentUser =
            (normalizedUserEmail && recordEmail && normalizeText(recordEmail).includes(normalizedUserEmail)) ||
            (normalizedUserName && recordName && normalizeText(recordName).includes(normalizedUserName));

          if (isForCurrentUser) {
            console.log('✅ Update is for current user, reloading data');
            loadUserData();
          } else {
            console.log('❌ Update is for different user, ignoring:', {
              user: { email: normalizedUserEmail, name: normalizedUserName },
              record: { email: recordEmail, name: recordName }
            });
          }
        }
      })
      .subscribe();

    // Subscribe to bookings table with proper filtering
    const bookingsChannel = supabase
      .channel(bookingsChannelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings'
      }, (payload) => {
        console.log('📡 Real-time booking update:', payload);

        // Double-check that this update is for the current user with enhanced matching
        const record = payload.new || payload.old;
        if (record && typeof record === 'object') {
          const normalizeText = (text: string) => {
            return text.toLowerCase().trim().replace(/\s+/g, ' ');
          };

          const normalizedUserEmail = user.email ? normalizeText(user.email) : '';
          const normalizedUserName = user.name ? normalizeText(user.name) : '';
          const recordEmail = (record as any).customer_email || '';
          const recordName = (record as any).customer_name || '';

          const isForCurrentUser =
            (normalizedUserEmail && recordEmail && normalizeText(recordEmail).includes(normalizedUserEmail)) ||
            (normalizedUserName && recordName && normalizeText(recordName).includes(normalizedUserName));

          if (isForCurrentUser) {
            console.log('✅ Update is for current user, reloading data');
            loadUserData();
          } else {
            console.log('❌ Update is for different user, ignoring:', {
              user: { email: normalizedUserEmail, name: normalizedUserName },
              record: { email: recordEmail, name: recordName }
            });
          }
        }
      })
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up real-time subscriptions');
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, [user]);

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm) return userBookingsAndRequests;

    return userBookingsAndRequests.filter(item =>
      item.request_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.event_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.date.includes(searchTerm)
    );
  }, [userBookingsAndRequests, searchTerm]);

  const pendingCount = filteredItems.filter(b => b.status === BookingStatus.PENDING).length;
  const approvedCount = filteredItems.filter(b => b.status === BookingStatus.APPROVED).length;
  const confirmedCount = filteredItems.filter(b => b.status === BookingStatus.CONFIRMED).length;
  const rejectedCount = filteredItems.filter(b => b.status === BookingStatus.REJECTED).length;
  const totalCount = filteredItems.length;

  // If no user is logged in, show error
  if (!user) {
    return (
      <div className="space-y-6 animate-slideInUp">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Booking Tracker</h2>
          <p className="text-gray-600 dark:text-gray-400">Track the status of all your booking requests</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">⚠️ Please log in to view your bookings.</p>
        </div>
      </div>
    );
  }

  // Show loading state while fetching data
  if (isLoadingData) {
    return (
      <div className="space-y-4 animate-slideInUp">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">📱 Live Booking Tracker</h2>
            <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-700 dark:text-green-400 font-semibold">LIVE</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Track your booking requests with real-time updates from our admin team
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

  return (
    <div className="space-y-4 animate-slideInUp">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Track Bookings</h2>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Live</span>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Monitor your booking requests in real-time</p>

      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by tracking token, event, or date..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent"
        />
      </div>

      {/* Summary Stats - Compact Single Row */}
      <div className="flex gap-1 overflow-x-auto">
        <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 text-center flex-1 min-w-0">
          <p className="text-sm sm:text-base font-bold text-gray-700 dark:text-gray-300 leading-tight">{totalCount}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">Total</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md px-2 py-1.5 text-center flex-1 min-w-0">
          <p className="text-sm sm:text-base font-bold text-yellow-700 dark:text-yellow-300 leading-tight">{pendingCount}</p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 leading-tight">Pending</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md px-2 py-1.5 text-center flex-1 min-w-0">
          <p className="text-sm sm:text-base font-bold text-blue-700 dark:text-blue-300 leading-tight">{approvedCount}</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 leading-tight">Approved</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md px-2 py-1.5 text-center flex-1 min-w-0">
          <p className="text-sm sm:text-base font-bold text-green-700 dark:text-green-300 leading-tight">{confirmedCount}</p>
          <p className="text-xs text-green-600 dark:text-green-400 leading-tight">Confirmed</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md px-2 py-1.5 text-center flex-1 min-w-0">
          <p className="text-sm sm:text-base font-bold text-red-700 dark:text-red-300 leading-tight">{rejectedCount}</p>
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
              {searchTerm ? 'No Results Found' : 'No Bookings Yet'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {searchTerm
                ? `No bookings found matching "${searchTerm}". Try a different search term.`
                : "You haven't made any booking requests yet. Use the 'Book Now' tab to submit a request and get your tracking token!"
              }
            </p>

            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-brand-orange hover:text-orange-600 text-sm font-medium"
              >
                Clear search
              </button>
            )}

            {/* How it works section */}
            {!searchTerm && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">🎯 How Live Tracking Works</h4>
                <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-600 dark:text-blue-400">1.</span>
                    <span>Submit a booking request using the "Book Now" tab</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-600 dark:text-blue-400">2.</span>
                    <span>Get your unique tracking token (e.g., #REQ-20250126-143022-ABC)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-600 dark:text-blue-400">3.</span>
                    <span>Track real-time updates here when admin reviews your request</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-600 dark:text-blue-400">4.</span>
                    <span>Get instant notifications when your request is approved or rejected</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerBookingTracker;