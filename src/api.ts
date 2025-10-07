import { supabase } from './supabaseClient';
import { Booking, BookingStatus } from './types';

export type BookingSystem = 'ground' | 'net';

export interface BookingsBySystem {
  ground: Booking[];
  net: Booking[];
}

/**
 * Fetch bookings from the database.
 * - When called with a system argument, returns an array of bookings for that system.
 * - When called without arguments, returns bookings grouped by system.
 */
export async function fetchBookings(system?: BookingSystem): Promise<Booking[] | BookingsBySystem> {
  const baseQuery = supabase
    .from('bookings')
    .select('*')
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });

  if (system) {
    const { data, error } = await baseQuery.eq('system', system);
    if (error) {
      throw new Error(`Failed to fetch bookings for system "${system}": ${error.message}`);
    }
    return (data as unknown) as Booking[];
  }

  const { data, error } = await baseQuery;
  if (error) {
    throw new Error(`Failed to fetch bookings: ${error.message}`);
  }

  const ground = (data || []).filter((b: any) => b.system === 'ground') as Booking[];
  const net = (data || []).filter((b: any) => b.system === 'net') as Booking[];

  return { ground, net };
}

/**
 * Fetch booking requests from the database.
 * - When called with a system argument, returns an array of requests for that system.
 * - When called without arguments, returns requests grouped by system.
 */
export async function fetchBookingRequests(system?: BookingSystem): Promise<Booking[] | BookingsBySystem> {
  console.log(`📥 API: Fetching booking requests${system ? ` for system: ${system}` : ' for all systems'}`);

  const baseQuery = supabase
    .from('booking_requests')
    .select('*')
    .order('created_at', { ascending: true });

  if (system) {
    const { data, error } = await baseQuery.eq('system', system);
    if (error) {
      console.error(`❌ API: Failed to fetch booking requests for system "${system}":`, error.message);
      throw new Error(`Failed to fetch booking requests for system "${system}": ${error.message}`);
    }

    // Verify request numbers are present
    const requests = (data as unknown) as Booking[];
    const missingRequestNumbers = requests.filter(r => !r.request_number);
    if (missingRequestNumbers.length > 0) {
      console.warn(`⚠️ API: Found ${missingRequestNumbers.length} requests missing request numbers for system ${system}`);
    }

    console.log(`✅ API: Retrieved ${requests.length} booking requests for system ${system}`);
    return requests;
  }

  const { data, error } = await baseQuery;
  if (error) {
    console.error(`❌ API: Failed to fetch booking requests:`, error.message);
    throw new Error(`Failed to fetch booking requests: ${error.message}`);
  }

  const allRequests = (data || []) as Booking[];
  const ground = allRequests.filter((r: any) => r.system === 'ground') as Booking[];
  const net = allRequests.filter((r: any) => r.system === 'net') as Booking[];

  // Verify request numbers are present for both systems
  const groundMissing = ground.filter(r => !r.request_number).length;
  const netMissing = net.filter(r => !r.request_number).length;

  if (groundMissing > 0) {
    console.warn(`⚠️ API: Found ${groundMissing} ground requests missing request numbers`);
  }
  if (netMissing > 0) {
    console.warn(`⚠️ API: Found ${netMissing} net requests missing request numbers`);
  }

  console.log(`✅ API: Retrieved ${allRequests.length} total booking requests (${ground.length} ground, ${net.length} net)`);

  return { ground, net };
}

/**
 * Approve a booking request:
 * - Reads the request
 * - Inserts a corresponding row into bookings with status "approved"
 * - Deletes the original request
 * Returns the newly created booking.
 */
