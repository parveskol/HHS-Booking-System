import React, { createContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { User, UserRole, Booking, BookingStatus, BookingType, PaymentStatus, SpecialDate } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import { supabase } from '../supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';
import { notificationService } from '../utils/notificationService';

export type BookingSystem = 'ground' | 'net';

export interface BookingsState {
  ground: Booking[];
  net: Booking[];
}

export interface BookingRequestsState {
   ground: Booking[];
   net: Booking[];
}

export interface SpecialDatesState {
   specialDates: SpecialDate[];
}

interface AppContextType {
    user: User | null;
    theme: 'light' | 'dark';
    bookings: BookingsState;
    bookingRequests: BookingRequestsState;
    specialDates: SpecialDate[];
    pendingRequestCount: number;
    isLoading: boolean;
    login: (username: string, role: UserRole, email?: string) => void;
    logout: () => void;
    toggleTheme: () => void;
    addBooking: (booking: Omit<Booking, 'id' | 'created_at'>, system: BookingSystem) => Promise<void>;
    updateBooking: (booking: Booking, system: BookingSystem) => Promise<void>;
    deleteBooking: (bookingId: number, system: BookingSystem) => Promise<void>;
    addBookingRequest: (request: Omit<Booking, 'id' | 'created_at'>) => Promise<any>;
    approveBookingRequest: (requestId: number, system: BookingSystem) => Promise<void>;
    rejectBookingRequest: (requestId: number, system: BookingSystem) => Promise<void>;
    deleteBookingRequest: (requestId: number, system: BookingSystem) => Promise<void>;
    addSpecialDate: (dateOrStartDate: string, descriptionOrEndDate?: string, isRange?: boolean) => Promise<void>;
    removeSpecialDate: (dateOrStartDate: string, endDate?: string) => Promise<void>;
    cleanupDuplicateRequests: () => Promise<{ deletedCount: number }>;
    recalculatePendingCount: () => void;
    refreshData: () => Promise<void>;
    refreshDataSilent: () => Promise<void>;
}

export const AppContext = createContext<AppContextType>({
    user: null,
    theme: 'light',
    bookings: { ground: [], net: [] },
    bookingRequests: { ground: [], net: [] },
    specialDates: [],
    pendingRequestCount: 0,
    isLoading: true,
    login: () => {},
    logout: () => {},
    toggleTheme: () => {},
    addBooking: async () => {},
    updateBooking: async () => {},
    deleteBooking: async () => {},
    addBookingRequest: async () => {},
    approveBookingRequest: async () => {},
    rejectBookingRequest: async () => {},
    deleteBookingRequest: async () => {},
    addSpecialDate: async () => {},
    removeSpecialDate: async () => {},
    cleanupDuplicateRequests: async () => ({ deletedCount: 0 }),
    recalculatePendingCount: () => {},
    refreshData: async () => {},
    refreshDataSilent: async () => {},
});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useLocalStorage<User | null>('user', null);
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
  const [bookings, setBookings] = useState<BookingsState>({ ground: [], net: [] });
  const [bookingRequests, setBookingRequests] = useState<BookingRequestsState>({ ground: [], net: [] });
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([]);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Refs to prevent infinite loops and handle rapid updates
  const isProcessingRef = useRef(false);
  const lastUpdateRef = useRef<{[key: string]: number}>({});

  // Debounced update function to prevent rapid successive updates
  const debouncedUpdate = useCallback((key: string, updateFn: () => void, delay: number = 100) => {
    const now = Date.now();
    const lastUpdate = lastUpdateRef.current[key] || 0;

    if (now - lastUpdate < delay) {
      return;
    }

    lastUpdateRef.current[key] = now;
    updateFn();
  }, []);

  // Fetch initial data and subscribe to realtime changes
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setBookings({ ground: [], net: [] }); // Clear bookings on logout
      return;
    }

    let bookingsChannel: RealtimeChannel;
    let requestsChannel: RealtimeChannel;
    let specialDatesChannel: RealtimeChannel;

    const setupSubscriptions = () => {

        // Subscribe to bookings table
        bookingsChannel = supabase.channel('realtime-bookings');
        bookingsChannel
          .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' },
            (payload) => {
              // Prevent processing if already processing to avoid infinite loops
              if (isProcessingRef.current) {
                return;
              }

              try {
                isProcessingRef.current = true;

                setBookings(currentBookings => {
                  const newState = {
                    ground: [...currentBookings.ground],
                    net: [...currentBookings.net],
                  };

                  if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const newRecord = payload.new as Booking;

                    // Validate the record before processing
                    if (!newRecord || !newRecord.id || !newRecord.system) {
                      console.log('❌ Invalid booking data:', newRecord);
                      return currentBookings;
                    }

                    // Check if this booking already exists to prevent duplicates
                    const existingBooking = newState[newRecord.system].find(b => b.id === newRecord.id);
                    if (existingBooking) {
                      console.log('⚠️ Booking already exists, skipping:', newRecord.id);
                      return currentBookings;
                    }

                    // Remove old record if it exists, then add the new one to ensure no duplicates
                    newState[newRecord.system] = newState[newRecord.system].filter(b => b.id !== newRecord.id);
                    newState[newRecord.system].push(newRecord);
                    console.log(`✅ Added/updated booking ${newRecord.id} in ${newRecord.system} system`);
                  } else if (payload.eventType === 'DELETE') {
                    const oldRecord = payload.old as { id: number };
                    if (oldRecord && oldRecord.id) {
                      const beforeGround = newState.ground.length;
                      const beforeNet = newState.net.length;

                      newState.ground = newState.ground.filter(b => b.id !== oldRecord.id);
                      newState.net = newState.net.filter(b => b.id !== oldRecord.id);

                      const afterGround = newState.ground.length;
                      const afterNet = newState.net.length;

                      if (beforeGround !== afterGround || beforeNet !== afterNet) {
                        console.log(`🗑️ Removed booking ${oldRecord.id} from systems (ground: ${beforeGround}→${afterGround}, net: ${beforeNet}→${afterNet})`);
                      } else {
                        console.log(`⚠️ Booking ${oldRecord.id} was not found in either system state`);
                      }
                    } else {
                      console.log('❌ Invalid delete data for booking:', oldRecord);
                    }
                  }

                  // Re-sort both arrays to maintain chronological order
                  newState.ground.sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at));
                  newState.net.sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at));

                  console.log(`📊 Updated bookings state: ground=${newState.ground.length}, net=${newState.net.length}`);
                  return newState;
                });

              } catch (error) {
                console.error('❌ Error processing real-time booking update:', error);
                // Log additional context for debugging
                console.error('Real-time booking update error context:', {
                  eventType: payload?.eventType,
                  table: payload?.table,
                  userRole: user?.role,
                  timestamp: new Date().toISOString()
                });
                isProcessingRef.current = false;
              } finally {
                // Reset processing flag after a short delay
                setTimeout(() => {
                  isProcessingRef.current = false;
                }, 100);
              }
            }
          )
          .subscribe((status) => {
          });

        // Subscribe to booking_requests table
        requestsChannel = supabase.channel('realtime-requests');
        requestsChannel
          .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_requests' },
            (payload) => {
              console.log('📡 Real-time booking request change:', payload);

              // Prevent processing if already processing to avoid infinite loops
              if (isProcessingRef.current) {
                console.log('⏳ Already processing, skipping...');
                return;
              }

              try {
                isProcessingRef.current = true;

                // Validate payload structure
                if (!payload || !payload.eventType) {
                  console.log('❌ Invalid real-time payload:', payload);
                  return;
                }

                if (payload.eventType === 'INSERT') {
                  const newRequest = payload.new as Booking;

                  // Validate the request before processing
                  if (!newRequest || !newRequest.id || !newRequest.system) {
                    console.log('❌ Invalid request data:', newRequest);
                    return;
                  }

                  // Check if this request already exists in state to prevent duplicates
                  setBookingRequests(currentRequests => {
                    const existingRequest = [...currentRequests.ground, ...currentRequests.net].find(r => r.id === newRequest.id);
                    if (existingRequest) {
                      console.log('⚠️ Request already exists, skipping:', newRequest.id);
                      return currentRequests;
                    }

                    const newState = {
                      ground: [...currentRequests.ground],
                      net: [...currentRequests.net],
                    };

                    // For customers, only add requests that belong to them
                    if (user.role === 'customer') {
                      let isOwnRequest = false;

                      if (user.email && newRequest.customer_email) {
                        isOwnRequest = newRequest.customer_email.toLowerCase().trim() === user.email.toLowerCase().trim();
                      } else if (user.name && newRequest.customer_name) {
                        isOwnRequest = newRequest.customer_name.toLowerCase().trim() === user.name.toLowerCase().trim();
                      }

                      if (!isOwnRequest) {
                        console.log('👤 Request not for current customer, skipping');
                        return currentRequests;
                      }
                    }

                    // Add the new request to the appropriate system
                    newState[newRequest.system] = [...newState[newRequest.system], newRequest];
                    console.log(`✅ Added new request ${newRequest.id} to ${newRequest.system} system`);

                    // Only update pending count for admin/management
                    if (user.role === 'admin' || user.role === 'management') {
                      // Recalculate count from current state to ensure accuracy
                      const totalPending = [...newState.ground, ...newState.net].filter(r => r.status === BookingStatus.PENDING).length;
                      setPendingRequestCount(totalPending);
                      console.log('📊 Updated pending request count:', totalPending);

                      // Send notification for new booking request
                      console.log(`🔧 Sending notification for new booking request: ${newRequest.request_number || newRequest.id}`);
                      notificationService.showBookingRequestNotification({
                        customerName: newRequest.customer_name,
                        customerEmail: newRequest.customer_email,
                        date: newRequest.date,
                        system: newRequest.system,
                        bookingType: newRequest.booking_type,
                        eventType: newRequest.event_type,
                        requestNumber: newRequest.request_number || `REQ-${newRequest.id}`,
                      }).then(notificationResult => {
                        if (notificationResult) {
                          console.log(`✅ Notification sent successfully for new booking request: ${newRequest.request_number || newRequest.id}`);
                        } else {
                          console.log(`❌ Notification failed to send for new booking request: ${newRequest.request_number || newRequest.id}`);
                        }
                      }).catch(notificationError => {
                        console.error('❌ Failed to send notification for new booking request:', notificationError);
                        // Don't throw error here - notification failure shouldn't break the real-time update
                      });
                    }

                    return newState;
                  });
                } else if (payload.eventType === 'DELETE') {
                  const deletedRequest = payload.old as { id: number; system: BookingSystem };

                  if (!deletedRequest || !deletedRequest.id) {
                    console.log('❌ Invalid delete data:', deletedRequest);
                    return;
                  }

                  // Validate system
                  if (!deletedRequest.system || (deletedRequest.system !== 'ground' && deletedRequest.system !== 'net')) {
                    console.log('❌ Invalid or missing system in delete data:', deletedRequest);
                    return;
                  }

                  console.log(`🗑️ Real-time delete event for request ${deletedRequest.id} in ${deletedRequest.system} system`);

                  setBookingRequests(currentRequests => {
                    try {
                      const newState = {
                        ground: [...currentRequests.ground],
                        net: [...currentRequests.net],
                      };

                      // Safely remove the request from the appropriate system
                      if (newState[deletedRequest.system]) {
                        const beforeCount = newState[deletedRequest.system].length;
                        newState[deletedRequest.system] = newState[deletedRequest.system].filter(r => r.id !== deletedRequest.id);
                        const afterCount = newState[deletedRequest.system].length;

                        if (beforeCount !== afterCount) {
                          console.log(`✅ Removed request ${deletedRequest.id} from ${deletedRequest.system} system (${beforeCount} → ${afterCount})`);
                        } else {
                          console.log(`⚠️ Request ${deletedRequest.id} was not found in ${deletedRequest.system} system state`);
                        }
                      } else {
                        console.log(`❌ Invalid system ${deletedRequest.system} in delete operation`);
                        return currentRequests; // Return unchanged state
                      }

                      // Update pending request count (only for admin/management)
                      if (user.role === 'admin' || user.role === 'management') {
                        // Recalculate count from current state to ensure accuracy
                        const totalPending = [...newState.ground, ...newState.net].filter(r => r.status === BookingStatus.PENDING).length;
                        setPendingRequestCount(totalPending);
                        console.log('📊 Updated pending request count after delete:', totalPending);
                      }

                      return newState;
                    } catch (error) {
                      console.error('❌ Error processing real-time delete event:', error);
                      // Return unchanged state to prevent corruption
                      return currentRequests;
                    }
                  });
                } else if (payload.eventType === 'UPDATE') {
                  const updatedRequest = payload.new as Booking;
                  const oldRequest = payload.old as Booking;

                  // Validate the request before processing
                  if (!updatedRequest || !updatedRequest.id || !oldRequest) {
                    console.log('❌ Invalid update data:', { updatedRequest, oldRequest });
                    return;
                  }

                  // Check if this is a status transition from PENDING to APPROVED/REJECTED
                  const isStatusTransition = oldRequest.status === BookingStatus.PENDING &&
                                            (updatedRequest.status === BookingStatus.APPROVED || updatedRequest.status === BookingStatus.REJECTED);

                  console.log(`🔄 Processing ${isStatusTransition ? 'status transition' : 'status update'} for request ${updatedRequest.id}: ${oldRequest.status} -> ${updatedRequest.status}`);

                  // Handle status transitions (PENDING -> APPROVED/REJECTED)
                  if (isStatusTransition) {
                    // Remove the request from bookingRequests state since it's no longer pending
                    setBookingRequests(currentRequests => {
                      const newState = {
                        ground: [...currentRequests.ground],
                        net: [...currentRequests.net],
                      };

                      // Remove the request from the appropriate system
                      newState[updatedRequest.system] = newState[updatedRequest.system].filter(r => r.id !== updatedRequest.id);
                      console.log(`✅ Removed transitioned request ${updatedRequest.id} from booking requests`);

                      // Update pending request count (only for admin/management)
                      if (user?.role === 'admin' || user?.role === 'management') {
                        const totalPending = [...newState.ground, ...newState.net].filter(r => r.status === BookingStatus.PENDING).length;
                        setPendingRequestCount(totalPending);
                        console.log(`📊 Updated pending request count after transition: ${totalPending}`);
                      }

                      return newState;
                    });
                  } else {
                    // Regular status update (not a transition from PENDING)
                    setBookingRequests(currentRequests => {
                      const newState = {
                        ground: [...currentRequests.ground],
                        net: [...currentRequests.net],
                      };

                      // Update the request in the appropriate system
                      const systemRequests = newState[updatedRequest.system];
                      const requestIndex = systemRequests.findIndex(r => r.id === updatedRequest.id);
                      if (requestIndex !== -1) {
                        systemRequests[requestIndex] = updatedRequest;
                        console.log(`✅ Updated request ${updatedRequest.id} status to ${updatedRequest.status}`);
                      }

                      // Update pending request count based on status (only for admin/management)
                      if (user?.role === 'admin' || user?.role === 'management') {
                        const totalPending = [...newState.ground, ...newState.net].filter(r => r.status === BookingStatus.PENDING).length;
                        setPendingRequestCount(totalPending);
                        console.log(`📊 Updated pending request count after update: ${totalPending}`);
                      }

                      return newState;
                    });
                  }
                }
              } catch (error) {
                console.error('❌ Error processing real-time request update:', error);
                // Log additional context for debugging
                console.error('Real-time update error context:', {
                  eventType: payload?.eventType,
                  table: payload?.table,
                  userRole: user?.role,
                  timestamp: new Date().toISOString()
                });
              } finally {
                // Reset processing flag after a short delay
                setTimeout(() => {
                  isProcessingRef.current = false;
                }, 100);
              }
            }
          )
          .subscribe((status) => {
            console.log('📡 Booking requests subscription status:', status);
          });

       // Subscribe to special_dates table
       specialDatesChannel = supabase.channel('realtime-special-dates');
       specialDatesChannel
         .on('postgres_changes', { event: '*', schema: 'public', table: 'special_dates' },
           (payload) => {
             console.log('📡 Real-time special dates change:', payload);

             if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
               const newRecord = payload.new as SpecialDate;

               if (newRecord && newRecord.is_active) {
                 setSpecialDates(currentSpecialDates => {
                   const existingIndex = currentSpecialDates.findIndex(sd => sd.id === newRecord.id);
                   if (existingIndex !== -1) {
                     // Update existing record
                     const updated = [...currentSpecialDates];
                     updated[existingIndex] = newRecord;
                     console.log(`✅ Updated special date ${newRecord.id}: ${newRecord.date}`);
                     return updated;
                   } else {
                     // Add new record
                     const updated = [...currentSpecialDates, newRecord];
                     updated.sort((a, b) => a.date.localeCompare(b.date));
                     console.log(`✅ Added new special date ${newRecord.id}: ${newRecord.date}`);
                     return updated;
                   }
                 });
               }
             } else if (payload.eventType === 'DELETE') {
               const oldRecord = payload.old as { id: number };

               if (oldRecord && oldRecord.id) {
                 setSpecialDates(currentSpecialDates => {
                   const filtered = currentSpecialDates.filter(sd => sd.id !== oldRecord.id);
                   console.log(`🗑️ Removed special date ${oldRecord.id}`);
                   return filtered;
                 });
               }
             }
           }
         )
         .subscribe((status) => {
           console.log('📡 Special dates subscription status:', status);
         });

    }

    const cleanupOldRequests = async () => {
      try {
        // Delete requests older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffDate = thirtyDaysAgo.toISOString();

        const { error: oldRequestsError } = await supabase
          .from('booking_requests')
          .delete()
          .lt('created_at', cutoffDate);

        if (oldRequestsError) {
          console.error("Error cleaning up old requests:", oldRequestsError);
        }

        // For each customer, keep only the latest 10 requests
        const { data: allRequests, error: fetchError } = await supabase
          .from('booking_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) {
          return;
        }

        // Group requests by customer
        const requestsByCustomer: { [key: string]: Booking[] } = {};
        allRequests.forEach(request => {
          const customerKey = request.customer_email || request.customer_name;
          if (!requestsByCustomer[customerKey]) {
            requestsByCustomer[customerKey] = [];
          }
          requestsByCustomer[customerKey].push(request);
        });

        // Delete excess requests for each customer (keep only latest 10)
        for (const [customerKey, requests] of Object.entries(requestsByCustomer)) {
          if (requests.length > 10) {
            const requestsToDelete = requests.slice(10); // Keep first 10, delete the rest
            const requestIdsToDelete = requestsToDelete.map(r => r.id);

            const { error: deleteError } = await supabase
              .from('booking_requests')
              .delete()
              .in('id', requestIdsToDelete);

            if (deleteError) {
              console.error(`Error deleting excess requests for customer ${customerKey}:`, deleteError);
            }
          }
        }
      } catch (error) {
        console.error("Exception during cleanup:", error);
      }
    };

    const loadBookings = async () => {
      setIsLoading(true);
      try {
        // Clean up old requests first
        await cleanupOldRequests();

        // Load bookings
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('*')
          .order('date', { ascending: true });

        if (bookingsError) throw bookingsError;

        const groundBookings = bookingsData.filter(b => b.system === 'ground') as Booking[];
        const netBookings = bookingsData.filter(b => b.system === 'net') as Booking[];

        setBookings({ ground: groundBookings, net: netBookings });

        // Load special dates with caching optimization
        const { data: specialDatesData, error: specialDatesError } = await supabase
          .from('special_dates')
          .select('*')
          .eq('is_active', true)
          .order('date', { ascending: true })
          .limit(100); // Limit to prevent large datasets

        if (specialDatesError) {
          console.error("❌ Error loading special dates:", specialDatesError);
          // Set empty array to prevent app crash
          setSpecialDates([]);
        } else {
          setSpecialDates(specialDatesData as SpecialDate[]);
          console.log(`📅 Loaded ${specialDatesData.length} special dates successfully`);
        }

        // Load booking requests
        let requestsQuery = supabase
          .from('booking_requests')
          .select('*')
          .order('created_at', { ascending: true });
    
        // Filter requests for customers to only show their own requests
        if (user.role === 'customer') {
          // Case-insensitive filter by email and/or name using OR so we don't miss records
          const email = user.email?.toLowerCase().trim();
          const name = user.name?.toLowerCase().trim();

          if (email || name) {
            const orParts: string[] = [];
            if (email) orParts.push(`customer_email.ilike.${email}`);
            if (name) orParts.push(`customer_name.ilike.${name}`);
            // Supabase OR filter: "col.op.value,col2.op.value"
            requestsQuery = requestsQuery.or(orParts.join(','));
          } else {
            // If customer has no email or name, return empty array to prevent showing all requests
            setBookingRequests({ ground: [], net: [] });
            return;
          }
        }

        const { data: requestsData, error: requestsError } = await requestsQuery;

        if (requestsError) throw requestsError;

        console.log('📋 Loaded booking requests:', {
          total: requestsData?.length || 0,
          requests: requestsData,
          user: user.role === 'customer' ? { name: user.name, email: user.email } : 'Admin'
        });

        const groundRequests = requestsData.filter(r => r.system === 'ground') as Booking[];
        const netRequests = requestsData.filter(r => r.system === 'net') as Booking[];

        console.log('📊 Filtered requests by system:', {
          ground: groundRequests.length,
          net: netRequests.length,
          groundRequests,
          netRequests
        });

        setBookingRequests({ ground: groundRequests, net: netRequests });

        // Calculate pending request count (only for admin/management)
        if (user.role === 'admin' || user.role === 'management') {
          const totalPending = [...groundRequests, ...netRequests].filter(r => r.status === BookingStatus.PENDING).length;
          setPendingRequestCount(totalPending);
        } else {
          setPendingRequestCount(0);
        }

      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBookings();
    setupSubscriptions();

    return () => {
      if (bookingsChannel) {
        supabase.removeChannel(bookingsChannel);
      }
      if (requestsChannel) {
        supabase.removeChannel(requestsChannel);
      }
      if (specialDatesChannel) {
        supabase.removeChannel(specialDatesChannel);
      }
    };
}, [user]);

