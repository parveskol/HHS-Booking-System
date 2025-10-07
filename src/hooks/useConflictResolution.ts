import { useState, useCallback } from 'react';
import { Booking } from '../types';
import { detectConflicts, resolveConflict, ConflictResolution } from '../utils/dataValidation';

export interface SyncConflict {
  id: string;
  localData: Booking;
  serverData: Booking;
  conflicts: string[];
  resolution?: ConflictResolution;
  timestamp: string;
}

export const useConflictResolution = () => {
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [isResolving, setIsResolving] = useState(false);

  const detectSyncConflicts = useCallback((
    localBookings: Booking[],
    serverBookings: Booking[]
  ): SyncConflict[] => {
    const syncConflicts: SyncConflict[] = [];

    // Create maps for efficient lookup
    const localMap = new Map(localBookings.map(b => [b.id, b]));
    const serverMap = new Map(serverBookings.map(b => [b.id, b]));

    // Check for conflicts in bookings that exist in both local and server
    const allIds = new Set([...localMap.keys(), ...serverMap.keys()]);

    for (const id of allIds) {
      const localBooking = localMap.get(id);
      const serverBooking = serverMap.get(id);

      if (localBooking && serverBooking) {
        const fieldConflicts = detectConflicts(localBooking, serverBooking);

        if (fieldConflicts.length > 0) {
          syncConflicts.push({
            id: `conflict_${id}_${Date.now()}`,
            localData: localBooking,
            serverData: serverBooking,
            conflicts: fieldConflicts,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    return syncConflicts;
  }, []);

  const resolveConflicts = useCallback(async (
    conflictsToResolve: SyncConflict[],
    strategy: ConflictResolution['strategy'] = 'server_wins'
  ): Promise<Booking[]> => {
    setIsResolving(true);

    try {
      const resolvedBookings: Booking[] = [];

      for (const conflict of conflictsToResolve) {
        const resolution = resolveConflict(
          conflict.localData,
          conflict.serverData,
          strategy
        );

        if (resolution.resolvedData) {
          resolvedBookings.push(resolution.resolvedData);
        }

        // Update the conflict with resolution
        setConflicts(prev => prev.map(c =>
          c.id === conflict.id
            ? { ...c, resolution }
            : c
        ));
      }

      return resolvedBookings;
    } finally {
      setIsResolving(false);
    }
  }, []);

  const addConflict = useCallback((conflict: SyncConflict) => {
    setConflicts(prev => [...prev, conflict]);
  }, []);

  const removeConflict = useCallback((conflictId: string) => {
    setConflicts(prev => prev.filter(c => c.id !== conflictId));
  }, []);

  const clearConflicts = useCallback(() => {
    setConflicts([]);
  }, []);

  const getUnresolvedConflicts = useCallback(() => {
    return conflicts.filter(c => !c.resolution);
  }, [conflicts]);

  const getResolvedConflicts = useCallback(() => {
    return conflicts.filter(c => c.resolution);
  }, [conflicts]);

  return {
    conflicts,
    isResolving,
    detectSyncConflicts,
    resolveConflicts,
    addConflict,
    removeConflict,
    clearConflicts,
    getUnresolvedConflicts,
    getResolvedConflicts
  };
};

export default useConflictResolution;