export async function approveBookingRequest(requestId: number): Promise<Booking> {
  console.log(`🔄 API: Starting approval process for request ${requestId}`);

  // Fetch the request
  const { data: request, error: fetchError } = await supabase
    .from('booking_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    console.error(`❌ API: Failed to fetch booking request ${requestId}:`, fetchError?.message || 'Not found');
    throw new Error(`Failed to fetch booking request ${requestId}: ${fetchError?.message || 'Not found'}`);
  }

  console.log(`✅ API: Retrieved request ${requestId}:`, {
    requestNumber: request.request_number,
    customer: request.customer_name,
    status: request.status,
    system: request.system
  });

  // Verify request number exists
  if (!request.request_number) {
    console.error(`❌ API: Request ${requestId} missing request_number!`);
    throw new Error(`Request ${requestId} is missing a request number`);
  }

  const bookingData = {
    customer_name: request.customer_name,
    customer_contact: request.customer_contact,
    customer_email: request.customer_email,
    date: request.date,
    system: request.system as BookingSystem,
    booking_type: request.booking_type,
    slots: request.slots,
    event_type: request.event_type,
    net_number: request.net_number,
    payment_status: request.payment_status,
    payment_amount: request.payment_amount,
    status: BookingStatus.APPROVED as BookingStatus,
    created_at: new Date().toISOString(),
  };

  console.log(`📝 API: Creating booking from request ${requestId} with data:`, {
    customer: bookingData.customer_name,
    date: bookingData.date,
    system: bookingData.system,
    eventType: bookingData.event_type
  });

  const { data: newBooking, error: insertError } = await supabase
    .from('bookings')
    .insert([bookingData])
    .select()
    .single();

  if (insertError || !newBooking) {
    console.error(`❌ API: Failed to create booking from request ${requestId}:`, insertError?.message || 'Unknown error');
    throw new Error(`Failed to create booking from request ${requestId}: ${insertError?.message || 'Unknown error'}`);
  }

  console.log(`✅ API: Successfully created booking ${newBooking.id} from request ${requestId}`);

  console.log(`🗑️ API: Deleting original request ${requestId}`);
  const { error: deleteError } = await supabase
    .from('booking_requests')
    .delete()
    .eq('id', requestId);

  if (deleteError) {
    console.error(`❌ API: Created booking but failed to delete request ${requestId}:`, deleteError.message);
    throw new Error(`Created booking but failed to delete request ${requestId}: ${deleteError.message}`);
  }

  console.log(`✅ API: Successfully completed approval process for request ${requestId}`);
  return (newBooking as unknown) as Booking;
}

/**
 * Reject a booking request by updating its status to "rejected".
 */
export async function rejectBookingRequest(requestId: number): Promise<void> {
  console.log(`🔄 API: Starting rejection process for request ${requestId}`);

  // First fetch the request to verify it exists and log the request number
  const { data: request, error: fetchError } = await supabase
    .from('booking_requests')
    .select('id, request_number, customer_name, status')
    .eq('id', requestId)
    .single();

  if (fetchError) {
    console.error(`❌ API: Failed to fetch request ${requestId} for rejection:`, fetchError);
    throw new Error(`Failed to fetch booking request ${requestId}: ${fetchError.message}`);
  }

  if (!request) {
    throw new Error(`Request ${requestId} not found`);
  }

  console.log(`📋 API: Rejecting request ${requestId}:`, {
    requestNumber: request.request_number,
    customer: request.customer_name,
    currentStatus: request.status
  });

  // Verify request number exists
  if (!request.request_number) {
    console.error(`❌ API: Request ${requestId} missing request_number!`);
  }

  const { error } = await supabase
    .from('booking_requests')
    .update({ status: BookingStatus.REJECTED })
    .eq('id', requestId);

  if (error) {
    console.error(`❌ API: Failed to reject booking request ${requestId}:`, error.message);
    throw new Error(`Failed to reject booking request ${requestId}: ${error.message}`);
  }

  console.log(`✅ API: Successfully rejected request ${requestId}`);
}

/**
 * Permanently delete a booking request.
 */
export async function deleteBookingRequest(requestId: number): Promise<void> {
  const { error } = await supabase
    .from('booking_requests')
    .delete()
    .eq('id', requestId);

  if (error) {
    throw new Error(`Failed to delete booking request ${requestId}: ${error.message}`);
  }
}