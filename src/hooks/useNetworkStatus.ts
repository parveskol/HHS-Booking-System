import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
  lastOnline: Date | null;
}

export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isSlowConnection: false,
    connectionType: 'unknown',
    lastOnline: null
  });

  useEffect(() => {
    const updateNetworkStatus = () => {
      const isOnline = navigator.onLine;
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

      setNetworkStatus(prev => ({
        isOnline,
        isSlowConnection: connection ? (
          connection.effectiveType === 'slow-2g' ||
          connection.effectiveType === '2g' ||
          connection.rtt > 300
        ) : false,
        connectionType: connection?.effectiveType || 'unknown',
        lastOnline: isOnline ? new Date() : prev.lastOnline
      }));
    };

    const handleOnline = () => {
      updateNetworkStatus();
    };

    const handleOffline = () => {
      updateNetworkStatus();
    };

    // Initial status
    updateNetworkStatus();

    // Event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes if available
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, []);

  return networkStatus;
};

export default useNetworkStatus;