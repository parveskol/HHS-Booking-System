import React, { useState, useMemo, useEffect, useContext } from 'react';
import { Booking, PaymentStatus, BookingStatus } from '../types';
import { Search, ArrowUpDown, Check, X, Trash2, Download, Edit } from 'lucide-react';
import { AppContext, BookingSystem } from '../context/AppContext';

interface BookingsViewProps {
    bookings: Booking[];
    bookingRequests: Booking[];
    openModal: (date: Date, booking: Booking) => void;
    initialDateFilter?: {start: string, end: string} | null;
    clearInitialFilter: () => void;
    onApproveRequest?: (requestId: number, system: 'ground' | 'net') => void;
    onRejectRequest?: (requestId: number, system: 'ground' | 'net') => void;
    onDeleteRequest?: (requestId: number, system: 'ground' | 'net') => void;
    onEditRequest?: (date: Date, booking: Booking, system: 'ground' | 'net') => void;
    system?: BookingSystem;
    onDataRefresh?: () => void; // Add callback for data refresh
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
        className={`px-2 py-1 text-xs font-semibold rounded transition-colors ${activeValue === value ? 'bg-brand-blue text-white shadow-sm' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
        {label}
    </button>
);

const BookingCard: React.FC<{
   booking: Booking & { isRequest: boolean };
   onClick: () => void;
   onApprove?: () => void;
   onReject?: () => void;
   onDelete?: () => void;
   onEdit?: () => void;
   userRole?: string;
   isApproving?: boolean;
   isRejecting?: boolean;
   isDeleting?: boolean;
 }> = ({ booking, onClick, onApprove, onReject, onDelete, onEdit, userRole, isApproving, isRejecting, isDeleting }) => {
    const isPaid = booking.payment_status === PaymentStatus.PAID;
    const isPending = booking.status === BookingStatus.PENDING;
    const isRequest = booking.isRequest;

    return (
        <div className={`p-2.5 rounded-lg shadow-sm cursor-pointer ${
            isRequest
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400'
                : 'bg-white dark:bg-gray-800 border-l-4 border-brand-orange'
        }`} onClick={onClick}>
            <div className="flex justify-between items-start mb-1.5">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        <p className="font-bold text-gray-800 dark:text-gray-200 truncate text-sm">{booking.customer_name}</p>
                        {isRequest && (
                            <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300">
                                REQ
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="truncate block">
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
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                        isPaid
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                    }`}>
                        {isPaid ? 'PAID' : 'UNPAID'}
                    </span>
                    {isRequest && userRole === 'admin' && (
                        <div className="flex gap-0.5">
                            {isPending && onApprove && onReject && (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onApprove();
                                        }}
                                        disabled={isApproving}
                                        className={`p-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/70 disabled:opacity-50 disabled:cursor-not-allowed ${
                                            isApproving ? 'cursor-wait' : ''
                                        }`}
                                        title="Approve Request"
                                    >
                                        {isApproving ? (
                                            <div className="animate-spin rounded-full h-3 w-3 border border-green-700 border-t-transparent"></div>
                                        ) : (
                                            <Check size={14} />
                                        )}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onReject();
                                        }}
                                        disabled={isRejecting}
                                        className={`p-0.5 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/70 disabled:opacity-50 disabled:cursor-not-allowed ${
                                            isRejecting ? 'cursor-wait' : ''
                                        }`}
                                        title="Reject Request"
                                    >
                                        {isRejecting ? (
                                            <div className="animate-spin rounded-full h-3 w-3 border border-red-700 border-t-transparent"></div>
                                        ) : (
                                            <X size={14} />
                                        )}
                                    </button>
                                </>
                            )}
                            {onEdit && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit();
                                    }}
                                    className={`p-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/70`}
                                    title="Edit Request"
                                >
                                    <Edit size={14} />
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onDelete && window.confirm(`⚠️ PERMANENT DELETION WARNING ⚠️

Are you sure you want to delete this booking request?

This will:
• Permanently delete the request from the database
• Remove all associated data and records
• Cannot be undone or recovered

Customer: ${booking.customer_name}
Date: ${parseLocalDate(booking.date).toLocaleDateString('en-GB')}
Time: ${booking.booking_type === 'full_day' ? 'Full Day' : booking.slots?.join(', ')}

Click "OK" to permanently delete this request, or "Cancel" to keep it.`)) {
                                        onDelete();
                                    }
                                }}
                                disabled={isDeleting}
                                className={`p-0.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-900/50 dark:text-gray-300 dark:hover:bg-gray-900/70 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    isDeleting ? 'cursor-wait' : ''
                                }`}
                                title="Delete Request"
                            >
                                {isDeleting ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border border-gray-700 border-t-transparent"></div>
                                ) : (
                                    <Trash2 size={14} />
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div className="border-t dark:border-gray-700 my-1.5"></div>
            <div className="text-xs text-gray-700 dark:text-gray-300 space-y-0.5">
                <div className="flex justify-between items-center">
                    <span><strong>Date:</strong> {parseLocalDate(booking.date).toLocaleDateString('en-GB')}</span>
                    <span><strong>Amount:</strong> ₹{booking.payment_amount}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span><strong>Time:</strong> {booking.booking_type === 'full_day' ? 'Full Day' : booking.slots?.join(', ')}</span>
                    {booking.status && (
                        <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                            booking.status === BookingStatus.PENDING
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                                : booking.status === BookingStatus.APPROVED
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                : booking.status === BookingStatus.CONFIRMED
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300'
                        }`}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1).toLowerCase()}
                        </span>
                    )}
                </div>
                {booking.notes && (
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                        <span className="text-xs font-medium text-blue-800 dark:text-blue-300"><strong>Notes:</strong></span>
                        <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                            {booking.notes}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};


const BookingsView: React.FC<BookingsViewProps> = ({
    bookings,
    bookingRequests,
    openModal,
    initialDateFilter,
    clearInitialFilter,
    onApproveRequest,
    onRejectRequest,
    onDeleteRequest,
    onEditRequest,
    onDataRefresh,
    system = 'ground'
  }) => {
  const { user, deleteBookingRequest } = useContext(AppContext);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isApproving, setIsApproving] = useState<number | null>(null);
  const [isRejecting, setIsRejecting] = useState<number | null>(null);

  const handleApproveRequest = async (requestId: number, system: 'ground' | 'net') => {
    if (isApproving) return; // Prevent multiple clicks

    setIsApproving(requestId);
    try {
      await onApproveRequest?.(requestId, system);
      console.log(`✅ Request ${requestId} approved successfully`);

      // Refresh data after successful approval
      setTimeout(() => {
        onDataRefresh?.();
      }, 500);
    } catch (error: any) {
      console.error('❌ Error approving request:', error);

      // Provide specific error messages based on error type
      let errorMessage = 'Error approving request. Please try again.';

      if (error.message) {
        if (error.message.includes('Access denied')) {
          errorMessage = 'Access denied: Insufficient permissions to approve requests.';
        } else if (error.message.includes('not found')) {
          errorMessage = 'Request not found. It may have already been processed.';
        } else if (error.message.includes('already approved')) {
          errorMessage = 'Request has already been approved.';
        } else if (error.message.includes('Failed to approve')) {
          errorMessage = `Failed to approve request: ${error.message.replace('Failed to approve booking request: ', '')}`;
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      alert(errorMessage);

      // Log additional context for debugging
      console.error('Approve operation context:', {
        requestId,
        system,
        userRole: user?.role,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsApproving(null);
    }
  };

  const handleRejectRequest = async (requestId: number, system: 'ground' | 'net') => {
    if (isRejecting) return; // Prevent multiple clicks

    setIsRejecting(requestId);
    try {
      await onRejectRequest?.(requestId, system);
      console.log(`✅ Request ${requestId} rejected successfully`);

      // Refresh data after successful rejection
      setTimeout(() => {
        onDataRefresh?.();
      }, 500);
    } catch (error: any) {
      console.error('❌ Error rejecting request:', error);

      // Provide specific error messages based on error type
      let errorMessage = 'Error rejecting request. Please try again.';

      if (error.message) {
        if (error.message.includes('Access denied')) {
          errorMessage = 'Access denied: Insufficient permissions to reject requests.';
        } else if (error.message.includes('not found')) {
          errorMessage = 'Request not found. It may have already been processed.';
        } else if (error.message.includes('already rejected')) {
          errorMessage = 'Request has already been rejected.';
        } else if (error.message.includes('Failed to reject')) {
          errorMessage = `Failed to reject request: ${error.message.replace('Failed to reject booking request: ', '')}`;
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      alert(errorMessage);

      // Log additional context for debugging
      console.error('Reject operation context:', {
        requestId,
        system,
        userRole: user?.role,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsRejecting(null);
    }
  };

  const handleDeleteRequest = async (requestId: number, system: 'ground' | 'net') => {
    if (isDeleting) return; // Prevent multiple clicks

    setIsDeleting(requestId);
    try {
      await onDeleteRequest?.(requestId, system);
      console.log(`✅ Request ${requestId} deleted successfully`);

      // Refresh data after successful deletion
      setTimeout(() => {
        onDataRefresh?.();
      }, 500); // Small delay to allow real-time updates to process first
    } catch (error: any) {
      console.error('❌ Error deleting request:', error);

      // Provide specific error messages based on error type
      let errorMessage = 'Error deleting request. Please try again.';

      if (error.message) {
        if (error.message.includes('Access denied')) {
          errorMessage = 'Access denied: Only administrators can delete booking requests.';
        } else if (error.message.includes('not found')) {
          errorMessage = 'Request not found. It may have already been deleted.';
        } else if (error.message.includes('System mismatch')) {
          errorMessage = 'System mismatch error. Please refresh and try again.';
        } else if (error.message.includes('Cannot delete request')) {
          errorMessage = 'Cannot delete this request as it may be referenced by other records.';
        } else if (error.message.includes('Permission denied')) {
          errorMessage = 'Permission denied. You may not have sufficient privileges to delete this request.';
        } else if (error.message.includes('Failed to delete')) {
          errorMessage = `Failed to delete request: ${error.message.replace('Failed to delete booking request: ', '')}`;
        } else if (error.message.includes('Invalid request')) {
          errorMessage = error.message;
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      // Show error message to user
      alert(errorMessage);

      // Log additional context for debugging
      console.error('Delete operation context:', {
        requestId,
        system,
        userRole: user?.role,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all', 'paid', 'unpaid'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'approved', 'confirmed'
  const [dateFilter, setDateFilter] = useState<{start: string, end: string}>(initialDateFilter ? initialDateFilter : {start: '', end: ''});
  const [sortConfig, setSortConfig] = useState<{ key: keyof Booking, direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });

  useEffect(() => {
    if (initialDateFilter) {
      setDateFilter(initialDateFilter);
      clearInitialFilter();
    }
  }, [initialDateFilter, clearInitialFilter]);

  const filteredAndSortedBookings = useMemo(() => {
    // Combine bookings and booking requests
    let allItems: (Booking & { isRequest: boolean })[] = [
      ...bookings.map(b => ({ ...b, isRequest: false })),
      ...bookingRequests.map(r => ({ ...r, isRequest: true }))
    ];

    if (dateFilter.start && dateFilter.end) {
        allItems = allItems.filter(b => b.date >= dateFilter.start && b.date <= dateFilter.end);
    }

    if (statusFilter === 'pending') {
      allItems = allItems.filter(b => b.status === BookingStatus.PENDING);
    } else if (statusFilter === 'approved') {
      allItems = allItems.filter(b => b.status === BookingStatus.APPROVED);
    } else if (statusFilter === 'confirmed') {
      allItems = allItems.filter(b => b.status === BookingStatus.CONFIRMED);
    } else if (statusFilter === 'requests') {
      allItems = allItems.filter(b => b.isRequest);
    } else if (statusFilter === 'bookings') {
      allItems = allItems.filter(b => !b.isRequest);
    }

    if (paymentFilter === 'paid') {
      allItems = allItems.filter(b => b.payment_status === PaymentStatus.PAID);
    } else if (paymentFilter === 'unpaid') {
      allItems = allItems.filter(b => b.payment_status === PaymentStatus.UNPAID);
    }

    if (searchQuery) {
        const lowercasedQuery = searchQuery.toLowerCase();
        allItems = allItems.filter(b => {
            const netNumberString = b.net_number
                ? (Array.isArray(b.net_number) ? b.net_number.join(', ') : String(b.net_number))
                : '';
            return (
                b.customer_name.toLowerCase().includes(lowercasedQuery) ||
                b.customer_contact.toLowerCase().includes(lowercasedQuery) ||
                (b.customer_email && b.customer_email.toLowerCase().includes(lowercasedQuery)) ||
                (b.event_type && b.event_type.toLowerCase().includes(lowercasedQuery)) ||
                netNumberString.toLowerCase().includes(lowercasedQuery)
            );
        });
    }

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
  }, [bookings, bookingRequests, searchQuery, sortConfig, paymentFilter, statusFilter, dateFilter]);

  const requestSort = (key: keyof Booking) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const downloadCSV = () => {
    if (filteredAndSortedBookings.length === 0) {
      alert("No bookings to export with the current filters.");
      return;
    }

    // Use the filtered and sorted bookings for export
    const bookingsToExport = filteredAndSortedBookings;

    const headers = ["S.No", "Date", "System", "Type", "Slots", "Customer Name", "Contact", "Email", "Event/Indoor Net No.", "Payment Status", "Amount", "Notes"];
    const rows = bookingsToExport.map((b, index) => [
      index + 1,
      b.date,
      system?.charAt(0).toUpperCase() + system?.slice(1) || 'Ground',
      b.booking_type,
      b.slots?.join('; ') || "N/A",
      `"${b.customer_name.replace(/"/g, '""')}"`,
      b.customer_contact,
      b.customer_email,
      `"${(() => {
          const netDisplay = b.net_number && (Array.isArray(b.net_number) ? b.net_number.length : b.net_number)
              ? (Array.isArray(b.net_number)
                  ? b.net_number.map(net => `Net ${net}`).join(', ')
                  : `Net ${b.net_number}`)
              : '';
          return b.event_type
              ? `${b.event_type}${netDisplay ? ` (${netDisplay})` : ''}`
              : netDisplay || 'No details';
      })().replace(/"/g, '""')}"`,
      b.payment_status,
      b.payment_amount,
      `"${(b.notes || "").replace(/"/g, '""')}"`
    ].join(','));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `harvard_house_${system || 'ground'}_bookings_filtered.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const SortableHeader: React.FC<{ sortKey: keyof Booking, children: React.ReactNode }> = ({ sortKey, children }) => (
    <th className="py-2 px-2 font-semibold text-xs text-left">
        <button onClick={() => requestSort(sortKey)} className="flex items-center gap-1 hover:text-brand-blue dark:hover:text-brand-orange">
            <span>{children}</span>
            <ArrowUpDown size={12} />
        </button>
    </th>
  )

  return (
    <div className="space-y-3 animate-slideInUp">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
            {user?.role === 'customer' ? 'My Bookings & Requests' : 'All Bookings & Requests'}
          </h2>
          {user?.role === 'admin' && (
            <button
              onClick={downloadCSV}
              className="bg-brand-blue text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-brand-dark transition-all transform hover:scale-105 flex items-center space-x-2"
            >
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm space-y-2">
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-7 pr-2 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-orange"
                    />
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Payment:</span>
                    <div className="flex gap-0.5">
                        <FilterButton label="All" value="all" activeValue={paymentFilter} onClick={setPaymentFilter} />
                        <FilterButton label="Paid" value="paid" activeValue={paymentFilter} onClick={setPaymentFilter} />
                        <FilterButton label="Unpaid" value="unpaid" activeValue={paymentFilter} onClick={setPaymentFilter} />
                    </div>
                </div>
                {user?.role !== 'customer' && (
                  <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Status:</span>
                      <div className="flex gap-0.5">
                          <FilterButton label="All" value="all" activeValue={statusFilter} onClick={setStatusFilter} />
                          <FilterButton label="Pending" value="pending" activeValue={statusFilter} onClick={setStatusFilter} />
                          <FilterButton label="Approved" value="approved" activeValue={statusFilter} onClick={setStatusFilter} />
                          <FilterButton label="Confirmed" value="confirmed" activeValue={statusFilter} onClick={setStatusFilter} />
                      </div>
                  </div>
                )}
                  <div className="flex items-center gap-1.5">
                     <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Date:</span>
                     <div className="flex items-center gap-0.5">
                         <input type="date" value={dateFilter.start} onChange={e => setDateFilter(prev => ({...prev, start: e.target.value}))} className="p-0.5 text-xs border rounded bg-white dark:bg-gray-700 dark:border-gray-600 w-24"/>
                         <span className="text-xs text-gray-500">to</span>
                         <input type="date" value={dateFilter.end} onChange={e => setDateFilter(prev => ({...prev, end: e.target.value}))} className="p-0.5 text-xs border rounded bg-white dark:bg-gray-700 dark:border-gray-600 w-24"/>
                     </div>
                 </div>
            </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden hidden lg:block">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            <SortableHeader sortKey="date">Date</SortableHeader>
                            <SortableHeader sortKey="customer_name">Customer</SortableHeader>
                            <SortableHeader sortKey="event_type">Details</SortableHeader>
                            <th className="py-2 px-2 font-semibold text-xs text-left">Notes</th>
                            <SortableHeader sortKey="payment_amount">Amount</SortableHeader>
                            <SortableHeader sortKey="payment_status">Payment</SortableHeader>
                            <SortableHeader sortKey="status">Status</SortableHeader>
                            {user?.role !== 'customer' && <th className="py-2 px-2 font-semibold text-xs text-center">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredAndSortedBookings.map(booking => (
                            <tr key={booking.id} onClick={() => openModal(parseLocalDate(booking.date), booking)} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                                <td className="py-2 px-2 text-sm text-gray-800 dark:text-gray-300 text-left">{parseLocalDate(booking.date).toLocaleDateString('en-GB')}</td>
                                <td className="py-2 px-2 text-sm font-semibold text-gray-800 dark:text-gray-200 text-left">
                                    <div className="flex items-center gap-1.5">
                                        <span className="truncate max-w-[120px]" title={booking.customer_name}>{booking.customer_name}</span>
                                        {booking.isRequest && (
                                            <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300">
                                                REQ
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="py-2 px-2 text-xs text-gray-600 dark:text-gray-400 max-w-[150px] text-left">
                                    <div className="flex flex-col">
                                        <span className="truncate" title={booking.event_type || `Net ${booking.net_number}`}>
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
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-500 text-xs">
                                            ({booking.booking_type === 'full_day' ? 'Full' : booking.slots?.join(',')})
                                        </span>
                                    </div>
                                </td>
                                <td className="py-2 px-2 text-xs text-gray-600 dark:text-gray-400 max-w-[150px] text-left">
                                    <div className="truncate" title={booking.notes || 'No notes'}>
                                        {booking.notes || 'No notes'}
                                    </div>
                                </td>
                                <td className="py-2 px-2 text-sm text-gray-800 dark:text-gray-300 font-medium text-left">₹{booking.payment_amount}</td>
                                <td className="py-2 px-2 text-sm text-left">
                                    <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${booking.payment_status === PaymentStatus.PAID ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'}`}>
                                        {booking.payment_status === PaymentStatus.PAID ? 'PAID' : 'UNPAID'}
                                    </span>
                                </td>
                                <td className="py-2 px-2 text-sm text-left">
                                    <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                                        booking.status === BookingStatus.PENDING
                                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                                            : booking.status === BookingStatus.APPROVED
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                            : booking.status === BookingStatus.CONFIRMED
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                            : 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300'
                                    }`}>
                                        {booking.status?.charAt(0) + booking.status?.slice(1).toLowerCase()}
                                    </span>
                                </td>
                                {user?.role !== 'customer' && (
                                    <td className="py-2 px-2 text-sm text-center">
                                        {booking.isRequest && user?.role === 'admin' && (
                                            <div className="flex justify-center gap-0.5">
                                                {booking.status === BookingStatus.PENDING && onApproveRequest && onRejectRequest && (
                                                    <>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleApproveRequest(booking.id, booking.system);
                                                            }}
                                                            disabled={isApproving === booking.id}
                                                            className={`p-1 rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/70 disabled:opacity-50 disabled:cursor-not-allowed ${
                                                                isApproving === booking.id ? 'cursor-wait' : ''
                                                            }`}
                                                            title="Approve Request"
                                                        >
                                                            {isApproving === booking.id ? (
                                                                <div className="animate-spin rounded-full h-2.5 w-2.5 border border-green-700 border-t-transparent"></div>
                                                            ) : (
                                                                <Check size={12} />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRejectRequest(booking.id, booking.system);
                                                            }}
                                                            disabled={isRejecting === booking.id}
                                                            className={`p-1 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/70 disabled:opacity-50 disabled:cursor-not-allowed ${
                                                                isRejecting === booking.id ? 'cursor-wait' : ''
                                                            }`}
                                                            title="Reject Request"
                                                        >
                                                            {isRejecting === booking.id ? (
                                                                <div className="animate-spin rounded-full h-2.5 w-2.5 border border-red-700 border-t-transparent"></div>
                                                            ) : (
                                                                <X size={12} />
                                                            )}
                                                        </button>
                                                    </>
                                                )}
                                                {onEditRequest && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onEditRequest(parseLocalDate(booking.date), booking, booking.system);
                                                        }}
                                                        className={`p-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/70`}
                                                        title="Edit Request"
                                                    >
                                                        <Edit size={12} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm(`⚠️ Delete ${booking.customer_name} - ${parseLocalDate(booking.date).toLocaleDateString('en-GB')}?`)) {
                                                            handleDeleteRequest(booking.id, booking.system);
                                                        }
                                                    }}
                                                    disabled={isDeleting === booking.id}
                                                    className={`p-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-900/50 dark:text-gray-300 dark:hover:bg-gray-900/70 disabled:opacity-50 disabled:cursor-not-allowed ${
                                                        isDeleting === booking.id ? 'cursor-wait' : ''
                                                    }`}
                                                    title="Delete Request"
                                                >
                                                    {isDeleting === booking.id ? (
                                                        <div className="animate-spin rounded-full h-2.5 w-2.5 border border-gray-700 border-t-transparent"></div>
                                                    ) : (
                                                        <Trash2 size={12} />
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                        {booking.status === BookingStatus.PENDING && booking.isRequest && user?.role === 'management' && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                                Pending
                                            </div>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredAndSortedBookings.length === 0 && (
                      <div className="text-center py-10">
                          <p className="text-gray-500 dark:text-gray-400">No bookings found.</p>
                      </div>
                )}
            </div>
        </div>

        <div className="md:hidden space-y-2">
            {filteredAndSortedBookings.length > 0 ? (
                filteredAndSortedBookings.map(booking => (
                    <BookingCard
                        key={booking.id}
                        booking={booking}
                        onClick={() => openModal(parseLocalDate(booking.date), booking)}
                        onApprove={booking.status === BookingStatus.PENDING && booking.isRequest ? () => handleApproveRequest(booking.id, booking.system) : undefined}
                        onReject={booking.status === BookingStatus.PENDING && booking.isRequest ? () => handleRejectRequest(booking.id, booking.system) : undefined}
                        onDelete={booking.isRequest ? () => handleDeleteRequest(booking.id, booking.system) : undefined}
                        onEdit={onEditRequest ? () => onEditRequest(parseLocalDate(booking.date), booking, booking.system) : undefined}
                        userRole={user?.role}
                        isApproving={isApproving === booking.id}
                        isRejecting={isRejecting === booking.id}
                        isDeleting={isDeleting === booking.id}
                    />
                ))
            ) : (
                <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No bookings found matching your filters.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default BookingsView;