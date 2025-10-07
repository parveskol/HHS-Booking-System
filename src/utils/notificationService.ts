/**
 * Notification Service for Browser Push Notifications
 * Handles permission requests and notification display for booking system
 */

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
}

export interface NotificationPermissionState {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

class NotificationService {
  private static instance: NotificationService;
  private permissionRequested: boolean = false;

  private constructor() {
    this.checkNotificationSupport();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Check if browser supports notifications
   */
  private checkNotificationSupport(): void {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported. Notifications may not work properly.');
    }
  }

  /**
   * Request notification permission from user
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Browser does not support notifications');
    }

    if (this.permissionRequested) {
      return Notification.permission;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionRequested = true;

      console.log('Notification permission:', permission);

      if (permission === 'granted') {
        // Save permission status
        localStorage.setItem('notificationPermission', 'granted');
        console.log('✅ Notification permission granted');
      } else if (permission === 'denied') {
        localStorage.setItem('notificationPermission', 'denied');
        console.log('❌ Notification permission denied');
      } else {
        localStorage.setItem('notificationPermission', 'default');
        console.log('⏸️ Notification permission default (dismissed)');
      }

      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      throw error;
    }
  }

  /**
   * Check current notification permission status
   */
  public getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Check if notifications are supported and permitted
   */
  public canNotify(): boolean {
    return 'Notification' in window &&
           Notification.permission === 'granted';
  }

  /**
   * Show a notification
   */
  public async showNotification(options: NotificationOptions): Promise<Notification | null> {
    console.log('🔔 Attempting to show notification:', options.title);
    console.log('📊 Notification permission status:', this.getPermissionStatus());
    console.log('🔧 Can notify:', this.canNotify());

    if (!this.canNotify()) {
      console.warn('❌ Cannot show notification: permission not granted or not supported');
      console.warn('🔍 Debugging info:', {
        notificationSupported: 'Notification' in window,
        permission: Notification.permission,
        canNotify: this.canNotify()
      });

      // Try to request permission if it's in default state
      if (Notification.permission === 'default') {
        console.log('🔄 Permission is default, requesting permission...');
        try {
          const permission = await this.requestPermission();
          if (permission === 'granted') {
            console.log('✅ Permission granted after request, retrying notification...');
            return this.showNotification(options);
          }
        } catch (error) {
          console.error('❌ Failed to request permission:', error);
        }
      }
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || 'logo.png',
        badge: options.badge || 'logo.png',
        tag: options.tag || 'booking-notification',
        data: options.data,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
      });

      console.log('✅ Notification shown successfully:', options.title);

      // Auto-close notification after 5 seconds unless it requires interaction
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      // Handle notification click
      notification.onclick = () => {
        console.log('🔔 Notification clicked:', options.title);
        notification.close();

        // Focus the window if it's already open
        window.focus();

        // You can add custom click handling here
        if (options.data?.onClick) {
          options.data.onClick();
        }
      };

