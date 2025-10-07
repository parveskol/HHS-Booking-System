import React, { useContext, useMemo, useState, useEffect } from 'react';
import { AppContext, BookingSystem } from '../context/AppContext';
import { Booking, BookingType, Holiday, UserRole, BookingStatus, SpecialDate } from '../types';
import { INDIAN_HOLIDAYS_2024 } from '../constants';
import { ChevronLeft, ChevronRight, Plus, LayoutGrid, List, Check, X, Calendar } from 'lucide-react';

interface CalendarViewProps {
     bookings: Booking[];
     bookingRequests: Booking[];
     system: BookingSystem;
     openModal: (date: Date, booking?: Booking) => void;
     onApproveRequest?: (requestId: number, system: BookingSystem) => void;
     onRejectRequest?: (requestId: number, system: BookingSystem) => void;
     onManageSpecialDates?: () => void;
 }

type CalendarDisplayMode = 'grid' | 'list';

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

const CalendarView: React.FC<CalendarViewProps> = ({
    bookings,
    bookingRequests,
    openModal,
    system,
    onApproveRequest,
    onRejectRequest,
    onManageSpecialDates
}) => {
    const { user, specialDates } = useContext(AppContext);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<CalendarDisplayMode>('grid'); // Default to grid view for management

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setViewMode('grid'); // Default to grid view for mobile devices
            } else {
                setViewMode('grid');
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const holidaysMap = useMemo(() => {
        const map = new Map<string, Holiday>();
        INDIAN_HOLIDAYS_2024.forEach(h => map.set(h.date, h));
        return map;
    }, []);

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

    const bookingsByDate = useMemo(() => {
        const map = new Map<string, (Booking & { isRequest: boolean })[]>();
        // Add confirmed bookings
        bookings.forEach(b => {
            const dateStr = b.date;
            if (!map.has(dateStr)) {
                map.set(dateStr, []);
            }
            map.get(dateStr)!.push({ ...b, isRequest: false });
        });
        // Add booking requests
        bookingRequests.forEach(r => {
            const dateStr = r.date;
            if (!map.has(dateStr)) {
                map.set(dateStr, []);
            }
            map.get(dateStr)!.push({ ...r, isRequest: true });
        });
        return map;
    }, [bookings, bookingRequests]);

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDay = startOfMonth.getDay();
    const daysInMonth = endOfMonth.getDate();
    const days = Array.from({ length: startDay + daysInMonth }, (_, i) => {
        if (i < startDay) return null;
        return new Date(currentDate.getFullYear(), currentDate.getMonth(), i - startDay + 1);
    });

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const handleToday = () => setCurrentDate(new Date());
    
    const renderGridView = () => (
      <>
        <div className="grid grid-cols-7 text-center font-semibold text-gray-500 dark:text-gray-400 border-b dark:border-gray-700 pb-1 sm:pb-2 text-xs sm:text-base">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="py-1 sm:py-2 text-xs sm:text-base">{day}</div>)}
        </div>
        <div className="grid grid-cols-7 flex-grow">
            {days.map((day, index) => {
                if (!day) return <div key={`empty-${index}`} className="border-r border-b dark:border-gray-700"></div>;

                const dateStr = toLocalDateString(day);
                const dayOfWeek = day.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const isHoliday = holidaysMap.has(dateStr);
                const isSpecial = isSpecialDate(day);
                const isToday = day.toDateString() === new Date().toDateString();
                const dayBookings = bookingsByDate.get(dateStr) || [];

                return (
                    <div key={dateStr} className={`group border-r border-b dark:border-gray-700 p-0.5 sm:p-0.5 md:p-1 flex flex-col relative min-h-[3.5rem] sm:min-h-[4rem] md:min-h-[4rem] lg:min-h-[5rem] transition-colors ${isToday ? 'bg-brand-gold/20' : ''}`}>
                        <span className={`text-sm sm:text-sm md:text-sm font-bold ${(isWeekend || isHoliday || isSpecial) ? 'text-brand-orange' : 'text-gray-700 dark:text-gray-300'}`}>{day.getDate()}</span>
                        {isHoliday && <span className="text-xs text-red-500 truncate leading-tight">{holidaysMap.get(dateStr)?.name}</span>}
                        <div className="flex-grow flex flex-wrap gap-0.5 sm:gap-1 md:gap-1 justify-center">
                            {dayBookings.slice(0, 3).map(b => (
                                <div
                                    key={b.id}
                                    className={`h-2 w-2 sm:h-2 sm:w-2 md:h-2 md:w-2 rounded-full ${
                                        b.isRequest && b.status === BookingStatus.PENDING
                                            ? 'bg-yellow-400'
                                            : 'bg-brand-blue'
                                    }`}
                                    title={`${b.customer_name} - ${b.slots?.join(', ') || 'Full Day'}${b.isRequest ? ' (REQUEST)' : ''}`}
                                ></div>
                            ))}
                             {dayBookings.length > 3 && <div className="h-2 w-2 sm:h-2 sm:w-2 md:h-2 md:w-2 rounded-full bg-gray-400 text-xs flex items-center justify-center" title={`${dayBookings.length - 3} more...`}></div>}
                        </div>
                        {user?.role === UserRole.ADMIN && (
                            <button onClick={() => openModal(day)} className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 md:top-1 md:right-1 h-2 w-2 sm:h-6 sm:w-6 md:h-7 md:w-7 flex items-center justify-center opacity-60 text-brand-orange hover:text-brand-orange/80 sm:opacity-0 sm:group-hover:opacity-100 transition-all transform hover:scale-110 active:scale-95 touch-manipulation z-10">
                                <div className="flex items-center justify-center">
                                    <Plus size={6} className="sm:w-[12px] sm:h-[12px] md:w-[16px] md:h-[16px]" />
                                </div>
                            </button>
                        )}
                        {dayBookings.length > 0 && (
                            <div className="absolute top-6 sm:top-8 left-0 w-full p-0.5 sm:p-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-300 z-20">
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-1.5 sm:p-3 max-w-xs w-full border dark:border-gray-700">
                                    <h4 className="font-bold text-xs sm:text-sm mb-1 sm:mb-2 text-gray-800 dark:text-gray-200">{day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}</h4>
                                    <div className="space-y-0.5 sm:space-y-1 max-h-32 sm:max-h-40 overflow-y-auto">
                                        {dayBookings.map(b => (
                                            <div
                                                key={b.id}
                                                onClick={() => openModal(day, b)}
                                                className={`p-1 sm:p-1.5 rounded cursor-pointer text-xs sm:text-xs ${
                                                    b.isRequest && b.status === BookingStatus.PENDING
                                                        ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800'
                                                        : 'bg-brand-blue/10 dark:bg-brand-blue-light/20 text-brand-dark dark:text-gray-300 hover:bg-brand-blue/20 dark:hover:bg-brand-blue-light/40'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold truncate text-xs sm:text-sm">{b.customer_name} {b.isRequest && '(REQUEST)'}</p>
                                                        <p className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">{b.booking_type === BookingType.FULL_DAY ? 'Full Day' : b.slots?.join(', ')}</p>
                                                    </div>
                                                    {b.isRequest && b.status === BookingStatus.PENDING && onApproveRequest && onRejectRequest && user?.role === UserRole.ADMIN && (
                                                        <div className="flex gap-0.5 sm:gap-0.5 ml-1 sm:ml-1 flex-shrink-0">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onApproveRequest(b.id, system);
                                                                }}
                                                                className="p-1 sm:p-1 rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/70 flex items-center justify-center min-w-[24px] min-h-[24px] sm:min-w-[24px] sm:min-h-[24px]"
                                                                title="Approve Request"
                                                            >
                                                                <Check size={10} className="sm:w-[10px] sm:h-[10px]" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onRejectRequest(b.id, system);
                                                                }}
                                                                className="p-1 sm:p-1 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/70 flex items-center justify-center min-w-[24px] min-h-[24px] sm:min-w-[24px] sm:min-h-[24px]"
                                                                title="Reject Request"
                                                            >
                                                                <X size={10} className="sm:w-[10px] sm:h-[10px]" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
      </>
    );

    const renderListView = () => (
        <div className="space-y-2 sm:space-y-3">
            {days.filter(d => d).map(day => {
                if (!day) return null;
                const dateStr = toLocalDateString(day);
                const dayBookings = bookingsByDate.get(dateStr) || [];
                const isToday = day.toDateString() === new Date().toDateString();
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const holiday = holidaysMap.get(dateStr);
                const isSpecial = isSpecialDate(day);

                return (
                    <div key={dateStr} className={`p-3 sm:p-4 rounded-lg ${isToday ? 'bg-brand-gold/20' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className={`font-bold text-sm sm:text-base text-gray-800 dark:text-gray-200 ${(isWeekend || holiday || isSpecial) ? 'text-brand-orange' : ''}`}>
                                    {day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </p>
                                {holiday && <p className="text-xs text-red-500">{holiday.name}</p>}
                            </div>
                            {user?.role === UserRole.ADMIN && (
                                <button onClick={() => openModal(day)} className="h-3 w-3 sm:h-7 sm:w-7 flex items-center justify-center text-brand-orange hover:text-brand-orange/80 transition-all transform hover:scale-110">
                                    <div className="flex items-center justify-center">
                                        <Plus size={8} className="sm:w-[18px] sm:h-[18px]" />
                                    </div>
                                </button>
                            )}
                        </div>
                        <div className="mt-2 space-y-1.5 sm:space-y-2">
                             {dayBookings.length > 0 ? dayBookings.map(b => (
                                <div
                                    key={b.id}
                                    onClick={() => openModal(day, b)}
                                    className={`p-2 sm:p-2.5 rounded shadow-sm cursor-pointer ${
                                        b.isRequest && b.status === BookingStatus.PENDING
                                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400'
                                            : 'bg-white dark:bg-gray-800 border-l-4 border-brand-blue'
                                    }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-xs sm:text-sm text-gray-800 dark:text-gray-200 truncate">
                                                {b.customer_name} {b.isRequest && '(REQUEST)'}
                                            </p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                                {b.booking_type === BookingType.FULL_DAY ? 'Full Day' : b.slots?.join(', ')} - {(() => {
                                                    const netDisplay = b.net_number && (Array.isArray(b.net_number) ? b.net_number.length : b.net_number)
                                                        ? (Array.isArray(b.net_number)
                                                            ? b.net_number.map(net => `Net ${net}`).join(', ')
                                                            : `Net ${b.net_number}`)
                                                        : '';
                                                    return b.event_type
                                                        ? `${b.event_type}${netDisplay ? ` (${netDisplay})` : ''}`
                                                        : netDisplay || 'No details';
                                                })()}
                                            </p>
                                        </div>
                                        {b.isRequest && b.status === BookingStatus.PENDING && onApproveRequest && onRejectRequest && user?.role === UserRole.ADMIN && (
                                            <div className="flex gap-0.5 sm:gap-1 ml-2 flex-shrink-0">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onApproveRequest(b.id, system);
                                                    }}
                                                    className="p-0.5 sm:p-1 rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/70 flex items-center justify-center"
                                                    title="Approve Request"
                                                >
                                                    <Check size={10} className="sm:w-[12px] sm:h-[12px]" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onRejectRequest(b.id, system);
                                                    }}
                                                    className="p-0.5 sm:p-1 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/70 flex items-center justify-center"
                                                    title="Reject Request"
                                                >
                                                    <X size={10} className="sm:w-[12px] sm:h-[12px]" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <p className="text-xs text-gray-500 dark:text-gray-400">No bookings.</p>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    );

    const renderHeader = () => (
        <div className="flex flex-col sm:flex-row justify-between items-center mb-2 sm:mb-3 gap-2 sm:gap-3">
            <div className="text-lg sm:text-xl lg:text-2xl font-display font-bold text-brand-dark dark:text-white text-center sm:text-left">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 text-gray-700 dark:text-gray-300 w-full sm:w-auto justify-center sm:justify-end">
                {user?.role === UserRole.ADMIN && onManageSpecialDates && (
                    <button
                        onClick={onManageSpecialDates}
                        className="p-2 sm:p-2.5 rounded-full bg-gradient-to-r from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 hover:from-orange-200 hover:to-orange-300 dark:hover:from-orange-800/40 dark:hover:to-orange-700/40 transition-all transform hover:scale-110 active:scale-95 shadow-sm hover:shadow-md flex items-center justify-center min-w-[40px] min-h-[40px] sm:min-w-[40px] sm:min-h-[40px]"
                        title="Manage Special Dates"
                    >
                        <Calendar size={16} className="sm:w-4 sm:h-4 text-brand-orange" />
                    </button>
                )}
                <button onClick={handlePrevMonth} className="p-1.5 sm:p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center min-w-[36px] min-h-[36px] sm:min-w-[32px] sm:min-h-[32px]">
                    <ChevronLeft size={16} className="sm:w-4 sm:h-4" />
                </button>
                <button onClick={handleToday} className="px-3 py-1.5 text-xs sm:text-xs font-semibold rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-w-[50px]">
                    Today
                </button>
                <button onClick={handleNextMonth} className="p-1.5 sm:p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center min-w-[36px] min-h-[36px] sm:min-w-[32px] sm:min-h-[32px]">
                    <ChevronRight size={16} className="sm:w-4 sm:h-4" />
                </button>
                <div className="ml-1 sm:ml-2 border-l dark:border-gray-600 pl-1 sm:pl-2 flex space-x-0.5 sm:space-x-1">
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 sm:p-1.5 rounded-lg flex items-center justify-center min-w-[32px] min-h-[32px] sm:min-w-[32px] sm:min-h-[32px] ${viewMode === 'grid' ? 'bg-brand-blue/10 text-brand-blue dark:bg-brand-blue-light/20 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                        <LayoutGrid size={14} className="sm:w-4 sm:h-4" />
                    </button>
                    <button onClick={() => setViewMode('list')} className={`p-1.5 sm:p-1.5 rounded-lg flex items-center justify-center min-w-[32px] min-h-[32px] sm:min-w-[32px] sm:min-h-[32px] ${viewMode === 'list' ? 'bg-brand-blue/10 text-brand-blue dark:bg-brand-blue-light/20 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                        <List size={14} className="sm:w-4 sm:h-4" />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderBottomBar = () => (
        <div className="flex items-center justify-center space-x-1 text-gray-700 dark:text-gray-300 mt-2 sm:mt-3">
            <button onClick={handlePrevMonth} className="p-1 sm:p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center">
                <ChevronLeft size={16} className="sm:w-4 sm:h-4" />
            </button>
            <button onClick={handleToday} className="px-2 py-1 text-xs font-semibold rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                Today
            </button>
            <button onClick={handleNextMonth} className="p-1 sm:p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center">
                <ChevronRight size={16} className="sm:w-4 sm:h-4" />
            </button>
            <div className="ml-1 border-l dark:border-gray-600 pl-1 flex space-x-0.5">
                <button onClick={() => setViewMode('grid')} className={`p-1 sm:p-1.5 rounded-lg flex items-center justify-center ${viewMode === 'grid' ? 'bg-brand-blue/10 text-brand-blue dark:bg-brand-blue-light/20 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                    <LayoutGrid size={14} className="sm:w-4 sm:h-4" />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-1 sm:p-1.5 rounded-lg flex items-center justify-center ${viewMode === 'list' ? 'bg-brand-blue/10 text-brand-blue dark:bg-brand-blue-light/20 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                    <List size={14} className="sm:w-4 sm:h-4" />
                </button>
            </div>
        </div>
    );

    return (
        <div className="p-1 sm:p-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg h-full flex flex-col">
            {viewMode === 'grid' ? (
                <>
                    {renderHeader()}
                    <div className="flex-grow">
                        {renderGridView()}
                    </div>
                    {window.innerWidth < 768 && renderBottomBar()}
                </>
            ) : (
                <>
                    {renderHeader()}
                    <div className="flex-grow overflow-y-auto">
                        {renderListView()}
                    </div>
                    {renderBottomBar()}
                </>
            )}
        </div>
    );
};

export default CalendarView;