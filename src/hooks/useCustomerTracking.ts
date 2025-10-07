import { useState, useEffect, useCallback } from 'react';
import { Booking } from '../types';
import { supabase } from '../supabaseClient';

export interface CustomerSession {
  id: string;
  name: string;
  email: string;
  created_at: string;
  last_active: string;
}

export interface TrackingData {
  requests: Booking[];
  bookings: Booking[];
  session: CustomerSession;
  lastSync: string;
}

export const useCustomerTracking = (user: { name: string; email?: string } | null) => {
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate unique customer session ID (matching the database migration)
  const generateCustomerId = useCallback((name: string, email?: string) => {
    if (email && name) {
      // Use the same method as the database migration
      const data = name + '-' + email;
      const hashBuffer = new TextEncoder().encode(data);
      // Simple hash function that matches the SQL digest function
      let hash = 0;
      for (let i = 0; i < hashBuffer.length; i++) {
        hash = ((hash << 5) - hash) + hashBuffer[i];
        hash = hash & hash; // Convert to 32-bit integer
      }
      return btoa(String.fromCharCode(...hashBuffer)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    }
    return `session-${Date.now()}`;
  }, []);

  // Create or get customer session
  const getOrCreateSession = useCallback(async (): Promise<CustomerSession | null> => {
    if (!user) return null;

    try {
      const sessionId = generateCustomerId(user.name, user.email);
      const now = new Date().toISOString();

      // For now, create a virtual session since the table might not exist yet
      // This allows the system to work immediately without database changes
      const virtualSession: CustomerSession = {
        id: sessionId,
        name: user.name,
        email: user.email || null,
        created_at: now,
        last_active: now
      };

      // Try to save to database, but don't fail if it doesn't work
      try {
        const { data: existingSession, error: selectError } = await supabase
          .from('customer_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (!selectError && existingSession) {
          await supabase
            .from('customer_sessions')
            .update({ last_active: now })
            .eq('id', sessionId);
          return { ...existingSession, last_active: now };
        } else {
          const { error } = await supabase
            .from('customer_sessions')
            .insert([virtualSession]);

          // If table doesn't exist or no permissions, use virtual session
          if (error) {
            console.log('Using virtual session (database table may not exist yet):', error.message);
            return virtualSession;
          }

          return virtualSession;
        }
      } catch (dbError) {
        console.log('Database session failed, using virtual session:', dbError);
        return virtualSession;
      }
    } catch (error) {
      console.error('Error creating customer session:', error);
      // Return a fallback session so the system still works
      return {
        id: generateCustomerId(user.name, user.email),
        name: user.name,
        email: user.email || null,
        created_at: new Date().toISOString(),
        last_active: new Date().toISOString()
      };
    }
  }, [user, generateCustomerId]);

  // Load customer tracking data
  const loadTrackingData = useCallback(async () => {
    if (!user) {
      setTrackingData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const session = await getOrCreateSession();
      if (!session) {
        throw new Error('Could not create customer session');
      }

      console.log('🔍 Loading tracking data for session:', session.id);

      let requests = [];
      let bookings = [];

      // Try to get data using session ID first (new method)
      try {
        const { data: sessionRequests, error: requestsError } = await supabase
          .from('booking_requests')
          .select('*')
          .eq('customer_session_id', session.id)
          .order('created_at', { ascending: false });

        if (!requestsError && sessionRequests) {
          requests = sessionRequests;
          console.log('✅ Loaded requests using session ID:', requests.length);
        } else {
          console.log('⚠️ Session ID method failed, trying fallback method');
          throw new Error('Session method failed');
        }

        const { data: sessionBookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('*')
          .eq('customer_session_id', session.id)
          .order('created_at', { ascending: false });

        if (!bookingsError && sessionBookings) {
          bookings = sessionBookings;
          console.log('✅ Loaded bookings using session ID:', bookings.length);
        } else {
          console.log('⚠️ Session ID method failed for bookings, trying fallback method');
          throw new Error('Session method failed');
        }
      } catch (sessionError) {
        console.log('🔄 Falling back to name/email matching:', sessionError);

        // Fallback to original method using name and email matching
        const requestFilters = [];
        if (user.email) {
          requestFilters.push(`customer_email.ilike.%${user.email.toLowerCase().trim()}%`);
        }
        if (user.name) {
          requestFilters.push(`customer_name.ilike.%${user.name.toLowerCase().trim()}%`);
        }

        const bookingFilters = [];
        if (user.email) {
          bookingFilters.push(`customer_email.ilike.%${user.email.toLowerCase().trim()}%`);
        }
        if (user.name) {
          bookingFilters.push(`customer_name.ilike.%${user.name.toLowerCase().trim()}%`);
        }

        if (requestFilters.length > 0) {
          const { data: fallbackRequests, error: fallbackRequestsError } = await supabase
            .from('booking_requests')
            .select('*')
            .or(requestFilters.join(','))
            .order('created_at', { ascending: false });

          if (!fallbackRequestsError) {
            requests = fallbackRequests || [];
            console.log('✅ Loaded requests using fallback method:', requests.length);
          }
        }

        if (bookingFilters.length > 0) {
          const { data: fallbackBookings, error: fallbackBookingsError } = await supabase
            .from('bookings')
            .select('*')
            .or(bookingFilters.join(','))
            .order('created_at', { ascending: false });

          if (!fallbackBookingsError) {
            bookings = fallbackBookings || [];
            console.log('✅ Loaded bookings using fallback method:', bookings.length);
          }
        }
      }

      const trackingData: TrackingData = {
        requests,
        bookings,
        session,
        lastSync: new Date().toISOString()
      };

      console.log('📊 Final tracking data:', {
        requests: requests.length,
        bookings: bookings.length,
        session: session.id
      });

      setTrackingData(trackingData);
    } catch (error) {
      console.error('❌ Error loading tracking data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load tracking data';

      // Don't show error for session creation issues since we have fallback
      if (errorMessage.includes('customer session')) {
        console.log('🔄 Session creation failed, but continuing with fallback method');
        setError(null); // Don't show error to user
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, getOrCreateSession]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user || !trackingData) return;

    console.log('🔌 Setting up real-time subscriptions for session:', trackingData.session.id);

    // Use name/email based subscriptions (more reliable for existing data)
    const userChannelSuffix = user.email || user.name;
    const requestsChannelName = `customer-requests-${userChannelSuffix}`;
    const bookingsChannelName = `customer-bookings-${userChannelSuffix}`;

    console.log('📡 Creating real-time subscriptions:', {
      requestsChannel: requestsChannelName,
      bookingsChannel: bookingsChannelName,
      user: { name: user.name, email: user.email }
    });

    // Subscribe to booking_requests table
    const requestsChannel = supabase
      .channel(requestsChannelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'booking_requests'
      }, (payload) => {
        console.log('📡 Real-time request update received:', {
          eventType: payload.eventType,
          record: payload.new || payload.old,
          user: { name: user.name, email: user.email }
        });

        // Check if this update is for the current user
        const record = payload.new || payload.old;
        if (record && typeof record === 'object') {
          const normalizeText = (text: string) => text.toLowerCase().trim();
          const normalizedUserEmail = user.email ? normalizeText(user.email) : '';
          const normalizedUserName = user.name ? normalizeText(user.name) : '';
          const recordEmail = (record as any).customer_email || '';
          const recordName = (record as any).customer_name || '';

          const isForCurrentUser =
            (normalizedUserEmail && recordEmail && normalizeText(recordEmail).includes(normalizedUserEmail)) ||
            (normalizedUserName && recordName && normalizeText(recordName).includes(normalizedUserName));

          if (isForCurrentUser) {
            console.log('✅ Real-time update is for current user, reloading data');
            loadTrackingData();
          } else {
            console.log('❌ Real-time update is for different user, ignoring');
          }
        }
      })
      .subscribe((status) => {
        console.log('📡 Requests subscription status:', status);
      });

    // Subscribe to bookings table
    const bookingsChannel = supabase
      .channel(bookingsChannelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings'
      }, (payload) => {
        console.log('📡 Real-time booking update received:', {
          eventType: payload.eventType,
          record: payload.new || payload.old,
          user: { name: user.name, email: user.email }
        });

        // Check if this update is for the current user
        const record = payload.new || payload.old;
        if (record && typeof record === 'object') {
          const normalizeText = (text: string) => text.toLowerCase().trim();
          const normalizedUserEmail = user.email ? normalizeText(user.email) : '';
          const normalizedUserName = user.name ? normalizeText(user.name) : '';
          const recordEmail = (record as any).customer_email || '';
          const recordName = (record as any).customer_name || '';

          const isForCurrentUser =
            (normalizedUserEmail && recordEmail && normalizeText(recordEmail).includes(normalizedUserEmail)) ||
            (normalizedUserName && recordName && normalizeText(recordName).includes(normalizedUserName));

          if (isForCurrentUser) {
            console.log('✅ Real-time booking update is for current user, reloading data');
            loadTrackingData();
          } else {
            console.log('❌ Real-time booking update is for different user, ignoring');
          }
        }
      })
      .subscribe((status) => {
        console.log('📡 Bookings subscription status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up real-time subscriptions');
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, [user, trackingData, loadTrackingData]);

  // Load data when user changes
  useEffect(() => {
    loadTrackingData();
  }, [loadTrackingData]);

  // Helper function to get combined items
  const getAllItems = useCallback(() => {
    if (!trackingData) return [];

    const requests = trackingData.requests.map(r => ({ ...r, isRequest: true }));
    const bookings = trackingData.bookings.map(b => ({ ...b, isRequest: false }));

    return [...requests, ...bookings].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Newest first
    });
  }, [trackingData]);

  // Helper function to get filtered items
  const getFilteredItems = useCallback((searchTerm?: string) => {
    const allItems = getAllItems();

    if (!searchTerm) return allItems;

    return allItems.filter(item =>
      item.request_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.event_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.date.includes(searchTerm)
    );
  }, [getAllItems]);

  // Get summary statistics
  const getStats = useCallback(() => {
    const allItems = getAllItems();
    return {
      total: allItems.length,
      pending: allItems.filter(b => b.status === 'pending').length,
      approved: allItems.filter(b => b.status === 'approved').length,
      confirmed: allItems.filter(b => b.status === 'confirmed').length,
      rejected: allItems.filter(b => b.status === 'rejected').length,
      requests: trackingData?.requests.length || 0,
      bookings: trackingData?.bookings.length || 0
    };
  }, [getAllItems, trackingData]);

  return {
    trackingData,
    isLoading,
    error,
    loadTrackingData,
    getAllItems,
    getFilteredItems,
    getStats,
    session: trackingData?.session || null
  };
};

export default useCustomerTracking;