import React, { useState } from 'react';
import { Bell, BellOff, TestTube, RotateCcw } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { User } from '../types';

interface NotificationSettingsProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  user,
  isOpen,
  onClose,
}) => {
  const {
    isSupported,
    permission,
    isLoading,
    requestPermission,
    showTestNotification,
    resetPermission,
  } = useNotifications(user);

  const [testNotificationLoading, setTestNotificationLoading] = useState(false);

  const handleRequestPermission = async () => {
    try {
      await requestPermission();
    } catch (error) {
      console.error('Failed to request permission:', error);
    }
  };

  const handleTestNotification = async () => {
    setTestNotificationLoading(true);
    try {
      await showTestNotification();
    } catch (error) {
      console.error('Failed to show test notification:', error);
    } finally {
      setTestNotificationLoading(false);
    }
  };

  const handleResetPermission = () => {
    resetPermission();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Notification Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Notification Support Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center">
              {isSupported ? (
                <Bell className="w-5 h-5 text-green-500 mr-3" />
              ) : (
                <BellOff className="w-5 h-5 text-red-500 mr-3" />
              )}
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Browser Support
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isSupported
                    ? 'Notifications are supported'
                    : 'Notifications are not supported in this browser'
                  }
                </p>
              </div>
            </div>
            <div className={`w-3 h-3 rounded-full ${isSupported ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>

          {/* Permission Status */}
          {isSupported && (
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center">
                {permission === 'granted' ? (
                  <Bell className="w-5 h-5 text-green-500 mr-3" />
                ) : permission === 'denied' ? (
                  <BellOff className="w-5 h-5 text-red-500 mr-3" />
                ) : (
                  <Bell className="w-5 h-5 text-yellow-500 mr-3" />
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Permission Status
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {permission === 'granted'
                      ? 'Notifications are enabled'
                      : permission === 'denied'
                      ? 'Notifications are blocked'
                      : 'Permission not requested yet'
                    }
                  </p>
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full ${
                permission === 'granted'
                  ? 'bg-green-500'
                  : permission === 'denied'
                  ? 'bg-red-500'
                  : 'bg-yellow-500'
              }`} />
            </div>
          )}

          {/* Action Buttons */}
          {isSupported && (
            <div className="space-y-3">
              {permission !== 'granted' && (
                <button
                  onClick={handleRequestPermission}
                  disabled={isLoading || permission === 'denied'}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Requesting...
                    </>
                  ) : permission === 'denied' ? (
                    'Permission Denied'
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      Enable Notifications
                    </>
                  )}
                </button>
              )}

              {permission === 'granted' && (
                <button
                  onClick={handleTestNotification}
                  disabled={testNotificationLoading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                >
                  {testNotificationLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <TestTube className="w-4 h-4 mr-2" />
                      Send Test Notification
                    </>
                  )}
                </button>
              )}

              <button
                onClick={handleResetPermission}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Permission
              </button>
            </div>
          )}

          {/* Information */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              About Notifications
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Get instant alerts for booking requests and approvals</li>
              <li>• Stay updated on your booking status in real-time</li>
              <li>• Notifications work even when the app is in the background</li>
              <li>• You can change these settings anytime</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;