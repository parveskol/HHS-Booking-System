import React, { useState, useEffect, useContext } from 'react';
import { X, Share, Download, Smartphone, Zap, Shield, Calendar, Users, BarChart3, Star, CheckCircle } from 'lucide-react';
import { AppContext } from '../context/AppContext';

interface InstallPromptProps {
  deferredPrompt: any;
  onInstallClick: () => void;
  userRole?: string;
}

const InstallPrompt: React.FC<InstallPromptProps> = ({ deferredPrompt, onInstallClick, userRole }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [appName, setAppName] = useState('HHS Booking');
  const [showFeatures, setShowFeatures] = useState(false);

  useEffect(() => {
    // Set app name based on user role
    if (userRole === 'customer') {
      setAppName('HHS Booking');
    } else if (userRole === 'admin' || userRole === 'management') {
      setAppName('Booking Management');
    } else {
      setAppName('HHS Booking');
    }

    // Check if the prompt was already dismissed in the current session
    const dismissedInSession = sessionStorage.getItem(`installPromptDismissed-${userRole || 'default'}`);
    if (dismissedInSession) {
      setIsVisible(false);
      return;
    }

    // Detect if the user is on an iOS device
    const isDeviceIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    // Check if the app is already running in standalone mode (installed)
    const isInStandaloneMode = 'standalone' in window.navigator && (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;

    if (deferredPrompt && !isInStandaloneMode) {
      // Standard PWA installation prompt is available
      setIsVisible(true);
      setIsIos(false);
    } else if (isDeviceIos && !isInStandaloneMode) {
      // Fallback for iOS devices
      setIsVisible(true);
      setIsIos(true);
    }
  }, [deferredPrompt, userRole]);

  useEffect(() => {
    // Animate features after popup appears
    if (isVisible) {
      const timer = setTimeout(() => setShowFeatures(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleDismiss = () => {
    // Store the dismissal state in session storage with role-specific key
    sessionStorage.setItem(`installPromptDismissed-${userRole || 'default'}`, 'true');
    setIsVisible(false);
  };

  const handleInstall = () => {
    onInstallClick();
    // The prompt will automatically close on success, but we can hide our banner as well.
    // However, keeping it allows the user to retry if they accidentally close the native prompt.
    // They can always dismiss it with the 'X' button.
  };

  if (!isVisible) {
    return null;
  }

  const isCustomer = userRole === 'customer';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full mx-auto overflow-hidden animate-bounce-in border border-gray-200 dark:border-gray-700">
        {/* Header with gradient background */}
        <div className={`relative ${isCustomer ? 'bg-gradient-to-br from-orange-500 to-red-500' : 'bg-gradient-to-br from-blue-600 to-indigo-600'} p-6 text-white overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 animate-float"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12 animate-float delay-1000"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img src="logo.png" alt="App Logo" className="h-12 w-12 rounded-xl shadow-lg" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold">{appName}</h3>
                  <p className="text-white/90 text-sm">Progressive Web App</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                aria-label="Dismiss install prompt"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex items-center space-x-2 mb-4">
              <Smartphone className="w-5 h-5" />
              <span className="text-sm font-medium">Install for the best experience</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
              {isCustomer ? '🚀 Book Facilities Faster' : '⚡ Manage Bookings Efficiently'}
            </h4>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              {isCustomer
                ? 'Get instant access to book sports facilities, track your reservations, and receive real-time updates - all from your home screen!'
                : 'Streamline your workflow with powerful management tools, real-time analytics, and instant notifications - right at your fingertips!'
              }
            </p>
          </div>

          {/* Features */}
          <div className={`space-y-3 mb-6 transition-all duration-500 ${showFeatures ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {isCustomer ? (
              <>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors duration-200 animate-slide-up-fade delay-200">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Instant booking confirmations</span>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200 animate-slide-up-fade delay-300">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Real-time availability updates</span>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors duration-200 animate-slide-up-fade delay-400">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Offline access & push notifications</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200 animate-slide-up-fade delay-200">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Advanced analytics & reporting</span>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors duration-200 animate-slide-up-fade delay-300">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Comprehensive customer management</span>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors duration-200 animate-slide-up-fade delay-400">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enterprise-grade security</span>
                </div>
              </>
            )}
          </div>

          {/* iOS Instructions */}
          {isIos && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4 animate-slide-up-fade delay-500">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                  <Share className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-semibold text-blue-800 dark:text-blue-200 text-sm">iPhone/iPad Installation Guide</span>
              </div>
              <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500 dark:text-blue-400 font-bold">1.</span>
                  <span>Tap the share button <Share size={14} className="inline-block mx-1" /> in Safari's toolbar (square with arrow pointing up)</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500 dark:text-blue-400 font-bold">2.</span>
                  <span>Scroll down and tap "Add to Home Screen"</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500 dark:text-blue-400 font-bold">3.</span>
                  <span>Tap "Add" in the top-right corner to install</span>
                </div>
                <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-800/50 rounded-lg">
                  <p className="text-xs text-blue-600 dark:text-blue-300">
                    💡 <strong>Tip:</strong> Look for the app icon on your home screen after installation!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {!isIos && deferredPrompt && (
              <button
                onClick={handleInstall}
                className={`flex-1 ${isCustomer
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                } text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 animate-pulse-glow`}
              >
                <Download className="w-5 h-5" />
                <span>Install App</span>
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;