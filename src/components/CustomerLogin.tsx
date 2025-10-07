import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { UserRole } from '../types';
import { ArrowLeft } from 'lucide-react';

interface CustomerLoginProps {
  onBack: () => void;
}

const CustomerLogin: React.FC<CustomerLoginProps> = ({ onBack }) => {
  const { login } = useContext(AppContext);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [dataRestored, setDataRestored] = useState(false);

  // Handle keyboard shortcuts for better UX
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // If data is restored and Enter is pressed, submit the form
      if (dataRestored && e.key === 'Enter' && !isAuthenticating) {
        e.preventDefault();
        const form = document.querySelector('form');
        if (form) {
          const formEvent = new Event('submit', { bubbles: true, cancelable: true });
          form.dispatchEvent(formEvent);
        }
      }
    };

    if (dataRestored) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [dataRestored, isAuthenticating]);

  // Load saved login data on component mount
  useEffect(() => {
    const savedName = localStorage.getItem('customerName');
    const savedEmail = localStorage.getItem('customerEmail');
    const shouldRemember = localStorage.getItem('customerRememberMe') === 'true';
    const lastLoginTime = localStorage.getItem('customerLastLoginTime');
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds

    // Only auto-populate if data exists, remember me was checked, and within 7 days
    if (shouldRemember && savedName && savedEmail && lastLoginTime && parseInt(lastLoginTime) > sevenDaysAgo) {
      setFormData({
        name: savedName,
        email: savedEmail,
      });
      setRememberMe(true);
      setDataRestored(true);
      console.log('✅ Auto-populated customer login form from saved data');

      // Auto-focus on submit button after a short delay for better UX
      setTimeout(() => {
        const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (submitButton) {
          submitButton.focus();
        }
      }, 500);
    } else if (lastLoginTime && parseInt(lastLoginTime) <= sevenDaysAgo) {
      // Clear expired data
      localStorage.removeItem('customerName');
      localStorage.removeItem('customerEmail');
      localStorage.removeItem('customerRememberMe');
      localStorage.removeItem('customerLastLoginTime');
      console.log('🗑️ Cleared expired customer login data (older than 7 days)');
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Enhanced validation
    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();

    if (!trimmedName) {
      setError('Please enter your name');
      return;
    }

    if (!trimmedEmail) {
      setError('Please enter your email address');
      return;
    }

    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }

    // Normalize the data before storing
    const normalizedName = trimmedName.replace(/\s+/g, ' '); // Replace multiple spaces with single space
    const normalizedEmail = trimmedEmail.toLowerCase();

    console.log('👤 Customer Login Debug:', {
      originalName: formData.name,
      originalEmail: formData.email,
      normalizedName,
      normalizedEmail
    });

    setIsAuthenticating(true);

    // Simulate authentication delay
    setTimeout(() => {
      // Save login data if "Remember Me" is checked
      if (rememberMe) {
        localStorage.setItem('customerName', normalizedName);
        localStorage.setItem('customerEmail', normalizedEmail);
        localStorage.setItem('customerRememberMe', 'true');
        localStorage.setItem('customerLastLoginTime', Date.now().toString());
        console.log('💾 Saved customer login data to localStorage');
      } else {
        // Clear saved data if "Remember Me" is not checked
        // Also listen for logout events from the main app
        window.addEventListener('storage', (e) => {
          if (e.key === 'customerLogout' && e.newValue === 'true') {
            localStorage.removeItem('customerName');
            localStorage.removeItem('customerEmail');
            localStorage.removeItem('customerRememberMe');
            localStorage.removeItem('customerLastLoginTime');
            localStorage.removeItem('customerLogout');
            console.log('🔐 Auto-cleared customer data on logout');
          }
        });
        console.log('🗑️ Cleared customer login data from localStorage');
      }

      login(normalizedName, UserRole.CUSTOMER, normalizedEmail);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className={`w-full max-w-sm sm:max-w-md bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4 sm:space-y-6 border border-white/20 ${isAuthenticating ? 'animate-fadeOut' : 'animate-slideInUp'}`}>

        {/* Header */}
        <div className="flex flex-col items-center space-y-3 sm:space-y-4">
          <div className="relative">
            <img src="logo.png" alt="Harvard House Sports Logo" className="h-32 w-32 sm:h-36 sm:w-36" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-800 dark:text-white text-center">Harvard House Sports</h1>
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base font-medium">
              Customer Portal
            </p>
            <div className="w-16 h-0.5 bg-gradient-to-r from-orange-400 to-red-400 mx-auto mt-2 rounded-full"></div>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
              placeholder="your.email@example.com"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 animate-fadeIn">
              <p className="text-red-800 dark:text-red-300 text-sm text-center font-medium">{error}</p>
            </div>
          )}

          {dataRestored && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 animate-fadeIn">
              <p className="text-green-800 dark:text-green-300 text-sm text-center font-medium flex items-center justify-center space-x-2">
                <span>✅ Login details restored from previous session</span>
                <span className="text-xs bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded-full">Press Enter to login</span>
              </p>
            </div>
          )}

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <label htmlFor="rememberMe" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Remember me
              </label>
            </div>

            {/* Clear Saved Data Button */}
            {(localStorage.getItem('customerName') || localStorage.getItem('customerEmail')) && (
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('customerName');
                  localStorage.removeItem('customerEmail');
                  localStorage.removeItem('customerRememberMe');
                  localStorage.removeItem('customerLastLoginTime');
                  setFormData({ name: '', email: '' });
                  setRememberMe(false);
                  console.log('🗑️ User manually cleared customer login data');

                  // Show a subtle notification instead of alert
                  const notification = document.createElement('div');
                  notification.className = 'fixed top-4 right-4 bg-green-100 dark:bg-green-900/50 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-4 py-2 rounded-lg shadow-lg z-50 animate-fadeIn';
                  notification.textContent = '✅ Saved login data cleared';
                  document.body.appendChild(notification);
                  setTimeout(() => {
                    document.body.removeChild(notification);
                  }, 3000);
                }}
                className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 underline"
              >
                Clear saved data
              </button>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isAuthenticating}
              className="group w-full flex justify-center py-3 sm:py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm sm:text-base font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-4 focus:ring-orange-300/50 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:scale-100 touch-manipulation"
            >
              {isAuthenticating ? (
                <div className="flex items-center justify-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>Sign In / Sign Up</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerLogin;