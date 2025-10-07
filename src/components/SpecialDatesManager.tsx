import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { SpecialDate } from '../types';
import { X, Plus, Calendar, Trash2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface SpecialDatesManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

const SpecialDatesManager: React.FC<SpecialDatesManagerProps> = ({ isOpen, onClose }) => {
    const { specialDates, addSpecialDate, removeSpecialDate, user } = useContext(AppContext);
    const [mode, setMode] = useState<'single' | 'range'>('single');
    const [newDate, setNewDate] = useState('');
    const [newStartDate, setNewStartDate] = useState('');
    const [newEndDate, setNewEndDate] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [dateToDelete, setDateToDelete] = useState<string | null>(null);
    const [rangeToDelete, setRangeToDelete] = useState<{ start: string; end: string } | null>(null);

    // Validation functions
    const validateSingleDate = (dateString: string): string | null => {
        if (!dateString) return 'Date is required';

        const selectedDate = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            return 'Cannot select past dates';
        }

        // Check if date already exists (single date or part of range)
        const dateExists = specialDates.some(sd => {
            if (sd.date === dateString) return true;
            if (sd.start_date && sd.end_date) {
                const start = new Date(sd.start_date);
                const end = new Date(sd.end_date);
                return selectedDate >= start && selectedDate <= end;
            }
            return false;
        });

        if (dateExists) {
            return 'This date is already marked as special';
        }

        return null;
    };

    const validateDateRange = (startDateString: string, endDateString: string): string | null => {
        if (!startDateString) return 'Start date is required';
        if (!endDateString) return 'End date is required';

        const startDate = new Date(startDateString);
        const endDate = new Date(endDateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (startDate < today) {
            return 'Cannot select past start dates';
        }

        if (endDate < today) {
            return 'Cannot select past end dates';
        }

        if (endDate < startDate) {
            return 'End date cannot be before start date';
        }

        // Check if date range is too large (more than 1 year)
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 365) {
            return 'Date range cannot exceed 365 days';
        }

        // Check for overlapping ranges
        const hasOverlap = specialDates.some(sd => {
            if (sd.start_date && sd.end_date) {
                const existingStart = new Date(sd.start_date);
                const existingEnd = new Date(sd.end_date);
                // Check for overlap: ranges overlap if start1 <= end2 AND start2 <= end1
                return startDate <= existingEnd && endDate >= existingStart;
            } else if (sd.date) {
                const existingDate = new Date(sd.date);
                return existingDate >= startDate && existingDate <= endDate;
            }
            return false;
        });

        if (hasOverlap) {
            return 'This date range overlaps with an existing special date or range';
        }

        return null;
    };

    const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const handleAddSpecialDate = async () => {
        if (!user) return;

        let validationError: string | null = null;

        if (mode === 'single') {
            if (!newDate) return;
            validationError = validateSingleDate(newDate);
        } else {
            if (!newStartDate || !newEndDate) return;
            validationError = validateDateRange(newStartDate, newEndDate);
        }

        if (validationError) {
            showMessage('error', validationError);
            return;
        }

        setIsSubmitting(true);
        try {
            if (mode === 'single') {
                await addSpecialDate(newDate, newDescription.trim() || undefined, false);
                setNewDate('');
                setNewDescription('');
                showMessage('success', `Special date added successfully for ${new Date(newDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`);
            } else {
                await addSpecialDate(newStartDate, newEndDate, true);
                setNewStartDate('');
                setNewEndDate('');
                setNewDescription('');
                const startFormatted = new Date(newStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
                const endFormatted = new Date(newEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                showMessage('success', `Special date range added successfully from ${startFormatted} to ${endFormatted}`);
            }
        } catch (error) {
            console.error('Error adding special date:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to add special date. Please try again.';
            showMessage('error', errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveSpecialDate = async (date: string) => {
        if (!user) return;

        // Show confirmation dialog
        setDateToDelete(date);
    };

    const confirmRemoveSpecialDate = async () => {
        if (!dateToDelete || !user) return;

        try {
            await removeSpecialDate(dateToDelete);
            showMessage('success', `Special date removed successfully`);
            setDateToDelete(null);
        } catch (error) {
            console.error('Error removing special date:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to remove special date. Please try again.';
            showMessage('error', errorMessage);
        }
    };

    const cancelRemoveSpecialDate = () => {
        setDateToDelete(null);
    };

    const handleRemoveSpecialDateRange = async () => {
        if (!rangeToDelete || !user) return;

        try {
            await removeSpecialDate(rangeToDelete.start, rangeToDelete.end);
            showMessage('success', `Special date range removed successfully`);
            setRangeToDelete(null);
        } catch (error) {
            console.error('Error removing special date range:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to remove special date range. Please try again.';
            showMessage('error', errorMessage);
        }
    };

    const cancelRemoveSpecialDateRange = () => {
        setRangeToDelete(null);
    };


    // Handle Enter key for form submission
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isSubmitting) {
            handleAddSpecialDate();
        }
    };

    // Get validation error for current mode
    const getCurrentValidationError = (): string | null => {
        if (mode === 'single') {
            return newDate ? validateSingleDate(newDate) : null;
        } else {
            return newStartDate && newEndDate ? validateDateRange(newStartDate, newEndDate) : null;
        }
    };

    // Check if form is valid for current mode
    const isFormValid = (): boolean => {
        if (mode === 'single') {
            return !!(newDate && !validateSingleDate(newDate) && !isSubmitting);
        } else {
            return !!(newStartDate && newEndDate && !validateDateRange(newStartDate, newEndDate) && !isSubmitting);
        }
    };

    const formatDateForDisplay = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatSpecialDateForDisplay = (specialDate: SpecialDate) => {
        if (specialDate.start_date && specialDate.end_date) {
            const start = new Date(specialDate.start_date);
            const end = new Date(specialDate.end_date);
            const startFormatted = start.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short'
            });
            const endFormatted = end.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            return `${startFormatted} - ${endFormatted}`;
        } else if (specialDate.date) {
            return formatDateForDisplay(specialDate.date);
        }
        return 'Invalid Date';
    };

    const formatDateForInput = (dateString: string) => {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                    <div>
                        <h2 className="text-lg font-bold text-brand-dark dark:text-white flex items-center gap-2">
                            <div className="p-1.5 bg-brand-orange/10 dark:bg-brand-orange/20 rounded-lg">
                                <Calendar size={20} className="text-brand-orange" />
                            </div>
                            Manage Special Dates
                        </h2>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            Add dates for full availability like weekends
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all transform hover:scale-110 active:scale-95"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-3 flex-grow overflow-y-auto">
                    {/* Status Messages */}
                    {message && (
                        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                            message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                            message.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                            'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                        }`}>
                            {message.type === 'success' ? <CheckCircle size={16} className="text-green-600 dark:text-green-400" /> :
                             message.type === 'error' ? <AlertCircle size={16} className="text-red-600 dark:text-red-400" /> :
                             <AlertCircle size={16} className="text-blue-600 dark:text-blue-400" />}
                            <span className={`text-sm ${
                                message.type === 'success' ? 'text-green-700 dark:text-green-300' :
                                message.type === 'error' ? 'text-red-700 dark:text-red-300' :
                                'text-blue-700 dark:text-blue-300'
                            }`}>
                                {message.text}
                            </span>
                        </div>
                    )}

                    {/* Add new special date form */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-600/50 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-600">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                            <Plus size={16} className="text-brand-orange" />
                            Add Special Date
                        </h3>

                        {/* Mode Toggle */}
                        <div className="mb-4">
                            <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                                <button
                                    type="button"
                                    onClick={() => setMode('single')}
                                    className={`flex-1 py-2 px-3 text-sm rounded-md transition-all ${
                                        mode === 'single'
                                            ? 'bg-white dark:bg-gray-600 text-brand-orange shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                    }`}
                                >
                                    Single Date
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode('range')}
                                    className={`flex-1 py-2 px-3 text-sm rounded-md transition-all ${
                                        mode === 'range'
                                            ? 'bg-white dark:bg-gray-600 text-brand-orange shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                    }`}
                                >
                                    Date Range
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {mode === 'single' ? (
                                /* Single Date Mode */
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Date * <span className="text-gray-500 dark:text-gray-400">(Future dates only)</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={newDate}
                                        onChange={(e) => setNewDate(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        className={`w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent text-sm transition-colors ${
                                            newDate && validateSingleDate(newDate) ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-500'
                                        }`}
                                        min={new Date().toISOString().split('T')[0]}
                                        required
                                    />
                                    {newDate && validateSingleDate(newDate) && (
                                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                            <AlertCircle size={12} />
                                            {validateSingleDate(newDate)}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                /* Date Range Mode */
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Start Date *
                                            </label>
                                            <input
                                                type="date"
                                                value={newStartDate}
                                                onChange={(e) => setNewStartDate(e.target.value)}
                                                onKeyPress={handleKeyPress}
                                                className={`w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent text-sm transition-colors ${
                                                    newStartDate && validateDateRange(newStartDate, newEndDate) ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-500'
                                                }`}
                                                min={new Date().toISOString().split('T')[0]}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                End Date *
                                            </label>
                                            <input
                                                type="date"
                                                value={newEndDate}
                                                onChange={(e) => setNewEndDate(e.target.value)}
                                                onKeyPress={handleKeyPress}
                                                className={`w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent text-sm transition-colors ${
                                                    newEndDate && validateDateRange(newStartDate, newEndDate) ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-500'
                                                }`}
                                                min={newStartDate || new Date().toISOString().split('T')[0]}
                                                required
                                            />
                                        </div>
                                    </div>
                                    {newStartDate && newEndDate && validateDateRange(newStartDate, newEndDate) && (
                                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                            <AlertCircle size={12} />
                                            {validateDateRange(newStartDate, newEndDate)}
                                        </p>
                                    )}
                                    {newStartDate && newEndDate && !validateDateRange(newStartDate, newEndDate) && (
                                        <p className="text-blue-600 dark:text-blue-400 text-xs mt-1 flex items-center gap-1">
                                            <Calendar size={12} />
                                            Range: {Math.ceil((new Date(newEndDate).getTime() - new Date(newStartDate).getTime()) / (1000 * 60 * 60 * 24))} days
                                        </p>
                                    )}
                                </>
                            )}

                            {/* Description field (only for single dates) */}
                            {mode === 'single' && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Description <span className="text-gray-500 dark:text-gray-400">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newDescription}
                                        onChange={(e) => setNewDescription(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="e.g., Company event, Holiday, etc."
                                        className="w-full p-2 border border-gray-300 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent text-sm transition-colors"
                                    />
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleAddSpecialDate}
                            disabled={!isFormValid()}
                            className="mt-3 w-full bg-brand-orange text-white py-2.5 px-4 rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    {mode === 'single' ? 'Adding Special Date...' : 'Adding Date Range...'}
                                </>
                            ) : (
                                <>
                                    <Plus size={14} />
                                    {mode === 'single' ? 'Add Special Date' : 'Add Date Range'}
                                </>
                            )}
                        </button>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                            💡 {mode === 'single' ? 'Special dates' : 'Date ranges'} will be treated like weekends with all slots available
                        </p>
                    </div>

                    {/* Existing special dates list */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-sm">
                        <div className="p-4 border-b dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                <Calendar size={16} className="text-brand-orange" />
                                Current Special Dates ({specialDates.length})
                            </h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                These dates will be treated like weekends with all slots available for full day bookings
                            </p>
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                            {specialDates.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Calendar size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">No special dates configured</p>
                                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Add your first special date above</p>
                                </div>
                            ) : (
                                <div className="divide-y dark:divide-gray-700">
                                    {specialDates
                                        .sort((a, b) => {
                                            // Sort by start date, handling both single dates and ranges
                                            const aDate = a.start_date || a.date || '';
                                            const bDate = b.start_date || b.date || '';
                                            return aDate.localeCompare(bDate);
                                        })
                                        .map((specialDate) => {
                                            const isRange = !!(specialDate.start_date && specialDate.end_date);
                                            return (
                                                <div key={specialDate.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-grow">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <div className="font-semibold text-gray-800 dark:text-gray-200">
                                                                    {formatSpecialDateForDisplay(specialDate)}
                                                                </div>
                                                                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                                                    isRange
                                                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                                        : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                                                }`}>
                                                                    {isRange ? 'Date Range' : 'Special Day'}
                                                                </span>
                                                            </div>
                                                            {specialDate.description && (
                                                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                                                                    <span className="text-xs">📝</span>
                                                                    {specialDate.description}
                                                                </div>
                                                            )}
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                                <span>Added: {new Date(specialDate.created_at).toLocaleDateString('en-GB', {
                                                                    day: 'numeric',
                                                                    month: 'short',
                                                                    year: 'numeric'
                                                                })}</span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                if (isRange && specialDate.start_date && specialDate.end_date) {
                                                                    setRangeToDelete({ start: specialDate.start_date, end: specialDate.end_date });
                                                                } else if (specialDate.date) {
                                                                    handleRemoveSpecialDate(specialDate.date);
                                                                }
                                                            }}
                                                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all transform hover:scale-110 active:scale-95 opacity-0 group-hover:opacity-100"
                                                            title={`Remove special ${isRange ? 'date range' : 'date'}`}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 py-2.5 px-4 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors font-medium"
                        >
                            Close
                        </button>
                        {specialDates.length > 0 && (
                            <button
                                onClick={() => showMessage('info', `Total special dates: ${specialDates.length}. These dates provide full availability like weekends.`)}
                                className="flex-1 bg-blue-500 text-white py-2.5 px-4 rounded-lg text-sm hover:bg-blue-600 transition-colors font-medium"
                            >
                                View Summary
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog for Single Date Deletion */}
            {dateToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-2 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-sm">
                        <div className="p-4 border-b dark:border-gray-700">
                            <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                <AlertCircle size={18} className="text-red-500" />
                                Confirm Deletion
                            </h3>
                        </div>
                        <div className="p-4">
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                                Are you sure you want to remove this special date?
                                <br />
                                <span className="font-medium text-gray-800 dark:text-gray-200">
                                    {dateToDelete && formatDateForDisplay(dateToDelete)}
                                </span>
                                <br />
                                This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={cancelRemoveSpecialDate}
                                    className="flex-1 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 py-2 px-3 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmRemoveSpecialDate}
                                    className="flex-1 bg-red-500 text-white py-2 px-3 rounded text-sm hover:bg-red-600 transition-colors"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog for Date Range Deletion */}
            {rangeToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-2 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-sm">
                        <div className="p-4 border-b dark:border-gray-700">
                            <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                <AlertCircle size={18} className="text-red-500" />
                                Confirm Deletion
                            </h3>
                        </div>
                        <div className="p-4">
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                                Are you sure you want to remove this special date range?
                                <br />
                                <span className="font-medium text-gray-800 dark:text-gray-200">
                                    {rangeToDelete && `${formatDateForDisplay(rangeToDelete.start)} - ${formatDateForDisplay(rangeToDelete.end)}`}
                                </span>
                                <br />
                                This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={cancelRemoveSpecialDateRange}
                                    className="flex-1 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 py-2 px-3 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRemoveSpecialDateRange}
                                    className="flex-1 bg-red-500 text-white py-2 px-3 rounded text-sm hover:bg-red-600 transition-colors"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpecialDatesManager;