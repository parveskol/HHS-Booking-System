import React, { useMemo } from 'react';
import { PaymentStatus, Booking } from '../types';
import { Calendar, TrendingUp } from 'lucide-react';

interface DashboardViewProps {
    bookings: Booking[];
    openModal: (date: Date, booking: Booking) => void;
    onBookingsCardClick: () => void;
    onRevenueCardClick: () => void;
}

/**
 * Converts a Date object to a 'YYYY-MM-DD' string in the local timezone.
 * This avoids timezone conversion issues that occur with toISOString().
 */
const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parses a 'YYYY-MM-DD' string into a Date object in the local timezone.
 * This avoids timezone issues where new Date('YYYY-MM-DD') is treated as UTC.
 */
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  // Month is 0-indexed in JavaScript Dates, so subtract 1.
  return new Date(year, month - 1, day);
};

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType; color: string; onClick?: () => void; }> = ({ title, value, icon: Icon, color, onClick }) => (
    <div onClick={onClick} className={`bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-1 transform ${onClick ? 'cursor-pointer' : ''}`}>
        <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-dark dark:text-white mt-1 break-all">{value}</p>
        </div>
        <div className={`text-white p-2 sm:p-3 rounded-full flex-shrink-0 ${color}`}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
    </div>
);

const UpcomingBookingRow: React.FC<{ booking: Booking; onClick: () => void }> = ({ booking, onClick }) => {
    const isPaid = booking.payment_status === PaymentStatus.PAID;
    return (
        <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors duration-200" onClick={onClick}>
            <td className="py-3 px-3 sm:px-4 text-sm text-gray-800 dark:text-gray-300">{parseLocalDate(booking.date).toLocaleDateString('en-GB')}</td>
            <td className="py-3 px-3 sm:px-4 text-sm text-gray-600 dark:text-gray-400">{booking.booking_type === 'full_day' ? 'Full Day' : booking.slots?.join(', ')}</td>
            <td className="py-3 px-3 sm:px-4 text-sm font-semibold text-gray-800 dark:text-gray-200">{booking.customer_name}</td>
            <td className="py-3 px-3 sm:px-4 text-sm text-gray-600 dark:text-gray-400">
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
            </td>
            <td className="py-3 px-3 sm:px-4 text-sm text-gray-800 dark:text-gray-300">{booking.payment_amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
            <td className="py-3 px-3 sm:px-4 text-sm">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${isPaid ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'}`}>
                    {booking.payment_status}
                </span>
            </td>
        </tr>
    );
};

const UpcomingBookingCard: React.FC<{ booking: Booking; onClick: () => void }> = ({ booking, onClick }) => {
    const isPaid = booking.payment_status === PaymentStatus.PAID;
    return (
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm border-l-4 border-brand-blue transition-all duration-300 hover:shadow-md transform hover:scale-[1.02] cursor-pointer" onClick={onClick}>
            <div className="flex justify-between items-start mb-2">
                <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-800 dark:text-gray-200 truncate">{booking.customer_name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
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
                <span className={`px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ml-2 ${isPaid ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'}`}>
                    {booking.payment_status}
                </span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <p><strong>Date:</strong> {parseLocalDate(booking.date).toLocaleDateString('en-GB')}</p>
                <p><strong>Time:</strong> {booking.booking_type === 'full_day' ? 'Full Day' : booking.slots?.join(', ')}</p>
                <p><strong>Amount:</strong> {booking.payment_amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</p>
            </div>
        </div>
    );
};

const DashboardView: React.FC<DashboardViewProps> = ({ bookings, openModal, onBookingsCardClick, onRevenueCardClick }) => {

    const stats = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const confirmedBookings = bookings.filter(b => b.status === 'confirmed');

        const bookingsThisMonth = confirmedBookings.filter(b => {
            const bookingDate = parseLocalDate(b.date);
            return bookingDate >= startOfMonth && bookingDate <= endOfMonth;
        });

        return {
            bookingsThisMonth: bookingsThisMonth.length,
            revenueThisMonth: bookingsThisMonth.reduce((acc, b) => acc + b.payment_amount, 0),
        };
    }, [bookings]);

    const upcomingBookings = useMemo(() => {
        const today = new Date();
        const todayStr = toLocalDateString(today);
        return bookings
            .filter(b => b.status === 'confirmed' && b.date >= todayStr)
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [bookings]);


    return (
        <div className="space-y-8 animate-slideInUp">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Dashboard Overview</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <StatCard title="Total Bookings This Month" value={stats.bookingsThisMonth} icon={Calendar} color="bg-blue-500" onClick={onBookingsCardClick} />
                <StatCard title="Revenue This Month" value={stats.revenueThisMonth.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })} icon={TrendingUp} color="bg-green-500" onClick={onRevenueCardClick} />
            </div>

            <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200 mb-3 sm:mb-4">Upcoming Bookings</h2>

                  <div className="hidden lg:block overflow-x-auto">
                     <table className="w-full min-w-[600px]">
                         <thead>
                             <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                 <th className="py-3 px-3 sm:px-4 font-semibold">Date</th>
                                 <th className="py-3 px-3 sm:px-4 font-semibold">Time</th>
                                 <th className="py-3 px-3 sm:px-4 font-semibold">Customer</th>
                                 <th className="py-3 px-3 sm:px-4 font-semibold">Details</th>
                                 <th className="py-3 px-3 sm:px-4 font-semibold">Payment</th>
                                 <th className="py-3 px-3 sm:px-4 font-semibold">Status</th>
                             </tr>
                         </thead>
                         <tbody>
                             {upcomingBookings.length > 0 ? (
                                 upcomingBookings.map(booking => <UpcomingBookingRow key={booking.id} booking={booking} onClick={() => openModal(parseLocalDate(booking.date), booking)} />)
                             ) : (
                                 <tr>
                                     <td colSpan={6} className="text-center py-10 text-gray-500 dark:text-gray-400">
                                         No upcoming bookings
                                     </td>
                                 </tr>
                             )}
                         </tbody>
                     </table>
                  </div>

                  <div className="lg:hidden space-y-3 sm:space-y-4">
                      {upcomingBookings.length > 0 ? (
                         upcomingBookings.map(booking => <UpcomingBookingCard key={booking.id} booking={booking} onClick={() => openModal(parseLocalDate(booking.date), booking)}/>)
                      ) : (
                         <p className="text-center py-8 sm:py-10 text-gray-500 dark:text-gray-400">No upcoming bookings</p>
                      )}
                  </div>
             </div>
        </div>
    );
};

export default DashboardView;