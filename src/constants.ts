import { Holiday } from './types';

export const INDIAN_HOLIDAYS_2024: Holiday[] = [
  { date: '2024-01-26', name: 'Republic Day' },
  { date: '2024-03-25', name: 'Holi' },
  { date: '2024-08-15', name: 'Independence Day' },
  { date: '2024-10-02', name: 'Gandhi Jayanti' },
  { date: '2024-11-01', name: 'Diwali' },
];

// Original hourly slots for Indoor Net Booking (unchanged)
const ORIGINAL_HOURLY_SLOTS: string[] = [
     '07:00 AM - 08:00 AM',
     '08:00 AM - 09:00 AM',
     '09:00 AM - 10:00 AM',
     '10:00 AM - 11:00 AM',
     '11:00 AM - 12:00 PM',
     '12:00 PM - 01:00 PM',
     '01:00 PM - 02:00 PM',
     '02:00 PM - 03:00 PM',
     '03:00 PM - 04:00 PM',
     '04:00 PM - 05:00 PM',
     '05:00 PM - 06:00 PM',
     '06:00 PM - 07:00 PM',
     '07:00 PM - 08:00 PM',
     '08:00 PM - 09:00 PM',
     '09:00 PM - 10:00 PM',
 ];

// New schedule for Ground Booking only
const GROUND_BOOKING_SLOTS: string[] = [
     '07:00 AM - 09:30 AM',
     '10:00 AM - 12:30 PM',
     '01:30 PM - 04:00 PM',
     '04:30 PM - 07:00 PM',
     '07:30 PM - 10:00 PM',
 ];

export const TIME_SLOTS: string[] = GROUND_BOOKING_SLOTS;

export const NET_TIME_SLOTS: string[] = ORIGINAL_HOURLY_SLOTS;