// Periodic check to ensure pending count is accurate
useEffect(() => {
  if (user?.role === 'admin' || user?.role === 'management') {
    const interval = setInterval(() => {
      const currentPending = [...bookingRequests.ground, ...bookingRequests.net].filter(r => r.status === BookingStatus.PENDING).length;
      if (currentPending !== pendingRequestCount) {
        console.log(`🔄 Pending count mismatch detected. Current: ${pendingRequestCount}, Actual: ${currentPending}. Recalculating...`);
        setPendingRequestCount(currentPending);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }
}, [user?.role, bookingRequests, pendingRequestCount]);

// Safety check for data consistency (separate effect to avoid dependency issues)
useEffect(() => {
  if (user?.role === 'admin' || user?.role === 'management' && !isLoading) {
    const safetyInterval = setInterval(() => {
      const totalRequests = [...bookingRequests.ground, ...bookingRequests.net].length;
      if (totalRequests === 0) {
        console.log('⚠️ No booking requests found in state, this might indicate a data issue');
        // Note: Don't auto-refresh here to avoid infinite loops, but log for manual intervention
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(safetyInterval);
  }
}, [user?.role, bookingRequests, isLoading]);

const login = useCallback((name: string, role: UserRole, email?: string) => {
    setUser({ id: Date.now().toString(), name, role, email });
  }, [setUser]);

  const logout = useCallback(() => {
    setUser(null);
    // Clear customer login data when manually logging out
    localStorage.removeItem('customerName');
    localStorage.removeItem('customerEmail');
    localStorage.removeItem('customerRememberMe');
  }, [setUser]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, [setTheme]);

  const addBooking = useCallback(async (booking: Omit<Booking, 'id' | 'created_at'>, system: BookingSystem) => {
    // Generate customer session ID for tracking (matching database migration)
    const customerSessionId = user && user.email && user.name
      ? (() => {
          const data = user.name + '-' + user.email;
          const hashBuffer = new TextEncoder().encode(data);
          let hash = 0;
          for (let i = 0; i < hashBuffer.length; i++) {
            hash = ((hash << 5) - hash) + hashBuffer[i];
            hash = hash & hash;
          }
          return btoa(String.fromCharCode(...hashBuffer)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
        })()
      : `session-${Date.now()}`;


    const { data, error } = await supabase
        .from('bookings')
        .insert([{ ...booking, system, customer_session_id: customerSessionId }])
        .select()
        .single();

    if (error) {
      console.error("❌ Error adding booking:", error);
      throw error;
    }

    console.log('✅ Booking added successfully:', data.id);

    // Send notification to admin/management users about new booking
    try {
      console.log(`🔧 Attempting to send notification for new booking: ${data.customer_name}`);
      const notificationResult = await notificationService.showNewBookingNotification({
        customerName: data.customer_name,
        date: data.date,
        system: data.system,
        bookingType: data.booking_type,
        eventType: data.event_type,
      });
      if (notificationResult) {
        console.log(`✅ Notification sent successfully for new booking: ${data.customer_name}`);
      } else {
        console.log(`❌ Notification failed to send for new booking: ${data.customer_name}`);
      }
    } catch (notificationError) {
      console.error('❌ Failed to send notification for new booking:', notificationError);
      // Don't throw error here - notification failure shouldn't break the booking creation
    }

    return data;
  }, [user]);
  
  const updateBooking = useCallback(async (updatedBooking: Booking, system: BookingSystem) => {
    const { id, ...bookingToUpdate } = updatedBooking;

    // Disable processing during update to prevent real-time conflicts
    const wasProcessing = isProcessingRef.current;
    isProcessingRef.current = true;

    try {
      // First, let's check if the booking exists
      const { data: existingBooking, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw new Error(`Booking not found: ${fetchError.message}`);
      }

      // Auto-confirm booking when payment status is set to Paid
      let finalBookingToUpdate = { ...bookingToUpdate };

      if (bookingToUpdate.payment_status === 'Paid' && existingBooking.status !== BookingStatus.CONFIRMED) {
        finalBookingToUpdate = {
          ...finalBookingToUpdate,
          status: BookingStatus.CONFIRMED
        };
      }

      // Now update the booking
      const { data: updatedData, error } = await supabase
        .from('bookings')
        .update(finalBookingToUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Return the updated data
      return updatedData;
    } catch (error) {
      throw error;
    } finally {
      // Restore processing state
      isProcessingRef.current = wasProcessing;
    }
  }, []);

  const deleteBooking = useCallback(async (bookingId: number, system: BookingSystem) => {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);

    if (error) {
      throw error;
    }
  }, []);

  const addBookingRequest = useCallback(async (request: Omit<Booking, 'id' | 'created_at'>) => {
    // Prevent multiple simultaneous requests
    if (isProcessingRef.current) {
      throw new Error("Request submission already in progress, please wait");
    }

    // Allow both admin and customer roles to create booking requests
    if (!user || (user.role !== 'admin' && user.role !== 'customer')) {
      throw new Error("Access denied: Only registered users can create booking requests");
    }

    try {
      isProcessingRef.current = true;
      console.log(`🔄 Starting booking request creation for ${request.customer_name}`);

      // Generate unique customer session ID for tracking (matching database migration)
      const customerSessionId = user.email && user.name
        ? (() => {
            const data = user.name + '-' + user.email;
            const hashBuffer = new TextEncoder().encode(data);
            let hash = 0;
            for (let i = 0; i < hashBuffer.length; i++) {
              hash = ((hash << 5) - hash) + hashBuffer[i];
              hash = hash & hash;
            }
            return btoa(String.fromCharCode(...hashBuffer)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
          })()
        : `session-${Date.now()}`;

      // Generate unique request number based on Date&Time with higher precision
      const now = new Date();
      const requestNumber = `REQ-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}-${now.getMilliseconds().toString().padStart(3, '0')}-${Math.random().toString(36).substr(2, 4)}`;

      console.log(`🎫 Generated unique request number: ${requestNumber}`);

      // Debug logging for form data validation
      console.log('🔍 Debugging form data:', {
        customer_name: request.customer_name,
        customer_email: request.customer_email,
        customer_contact: request.customer_contact,
        date: request.date,
        system: request.system,
        booking_type: request.booking_type,
        event_type: request.event_type,
        payment_status: request.payment_status
      });

      // Enhanced duplicate check - look for exact matches within last 10 minutes for better coverage
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

      console.log(`🔍 Checking for duplicates for customer: ${request.customer_name} (${request.customer_email})`);
      console.log(`📋 Request details:`, {
        date: request.date,
        system: request.system,
        bookingType: request.booking_type,
        eventType: request.event_type,
        slots: request.slots
      });

      const { data: existingRequests, error: checkError } = await supabase
        .from('booking_requests')
        .select('id, created_at, request_number, status, booking_type, slots, customer_name, customer_email, date, system, event_type')
        .or(`customer_email.ilike.${request.customer_email},customer_name.ilike.${request.customer_name}`)
        .eq('date', request.date)
        .eq('system', request.system)
        .in('status', [BookingStatus.PENDING, BookingStatus.APPROVED])
        .gte('created_at', tenMinutesAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (checkError) {
        console.error(`❌ Error checking for duplicates:`, checkError);
        throw new Error(`Database error while checking for duplicates: ${checkError.message}`);
      }

      if (existingRequests && existingRequests.length > 0) {
        console.log(`🔍 Found ${existingRequests.length} existing requests, analyzing for duplicates...`);

        // Check for exact duplicates (same customer, date, system, and booking details)
        const exactDuplicates = existingRequests.filter(existing => {
          const isSameCustomer = existing.customer_email?.toLowerCase() === request.customer_email?.toLowerCase() ||
                                existing.customer_name?.toLowerCase() === request.customer_name?.toLowerCase();
          const isSameDate = existing.date === request.date;
          const isSameSystem = existing.system === request.system;
          const isSameBookingType = existing.booking_type === request.booking_type;
          const isSameEventType = existing.event_type?.toLowerCase() === request.event_type?.toLowerCase();

          // For slot bookings, also check if slots overlap
          let slotsOverlap = true;
          if (request.booking_type === BookingType.SLOT && existing.booking_type === BookingType.SLOT) {
            const existingSlots = existing.slots || [];
            const newSlots = request.slots || [];
            slotsOverlap = newSlots.some(slot => existingSlots.includes(slot));
          }

          const isDuplicate = isSameCustomer && isSameDate && isSameSystem &&
                            isSameBookingType && isSameEventType && slotsOverlap;

          if (isDuplicate) {
            const timeDiff = now.getTime() - new Date(existing.created_at).getTime();
            console.log(`⏱️ Time difference for potential duplicate: ${timeDiff}ms`);
          }

          return isDuplicate && (now.getTime() - new Date(existing.created_at).getTime()) < 300000; // 5 minutes
        });

        if (exactDuplicates.length > 0) {
          console.log(`⚠️ Found exact duplicate request(s):`, exactDuplicates.map(d => ({
            requestNumber: d.request_number,
            createdAt: d.created_at,
            customer: d.customer_name,
            status: d.status
          })));
          // Return the most recent duplicate
          return [exactDuplicates[0]];
        }

        // Check for same-day, same-system bookings that might conflict
        const sameDayBookings = existingRequests.filter(existing =>
          existing.status === BookingStatus.APPROVED &&
          existing.customer_email?.toLowerCase() === request.customer_email?.toLowerCase() &&
          (request.booking_type === BookingType.FULL_DAY ||
           existing.booking_type === BookingType.FULL_DAY ||
           (request.slots && existing.slots &&
            request.slots.some(slot => existing.slots?.includes(slot))))
        );

        if (sameDayBookings.length > 0) {
          console.warn(`⚠️ Potential booking conflict detected:`, {
            newRequest: {
              date: request.date,
              system: request.system,
              slots: request.slots,
              customer: request.customer_name
            },
            existingBooking: {
              requestNumber: sameDayBookings[0].request_number,
              status: sameDayBookings[0].status,
              slots: sameDayBookings[0].slots,
              customer: sameDayBookings[0].customer_name
            }
          });
          // Still allow the request but log the potential conflict
        }
      }

      console.log(`✅ No duplicates found, proceeding with request creation`);

      // Prepare request data with unique request number and customer session ID
      const requestWithNumber = {
        ...request,
        request_number: requestNumber,
        customer_session_id: customerSessionId, // Add session ID for new tracking system
        status: BookingStatus.PENDING,
        submitted_at: now.toISOString()
      };

      console.log(`📝 Preparing to insert request with data:`, {
        requestNumber,
        customer: request.customer_name,
        email: request.customer_email,
        date: request.date,
        system: request.system,
        bookingType: request.booking_type,
        eventType: request.event_type
      });

      console.log(`💾 Attempting to insert request into database...`);
      const { data, error } = await supabase
        .from('booking_requests')
        .insert([requestWithNumber])
        .select();

      if (error) {
        console.error(`❌ Error inserting request:`, error);
        console.error(`🔍 Request data that failed to insert:`, {
          requestNumber: requestWithNumber.request_number,
          customer: requestWithNumber.customer_name,
          email: requestWithNumber.customer_email,
          date: requestWithNumber.date,
          system: requestWithNumber.system,
          bookingType: requestWithNumber.booking_type,
          eventType: requestWithNumber.event_type,
          status: requestWithNumber.status,
          paymentStatus: requestWithNumber.payment_status
        });

        // Handle specific error cases
        if (error.code === '23505') { // PostgreSQL unique constraint violation
          console.log(`⚠️ Unique constraint violation detected, attempting recovery...`);

          // Try to find the existing request with better error handling
          const { data: existingData, error: fetchError } = await supabase
            .from('booking_requests')
            .select('*')
            .eq('customer_email', request.customer_email)
            .eq('customer_name', request.customer_name)
            .eq('date', request.date)
            .eq('system', request.system)
            .eq('booking_type', request.booking_type)
            .eq('event_type', request.event_type)
            .in('status', [BookingStatus.PENDING, BookingStatus.APPROVED])
            .order('created_at', { ascending: false })
            .limit(1);

          if (fetchError) {
            console.error(`❌ Error fetching existing request during recovery:`, fetchError);
            throw new Error(`Duplicate request detected but failed to retrieve: ${fetchError.message}`);
          }

          if (existingData && existingData.length > 0) {
            console.log(`✅ Recovered existing request: ${existingData[0].request_number}`);
            return existingData;
          } else {
            throw new Error("Duplicate request detected but no existing request found");
          }
        } else if (error.code === '23514') { // PostgreSQL check constraint violation
          console.error(`❌ Check constraint violation:`, error);
          throw new Error("Invalid request data: Please check all required fields are filled correctly");
        } else if (error.code === '23502') { // PostgreSQL not-null constraint violation
          console.error(`❌ Not-null constraint violation:`, error);
          throw new Error("Missing required information: Please fill in all mandatory fields");
        } else {
          console.error(`❌ Unexpected database error:`, error);
          throw new Error(`Database error: ${error.message || 'Unknown error occurred'}`);
        }
      }

      if (!data || data.length === 0) {
        console.error(`❌ No data returned after insert operation`);
        throw new Error("Request was not created successfully - no data returned");
      }

      const createdRequest = data[0];
      console.log(`✅ Successfully created request:`, {
        id: createdRequest.id,
        requestNumber: createdRequest.request_number,
        status: createdRequest.status,
        customer: createdRequest.customer_name,
        fullRequest: createdRequest
      });

      // Verify the request number was stored correctly
      if (createdRequest.request_number !== requestNumber) {
        console.warn(`⚠️ Request number mismatch! Generated: ${requestNumber}, Stored: ${createdRequest.request_number}`);
        throw new Error("Request created but request number verification failed");
      } else {
        console.log(`✅ Request number verification successful: ${createdRequest.request_number}`);
      }

      // Send notification to management users about new booking request
      try {
        console.log(`🔧 Attempting to send notification for new booking request: ${createdRequest.request_number}`);
        const notificationResult = await notificationService.showBookingRequestNotification({
          customerName: createdRequest.customer_name,
          customerEmail: createdRequest.customer_email,
          date: createdRequest.date,
          system: createdRequest.system,
          bookingType: createdRequest.booking_type,
          eventType: createdRequest.event_type,
          requestNumber: createdRequest.request_number,
        });
        if (notificationResult) {
          console.log(`✅ Notification sent successfully to management for new booking request: ${createdRequest.request_number}`);
        } else {
          console.log(`❌ Notification failed to send for new booking request: ${createdRequest.request_number}`);
        }
      } catch (notificationError) {
        console.error('❌ Failed to send notification for new booking request:', notificationError);
        // Don't throw error here - notification failure shouldn't break the booking request
      }

      // Additional debugging for customer requests
      if (user.role === 'customer') {
        console.log(`👤 Customer request created successfully:`, {
          id: createdRequest.id,
          requestNumber: createdRequest.request_number,
          customerName: createdRequest.customer_name,
          customerEmail: createdRequest.customer_email,
          date: createdRequest.date,
          system: createdRequest.system,
          status: createdRequest.status
        });
      }

      // Verify all required fields are present
      const requiredFields = ['customer_name', 'customer_contact', 'date', 'system', 'booking_type', 'event_type'];
      const missingFields = requiredFields.filter(field => !createdRequest[field]);

      if (missingFields.length > 0) {
        console.error(`❌ Request created but missing required fields:`, missingFields);
        throw new Error(`Request created but missing required information: ${missingFields.join(', ')}`);
      }

      console.log(`✅ Request validation completed successfully`);

      // Show success message for customers with request number
      if (user.role === 'customer') {
        console.log(`👤 Customer request created successfully: ${data[0].request_number}`);
        // Don't show alert for customers - silent submission
      }

      return data;
    } catch (error) {
      console.error(`❌ Error in addBookingRequest:`, error);
      throw error;
    } finally {
      // Reset processing flag after a delay
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 2000);
    }
  }, [user]);




  const approveBookingRequest = useCallback(async (requestId: number, system: BookingSystem) => {
    // Prevent multiple simultaneous approvals
    if (isProcessingRef.current) {
      throw new Error("Approval already in progress, please wait");
    }

    // Validate requestId
    if (!requestId || requestId <= 0) {
      throw new Error("Invalid request ID provided");
    }

    try {
      isProcessingRef.current = true;
      console.log(`🔄 Starting approval process for request ${requestId}`);

      // Get the request first
      const { data: request, error: fetchError } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') { // No rows returned
          console.warn(`⚠️ Request ${requestId} not found`);
          throw new Error(`Request not found`);
        }
        console.error(`❌ Error fetching request ${requestId}:`, fetchError);
        throw new Error(`Failed to verify request: ${fetchError.message}`);
      }

      if (!request) {
        console.warn(`⚠️ Request ${requestId} not found`);
        throw new Error("Request not found");
      }

      // Verify the system matches
      if (request.system !== system) {
        console.warn(`⚠️ System mismatch for request ${requestId}: expected ${system}, got ${request.system}`);
        throw new Error(`System mismatch: Request belongs to ${request.system} system`);
      }

      // Check if request is already approved to prevent duplicates
      if (request.status === BookingStatus.APPROVED) {
        console.log(`⚠️ Request ${requestId} is already approved`);
        throw new Error("Request has already been approved");
      }

      // Check if request is rejected (can't approve rejected requests)
      if (request.status === BookingStatus.REJECTED) {
        throw new Error("Cannot approve a rejected request");
      }

      console.log(`📋 Converting request ${requestId} to booking:`, {
        requestNumber: request.request_number,
        customer: request.customer_name,
        date: request.date,
        system: request.system
      });

      // Convert request to booking format
      const bookingData = {
        customer_name: request.customer_name,
        customer_contact: request.customer_contact,
        customer_email: request.customer_email,
        customer_session_id: request.customer_session_id,
        date: request.date,
        system: request.system,
        booking_type: request.booking_type,
        slots: request.slots,
        event_type: request.event_type,
        net_number: request.net_number || [],
        payment_status: request.payment_status,
        payment_amount: request.payment_amount,
        notes: request.notes,
        status: BookingStatus.APPROVED,
        created_at: new Date().toISOString()
      };

      // Insert into bookings table
      const { data: newBooking, error: insertError } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select()
        .single();

      if (insertError) {
        console.error("❌ Error creating booking:", insertError);
        throw insertError;
      }

      console.log(`✅ Successfully created booking ${newBooking.id} from request ${requestId}`);

      // Delete the request from booking_requests table
      const { error: deleteError } = await supabase
        .from('booking_requests')
        .delete()
        .eq('id', requestId);

      if (deleteError) {
        console.error(`❌ Error deleting request ${requestId}:`, deleteError);
        throw deleteError;
      }

      console.log(`🗑️ Successfully deleted request ${requestId} after approval`);

      // Note: pendingRequestCount will be updated automatically by real-time handlers

      // Force immediate UI update by removing the request from state
      setBookingRequests(currentRequests => {
        const newState = {
          ground: currentRequests.ground.filter(r => r.id !== requestId),
          net: currentRequests.net.filter(r => r.id !== requestId),
        };
        console.log(`🔄 Updated booking requests state, removed request ${requestId}`);
        return newState;
      });

      // Add the new booking to the bookings state
      setBookings(currentBookings => {
        const newState = {
          ground: [...currentBookings.ground],
          net: [...currentBookings.net],
        };

        // Add the new booking to the appropriate system
        newState[system] = [...newState[system], newBooking as Booking];

        // Re-sort to maintain chronological order
        newState[system].sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at));

        console.log(`🔄 Updated bookings state, added booking ${newBooking.id}`);
        return newState;
      });

      console.log(`✅ Approval process completed successfully for request ${requestId}`);

      // Send notification to admin/management users about new booking
      try {
        console.log(`🔧 Attempting to send notification for approved booking: ${request.customer_name}`);
        const notificationResult = await notificationService.showNewBookingNotification({
          customerName: request.customer_name,
          date: request.date,
          system: request.system,
          bookingType: request.booking_type,
          eventType: request.event_type,
        });
        if (notificationResult) {
          console.log(`✅ Notification sent successfully for approved booking: ${request.customer_name}`);
        } else {
          console.log(`❌ Notification failed to send for approved booking: ${request.customer_name}`);
        }
      } catch (notificationError) {
        console.error('❌ Failed to send notification for approved booking:', notificationError);
        // Don't throw error here - notification failure shouldn't break the approval
      }

      // Send notification to customer about booking approval
      try {
        console.log(`🔧 Attempting to send approval notification for request: ${request.request_number}`);
        const notificationResult = await notificationService.showBookingApprovalNotification({
          customerName: request.customer_name,
          date: request.date,
          system: request.system,
          bookingType: request.booking_type,
          requestNumber: request.request_number,
        });
        if (notificationResult) {
          console.log(`✅ Approval notification sent successfully to customer for request: ${request.request_number}`);
        } else {
          console.log(`❌ Approval notification failed to send for request: ${request.request_number}`);
        }
      } catch (notificationError) {
        console.error('❌ Failed to send approval notification to customer:', notificationError);
        // Don't throw error here - notification failure shouldn't break the approval
      }
    } catch (error: any) {
      console.error(`❌ Error in approveBookingRequest for request ${requestId}:`, error);

      // Re-throw the error with additional context if it's not already a user-friendly message
      if (error.message && !error.message.includes("Access denied") && !error.message.includes("Invalid request") && !error.message.includes("not found") && !error.message.includes("already")) {
        throw new Error(`Failed to approve booking request: ${error.message}`);
      } else {
        throw error;
      }
    } finally {
      // Reset processing flag after a delay
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1000);
    }
  }, [user?.role, pendingRequestCount]);

  const rejectBookingRequest = useCallback(async (requestId: number, system: BookingSystem) => {
    // Prevent multiple simultaneous rejections
    if (isProcessingRef.current) {
      throw new Error("Rejection already in progress, please wait");
    }

    // Validate requestId
    if (!requestId || requestId <= 0) {
      throw new Error("Invalid request ID provided");
    }

    try {
      isProcessingRef.current = true;
      console.log(`🔄 Starting rejection process for request ${requestId}`);

      // Get the request first to get the date
      const { data: request, error: fetchError } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') { // No rows returned
          console.warn(`⚠️ Request ${requestId} not found`);
          throw new Error(`Request not found`);
        }
        console.error(`❌ Error fetching request ${requestId}:`, fetchError);
        throw new Error(`Failed to verify request: ${fetchError.message}`);
      }

      if (!request) {
        console.warn(`⚠️ Request ${requestId} not found`);
        throw new Error("Request not found");
      }

      // Verify the system matches
      if (request.system !== system) {
        console.warn(`⚠️ System mismatch for request ${requestId}: expected ${system}, got ${request.system}`);
        throw new Error(`System mismatch: Request belongs to ${request.system} system`);
      }

      // Check if request is already rejected to prevent duplicates
      if (request.status === BookingStatus.REJECTED) {
        console.log(`⚠️ Request ${requestId} is already rejected`);
        throw new Error("Request has already been rejected");
      }

      // Check if request is approved (can't reject approved requests)
      if (request.status === BookingStatus.APPROVED) {
        throw new Error("Cannot reject an approved request");
      }

      console.log(`📋 Rejecting request ${requestId}:`, {
        requestNumber: request.request_number,
        customer: request.customer_name,
        date: request.date,
        system: request.system
      });

      const { error } = await supabase
        .from('booking_requests')
        .update({ status: BookingStatus.REJECTED })
        .eq('id', requestId);

      if (error) {
        console.error(`❌ Error rejecting request ${requestId}:`, error);
        throw error;
      }

      console.log(`✅ Successfully rejected request ${requestId}`);

      // Note: pendingRequestCount will be updated automatically by real-time handlers

      // Force immediate UI update by updating the request status in state
      setBookingRequests(currentRequests => {
        const newState = {
          ground: [...currentRequests.ground],
          net: [...currentRequests.net],
        };

        // Find and update the request in the appropriate system
        const systemRequests = newState[system];
        const requestIndex = systemRequests.findIndex(r => r.id === requestId);
        if (requestIndex !== -1) {
          systemRequests[requestIndex] = { ...systemRequests[requestIndex], status: BookingStatus.REJECTED };
          console.log(`🔄 Updated request ${requestId} status to REJECTED in state`);
        }

        return newState;
      });

      console.log(`✅ Rejection process completed successfully for request ${requestId}`);

      // Send notification to customer about booking rejection
      try {
        console.log(`🔧 Attempting to send rejection notification for request: ${request.request_number}`);
        const notificationResult = await notificationService.showBookingRejectionNotification({
          customerName: request.customer_name,
          date: request.date,
          system: request.system,
          requestNumber: request.request_number,
        });
        if (notificationResult) {
          console.log(`✅ Rejection notification sent successfully to customer for request: ${request.request_number}`);
        } else {
          console.log(`❌ Rejection notification failed to send for request: ${request.request_number}`);
        }
      } catch (notificationError) {
        console.error('❌ Failed to send rejection notification to customer:', notificationError);
        // Don't throw error here - notification failure shouldn't break the rejection
      }
    } catch (error: any) {
      console.error(`❌ Error in rejectBookingRequest for request ${requestId}:`, error);

      // Re-throw the error with additional context if it's not already a user-friendly message
      if (error.message && !error.message.includes("Access denied") && !error.message.includes("Invalid request") && !error.message.includes("not found") && !error.message.includes("already")) {
        throw new Error(`Failed to reject booking request: ${error.message}`);
      } else {
        throw error;
      }
    } finally {
      // Reset processing flag after a delay
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1000);
    }
  }, [user?.role, pendingRequestCount]);

  const deleteBookingRequest = useCallback(async (requestId: number, system: BookingSystem) => {
    // Only allow admin users to delete booking requests
    if (user?.role !== 'admin') {
      throw new Error("Access denied: Only admin users can delete booking requests");
    }

    // Validate requestId
    if (!requestId || requestId <= 0) {
      throw new Error("Invalid request ID provided");
    }

    console.log(`🔄 Starting deletion process for request ${requestId} in ${system} system`);

    try {
      // First, check if the request exists
      const { data: existingRequest, error: fetchError } = await supabase
        .from('booking_requests')
        .select('id, request_number, customer_name, status, system')
        .eq('id', requestId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') { // No rows returned
          console.warn(`⚠️ Request ${requestId} not found`);
          throw new Error(`Request not found`);
        }
        console.error(`❌ Error fetching request ${requestId}:`, fetchError);
        throw new Error(`Failed to verify request: ${fetchError.message}`);
      }

      if (!existingRequest) {
        console.warn(`⚠️ Request ${requestId} not found`);
        throw new Error("Request not found");
      }

      // Verify the system matches
      if (existingRequest.system !== system) {
        console.warn(`⚠️ System mismatch for request ${requestId}: expected ${system}, got ${existingRequest.system}`);
        throw new Error(`System mismatch: Request belongs to ${existingRequest.system} system`);
      }

      console.log(`✅ Found request ${requestId}: ${existingRequest.request_number} (${existingRequest.customer_name})`);

      // Proceed with deletion
      const { error: deleteError } = await supabase
        .from('booking_requests')
        .delete()
        .eq('id', requestId);

      if (deleteError) {
        console.error(`❌ Error deleting request ${requestId}:`, deleteError);

        // Handle specific error cases
        if (deleteError.code === '23503') { // Foreign key constraint violation
          throw new Error("Cannot delete request: It may be referenced by other records");
        } else if (deleteError.code === '23505') { // Unique constraint violation (shouldn't happen for delete)
          throw new Error("Database constraint error occurred");
        } else if (deleteError.code === '42501') { // Insufficient privilege
          throw new Error("Permission denied: Cannot delete this request");
        } else {
          throw new Error(`Failed to delete request: ${deleteError.message}`);
        }
      }

      console.log(`✅ Successfully deleted request ${requestId}: ${existingRequest.request_number}`);

      // Note: pendingRequestCount will be updated automatically by real-time handlers

    } catch (error: any) {
      console.error(`❌ Error in deleteBookingRequest for request ${requestId}:`, error);

      // Re-throw the error with additional context if it's not already a user-friendly message
      if (error.message && !error.message.includes("Access denied") && !error.message.includes("Invalid request")) {
        throw new Error(`Failed to delete booking request: ${error.message}`);
      } else {
        throw error;
      }
    }
  }, [user?.role]);

  const recalculatePendingCount = useCallback(() => {
    if (user?.role === 'admin' || user?.role === 'management') {
      const totalPending = [...bookingRequests.ground, ...bookingRequests.net].filter(r => r.status === BookingStatus.PENDING).length;
      setPendingRequestCount(totalPending);
      console.log(`📊 Recalculated pending request count: ${totalPending}`);
    }
  }, [user?.role, bookingRequests]);

  const refreshDataSilent = useCallback(async () => {
    if (!user) return;

    console.log('🔄 Silent data refresh triggered');

    try {
      // Clean up old requests first
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoffDate = thirtyDaysAgo.toISOString();

      const { error: oldRequestsError } = await supabase
        .from('booking_requests')
        .delete()
        .lt('created_at', cutoffDate);

      if (oldRequestsError) {
        console.error("Error cleaning up old requests:", oldRequestsError);
      }

      // Reload bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .order('date', { ascending: true });

      if (bookingsError) throw bookingsError;

      const groundBookings = bookingsData.filter(b => b.system === 'ground') as Booking[];
      const netBookings = bookingsData.filter(b => b.system === 'net') as Booking[];

      setBookings({ ground: groundBookings, net: netBookings });

      // Reload booking requests
      let requestsQuery = supabase
        .from('booking_requests')
        .select('*')
        .order('created_at', { ascending: true });

      // Filter requests for customers to only show their own requests
      if (user.role === 'customer') {
        const email = user.email?.toLowerCase().trim();
        const name = user.name?.toLowerCase().trim();

        if (email || name) {
          const orParts: string[] = [];
          if (email) orParts.push(`customer_email.ilike.${email}`);
          if (name) orParts.push(`customer_name.ilike.${name}`);
          requestsQuery = requestsQuery.or(orParts.join(','));
        } else {
          setBookingRequests({ ground: [], net: [] });
          return;
        }
      }

      const { data: requestsData, error: requestsError } = await requestsQuery;

      if (requestsError) throw requestsError;

      const groundRequests = requestsData.filter(r => r.system === 'ground') as Booking[];
      const netRequests = requestsData.filter(r => r.system === 'net') as Booking[];

      setBookingRequests({ ground: groundRequests, net: netRequests });

      // Recalculate pending request count
      if (user.role === 'admin' || user.role === 'management') {
        const totalPending = [...groundRequests, ...netRequests].filter(r => r.status === BookingStatus.PENDING).length;
        setPendingRequestCount(totalPending);
      } else {
        setPendingRequestCount(0);
      }

      console.log('✅ Silent data refresh completed');
    } catch (error) {
      console.error('❌ Error during silent data refresh:', error);
    }
  }, [user]);

  const refreshData = useCallback(async () => {
    if (!user) return;

    console.log('🔄 Manual data refresh triggered');
    setIsLoading(true);

    try {
      await refreshDataSilent();
      console.log('✅ Manual data refresh completed');
    } catch (error) {
      console.error('❌ Error during manual data refresh:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, refreshDataSilent]);

  const addSpecialDate = useCallback(async (dateOrStartDate: string, descriptionOrEndDate?: string, isRange?: boolean) => {
    if (!user || (user.role !== 'admin' && user.role !== 'management')) {
      throw new Error("Access denied: Only admin and management users can manage special dates");
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateOrStartDate)) {
      throw new Error("Invalid date format. Please use YYYY-MM-DD format");
    }

    let startDate: string;
    let endDate: string | undefined;
    let description: string | undefined;

    if (isRange && descriptionOrEndDate) {
      // Date range mode: dateOrStartDate = start date, descriptionOrEndDate = end date
      startDate = dateOrStartDate;
      endDate = descriptionOrEndDate;

      // Validate end date format
      if (!dateRegex.test(endDate)) {
        throw new Error("Invalid end date format. Please use YYYY-MM-DD format");
      }

      // Check if end date is before start date
      if (new Date(endDate) < new Date(startDate)) {
        throw new Error("End date cannot be before start date");
      }

      // Check if date range is too large (more than 1 year)
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 365) {
        throw new Error("Date range cannot exceed 365 days");
      }

      description = undefined; // Description not supported for ranges in this implementation
    } else {
      // Single date mode: dateOrStartDate = date, descriptionOrEndDate = description
      startDate = dateOrStartDate;
      endDate = undefined;
      description = descriptionOrEndDate;
    }

    // Check if dates are in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (new Date(startDate) < today) {
      throw new Error("Cannot add past dates as special dates");
    }

    if (endDate && new Date(endDate) < today) {
      throw new Error("Cannot add past end dates as special dates");
    }

    let retries = 3;
    while (retries > 0) {
      try {
        const insertData: any = {
          created_by: user.id
        };

        if (isRange && endDate) {
          // Insert date range
          insertData.start_date = startDate;
          insertData.end_date = endDate;
          insertData.date = null;
        } else {
          // Insert single date
          insertData.date = startDate;
          insertData.start_date = null;
          insertData.end_date = null;
        }

        if (description) {
          insertData.description = description;
        }

        const { data, error } = await supabase
          .from('special_dates')
          .insert([insertData])
          .select()
          .single();

        if (error) {
          if (error.code === '23505' && retries > 1) { // Unique constraint violation
            console.log('⚠️ Date already exists, retrying...');
            retries--;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            continue;
          }
          throw error;
        }

        console.log('✅ Special date added successfully:', data.id);
        return data;
      } catch (error: any) {
        if (retries <= 1) {
          console.error("❌ Error adding special date after retries:", error);
          if (error.code === '23505') {
            throw new Error("This date or date range is already marked as special");
          }
          throw new Error(`Failed to add special date: ${error.message || 'Unknown error'}`);
        }
        retries--;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }, [user]);

  const removeSpecialDate = useCallback(async (dateOrStartDate: string, endDate?: string) => {
    if (!user || (user.role !== 'admin' && user.role !== 'management')) {
      throw new Error("Access denied: Only admin and management users can manage special dates");
    }

    let retries = 2;
    while (retries > 0) {
      try {
        let query = supabase.from('special_dates').delete();

        if (endDate) {
          // Remove date range
          query = query
            .eq('start_date', dateOrStartDate)
            .eq('end_date', endDate);
        } else {
          // Remove single date - check both old format (date) and new format (start_date = end_date)
          query = query.or(`date.eq.${dateOrStartDate},and(start_date.eq.${dateOrStartDate},end_date.eq.${dateOrStartDate})`);
        }

        const { error } = await query;

        if (error) {
          throw error;
        }

        console.log('✅ Special date removed successfully:', endDate ? `${dateOrStartDate} to ${endDate}` : dateOrStartDate);
        return;
      } catch (error: any) {
        if (retries <= 1) {
          console.error("❌ Error removing special date after retries:", error);
          throw new Error(`Failed to remove special date: ${error.message || 'Unknown error'}`);
        }
        retries--;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }, [user]);

  const cleanupDuplicateRequests = useCallback(async () => {
    try {
      // Find all duplicate requests
      const { data: allRequests, error: fetchError } = await supabase
        .from('booking_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Group requests by customer and request details
      const requestGroups: { [key: string]: Booking[] } = {};
      allRequests.forEach(request => {
        const groupKey = `${request.customer_email}-${request.customer_name}-${request.date}-${request.system}-${request.booking_type}-${request.event_type}`;
        if (!requestGroups[groupKey]) {
          requestGroups[groupKey] = [];
        }
        requestGroups[groupKey].push(request);
      });

      let deletedCount = 0;
      // Delete duplicates, keeping only the most recent one
      for (const [groupKey, requests] of Object.entries(requestGroups)) {
        if (requests.length > 1) {
          // Sort by created_at descending (newest first)
          requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          // Keep the first (newest) one, delete the rest
          const requestsToDelete = requests.slice(1);
          const requestIdsToDelete = requestsToDelete.map(r => r.id);

          const { error: deleteError } = await supabase
            .from('booking_requests')
            .delete()
            .in('id', requestIdsToDelete);

          if (deleteError) {
            throw deleteError;
          } else {
            deletedCount += requestsToDelete.length;
          }
        }
      }

      // Refresh the data
      const { data: updatedRequests, error: refreshError } = await supabase
        .from('booking_requests')
        .select('*')
        .order('created_at', { ascending: true });

      if (!refreshError) {
        const groundRequests = updatedRequests.filter(r => r.system === 'ground') as Booking[];
        const netRequests = updatedRequests.filter(r => r.system === 'net') as Booking[];
        setBookingRequests({ ground: groundRequests, net: netRequests });

        // Update pending request count
        if (user?.role === 'admin' || user?.role === 'management') {
          const totalPending = [...groundRequests, ...netRequests].filter(r => r.status === BookingStatus.PENDING).length;
          setPendingRequestCount(totalPending);
          console.log(`📊 Updated pending request count after cleanup: ${totalPending}`);
        }
      }

      return { deletedCount };
    } catch (error) {
      throw error;
    }
  }, [user?.role]);


  const contextValue: AppContextType = {
      user,
      theme,
      bookings,
      bookingRequests,
      specialDates,
      pendingRequestCount,
      isLoading,
      login,
      logout,
      toggleTheme,
      addBooking,
      updateBooking,
      deleteBooking,
      addBookingRequest,
      approveBookingRequest,
      rejectBookingRequest,
      deleteBookingRequest,
      addSpecialDate,
      removeSpecialDate,
      cleanupDuplicateRequests,
      recalculatePendingCount,
      refreshData,
      refreshDataSilent,
    };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};