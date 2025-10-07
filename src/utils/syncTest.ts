import { supabase } from '../supabaseClient';
import { Booking, BookingStatus, BookingType, PaymentStatus } from '../types';

export interface SyncTestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
}

export interface CrossDeviceTestResult {
  device1: SyncTestResult;
  device2: SyncTestResult;
  consistency: boolean;
  message: string;
}

// Test basic cloud connectivity
export const testCloudConnectivity = async (): Promise<SyncTestResult> => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('count')
      .limit(1);

    if (error) {
      return {
        success: false,
        message: `Cloud connectivity test failed: ${error.message}`,
        details: error,
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      message: 'Cloud connectivity test passed',
      details: { recordCount: data?.length || 0 },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      message: `Cloud connectivity test error: ${error}`,
      details: error,
      timestamp: new Date().toISOString()
    };
  }
};

// Test real-time subscriptions
export const testRealtimeSync = async (): Promise<SyncTestResult> => {
  return new Promise((resolve) => {
    try {
      const channel = supabase.channel('sync-test');

      const timeout = setTimeout(() => {
        supabase.removeChannel(channel);
        resolve({
          success: false,
          message: 'Real-time sync test timed out',
          timestamp: new Date().toISOString()
        });
      }, 10000);

      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
          clearTimeout(timeout);
          supabase.removeChannel(channel);
          resolve({
            success: true,
            message: 'Real-time sync test passed',
            details: { eventType: payload.eventType },
            timestamp: new Date().toISOString()
          });
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Trigger a test change
            setTimeout(async () => {
              try {
                await supabase
                  .from('bookings')
                  .insert([{
                    customer_name: 'Sync Test',
                    customer_contact: '9999999999',
                    customer_email: 'test@example.com',
                    date: new Date().toISOString().split('T')[0],
                    booking_type: BookingType.FULL_DAY,
                    event_type: 'Test Event',
                    payment_status: PaymentStatus.UNPAID,
                    payment_amount: 0,
                    system: 'ground',
                    status: BookingStatus.PENDING
                  }]);
              } catch (error) {
                // Ignore errors in test data insertion
              }
            }, 1000);
          }
        });
    } catch (error) {
      resolve({
        success: false,
        message: `Real-time sync test error: ${error}`,
        details: error,
        timestamp: new Date().toISOString()
      });
    }
  });
};

// Test data consistency across devices
export const testDataConsistency = async (
  device1Data: Booking[],
  device2Data: Booking[]
): Promise<SyncTestResult> => {
  try {
    // Compare data lengths
    if (device1Data.length !== device2Data.length) {
      return {
        success: false,
        message: `Data inconsistency detected: Device 1 has ${device1Data.length} records, Device 2 has ${device2Data.length} records`,
        details: {
          device1Count: device1Data.length,
          device2Count: device2Data.length
        },
        timestamp: new Date().toISOString()
      };
    }

    // Compare specific records
    const inconsistencies: any[] = [];
    for (let i = 0; i < device1Data.length; i++) {
      const d1Record = device1Data[i];
      const d2Record = device2Data.find(r => r.id === d1Record.id);

      if (!d2Record) {
        inconsistencies.push({
          type: 'missing_record',
          device1Id: d1Record.id,
          message: `Record ${d1Record.id} exists on Device 1 but not on Device 2`
        });
      } else {
        // Compare key fields
        const fieldsToCompare = ['status', 'payment_status', 'payment_amount', 'customer_name'];
        for (const field of fieldsToCompare) {
          if (d1Record[field as keyof Booking] !== d2Record[field as keyof Booking]) {
            inconsistencies.push({
              type: 'field_mismatch',
              recordId: d1Record.id,
              field,
              device1Value: d1Record[field as keyof Booking],
              device2Value: d2Record[field as keyof Booking]
            });
          }
        }
      }
    }

    if (inconsistencies.length > 0) {
      return {
        success: false,
        message: `Found ${inconsistencies.length} inconsistencies between devices`,
        details: { inconsistencies },
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      message: 'Data consistency test passed',
      details: { recordCount: device1Data.length },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      message: `Data consistency test error: ${error}`,
      details: error,
      timestamp: new Date().toISOString()
    };
  }
};

// Test offline data storage and sync
export const testOfflineStorage = async (): Promise<SyncTestResult> => {
  try {
    // Test IndexedDB availability
    if (!('indexedDB' in window)) {
      return {
        success: false,
        message: 'IndexedDB not supported',
        timestamp: new Date().toISOString()
      };
    }

    // Test basic storage operations
    const testData = {
      id: 'test_main',
      bookings: [],
      bookingRequests: [],
      lastSync: new Date().toISOString(),
      pendingOperations: []
    };

    // This would require access to the offline storage hook
    // For now, we'll just test IndexedDB directly
    return new Promise((resolve) => {
      const request = indexedDB.open('HHSBookings', 1);

      request.onerror = () => {
        resolve({
          success: false,
          message: 'IndexedDB test failed',
          details: request.error,
          timestamp: new Date().toISOString()
        });
      };

      request.onsuccess = () => {
        resolve({
          success: true,
          message: 'Offline storage test passed',
          details: { dbVersion: request.result.version },
          timestamp: new Date().toISOString()
        });
      };
    });
  } catch (error) {
    return {
      success: false,
      message: `Offline storage test error: ${error}`,
      details: error,
      timestamp: new Date().toISOString()
    };
  }
};

// Run comprehensive sync tests
export const runSyncTests = async (): Promise<{
  connectivity: SyncTestResult;
  realtime: SyncTestResult;
  offlineStorage: SyncTestResult;
  overall: SyncTestResult;
}> => {
  console.log('Running comprehensive sync tests...');

  const [connectivity, realtime, offlineStorage] = await Promise.all([
    testCloudConnectivity(),
    testRealtimeSync(),
    testOfflineStorage()
  ]);

  const allPassed = connectivity.success && realtime.success && offlineStorage.success;

  const overall: SyncTestResult = {
    success: allPassed,
    message: allPassed
      ? 'All sync tests passed'
      : 'Some sync tests failed',
    details: {
      connectivity: connectivity.success,
      realtime: realtime.success,
      offlineStorage: offlineStorage.success
    },
    timestamp: new Date().toISOString()
  };

  console.log('Sync test results:', { connectivity, realtime, offlineStorage, overall });

  return {
    connectivity,
    realtime,
    offlineStorage,
    overall
  };
};

// Simulate cross-device sync scenario
export const simulateCrossDeviceSync = async (
  device1Bookings: Booking[],
  device2Bookings: Booking[]
): Promise<CrossDeviceTestResult> => {
  try {
    const consistencyResult = await testDataConsistency(device1Bookings, device2Bookings);

    return {
      device1: {
        success: true,
        message: `Device 1 has ${device1Bookings.length} bookings`,
        details: { count: device1Bookings.length },
        timestamp: new Date().toISOString()
      },
      device2: {
        success: true,
        message: `Device 2 has ${device2Bookings.length} bookings`,
        details: { count: device2Bookings.length },
        timestamp: new Date().toISOString()
      },
      consistency: consistencyResult.success,
      message: consistencyResult.message
    };
  } catch (error) {
    return {
      device1: {
        success: false,
        message: 'Device 1 test failed',
        details: error,
        timestamp: new Date().toISOString()
      },
      device2: {
        success: false,
        message: 'Device 2 test failed',
        details: error,
        timestamp: new Date().toISOString()
      },
      consistency: false,
      message: `Cross-device test error: ${error}`
    };
  }
};