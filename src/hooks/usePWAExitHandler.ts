import { useEffect, useState, useCallback } from 'react';

interface NavigationState {
  viewHistory: string[];
  canGoBack: boolean;
}

interface PWAExitHandlerOptions {
  onExit: () => void;
  onNavigateBack: (previousView: string) => void;
  isMobile: boolean;
}

export const usePWAExitHandler = (options: PWAExitHandlerOptions) => {
  const { onExit, onNavigateBack, isMobile } = options;
  const [navigationState, setNavigationState] = useState<NavigationState>({
    viewHistory: [],
    canGoBack: false,
  });
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [exitDialogType, setExitDialogType] = useState<'back-button' | 'exit-button'>('back-button');

  // Add view to history
  const addToHistory = useCallback((view: string) => {
    setNavigationState(prev => {
      const newHistory = [...prev.viewHistory, view];
      return {
        viewHistory: newHistory,
        canGoBack: newHistory.length > 1,
      };
    });
  }, []);

  // Navigate back in history
  const navigateBack = useCallback(() => {
    setNavigationState(prev => {
      if (prev.viewHistory.length <= 1) {
        // No history to go back to, show exit dialog on mobile
        if (isMobile) {
          setExitDialogType('back-button');
          setShowExitDialog(true);
          return prev;
        }
        return prev;
      }

      const newHistory = prev.viewHistory.slice(0, -1);
      const previousView = newHistory[newHistory.length - 1];

      if (previousView) {
        onNavigateBack(previousView);
      }

      return {
        viewHistory: newHistory,
        canGoBack: newHistory.length > 1,
      };
    });
  }, [onNavigateBack, isMobile]);

  // Handle browser back button
  useEffect(() => {
    if (!isMobile) return;

    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      navigateBack();
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isMobile && navigationState.canGoBack) {
        event.preventDefault();
        event.returnValue = '';
        return '';
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isMobile, navigateBack, navigationState.canGoBack]);

  // Push state to browser history when view changes
  const updateBrowserHistory = useCallback((view: string) => {
    if (typeof window !== 'undefined' && isMobile) {
      // Use a more specific state identifier
      const state = { view, timestamp: Date.now() };
      window.history.pushState(state, '', `#${view}`);
    }
  }, [isMobile]);

  // Initialize browser history on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && isMobile) {
      // Initialize with current state
      window.history.replaceState({ view: 'initial', timestamp: Date.now() }, '', window.location.pathname);
    }
  }, [isMobile]);

  const confirmExit = useCallback(() => {
    setShowExitDialog(false);

    // Perform cleanup before exit
    performCleanup().then(() => {
      onExit();
    }).catch((error) => {
      console.error('Error during cleanup:', error);
      // Continue with exit even if cleanup fails
      onExit();
    });
  }, [onExit]);

  // Cleanup function for proper state management before exit
  const performCleanup = useCallback(async () => {
    try {
      console.log('🧹 Performing cleanup before exit...');

      // Clear local storage data
      const keysToRemove = [
        'customerName',
        'customerEmail',
        'customerRememberMe',
        'customerLastLoginTime',
        'customerSelectedSystem',
        'customerLogout'
      ];

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      // Clear session storage
      sessionStorage.clear();

      // Close any open IndexedDB connections if possible
      if ('serviceWorker' in navigator && 'controller' in navigator.serviceWorker) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.active) {
          // Send exit message to service worker
          registration.active.postMessage({
            type: 'EXIT_APP',
            timestamp: Date.now()
          });
          console.log('📡 Sent exit message to service worker');
        }
      }

      // Wait a bit for service worker to process
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      throw error;
    }
  }, []);

  const cancelExit = useCallback(() => {
    setShowExitDialog(false);
  }, []);

  // Explicit exit trigger for exit button
  const triggerExit = useCallback(() => {
    if (isMobile) {
      setExitDialogType('exit-button');
      setShowExitDialog(true);
    } else {
      // For desktop, exit directly without confirmation
      onExit();
    }
  }, [isMobile, onExit]);

  return {
    navigationState,
    showExitDialog,
    exitDialogType,
    addToHistory,
    navigateBack,
    updateBrowserHistory,
    confirmExit,
    cancelExit,
    triggerExit,
  };
};