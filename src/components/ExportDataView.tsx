import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Booking } from '../types';
import { BookingSystem } from '../context/AppContext';

interface ExportDataViewProps {
    bookings: Booking[];
    system: BookingSystem;
}

const ExportDataView: React.FC<ExportDataViewProps> = ({ bookings, system }) => {
    const [dateFilter, setDateFilter] = useState<{start: string, end: string}>({start: '', end: ''});

    const downloadCSV = () => {
        let bookingsToExport = bookings;

        if (dateFilter.start && dateFilter.end) {
            bookingsToExport = bookings.filter(b => {
                return b.date >= dateFilter.start && b.date <= dateFilter.end;
            });
        }

        // Sort bookings by date before exporting
        bookingsToExport.sort((a, b) => a.date.localeCompare(b.date));
        
        if (bookingsToExport.length === 0) {
            alert("No bookings to export in the selected range.");
            return;
        }

        const headers = ["S.No", "Date", "System", "Type", "Slots", "Customer Name", "Contact", "Email", "Event/Indoor Net No.", "Payment Status", "Amount", "Notes"];
        const rows = bookingsToExport.map((b, index) => [
            index + 1,
            b.date,
            system.charAt(0).toUpperCase() + system.slice(1),
            b.booking_type,
            b.slots?.join('; ') || "N/A",
            `"${b.customer_name.replace(/"/g, '""')}"`,
            b.customer_contact,
            b.customer_email,
            `"${(b.event_type || (b.net_number ? (Array.isArray(b.net_number) ? b.net_number.map(net => `Net ${net}`).join(', ') : `Net ${b.net_number}`) : '')).replace(/"/g, '""')}"`,
            b.payment_status,
            b.payment_amount,
            `"${(b.notes || "").replace(/"/g, '""')}"`
        ].join(','));

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `harvard_house_${system}_bookings.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-slideInUp">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Export Data</h2>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm">
                <div className="max-w-xl">
                    <h3 className="text-lg font-semibold text-brand-dark dark:text-white">Download Booking Records for <span className="capitalize text-brand-orange">{system} Bookings</span></h3>
                    <p className="text-gray-600 dark:text-gray-300 mt-2">
                        Select a date range to download a targeted CSV file, or leave it blank to download all records.
                    </p>
                    <div className="mt-6 space-y-4">
                        <div>
                            <label htmlFor="exportStartDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                            <input 
                                id="exportStartDate"
                                type="date" 
                                value={dateFilter.start} 
                                onChange={e => setDateFilter(prev => ({...prev, start: e.target.value}))} 
                                className="mt-1 p-2 w-full sm:w-72 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition"
                            />
                        </div>
                        <div>
                            <label htmlFor="exportEndDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                            <input 
                                id="exportEndDate"
                                type="date" 
                                value={dateFilter.end} 
                                onChange={e => setDateFilter(prev => ({...prev, end: e.target.value}))} 
                                className="mt-1 p-2 w-full sm:w-72 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition"
                            />
                        </div>
                    </div>
                    <div className="mt-8">
                        <button
                            onClick={downloadCSV}
                            className="bg-brand-blue text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:bg-brand-dark transition-all transform hover:scale-105 flex items-center space-x-2"
                        >
                            <Download size={18} />
                            <span>Download CSV</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExportDataView;