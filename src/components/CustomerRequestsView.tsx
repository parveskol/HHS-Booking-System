import React, { useState, useMemo, useContext } from 'react';
import { Booking, PaymentStatus, BookingStatus } from '../types';
import { Search, ArrowUpDown, Clock, CheckCircle, XCircle } from 'lucide-react';
import { AppContext } from '../context/AppContext';

interface CustomerRequestsViewProps {
  bookings: Booking[];
  bookingRequests: Booking[];
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

const FilterButton: React.FC<{label: string; value: string; activeValue: string; onClick: (value: string) => void;}> = ({ label, value, activeValue, onClick }) => (
    <button
        onClick={() => onClick(value)}
        className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeValue === value ? 'bg-brand-blue text-white shadow-sm' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
        {label}
    </button>
);

const RequestCard: React.FC<{
  booking: Booking & { isRequest: boolean };
}> = ({ booking }) => {
    const isPaid = booking.payment_status === PaymentStatus.PAID;
    const isPending = booking.status === BookingStatus.PENDING;
    const isRequest = booking.isRequest;

    const getStatusIcon = () => {
        switch (booking.status) {
            case BookingStatus.PENDING:
                return <Clock size={18} className="text-yellow-500" />;
            case BookingStatus.APPROVED:
                return <CheckCircle size={18} className="text-blue-500" />;
            case BookingStatus.CONFIRMED:
                return <CheckCircle size={18} className="text-green-500" />;
            default:
                return <XCircle size={18} className="text-red-500" />;
        }
    };

    const getStatusColor = () => {
        switch (booking.status) {
            case BookingStatus.PENDING:
                return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400';
            case BookingStatus.APPROVED:
                return 'bg-blue-50 dark:bg-blue-900/20 border-blue-400';
            case BookingStatus.CONFIRMED:
                return 'bg-green-50 dark:bg-green-900/20 border-green-400';
            default:
                return 'bg-red-50 dark:bg-red-900/20 border-red-400';
        }
    };

    return (
        <div className={`p-4 rounded-lg shadow-sm border-l-4 ${getStatusColor()}`}>
            <div className="flex justify-between items-start mb-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-800 dark:text-gray-200 truncate">
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
                        {isRequest && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300">
                                REQUEST
                            </span>
                        )}
                    </div>
                    {booking.request_number && (
                        <p className="text-xs font-mono text-blue-600 dark:text-blue-400 mb-1">
                            Request #: {booking.request_number}
                        </p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {booking.booking_type === 'full_day' ? 'Full Day' : booking.slots?.join(', ')}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        isPaid
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                    }`}>
                        {booking.payment_status}
                    </span>
                    {getStatusIcon()}
                </div>
            </div>

            <div className="border-t dark:border-gray-700 my-3"></div>

            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <p><strong>Date:</strong> {parseLocalDate(booking.date).toLocaleDateString('en-GB')}</p>
                <p><strong>Amount:</strong> {booking.payment_amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</p>
                <p><strong>Status:</strong>
                    <span className={`ml-1 px-2 py-1 text-xs font-semibold rounded-full ${
                        booking.status === BookingStatus.PENDING
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                            : booking.status === BookingStatus.APPROVED
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                            : booking.status === BookingStatus.CONFIRMED
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300'
                    }`}>
                        {booking.status?.toUpperCase()}
                    </span>
                </p>
            </div>
        </div>
    );
};

const CustomerRequestsView: React.FC<CustomerRequestsViewProps> = ({
  bookings,
  bookingRequests
}) => {
  const { user } = useContext(AppContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'approved', 'confirmed'
  const [sortConfig, setSortConfig] = useState<{ key: keyof Booking, direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });

  const filteredAndSortedRequests = useMemo(() => {
    // Debug logging to help identify matching issues
    console.log('🔍 CustomerRequestsView Debug:', {
      user: user,
      totalBookings: bookings.length,
      totalRequests: bookingRequests.length,
      userEmail: user.email,
      userName: user.name
    });

    // Filter bookings and requests to only show current user's data
    const userBookings = bookings.filter(booking => {
      let isOwnBooking = false;

      // Enhanced matching logic with better normalization
      const normalizeText = (text: string) => {
        return text.toLowerCase()
                  .trim()
                  .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                  .replace(/[^\w\s@.]/g, ''); // Remove special characters except @ and .
      };

      const normalizedUserEmail = user.email ? normalizeText(user.email) : '';
      const normalizedUserName = user.name ? normalizeText(user.name) : '';
      const normalizedBookingEmail = booking.customer_email ? normalizeText(booking.customer_email) : '';
      const normalizedBookingName = booking.customer_name ? normalizeText(booking.customer_name) : '';

      // Enhanced email matching
      if (normalizedUserEmail && normalizedBookingEmail) {
        // Check for exact match first
        if (normalizedBookingEmail === normalizedUserEmail) {
          isOwnBooking = true;
          console.log('✅ Email match found:', { bookingEmail: normalizedBookingEmail, userEmail: normalizedUserEmail });
        } else {
          // Check for partial matches (e.g., if user enters "john@example.com" but stored as "john.doe@example.com")
          const emailPartsMatch = normalizedUserEmail.split('@')[1] === normalizedBookingEmail.split('@')[1] &&
                                 normalizedUserEmail.split('@')[0].length > 3 &&
                                 normalizedBookingEmail.split('@')[0].length > 3;
          if (emailPartsMatch) {
            isOwnBooking = true;
            console.log('✅ Partial email match found:', { bookingEmail: normalizedBookingEmail, userEmail: normalizedUserEmail });
          }
        }
      }

      // Enhanced name matching
      if (!isOwnBooking && normalizedUserName && normalizedBookingName) {
        // Check for exact match first
        if (normalizedBookingName === normalizedUserName) {
          isOwnBooking = true;
          console.log('✅ Name match found:', { bookingName: normalizedBookingName, userName: normalizedUserName });
        } else {
          // Check for significant overlap (e.g., "John Doe" vs "John D")
          const userNameWords = normalizedUserName.split(' ');
          const bookingNameWords = normalizedBookingName.split(' ');
          const commonWords = userNameWords.filter(word =>
            bookingNameWords.some(bWord => bWord.includes(word) || word.includes(bWord))
          );

          if (commonWords.length >= Math.min(userNameWords.length, bookingNameWords.length)) {
            isOwnBooking = true;
            console.log('✅ Partial name match found:', { bookingName: normalizedBookingName, userName: normalizedUserName });
          }
        }
      }

      // Debug logging for non-matches
      if (!isOwnBooking) {
        console.log('❌ No match for booking:', {
          bookingId: booking.id,
          bookingEmail: booking.customer_email,
          bookingName: booking.customer_name,
          normalizedBookingEmail,
          normalizedBookingName,
          normalizedUserEmail,
          normalizedUserName
        });
      }

      return isOwnBooking;
    });

    const userRequests = bookingRequests.filter(request => {
      let isOwnRequest = false;

      // Enhanced matching logic with better normalization
      const normalizeText = (text: string) => {
        return text.toLowerCase()
                  .trim()
                  .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                  .replace(/[^\w\s@.]/g, ''); // Remove special characters except @ and .
      };

      const normalizedUserEmail = user.email ? normalizeText(user.email) : '';
      const normalizedUserName = user.name ? normalizeText(user.name) : '';
      const normalizedRequestEmail = request.customer_email ? normalizeText(request.customer_email) : '';
      const normalizedRequestName = request.customer_name ? normalizeText(request.customer_name) : '';

      // Enhanced email matching
      if (normalizedUserEmail && normalizedRequestEmail) {
        // Check for exact match first
        if (normalizedRequestEmail === normalizedUserEmail) {
          isOwnRequest = true;
          console.log('✅ Request email match found:', { requestEmail: normalizedRequestEmail, userEmail: normalizedUserEmail });
        } else {
          // Check for partial matches
          const emailPartsMatch = normalizedUserEmail.split('@')[1] === normalizedRequestEmail.split('@')[1] &&
                                 normalizedUserEmail.split('@')[0].length > 3 &&
                                 normalizedRequestEmail.split('@')[0].length > 3;
          if (emailPartsMatch) {
            isOwnRequest = true;
            console.log('✅ Partial request email match found:', { requestEmail: normalizedRequestEmail, userEmail: normalizedUserEmail });
          }
        }
      }

      // Enhanced name matching
      if (!isOwnRequest && normalizedUserName && normalizedRequestName) {
        // Check for exact match first
        if (normalizedRequestName === normalizedUserName) {
          isOwnRequest = true;
          console.log('✅ Request name match found:', { requestName: normalizedRequestName, userName: normalizedUserName });
        } else {
          // Check for significant overlap
          const userNameWords = normalizedUserName.split(' ');
          const requestNameWords = normalizedRequestName.split(' ');
          const commonWords = userNameWords.filter(word =>
            requestNameWords.some(rWord => rWord.includes(word) || word.includes(rWord))
          );

          if (commonWords.length >= Math.min(userNameWords.length, requestNameWords.length)) {
            isOwnRequest = true;
            console.log('✅ Partial request name match found:', { requestName: normalizedRequestName, userName: normalizedUserName });
          }
        }
      }

      // Debug logging for non-matches
      if (!isOwnRequest) {
        console.log('❌ No match for request:', {
          requestId: request.id,
          requestEmail: request.customer_email,
          requestName: request.customer_name,
          normalizedRequestEmail,
          normalizedRequestName,
          normalizedUserEmail,
          normalizedUserName
        });
      }

      return isOwnRequest;
    });

    // Combine filtered bookings and booking requests
    // Include approved bookings so customers can see their approved requests
    let allItems: (Booking & { isRequest: boolean })[] = [
      ...userBookings.filter(b => b.status === BookingStatus.APPROVED || b.status === BookingStatus.CONFIRMED).map(b => ({ ...b, isRequest: false })),
      ...userRequests.map(r => ({ ...r, isRequest: true }))
    ];

    // Sort by date and status priority (pending first, then approved, then confirmed)
    allItems.sort((a, b) => {
      // First sort by date (newest first) - use local date parsing to avoid timezone issues
      const dateCompare = parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime();
      if (dateCompare !== 0) return dateCompare;

      // Then sort by status priority (pending > approved > confirmed)
      const statusPriority = { [BookingStatus.PENDING]: 3, [BookingStatus.APPROVED]: 2, [BookingStatus.CONFIRMED]: 1 };
      const aPriority = statusPriority[a.status] || 0;
      const bPriority = statusPriority[b.status] || 0;

      return bPriority - aPriority;
    });


    // Filter by status
    if (statusFilter === 'pending') {
      allItems = allItems.filter(b => b.status === BookingStatus.PENDING);
    } else if (statusFilter === 'approved') {
      allItems = allItems.filter(b => b.status === BookingStatus.APPROVED);
    } else if (statusFilter === 'confirmed') {
      allItems = allItems.filter(b => b.status === BookingStatus.CONFIRMED);
    } else if (statusFilter === 'all') {
      // Show all items (pending, approved, confirmed)
    }

    // Filter by search query
    if (searchQuery) {
        const lowercasedQuery = searchQuery.toLowerCase();
        allItems = allItems.filter(b =>
            (b.event_type && b.event_type.toLowerCase().includes(lowercasedQuery)) ||
            (b.net_number && (Array.isArray(b.net_number) ? b.net_number.join(', ') : String(b.net_number)).toLowerCase().includes(lowercasedQuery)) ||
            (b.request_number && b.request_number.toLowerCase().includes(lowercasedQuery)) ||
            b.date.includes(lowercasedQuery)
        );
    }

    // Sort items
    if (sortConfig) {
        allItems.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (sortConfig.key === 'date' || sortConfig.key === 'created_at') {
              return sortConfig.direction === 'asc'
                ? new Date(aValue.toString()).getTime() - new Date(bValue.toString()).getTime()
                : new Date(bValue.toString()).getTime() - new Date(aValue.toString()).getTime();
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    return allItems;
  }, [user, bookings, bookingRequests, searchQuery, sortConfig, statusFilter]);

  const requestSort = (key: keyof Booking) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortableHeader: React.FC<{ sortKey: keyof Booking, children: React.ReactNode }> = ({ sortKey, children }) => (
    <th className="py-3 px-4 font-semibold">
        <button onClick={() => requestSort(sortKey)} className="flex items-center space-x-1 hover:text-brand-blue dark:hover:text-brand-orange">
            <span>{children}</span>
            <ArrowUpDown size={16} />
        </button>
    </th>
  );

  return (
    <div className="space-y-6 animate-slideInUp">
        <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">My Booking Requests</h2>
            <p className="text-gray-600 dark:text-gray-400">View and track all your booking requests</p>

        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm space-y-4">
            <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search requests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
            </div>

            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Status:</span>
                    <FilterButton label="All" value="all" activeValue={statusFilter} onClick={setStatusFilter} />
                    <FilterButton label="Pending" value="pending" activeValue={statusFilter} onClick={setStatusFilter} />
                    <FilterButton label="Approved" value="approved" activeValue={statusFilter} onClick={setStatusFilter} />
                    <FilterButton label="Confirmed" value="confirmed" activeValue={statusFilter} onClick={setStatusFilter} />
                </div>
            </div>
        </div>

        {/* Desktop Table View */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden hidden lg:block">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            <SortableHeader sortKey="date">Date</SortableHeader>
                            <SortableHeader sortKey="request_number">Request #</SortableHeader>
                            <SortableHeader sortKey="event_type">Event/Details</SortableHeader>
                            <SortableHeader sortKey="payment_amount">Amount</SortableHeader>
                            <SortableHeader sortKey="payment_status">Payment</SortableHeader>
                            <SortableHeader sortKey="status">Status</SortableHeader>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredAndSortedRequests.map(booking => (
                            <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="py-3 px-3 sm:px-4 text-sm text-gray-800 dark:text-gray-300">
                                    {parseLocalDate(booking.date).toLocaleDateString('en-GB')}
                                </td>
                                <td className="py-3 px-3 sm:px-4 text-sm">
                                    {booking.request_number ? (
                                        <span className="font-mono text-blue-600 dark:text-blue-400 text-xs">
                                            {booking.request_number}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 text-xs">—</span>
                                    )}
                                </td>
                                <td className="py-3 px-3 sm:px-4 text-sm text-gray-800 dark:text-gray-200">
                                    <div className="flex items-center gap-2">
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
                                        {booking.isRequest && (
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300">
                                                REQUEST
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {booking.booking_type === 'full_day' ? 'Full Day' : booking.slots?.join(', ')}
                                    </div>
                                </td>
                                <td className="py-3 px-3 sm:px-4 text-sm text-gray-800 dark:text-gray-300">
                                    {booking.payment_amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                </td>
                                <td className="py-3 px-3 sm:px-4 text-sm">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                        booking.payment_status === PaymentStatus.PAID
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                                    }`}>
                                        {booking.payment_status}
                                    </span>
                                </td>
                                <td className="py-3 px-3 sm:px-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                            booking.status === BookingStatus.PENDING
                                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                                                : booking.status === BookingStatus.APPROVED
                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                                : booking.status === BookingStatus.CONFIRMED
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                                : 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300'
                                        }`}>
                                            {booking.status?.toUpperCase()}
                                        </span>
                                        {booking.status === BookingStatus.PENDING && (
                                            <Clock size={16} className="text-yellow-500" />
                                        )}
                                        {booking.status === BookingStatus.APPROVED && (
                                            <CheckCircle size={16} className="text-blue-500" />
                                        )}
                                        {booking.status === BookingStatus.CONFIRMED && (
                                            <CheckCircle size={16} className="text-green-500" />
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredAndSortedRequests.length === 0 && (
                    <p className="text-center py-10 text-gray-500 dark:text-gray-400">
                        {searchQuery || statusFilter !== 'all'
                            ? 'No requests found matching your filters.'
                            : 'No booking requests or approved bookings found for your account. Submit a new request using the calendar or check back later for updates on your pending requests.'}
                    </p>
                )}
            </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
            {filteredAndSortedRequests.length > 0 ? (
                filteredAndSortedRequests.map(booking => (
                    <RequestCard
                        key={booking.id}
                        booking={booking}
                    />
                ))
            ) : (
                <p className="text-center py-10 text-gray-500 dark:text-gray-400">
                    {searchQuery || statusFilter !== 'all'
                        ? 'No requests found matching your filters.'
                        : 'No booking requests or approved bookings found for your account. Submit a new request using the calendar or check back later for updates on your pending requests.'}
                </p>
            )}
        </div>
    </div>
  );
};

export default CustomerRequestsView;