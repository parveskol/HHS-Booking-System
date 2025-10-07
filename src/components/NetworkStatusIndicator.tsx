import React from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { Wifi, WifiOff, AlertTriangle, Clock } from 'lucide-react';

interface NetworkStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  className = '',
  showDetails = false
}) => {
  const { isOnline, isSlowConnection, connectionType, lastOnline } = useNetworkStatus();

  if (isOnline && !isSlowConnection) {
    return null; // Don't show anything when online and fast
  }

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />;
    if (isSlowConnection) return <AlertTriangle className="w-4 h-4" />;
    return <Wifi className="w-4 h-4" />;
  };

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-500 bg-red-50 border-red-200';
    if (isSlowConnection) return 'text-yellow-500 bg-yellow-50 border-yellow-200';
    return 'text-green-500 bg-green-50 border-green-200';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isSlowConnection) return 'Slow Connection';
    return 'Online';
  };

  const formatLastOnline = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className={`fixed top-4 right-4 z-50 border rounded-lg px-3 py-2 shadow-lg backdrop-blur-sm ${getStatusColor()} ${className}`}>
      <div className="flex items-center space-x-2">
        {getStatusIcon()}
        <div className="flex flex-col">
          <span className="text-sm font-medium">{getStatusText()}</span>
          {showDetails && (
            <div className="text-xs text-gray-600">
              {isOnline ? (
                <div className="flex items-center space-x-1">
                  <span>{connectionType}</span>
                  {isSlowConnection && <Clock className="w-3 h-3" />}
                </div>
              ) : (
                <span>Last online: {formatLastOnline(lastOnline)}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Offline mode indicator */}
      {!isOnline && (
        <div className="mt-2 text-xs text-gray-600 bg-white/50 rounded px-2 py-1">
          <div className="flex items-center space-x-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Changes will sync when online</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkStatusIndicator;