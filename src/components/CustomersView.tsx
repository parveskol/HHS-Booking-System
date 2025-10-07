import React, { useMemo, useState } from 'react';
import { Booking } from '../types';
import { User, Phone, Mail, Hash, DollarSign, Calendar, Download, Search, ArrowUpDown } from 'lucide-react';

interface CustomersViewProps {
    bookings: Booking[];
}

interface CustomerSummary {
    name: string;
    contact: string;
    email: string;
    totalBookings: number;
    totalSpent: number;
    lastBookingDate: Date;
    lastBooking: string;
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

const CustomerCard: React.FC<{ customer: CustomerSummary }> = ({ customer }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border-l-4 border-brand-blue">
        <p className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2"><User size={16}/> {customer.name}</p>
        <div className="border-t dark:border-gray-700 my-2"></div>
        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <p className="flex items-center gap-2"><Phone size={14}/> {customer.contact}</p>
            <p className="flex items-center gap-2 truncate"><Mail size={14}/> {customer.email}</p>
            <p className="flex items-center gap-2"><Hash size={14}/> {customer.totalBookings} Bookings</p>
            <p className="flex items-center gap-2"><DollarSign size={14}/> {customer.totalSpent.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} Total Spent</p>
            <p className="flex items-center gap-2"><Calendar size={14}/> Last Booking: {customer.lastBooking}</p>
        </div>
    </div>
);


const CustomersView: React.FC<CustomersViewProps> = ({ bookings }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof CustomerSummary, direction: 'asc' | 'desc' } | null>({ key: 'totalSpent', direction: 'desc' });

    const customers = useMemo(() => {
        const customerMap = new Map<string, { name: string; email: string; bookings: Booking[] }>();
        
        bookings.forEach(booking => {
            const key = booking.customer_contact;
            if (!customerMap.has(key)) {
                customerMap.set(key, { name: booking.customer_name, email: booking.customer_email, bookings: [] });
            }
            customerMap.get(key)!.bookings.push(booking);
        });

        let summaries: CustomerSummary[] = Array.from(customerMap.entries()).map(([contact, data]) => {
            const sortedBookings = data.bookings.sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
            const lastBookingDate = parseLocalDate(sortedBookings[0].date);
            return {
                contact,
                name: data.name,
                email: data.email,
                totalBookings: data.bookings.length,
                totalSpent: data.bookings.reduce((sum, b) => sum + b.payment_amount, 0),
                lastBookingDate: lastBookingDate,
                lastBooking: lastBookingDate.toLocaleDateString('en-GB'),
            };
        });
        
        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            summaries = summaries.filter(c => 
                c.name.toLowerCase().includes(lowercasedQuery) ||
                c.contact.toLowerCase().includes(lowercasedQuery) ||
                (c.email && c.email.toLowerCase().includes(lowercasedQuery))
            );
        }

        if (sortConfig) {
            summaries.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                
                if (aValue instanceof Date && bValue instanceof Date) {
                    return sortConfig.direction === 'asc' ? aValue.getTime() - bValue.getTime() : bValue.getTime() - aValue.getTime();
                }
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
                }
                const strA = String(aValue).toLowerCase();
                const strB = String(bValue).toLowerCase();
                if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return summaries;
    }, [bookings, searchQuery, sortConfig]);

    const allCustomersForExport = useMemo(() => {
        const customerMap = new Map<string, { name: string; email: string; bookings: Booking[] }>();
        bookings.forEach(booking => {
            const key = booking.customer_contact;
            if (!customerMap.has(key)) {
                customerMap.set(key, { name: booking.customer_name, email: booking.customer_email, bookings: [] });
            }
            customerMap.get(key)!.bookings.push(booking);
        });
        return Array.from(customerMap.entries()).map(([contact, data]) => {
            const sortedBookings = data.bookings.sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
            return {
                contact, name: data.name, email: data.email,
                totalBookings: data.bookings.length,
                totalSpent: data.bookings.reduce((sum, b) => sum + b.payment_amount, 0),
                lastBooking: parseLocalDate(sortedBookings[0].date).toLocaleDateString('en-GB'),
            };
        });
    }, [bookings]);

    const downloadCustomerCSV = () => {
        if (allCustomersForExport.length === 0) {
            alert("No customer data to export.");
            return;
        }

        const headers = ["Name", "Contact", "Email", "Total Bookings", "Total Spent", "Last Booking Date"];
        const rows = allCustomersForExport.map(c => [
            `"${c.name.replace(/"/g, '""')}"`, c.contact, c.email,
            c.totalBookings, c.totalSpent, c.lastBooking
        ].join(','));

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `harvard_house_customers.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const requestSort = (key: keyof CustomerSummary) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };
  
    const SortableHeader: React.FC<{ sortKey: keyof CustomerSummary, children: React.ReactNode }> = ({ sortKey, children }) => (
        <th className="py-3 px-4 font-semibold">
            <button onClick={() => requestSort(sortKey)} className="flex items-center space-x-1 hover:text-brand-blue dark:hover:text-brand-orange">
                <span>{children}</span>
                <ArrowUpDown size={14} />
            </button>
        </th>
    );

    return (
        <div className="space-y-6 animate-slideInUp">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Customer Management</h2>
                <button
                    onClick={downloadCustomerCSV}
                    disabled={allCustomersForExport.length === 0}
                    className="bg-brand-blue text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-brand-dark transition-all transform hover:scale-105 flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100"
                >
                    <Download size={16} />
                    <span>Export Customers</span>
                </button>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                        type="text"
                        placeholder="Search by name, contact, email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                    />
                </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden hidden md:block">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                <SortableHeader sortKey="name">Customer Name</SortableHeader>
                                <SortableHeader sortKey="contact">Contact</SortableHeader>
                                <SortableHeader sortKey="email">Email</SortableHeader>
                                <SortableHeader sortKey="totalBookings">Total Bookings</SortableHeader>
                                <SortableHeader sortKey="totalSpent">Total Spent</SortableHeader>
                                <SortableHeader sortKey="lastBookingDate">Last Booking Date</SortableHeader>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {customers.map(customer => (
                                <tr key={customer.contact} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="py-3 px-4 text-sm font-semibold text-gray-800 dark:text-gray-200">{customer.name}</td>
                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{customer.contact}</td>
                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">{customer.email}</td>
                                    <td className="py-3 px-4 text-sm text-center text-gray-800 dark:text-gray-300">{customer.totalBookings}</td>
                                    <td className="py-3 px-4 text-sm font-medium text-gray-800 dark:text-gray-200">{customer.totalSpent.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{customer.lastBooking}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {customers.length === 0 && (
                         <p className="text-center py-10 text-gray-500 dark:text-gray-400">No customers found.</p>
                    )}
                </div>
            </div>

            <div className="md:hidden space-y-4">
                {customers.length > 0 ? (
                    customers.map(customer => <CustomerCard key={customer.contact} customer={customer} />)
                ) : (
                    <p className="text-center py-10 text-gray-500 dark:text-gray-400">No customers found.</p>
                )}
            </div>
        </div>
    );
};

export default CustomersView;