import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../utils/notificationService';
import { User } from '../types';

interface UseNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  isLoading: boolean;
  requestPermission: () => Promise<NotificationPermission>;
  showTestNotification: () => Promise<void>;
  resetPermission: () => void;
}

export const useNotifications = (user: User | null): UseNotificationsReturn => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);

  // Check if notifications are supported
  const isSupported = 'Notification' in window;

  // Update permission state when it changes
  useEffect(() => {
    const updatePermission = () => {
      setPermission(notificationService.getPermissionStatus());
    };

    updatePermission();

    // Listen for permission changes
    const handlePermissionChange = () => updatePermission();
    window.addEventListener('notificationpermissionchange', handlePermissionChange);

    return () => {
      window.removeEventListener('notificationpermissionchange', handlePermissionChange);
    };
  }, []);

  // Initialize notifications when user logs in
  useEffect(() => {
    if (user && isSupported) {
      const initializeNotifications = async () => {
        setIsLoading(true);
        try {
          await notificationService.initialize();
          setPermission(notificationService.getPermissionStatus());
        } catch (error) {
          console.error('Failed to initialize notifications:', error);
        } finally {
          setIsLoading(false);
        }
      };

      initializeNotifications();
    }
  }, [user, isSupported]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      throw new Error('Notifications are not supported in this browser');
    }

    setIsLoading(true);
    try {
      const result = await notificationService.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const showTestNotification = useCallback(async (): Promise<void> => {
    if (!notificationService.canNotify()) {
      throw new Error('Notification permission not granted');
    }

    await notificationService.showNotification({
      title: 'Test Notification',
      body: 'Notifications are working correctly!',
      tag: 'test-notification',
    });
  }, []);

  const resetPermission = useCallback((): void => {
    notificationService.resetPermission();
    setPermission('default');
  }, []);

  return {
    isSupported,
    permission,
    isLoading,
    requestPermission,
    showTestNotification,
    resetPermission,
  };
};