      return notification;
    } catch (error) {
      console.error('❌ Error showing notification:', error);
      return null;
    }
  }

  /**
   * Show booking request notification for management users
   */
  public async showBookingRequestNotification(requestData: {
    customerName: string;
    customerEmail: string;
    date: string;
    system: string;
    bookingType: string;
    eventType: string;
    requestNumber: string;
  }): Promise<Notification | null> {
    const title = 'New Booking Request';
    const body = `Request from ${requestData.customerName} for ${requestData.system} system on ${requestData.date}`;

    return this.showNotification({
      title,
      body,
      tag: `booking-request-${requestData.requestNumber}`,
      data: {
        type: 'booking_request',
        requestNumber: requestData.requestNumber,
        customerName: requestData.customerName,
        date: requestData.date,
        system: requestData.system,
        onClick: () => {
          // Navigate to bookings view
          const event = new CustomEvent('navigateToBookings', {
            detail: { type: 'booking_request' }
          });
          window.dispatchEvent(event);
        }
      },
      requireInteraction: true,
    });
  }

  /**
   * Show booking approval notification for customers
   */
  public async showBookingApprovalNotification(bookingData: {
    customerName: string;
    date: string;
    system: string;
    bookingType: string;
    requestNumber: string;
  }): Promise<Notification | null> {
    const title = 'Booking Approved! 🎉';
    const body = `Your booking request ${bookingData.requestNumber} for ${bookingData.system} system on ${bookingData.date} has been approved!`;

    return this.showNotification({
      title,
      body,
      tag: `booking-approval-${bookingData.requestNumber}`,
      data: {
        type: 'booking_approval',
        requestNumber: bookingData.requestNumber,
        customerName: bookingData.customerName,
        date: bookingData.date,
        system: bookingData.system,
        onClick: () => {
          // Navigate to bookings tracker
          const event = new CustomEvent('navigateToBookingsTracker', {
            detail: { type: 'booking_approval' }
          });
          window.dispatchEvent(event);
        }
      },
      requireInteraction: true,
    });
  }

  /**
    * Show booking rejection notification for customers
    */
  public async showBookingRejectionNotification(bookingData: {
    customerName: string;
    date: string;
    system: string;
    requestNumber: string;
  }): Promise<Notification | null> {
    const title = 'Booking Request Update';
    const body = `Your booking request ${bookingData.requestNumber} for ${bookingData.system} system on ${bookingData.date} needs attention.`;

    return this.showNotification({
      title,
      body,
      tag: `booking-rejection-${bookingData.requestNumber}`,
      data: {
        type: 'booking_rejection',
        requestNumber: bookingData.requestNumber,
        customerName: bookingData.customerName,
        date: bookingData.date,
        system: bookingData.system,
        onClick: () => {
          // Navigate to bookings tracker
          const event = new CustomEvent('navigateToBookingsTracker', {
            detail: { type: 'booking_rejection' }
          });
          window.dispatchEvent(event);
        }
      },
      requireInteraction: true,
    });
  }

  /**
    * Show new booking notification for admin/management users
    */
  public async showNewBookingNotification(bookingData: {
    customerName: string;
    date: string;
    system: string;
    bookingType: string;
    eventType: string;
  }): Promise<Notification | null> {
    const title = 'New Booking Added';
    const body = `Booking for ${bookingData.customerName} - ${bookingData.system} system on ${bookingData.date}`;

    return this.showNotification({
      title,
      body,
      tag: `new-booking-${bookingData.customerName}-${bookingData.date}`,
      data: {
        type: 'new_booking',
        customerName: bookingData.customerName,
        date: bookingData.date,
        system: bookingData.system,
        bookingType: bookingData.bookingType,
        eventType: bookingData.eventType,
        onClick: () => {
          // Navigate to bookings view
          const event = new CustomEvent('navigateToBookings', {
            detail: { type: 'new_booking' }
          });
          window.dispatchEvent(event);
        }
      },
      requireInteraction: true,
    });
  }

  /**
   * Initialize notification service and request permission if needed
   */
  public async initialize(): Promise<void> {
    console.log('🔧 Initializing notification service...');

    // Check if we already have permission stored
    const storedPermission = localStorage.getItem('notificationPermission');

    if (storedPermission === 'granted') {
      console.log('✅ Notification permission already granted');
      return;
    }

    if (storedPermission === 'denied') {
      console.log('❌ Notification permission previously denied');
      return;
    }

    // Request permission for first-time users
    try {
      await this.requestPermission();
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  /**
   * Reset notification permission (for testing or user preference changes)
   */
  public resetPermission(): void {
    localStorage.removeItem('notificationPermission');
    this.permissionRequested = false;
    console.log('🔄 Notification permission reset');
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Export factory function for creating new instances if needed
export const createNotificationService = (): NotificationService => {
  return NotificationService.getInstance();
};