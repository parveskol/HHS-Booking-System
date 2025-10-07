import React, { useState, useContext, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { AppContext, BookingSystem } from './context/AppContext';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import CustomerLogin from './components/CustomerLogin';
import CalendarView from './components/CalendarView';
import CustomerCalendarView from './components/CustomerCalendarView';
import DashboardView from './components/DashboardView';
import BookingsView from './components/BookingsView';
import CustomersView from './components/CustomersView';
import BookingModal from './components/BookingModal';
import BookingRequestModal from './components/BookingRequestModal';
import CustomerBookingRequestModal from './components/CustomerBookingRequestModal';
import CustomerBookingTracker from './components/CustomerBookingTrackerNew';
import BookingGateway from './components/BookingGateway';
import InstallPrompt from './components/InstallPrompt';
import ExitConfirmationDialog from './components/ExitConfirmationDialog';
import NotificationSettings from './components/NotificationSettings';
import SpecialDatesManager from './components/SpecialDatesManager';
import { usePWAExitHandler } from './hooks/usePWAExitHandler';
import { LogOut, Sun, Moon, LayoutDashboard, Calendar as CalendarIcon, BookCopy, Users, X, Power } from 'lucide-react';
import { Booking, BookingStatus } from './types';
import { notificationService } from './utils/notificationService';
import CricketGroundIcon from './components/CricketGroundIcon';
import IndoorNetIcon from './components/IndoorNetIcon';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Something went wrong
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                The application encountered an unexpected error. Please refresh the page to continue.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-brand-orange text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                <span>Refresh Page</span>
              </button>
              <details className="text-left">
                <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  Technical Details
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                  {this.state.error?.message}
                </pre>
              </details>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

type View = 'dashboard' | 'calendar' | 'bookings' | 'customers' | 'my-requests';

type LoginScreen = 'landing' | 'customer' | 'admin';

// Internal App component
const AppContent: React.FC = () => {
  const { user, logout, theme, toggleTheme, bookings, bookingRequests, pendingRequestCount, isLoading, addBookingRequest, approveBookingRequest, rejectBookingRequest, deleteBookingRequest, refreshData, refreshDataSilent } = useContext(AppContext);

  // Enhanced logout function to clear remember me data
  const handleLogout = () => {
    // Clear customer remember me data when logging out
    localStorage.removeItem('customerName');
    localStorage.removeItem('customerEmail');
    localStorage.removeItem('customerRememberMe');
    localStorage.removeItem('customerLastLoginTime');
    localStorage.removeItem('customerSelectedSystem'); // Clear system preference
    localStorage.setItem('customerLogout', 'true'); // Signal to login component to clear data

    // Clear the logout signal after a short delay
    setTimeout(() => {
      localStorage.removeItem('customerLogout');
    }, 1000);

    // Reset gateway state on logout
    setShowGateway(false);

    console.log('🔐 Cleared customer remember me data and system preference on logout');
    logout();
  };

  const handleGatewaySelection = (system: 'ground' | 'net') => {
    setActiveSystem(system);
    setShowGateway(false);

    // Save customer's system preference to localStorage
    localStorage.setItem('customerSelectedSystem', system);
    console.log(`💾 Saved customer system preference: ${system}`);

    // Navigate to dashboard (main app) after gateway selection
    setCurrentViewState('dashboard');
  };
  const [currentView, setCurrentViewState] = useState<View>('dashboard');
  const [tabLoadingStates, setTabLoadingStates] = useState<{[key in View]?: boolean}>({});

  // Reset to appropriate default view when user logs in
  useEffect(() => {
    if (user) {
      // Show gateway for customers first, then dashboard for others
      if (user.role === 'customer') {
        // Check if customer has already selected a system preference
        const savedSystem = localStorage.getItem('customerSelectedSystem');
        if (savedSystem && (savedSystem === 'ground' || savedSystem === 'net')) {
          // Customer has already selected a system, use it
          setActiveSystem(savedSystem as 'ground' | 'net');
          setShowGateway(false);
          setCurrentViewState('dashboard');
            // Current view is managed locally now
        } else {
          // First time login, show gateway
          setShowGateway(true);
        }
      } else {
        setCurrentViewState('dashboard');
        // Current view is managed locally now
      }
    }
  }, [user]);
  const [activeSystem, setActiveSystem] = useState<BookingSystem>('ground');
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [systemAnimationClass, setSystemAnimationClass] = useState('animate-fadeIn');
  const [loginScreen, setLoginScreen] = useState<LoginScreen>('landing');
  const [showGateway, setShowGateway] = useState(false);
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [currentManifest, setCurrentManifest] = useState('/manifest.json');

  const [bookingsDateFilter, setBookingsDateFilter] = useState<{ start: string, end: string } | null>(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // PWA Exit Handler
  const {
    navigationState,
    showExitDialog,
    exitDialogType,
    addToHistory,
    navigateBack,
    updateBrowserHistory,
    confirmExit,
    cancelExit,
    triggerExit,
  } = usePWAExitHandler({
    onExit: async () => {
      console.log('🚪 Initiating PWA exit process...');

      try {
        // Strategy 1: Try to close via service worker communication first
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.ready;
            if (registration && registration.active) {
              console.log('📡 Sending exit command to service worker...');
              registration.active.postMessage({
                type: 'EXIT_APP',
                timestamp: Date.now(),
                url: window.location.href
              });

              // Wait for service worker to process
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } catch (swError) {
            console.log('Service worker exit failed:', swError);
          }
        }

        // Strategy 2: React Native WebView exit (if in React Native context)
        if ((window as any).ReactNativeWebView) {
          console.log('📱 React Native WebView detected, sending exit message...');
          (window as any).ReactNativeWebView.postMessage(JSON.stringify({
            type: 'EXIT_APP',
            timestamp: Date.now()
          }));
          return;
        }

        // Strategy 3: Trusted Web Activity (Android) exit
        if ((window as any).twaExitApp) {
          console.log('🤖 Trusted Web Activity detected, using TWA exit...');
          (window as any).twaExitApp();
          return;
        }

        // Strategy 4: PWA installed as standalone app
        if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
          console.log('📱 Standalone PWA detected, attempting native exit...');

          // Try multiple exit methods for standalone PWA
          const exitMethods = [
            () => window.close(),
            () => { throw new Error('close failed'); }
          ];

          for (const method of exitMethods) {
            try {
              method();
              console.log('✅ Exit method successful');
              return;
            } catch (error) {
              console.log('❌ Exit method failed:', error);
            }
          }
        }

        // Strategy 5: Fallback - redirect to blank page
        console.log('🔄 Using fallback exit method...');
        window.location.href = 'about:blank';

      } catch (error) {
        console.error('💥 Exit process failed:', error);
        // Final fallback
        window.location.href = 'about:blank';
      }
    },
    onNavigateBack: (previousView: string) => {
      setCurrentViewState(previousView as View);
    },
    isMobile,
  });

  // Initialize navigation history for mobile PWA
  useEffect(() => {
    if (isMobile && user && currentView) {
      // Initialize history with current view
      addToHistory(currentView);
      updateBrowserHistory(currentView);
    }
  }, [isMobile, user, currentView, addToHistory, updateBrowserHistory]);

  // Current view is managed locally now - no sync needed

  // Initialize notification service when user logs in
  useEffect(() => {
    if (user) {
      const initializeNotifications = async () => {
        try {
          console.log('🔧 Initializing notification service for user:', user.name);
          await notificationService.initialize();
          console.log('✅ Notification service initialized successfully');
        } catch (error) {
          console.error('❌ Failed to initialize notification service:', error);
        }
      };

      initializeNotifications();
    }
  }, [user]);

  // Handle notification click navigation
  useEffect(() => {
    const handleNotificationNavigation = (event: CustomEvent) => {
      const { type } = event.detail || {};

      switch (type) {
        case 'booking_request':
          if (user?.role === 'admin' || user?.role === 'management') {
            handleSetView('bookings');
          }
          break;
        case 'booking_approval':
        case 'booking_rejection':
          if (user?.role === 'customer') {
            handleSetView('bookings');
          }
          break;
        default:
          console.log('Unknown notification navigation type:', type);
      }
    };

    const events = ['navigateToBookings', 'navigateToBookingsTracker'];
    events.forEach(eventName => {
      window.addEventListener(eventName, handleNotificationNavigation as EventListener);
    });

    return () => {
      events.forEach(eventName => {
        window.removeEventListener(eventName, handleNotificationNavigation as EventListener);
      });
    };
  }, [user]);

  useEffect(() => {
    // Update manifest based on user role
    if (user?.role === 'customer') {
      setCurrentManifest('/manifest-customer.json');
    } else {
      setCurrentManifest('/manifest.json');
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Disable browser's beforeunload warning dialogs
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Don't show any warning dialogs by not preventing default
      // This disables both "Leave site?" and "Reload site?" warnings
      return undefined;
    };

    // Also handle pagehide event for more comprehensive coverage
    const handlePageHide = (e: PageTransitionEvent) => {
      // Ensure no warnings are shown during page transitions
      return undefined;
    };

    // Handle visibility change to prevent warnings when switching tabs
    const handleVisibilityChange = () => {
      // This helps prevent warnings when the page becomes hidden
      if (document.hidden) {
        // Page is hidden, ensure no warnings when it becomes visible again
        return undefined;
      }
    };

    // Handle unload event for immediate page unload scenarios
    const handleUnload = () => {
      // Ensure clean unload without warnings
      return undefined;
    };

    // Override history methods to prevent unsaved changes detection
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      return originalPushState.apply(history, args);
    };

    history.replaceState = function(...args) {
      return originalReplaceState.apply(history, args);
    };

    // Comprehensive event listener setup for all page unload scenarios
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('unload', handleUnload);

    // Additional handlers for edge cases
    const handlePopState = () => {
      // Handle browser back/forward navigation
      return undefined;
    };

    window.addEventListener('popstate', handlePopState);

    const registerSW = () => {
      if ('serviceWorker' in navigator) {
        let isRefreshing = false;

        // Reload once when the new SW activates to prevent stale caches/UI hangs
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (isRefreshing) {
            return;
          }
          isRefreshing = true;
          window.location.reload();
        });

        navigator.serviceWorker.register('/service-worker.js').then(registration => {
          // If a worker is waiting (updated), tell it to activate immediately
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }

          // When a new worker is found, ask it to skip waiting after install
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) {
              return;
            }

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
                }
              }
            });
          });

          // Send Supabase credentials to service worker for offline sync
          if (registration.active) {
            registration.active.postMessage({
              type: 'SUPABASE_CREDENTIALS',
              supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
              supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY
            });
          }
        }).catch(() => {
          // Silent fail for service worker registration
        });
      }
    }


    registerSW();

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('unload', handleUnload);
      window.removeEventListener('popstate', handlePopState);

      // Restore original history methods
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      // We no longer set deferredPrompt to null to allow the prompt to be shown again in new sessions.
    }
  };

  // Update manifest link based on user role
  useEffect(() => {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      manifestLink.setAttribute('href', currentManifest);
    }
  }, [currentManifest, user?.role]);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    date: Date | null;
    booking: Booking | null;
  }>({ isOpen: false, date: null, booking: null });

  const [requestModalState, setRequestModalState] = useState<{
    isOpen: boolean;
    date: Date | null;
    booking?: any;
  }>({ isOpen: false, date: null });

  // Notification settings modal state
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  // Customer request modal state removed - customers cannot create booking requests

  const openModal = (date: Date, booking: Booking | null = null) => {
    setModalState({ isOpen: true, date, booking });
  };
  const closeModal = () => setModalState({ isOpen: false, date: null, booking: null });

  const openRequestModal = (date: Date, system: 'ground' | 'net', booking?: any) => {
    setRequestModalState({ isOpen: true, date, booking });
    setActiveSystem(system);
  };

  const handleEditRequest = (date: Date, booking: any, system: 'ground' | 'net') => {
    setRequestModalState({ isOpen: true, date, booking });
    setActiveSystem(system);
  };
  const closeRequestModal = () => setRequestModalState({ isOpen: false, date: null, booking: undefined });

  // Customer request modal functions removed - customers cannot create booking requests

  const handleBookingRequest = async (requestData: any) => {
    try {
      const result = await addBookingRequest({
        ...requestData,
        status: BookingStatus.PENDING,
        created_at: new Date().toISOString(),
      });
      // Return the request data so the modal can access the tracking token
      return result;
    } catch (error) {
      console.error('Failed to submit booking request:', error);
      alert('Failed to submit booking request. Please try again.');
      throw error; // Re-throw to let the modal handle the error
    }
  };

  // Special dates management handler
  const [showSpecialDatesManager, setShowSpecialDatesManager] = useState(false);

  const handleManageSpecialDates = () => {
    setShowSpecialDatesManager(true);
  };

  const handleCloseSpecialDatesManager = () => {
    setShowSpecialDatesManager(false);
  };
  
  // Show login screens if no user is logged in
  if (!user) {
    switch (loginScreen) {
      case 'landing':
        return (
          <LandingPage
            onCustomerLogin={() => setLoginScreen('customer')}
            onAdminLogin={() => setLoginScreen('admin')}
          />
        );
      case 'customer':
        return <CustomerLogin onBack={() => setLoginScreen('landing')} />;
      case 'admin':
        return <Login isManagementPortal={true} />;
      default:
        return <LandingPage onCustomerLogin={() => setLoginScreen('customer')} onAdminLogin={() => setLoginScreen('admin')} />;
    }
  }

  // Show gateway for customers after login
  if (user && user.role === 'customer' && showGateway) {
    return (
      <BookingGateway
        onSelectSystem={handleGatewaySelection}
        customerName={user.name}
      />
    );
  }

  if (isLoading) {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="w-full max-w-4xl mx-auto">
                <video
                    src="/intro.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-auto max-h-screen object-contain rounded-lg"
                    style={{
                        maxHeight: '80vh',
                        width: '100%',
                        objectFit: 'contain'
                    }}
                >
                    Your browser does not support the video tag.
                </video>
            </div>
        </div>
    );
  }

  const handleSetView = async (view: View) => {
    if (currentView !== view) {
      setIsAnimatingOut(true);

      // Add current view to history before changing (only for mobile PWA)
      if (isMobile && currentView) {
        addToHistory(currentView);
        updateBrowserHistory(currentView);
      }

      // Set loading state for the target tab
      setTabLoadingStates(prev => ({ ...prev, [view]: true }));

      // Immediate tab switch - no loading screen
      setTimeout(() => {
        setCurrentViewState(view);
        setIsAnimatingOut(false);

        // Add new view to history after changing (only for mobile PWA)
        if (isMobile) {
          addToHistory(view);
          updateBrowserHistory(view);
        }
      }, 150);

      // Background data refresh after tab switch (silent)
      if (user && (user.role === 'admin' || user.role === 'management')) {
        setTimeout(() => {
          refreshDataSilent().then(() => {
            console.log(`✅ Data refreshed successfully for ${view} tab`);
            // Remove loading state when data is refreshed
            setTabLoadingStates(prev => ({ ...prev, [view]: false }));
          }).catch(error => {
            console.error(`❌ Error refreshing data during tab switch to ${view}:`, error);
            // Remove loading state even if refresh fails to prevent permanent loading
            setTabLoadingStates(prev => ({ ...prev, [view]: false }));
          });
        }, 200); // Small delay to ensure smooth animation
      } else {
        // For customers, just remove loading state after brief delay
        setTimeout(() => {
          setTabLoadingStates(prev => ({ ...prev, [view]: false }));
        }, 300);
      }
    }
  };
  
  const handleSystemChange = (newSystem: BookingSystem) => {
      const systems: BookingSystem[] = ['ground', 'net'];
      const oldIndex = systems.indexOf(activeSystem);
      const newIndex = systems.indexOf(newSystem);

      if (oldIndex === newIndex) return;

      if (newIndex > oldIndex) {
          setSystemAnimationClass('animate-slideInFromRight');
      } else {
          setSystemAnimationClass('animate-slideInFromLeft');
      }
      setActiveSystem(newSystem);
  };
  
    const handleNavigateToBookingsForCurrentMonth = () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const toLocalDateString = (date: Date): string => {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        setBookingsDateFilter({
            start: toLocalDateString(startOfMonth),
            end: toLocalDateString(endOfMonth),
        });
        handleSetView('bookings');
    };

    const handleNavigateToCustomers = () => {
        setBookingsDateFilter(null);
        handleSetView('customers');
    };


  const getAllNavItems = (role: string) => [
    { view: 'dashboard' as View, label: role === 'customer' ? 'Home' : 'Dashboard', icon: LayoutDashboard },
    { view: 'calendar' as View, label: 'Calendar', icon: CalendarIcon },
    { view: 'bookings' as View, label: role === 'customer' ? 'Track Bookings' : 'Bookings', icon: BookCopy },
    { view: 'customers' as View, label: 'Customers', icon: Users },
    { view: 'my-requests' as View, label: 'My Requests', icon: BookCopy },
  ];

  const allNavItems = user ? getAllNavItems(user.role) : [
    { view: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { view: 'calendar' as View, label: 'Calendar', icon: CalendarIcon },
    { view: 'bookings' as View, label: 'Bookings', icon: BookCopy },
    { view: 'customers' as View, label: 'Customers', icon: Users },
  ];

  // Filter navigation items based on user role
  const getNavItemsForRole = (role: string) => {
    switch (role) {
      case 'admin':
        return allNavItems.slice(0, 5); // All tabs except My Requests
      case 'management':
        return allNavItems.slice(0, 3); // Dashboard, Calendar, Bookings only
      case 'customer':
        return [allNavItems[1], allNavItems[2]]; // Calendar and Track Bookings only
      default:
        return allNavItems.slice(0, 3); // Default to management access
    }
  };

  const navItems = user ? getNavItemsForRole(user.role) : allNavItems.slice(0, 3);

  // Bottom navigation items - consistent for all user roles
  const getBottomNavItems = (role: string) => {
    const allItems = [
      { view: 'dashboard' as View, label: role === 'customer' ? 'Home' : 'Dashboard', icon: LayoutDashboard },
      { view: 'calendar' as View, label: 'Calendar', icon: CalendarIcon },
      { view: 'bookings' as View, label: role === 'customer' ? 'Track Bookings' : 'Bookings', icon: BookCopy },
      { view: 'customers' as View, label: 'Customers', icon: Users },
    ];

    // For customers, only show relevant items
    if (role === 'customer') {
      return [allItems[1], allItems[2]]; // Calendar and Track Bookings
    }

    // For management, show core items
    if (role === 'management') {
      return allItems.slice(0, 3); // Dashboard, Calendar, Bookings
    }

    // For admin, show all items
    return allItems;
  };

  const bottomNavItems = user ? getBottomNavItems(user.role) : allNavItems.slice(0, 3);

  // Debug logging for bottom navigation
  console.log('Bottom navigation items for role:', user?.role, bottomNavItems.length, 'items');

  const SideNavLink: React.FC<{ view: View; label: string; icon: React.ElementType }> = ({ view, label, icon: Icon }) => (
    <button
        onClick={() => handleSetView(view)}
        className={`group w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 touch-manipulation transform hover:scale-105 ${
            currentView === view
            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
            : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:text-gray-800 dark:hover:text-white'
        }`}
    >
        <div className={`p-2 rounded-lg transition-all duration-300 flex-shrink-0 flex items-center justify-center ${
            currentView === view
              ? 'bg-white/20'
              : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30'
        }`}>
            <Icon size={18} />
        </div>
        <span className="truncate flex-1 text-left">{label}</span>
        {view === 'bookings' && pendingRequestCount > 0 && (user?.role === 'admin' || user?.role === 'management') && (
            <div className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] h-5 flex items-center justify-center flex-shrink-0" aria-label={`${pendingRequestCount} pending requests`}>
                {pendingRequestCount}
            </div>
        )}
    </button>
  );

  const BottomNavItem: React.FC<{ view: View; label: string; icon: React.ElementType }> = ({ view, label, icon: Icon }) => (
       <button
           onClick={() => handleSetView(view)}
           className={`group flex flex-col items-center justify-center w-full h-full text-xs transition-all duration-300 touch-manipulation py-2 relative transform active:scale-95 ${
               currentView === view
                   ? 'text-orange-500'
                   : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
           }`}
       >
           <div className={`p-2 sm:p-2.5 rounded-xl transition-all duration-300 flex-shrink-0 flex items-center justify-center ${
               currentView === view
                   ? 'bg-orange-100 dark:bg-orange-900/30'
                   : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20'
           }`}>
               <Icon size={20} className="sm:w-[22px] sm:h-[22px]" />
           </div>
           <span className="text-xs leading-tight font-medium mt-1 text-center">{label}</span>
           {view === 'bookings' && pendingRequestCount > 0 && (user?.role === 'admin' || user?.role === 'management') && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-4 flex items-center justify-center z-10" aria-label={`${pendingRequestCount} pending requests`}>
                    {pendingRequestCount}
                </div>
            )}
       </button>
   );

  const SystemTab: React.FC<{ system: BookingSystem; label: string; }> = ({ system, label }) => {
    const isActive = activeSystem === system;
    const isGround = system === 'ground';

    return (
      <button
        onClick={() => handleSystemChange(system)}
        className={`group relative px-4 sm:px-6 py-3 sm:py-4 rounded-2xl font-bold transition-all duration-500 text-sm sm:text-base touch-manipulation transform hover:scale-105 ${
          isActive
            ? isGround
              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-2xl shadow-orange-500/30 animate-tab-glow'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xl shadow-blue-500/30 animate-tab-glow-blue'
            : 'bg-white/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-600'
        }`}>
        {/* Background glow effect for active tab */}
        {isActive && (
          <div className={`absolute inset-0 rounded-2xl opacity-50 blur-xl ${
            isGround ? 'bg-gradient-to-r from-orange-400 to-red-400' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
          }`}></div>
        )}

        {/* Floating particles effect */}
        <div className={`absolute inset-0 rounded-2xl overflow-hidden ${isActive ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
          <div className={`absolute top-1 left-2 w-1 h-1 rounded-full ${
            isGround ? 'bg-orange-200' : 'bg-blue-200'
          } animate-particle-float`}></div>
          <div className={`absolute top-2 right-3 w-0.5 h-0.5 rounded-full ${
            isGround ? 'bg-red-200' : 'bg-indigo-200'
          } animate-particle-float delay-1000`}></div>
          <div className={`absolute bottom-2 left-4 w-1 h-1 rounded-full ${
            isGround ? 'bg-orange-300' : 'bg-blue-300'
          } animate-particle-float delay-500`}></div>
        </div>

        <span className="relative z-10 flex items-center justify-center space-x-2">
          <div className={`p-1.5 rounded-lg transition-all duration-300 flex-shrink-0 flex items-center justify-center ${
            isActive
              ? 'bg-white/20'
              : 'bg-gray-100 dark:bg-gray-600 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30'
          }`}>
            {isGround ? (
              <CricketGroundIcon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
            ) : (
              <IndoorNetIcon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
            )}
          </div>
          <span className="font-bold">{label}</span>
          {isActive && (
            <div className="flex space-x-1 flex-shrink-0">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              <div className="w-1.5 h-1.5 bg-white/70 rounded-full animate-pulse delay-100"></div>
              <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-pulse delay-200"></div>
            </div>
          )}
        </span>

        {/* Hover effect overlay */}
        <div className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${
          isActive ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
        } bg-gradient-to-r ${
          isGround
            ? 'from-orange-500/10 to-red-500/10'
            : 'from-blue-500/10 to-indigo-500/10'
        }`}></div>
      </button>
    );
  };

  const renderView = () => {
    const activeBookings = bookings[activeSystem];
    const isTabLoading = tabLoadingStates[currentView] || false;

    // Show skeleton loading for data sections while keeping layout visible
    const renderSkeletonLoader = () => (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );

    switch(currentView) {
      case 'dashboard':
        return user?.role === 'customer'
          ? <div className="text-center py-12 relative">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Welcome to Harvard House Sports</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">Please use the calendar to check availability. Contact management directly for booking inquiries.</p>

              {/* Neon Book Now Button */}
              <div className="relative inline-block">
                {/* Animated neon glow rings */}
                <div className="absolute inset-0 rounded-full animate-ping bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 opacity-20 blur-xl"></div>
                <div className="absolute inset-0 rounded-full animate-pulse bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400 opacity-30 blur-lg"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 opacity-40 blur-md"></div>

                {/* Main button */}
                <button
                  onClick={() => {
                    handleSetView('calendar');
                  }}
                  className="group relative bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white font-bold text-lg px-8 py-4 rounded-full shadow-2xl transform transition-all duration-300 hover:scale-110 hover:shadow-3xl focus:outline-none focus:ring-4 focus:ring-orange-300/50 active:scale-95 border-2 border-white/20"
                >
                  {/* Inner glow effect */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-400 to-red-400 opacity-50 blur-sm group-hover:opacity-75 transition-opacity duration-300"></div>

                  {/* Button content */}
                  <div className="relative flex items-center justify-center space-x-3">
                    <div className="p-2 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors duration-300">
                      <CalendarIcon className="w-6 h-6" />
                    </div>
                    <span className="text-xl font-bold">Book Now</span>

                    {/* Animated sparkles */}
                    <div className="absolute -top-2 -right-2 w-3 h-3 bg-yellow-300 rounded-full animate-pulse opacity-80"></div>
                    <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-blue-300 rounded-full animate-pulse opacity-60 delay-300"></div>
                    <div className="absolute top-1 -right-4 w-1.5 h-1.5 bg-pink-300 rounded-full animate-pulse opacity-70 delay-500"></div>
                  </div>

                  {/* Hover effect overlay */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>

                {/* Bottom reflection effect */}
                <div className="absolute inset-x-0 -bottom-4 h-4 bg-gradient-to-t from-white/10 to-transparent rounded-full blur-sm opacity-50"></div>
              </div>

              {/* Additional info text */}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-8">Click the button above to start booking instantly</p>
            </div>
          : isTabLoading ? renderSkeletonLoader() : <DashboardView bookings={activeBookings} openModal={openModal} onBookingsCardClick={handleNavigateToBookingsForCurrentMonth} onRevenueCardClick={handleNavigateToCustomers}/>;
      case 'calendar':
        return user?.role === 'customer'
          ? (isTabLoading ? renderSkeletonLoader() : <CustomerCalendarView bookings={activeBookings} bookingRequests={bookingRequests[activeSystem]} system={activeSystem} onBookingRequest={handleBookingRequest} />)
          : (isTabLoading ? renderSkeletonLoader() : <CalendarView bookings={activeBookings} bookingRequests={bookingRequests[activeSystem]} openModal={openModal} system={activeSystem} onApproveRequest={approveBookingRequest} onRejectRequest={rejectBookingRequest} onManageSpecialDates={handleManageSpecialDates} />);
      case 'bookings':
        if (user?.role === 'customer') {
          return isTabLoading ? renderSkeletonLoader() : <CustomerBookingTracker />;
        }
        return isTabLoading ? renderSkeletonLoader() : <BookingsView bookings={activeBookings} bookingRequests={bookingRequests[activeSystem]} openModal={openModal} initialDateFilter={bookingsDateFilter} clearInitialFilter={() => setBookingsDateFilter(null)} onApproveRequest={approveBookingRequest} onRejectRequest={rejectBookingRequest} onDeleteRequest={deleteBookingRequest} onEditRequest={handleEditRequest} onDataRefresh={() => refreshDataSilent()} system={activeSystem} />;
      case 'customers':
        if (user?.role === 'customer') {
          return (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Access Restricted</h2>
              <p className="text-gray-600 dark:text-gray-400">You don't have permission to access this page.</p>
            </div>
          );
        }
        return isTabLoading ? renderSkeletonLoader() : <CustomersView bookings={activeBookings} />;
      case 'my-requests':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Access Restricted</h2>
            <p className="text-gray-600 dark:text-gray-400">You don't have permission to access this page.</p>
          </div>
        );
      default:
        return user?.role === 'customer'
          ? <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Welcome to Harvard House Sports</h2>
              <p className="text-gray-600 dark:text-gray-400">Please use the calendar to check availability. Contact management directly for booking inquiries.</p>
            </div>
          : <DashboardView bookings={activeBookings} openModal={openModal} onBookingsCardClick={handleNavigateToBookingsForCurrentMonth} onRevenueCardClick={handleNavigateToCustomers}/>;
    }
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-900 font-sans animate-fadeIn">
        {/* --- Sidebar (Desktop) --- */}
        <aside className="w-60 lg:w-64 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-xl border-r border-gray-200/50 dark:border-gray-700/50 hidden lg:flex flex-col fixed h-full z-20 animate-slideInLeft">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <img src="logo.png" alt="Logo" className="h-12 w-12" />
              <div>
                <h2 className="font-bold text-gray-800 dark:text-white text-sm">HHS Sports</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Management</p>
              </div>
            </div>
          </div>
          <nav className="flex-grow p-3 sm:p-4">
            <ul className="space-y-1 sm:space-y-2">
              {navItems.map(item => <li key={item.view}><SideNavLink {...item} /></li>)}
            </ul>
          </nav>
        </aside>

        <div className="flex-1 flex flex-col md:ml-64 min-h-screen">
          {/* --- Header --- */}
          <header className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm animate-slideInUp">
            <div className="container mx-auto px-3 sm:px-4 lg:px-6">
              <div className="flex items-center justify-between h-16 sm:h-18 md:h-20">
                <div className="flex items-center min-w-0 flex-1">
                  <div className="flex items-center">
                    <img src="logo.png" alt="Harvard House Sports Logo" className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 mr-2 sm:mr-3" />
                    <div className="ml-1 sm:ml-2 md:ml-3 min-w-0">
                      <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-display font-bold text-gray-800 dark:text-white leading-tight truncate">
                        Harvard House Sports
                      </h1>
                      <div className="flex flex-col">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user?.role === 'customer' ? 'Customer Portal' : 'Booking Management System'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-0.5 sm:space-x-0.5 md:space-x-1">
                  {/* Loading indicator */}
                  {Object.values(tabLoadingStates).some(loading => loading) && (
                    <div className="relative">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <div className="absolute inset-0 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-75"></div>
                    </div>
                  )}

                  <button onClick={toggleTheme} className="p-2 sm:p-2 md:p-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 touch-manipulation transform hover:scale-110 flex items-center justify-center min-w-[44px] min-h-[44px]">
                    <div className="flex items-center justify-center">
                      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                    </div>
                  </button>
                  <div className="flex flex-col items-center justify-center">
                    <button onClick={handleLogout} className="p-2 sm:p-2 md:p-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 touch-manipulation transform hover:scale-110 flex items-center justify-center min-w-[44px] min-h-[44px]">
                      <div className="flex items-center justify-center">
                        <LogOut size={20} />
                      </div>
                    </button>
                    {user && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 text-center leading-tight">
                        {user.name.substring(0, 4)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* --- Main Content --- */}
          <main className="flex-1 container mx-auto p-3 sm:p-4 lg:p-6">
            {/* System tabs for management users */}
            {user && (user.role === 'admin' || user.role === 'management') && (
              <div className="relative flex justify-center mb-6 sm:mb-8">
                {/* Background with gradient and effects */}
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-blue-500/5 rounded-3xl blur-xl"></div>
                <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl p-2 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
                  {/* Animated background elements */}
                  <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-orange-400/20 to-red-500/20 rounded-full blur-2xl animate-pulse"></div>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full blur-2xl animate-pulse delay-1000"></div>

                  <div className="relative flex space-x-2 sm:space-x-3">
                    <SystemTab system="ground" label="Ground Booking" />
                    <SystemTab system="net" label="Indoor Net Booking" />
                  </div>

                  {/* Bottom accent line */}
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-orange-400 via-red-400 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              </div>
            )}

            {/* Selected System Indicator for customers */}
            {user && user.role === 'customer' && (
              <div className="flex justify-center mb-6 sm:mb-8">
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl px-6 py-3 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg flex items-center justify-center ${
                      activeSystem === 'ground'
                        ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white'
                        : 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white'
                    }`}>
                      {activeSystem === 'ground' ? (
                        <CricketGroundIcon className="w-5 h-5" />
                      ) : (
                        <IndoorNetIcon className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Current System</p>
                      <p className="font-bold text-gray-800 dark:text-white">
                        {activeSystem === 'ground' ? 'Ground Booking' : 'Indoor Net Booking'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        // Clear saved system preference so gateway shows again
                        localStorage.removeItem('customerSelectedSystem');
                        console.log('🗑️ Cleared customer system preference for switching');
                        setShowGateway(true);
                      }}
                      className="ml-4 px-3 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors duration-200 border border-orange-200 dark:border-orange-800 flex items-center justify-center"
                    >
                      Switch System
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className={` ${isAnimatingOut ? 'animate-fadeOut' : ''}`}>
              <div key={activeSystem} className={systemAnimationClass}>
                {renderView()}
              </div>
            </div>
          </main>

          {/* --- Bottom Navigation (Mobile/Tablet) --- */}
          {user && bottomNavItems.length > 0 && (
            <footer className="sticky bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200/50 dark:border-gray-700/50 z-40 lg:hidden shadow-2xl pb-safe">
                <nav className="flex justify-around h-16 sm:h-18 md:h-20">
                  {bottomNavItems.map(item => <BottomNavItem key={item.view} {...item} />)}

                  {/* Exit Button for Mobile PWA */}
                  {isMobile && (
                    <button
                      onClick={triggerExit}
                      className="group flex flex-col items-center justify-center w-full h-full text-xs transition-all duration-300 touch-manipulation py-2 relative transform active:scale-95 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      aria-label="Exit App"
                    >
                      <div className="p-2 sm:p-2.5 rounded-xl transition-all duration-300 flex-shrink-0 bg-red-50 dark:bg-red-900/20 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 flex items-center justify-center">
                        <Power size={20} className="sm:w-[22px] sm:h-[22px]" />
                      </div>
                      <span className="text-xs leading-tight font-medium mt-1 text-center">Exit</span>
                    </button>
                  )}
                </nav>
            </footer>
          )}
        </div>
      </div>
      <InstallPrompt deferredPrompt={deferredPrompt} onInstallClick={handleInstallClick} userRole={user?.role} />
      <BookingModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        date={modalState.date}
        booking={modalState.booking}
        system={activeSystem}
        onBookingUpdate={refreshDataSilent}
      />
      {/* Admin Booking Request Modal - Only for admins */}
      {user?.role === 'admin' && (
        <BookingRequestModal
          isOpen={requestModalState.isOpen}
          onClose={closeRequestModal}
          date={requestModalState.date}
          system={activeSystem}
          onSubmitRequest={handleBookingRequest}
          userRole={user.role}
          onBookingUpdate={refreshDataSilent}
          booking={requestModalState.booking}
        />
      )}

      {/* Customer Booking Request Modal */}
      {user?.role === 'customer' && (
        <CustomerBookingRequestModal
          isOpen={requestModalState.isOpen}
          onClose={closeRequestModal}
          date={requestModalState.date}
          system={activeSystem}
          onSubmitRequest={handleBookingRequest}
          user={user}
          bookings={bookings[activeSystem]}
          onBookingUpdate={refreshDataSilent}
        />
      )}

      {/* Exit Confirmation Dialog for Mobile PWA */}
      {isMobile && (
        <ExitConfirmationDialog
          isOpen={showExitDialog}
          onConfirm={confirmExit}
          onCancel={cancelExit}
          canGoBack={navigationState.canGoBack}
          exitType={exitDialogType}
        />
      )}

      {/* Notification Settings Modal */}
      <NotificationSettings
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
        user={user}
      />

      {/* Special Dates Manager Modal - Only for admins */}
      {user?.role === 'admin' && (
        <SpecialDatesManager
          isOpen={showSpecialDatesManager}
          onClose={handleCloseSpecialDatesManager}
        />
      )}


    </ErrorBoundary>
  );
};

// Main App component
const App: React.FC = () => {
  return <AppContent />;
};

export default App;