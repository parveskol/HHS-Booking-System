import { useState, useEffect, useCallback, useRef } from 'react';
import type { Booking } from '../types';
import { supabase } from '../supabaseClient';
import {
  fetchBookings,
  fetchBookingRequests,
  approveBookingRequest as apiApproveBookingRequest,
  rejectBookingRequest as apiRejectBookingRequest,
  deleteBookingRequest as apiDeleteBookingRequest,
  type BookingsBySystem,
} from '../api';

type UseBookingsResult = {
  bookings: BookingsBySystem;
  bookingRequests: BookingsBySystem;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  approveRequest: (id: number) => Promise<void>;
  rejectRequest: (id: number) => Promise<void>;
  deleteRequest: (id: number) => Promise<void>;
};

const emptyBySystem: BookingsBySystem = {
  ground: [] as Booking[],
  net: [] as Booking[],
};

/**
 * useBookings
 * Centralizes loading of bookings and booking requests and exposes helpers
 * to approve/reject/delete requests. This hook expects the API layer to
 * export:
 * - fetchBookings(): Promise<BookingsBySystem>
 * - fetchBookingRequests(): Promise<BookingsBySystem>
 * - approveBookingRequest(id: number): Promise<Booking>
 * - rejectBookingRequest(id: number): Promise<void>
 * - deleteBookingRequest(id: number): Promise<void>
 */
export default function useBookings(): UseBookingsResult {
  const [bookings, setBookings] = useState<BookingsBySystem>(emptyBySystem);
  const [bookingRequests, setBookingRequests] = useState<BookingsBySystem>(emptyBySystem);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs to track subscriptions
  const bookingsSubscriptionRef = useRef<any>(null);
  const requestsSubscriptionRef = useRef<any>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [bookingsRes, requestsRes] = await Promise.all([
        fetchBookings() as Promise<BookingsBySystem>,
        fetchBookingRequests() as Promise<BookingsBySystem>,
      ]);
      setBookings(bookingsRes);
      setBookingRequests(requestsRes);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    const setupRealtimeSubscriptions = () => {
      // Subscribe to bookings table changes
      bookingsSubscriptionRef.current = supabase
        .channel('bookings_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings'
          },
          (payload) => {
            console.log('📡 Real-time booking change:', payload);
            // Refresh data when bookings change
            refresh();
          }
        )
        .subscribe();

      // Subscribe to booking_requests table changes
      requestsSubscriptionRef.current = supabase
        .channel('booking_requests_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'booking_requests'
          },
          (payload) => {
            console.log('📡 Real-time booking request change:', payload);
            // Refresh data when booking requests change
            refresh();
          }
        )
        .subscribe();
    };

    // Initial load
    refresh();

    // Set up real-time subscriptions
    setupRealtimeSubscriptions();

    // Cleanup function
    return () => {
      if (bookingsSubscriptionRef.current) {
        supabase.removeChannel(bookingsSubscriptionRef.current);
      }
      if (requestsSubscriptionRef.current) {
        supabase.removeChannel(requestsSubscriptionRef.current);
      }
    };
  }, [refresh]);

  const approveRequest = useCallback(
    async (id: number) => {
      setError(null);
      try {
        await apiApproveBookingRequest(id);
        await refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Failed to approve booking request');
        throw e;
      }
    },
    [refresh]
  );

  const rejectRequest = useCallback(
    async (id: number) => {
      setError(null);
      try {
        await apiRejectBookingRequest(id);
        await refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Failed to reject booking request');
        throw e;
      }
    },
    [refresh]
  );

  const deleteRequest = useCallback(
    async (id: number) => {
      setError(null);
      try {
        await apiDeleteBookingRequest(id);
        await refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Failed to delete booking request');
        throw e;
      }
    },
    [refresh]
  );

  return {
    bookings,
    bookingRequests,
    isLoading,
    error,
    refresh,
    approveRequest,
    rejectRequest,
    deleteRequest,
  };
}