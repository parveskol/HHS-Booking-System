import { useState, useEffect, useCallback } from 'react';
import { Booking } from '../types';
import { validateBookingData, validateBookingRequestData, sanitizeBookingData } from '../utils/dataValidation';

interface OfflineStorageData {
  id: string;
  bookings: Booking[];
  bookingRequests: Booking[];
  lastSync: string;
  pendingOperations: PendingOperation[];
}

interface PendingOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  table: 'bookings' | 'booking_requests';
  data: any;
  timestamp: string;
}

const DB_NAME = 'HHSBookings';
const DB_VERSION = 1;
const STORE_NAMES = {
  DATA: 'offlineData',
  PENDING: 'pendingOperations'
};

class OfflineStorageManager {
  private db: IDBDatabase | null = null;

  async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create stores if they don't exist
        if (!db.objectStoreNames.contains(STORE_NAMES.DATA)) {
          const dataStore = db.createObjectStore(STORE_NAMES.DATA, { keyPath: 'id' });
          dataStore.createIndex('lastSync', 'lastSync', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_NAMES.PENDING)) {
          const pendingStore = db.createObjectStore(STORE_NAMES.PENDING, { keyPath: 'id' });
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
          pendingStore.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  async getData(): Promise<OfflineStorageData> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAMES.DATA], 'readonly');
      const store = transaction.objectStore(STORE_NAMES.DATA);
      const request = store.get('main');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result || {
          id: 'main',
          bookings: [],
          bookingRequests: [],
          lastSync: new Date().toISOString(),
          pendingOperations: []
        };
        resolve(result);
      };
    });
  }

  async saveData(data: OfflineStorageData): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAMES.DATA], 'readwrite');
      const store = transaction.objectStore(STORE_NAMES.DATA);
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async addPendingOperation(operation: PendingOperation): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAMES.PENDING], 'readwrite');
      const store = transaction.objectStore(STORE_NAMES.PENDING);
      const request = store.add(operation);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getPendingOperations(): Promise<PendingOperation[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAMES.PENDING], 'readonly');
      const store = transaction.objectStore(STORE_NAMES.PENDING);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async removePendingOperation(id: string): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAMES.PENDING], 'readwrite');
      const store = transaction.objectStore(STORE_NAMES.PENDING);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearAllPendingOperations(): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAMES.PENDING], 'readwrite');
      const store = transaction.objectStore(STORE_NAMES.PENDING);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

const offlineStorage = new OfflineStorageManager();

export const useOfflineStorage = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineData, setOfflineData] = useState<OfflineStorageData | null>(null);
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when coming back online
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load offline data on mount
  useEffect(() => {
    loadOfflineData();
  }, []);

  const loadOfflineData = async () => {
    try {
      const data = await offlineStorage.getData();
      setOfflineData(data);

      const pending = await offlineStorage.getPendingOperations();
      setPendingOperations(pending);
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  };

  const saveOfflineData = async (data: OfflineStorageData) => {
    try {
      // Validate all booking data before saving
      const validatedBookings: Booking[] = data.bookings.map(booking => {
        const validation = validateBookingData(booking);
        if (!validation.isValid) {
          console.warn('Invalid booking data detected:', validation.errors);
        }
        return sanitizeBookingData(booking) as Booking;
      });

      // Validate all booking request data before saving
      const validatedRequests: Booking[] = data.bookingRequests.map(request => {
        const validation = validateBookingRequestData(request);
        if (!validation.isValid) {
          console.warn('Invalid request data detected:', validation.errors);
        }
        return sanitizeBookingData(request) as Booking;
      });

      const validatedData = {
        ...data,
        bookings: validatedBookings,
        bookingRequests: validatedRequests
      };

      await offlineStorage.saveData(validatedData);
      setOfflineData(validatedData);
    } catch (error) {
      console.error('Failed to save offline data:', error);
    }
  };

  const addPendingOperation = async (operation: Omit<PendingOperation, 'id' | 'timestamp'>) => {
    try {
      const fullOperation: PendingOperation = {
        ...operation,
        id: `${operation.type}_${operation.table}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      };

      await offlineStorage.addPendingOperation(fullOperation);
      setPendingOperations(prev => [...prev, fullOperation]);
      return fullOperation;
    } catch (error) {
      console.error('Failed to add pending operation:', error);
      throw error;
    }
  };

  const syncOfflineData = async () => {
    if (!isOnline) return;

    try {
      const pending = await offlineStorage.getPendingOperations();

      for (const operation of pending) {
        try {
          await processPendingOperation(operation);
          await offlineStorage.removePendingOperation(operation.id);
        } catch (error) {
          console.error(`Failed to sync operation ${operation.id}:`, error);
        }
      }

      // Reload pending operations
      const updatedPending = await offlineStorage.getPendingOperations();
      setPendingOperations(updatedPending);

    } catch (error) {
      console.error('Failed to sync offline data:', error);
    }
  };

  const processPendingOperation = async (operation: PendingOperation) => {
    // This will be implemented to sync with Supabase
    console.log('Processing pending operation:', operation);
    // Implementation depends on the specific sync logic needed
  };

  const clearOfflineData = async () => {
    try {
      const emptyData: OfflineStorageData = {
        id: 'main',
        bookings: [],
        bookingRequests: [],
        lastSync: new Date().toISOString(),
        pendingOperations: []
      };
      await offlineStorage.saveData(emptyData);
      await offlineStorage.clearAllPendingOperations();
      setOfflineData(emptyData);
      setPendingOperations([]);
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  };

  return {
    isOnline,
    offlineData,
    pendingOperations,
    saveOfflineData,
    addPendingOperation,
    syncOfflineData,
    clearOfflineData,
    loadOfflineData
  };
};

export default useOfflineStorage;