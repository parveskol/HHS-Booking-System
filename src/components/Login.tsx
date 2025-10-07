import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { UserRole } from '../types';

interface LoginProps {
  isManagementPortal?: boolean;
}

const Login: React.FC<LoginProps> = ({ isManagementPortal = false }) => {
  const { login } = useContext(AppContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isManagementPortal) {
      // Management Portal - Only admin and management login
      if (username === 'HHSadmin' && password === 'HHS@admin') {
        setIsAuthenticating(true);
        setTimeout(() => {
          login(username, UserRole.ADMIN);
        }, 150);
      } else if (username === 'Management' && password === 'HHS') {
        setIsAuthenticating(true);
        setTimeout(() => {
          login(username, UserRole.MANAGEMENT);
        }, 150);
      } else {
        setError('Invalid username or password.');
      }
    } else {
      // Customer Portal - Only customer login
      if (username === 'HHS' && password === 'HHS') {
        setIsAuthenticating(true);
        setTimeout(() => {
          login(username, UserRole.CUSTOMER, email);
        }, 150);
      } else {
        setError('Invalid username or password.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className={`w-full max-w-sm sm:max-w-md bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4 sm:space-y-6 border border-white/20 ${isAuthenticating ? 'animate-fadeOut' : 'animate-slideInUp'}`}>
        <div className="flex flex-col items-center space-y-3 sm:space-y-4">
          <div className="relative">
            <img src="logo.png" alt="Harvard House Sports Logo" className="h-32 w-32 sm:h-36 sm:w-36" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-800 dark:text-white text-center">Harvard House Sports</h1>
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base font-medium">
              {isManagementPortal ? 'Management Portal' : 'Customer Portal'}
            </p>
            <div className="w-16 h-0.5 bg-gradient-to-r from-orange-400 to-blue-400 mx-auto mt-2 rounded-full"></div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
              placeholder={isManagementPortal ? "e.g., HHSadmin or Management" : "HHS"}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
              placeholder={isManagementPortal ? "Enter your password" : "HHS"}
            />
          </div>
          {!isManagementPortal && (
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                placeholder="your.email@example.com"
                required
              />
            </div>
          )}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 animate-fadeIn">
              <p className="text-red-800 dark:text-red-300 text-sm text-center font-medium">{error}</p>
            </div>
          )}
          <div>
            <button
              type="submit"
              disabled={isAuthenticating}
              className="group w-full flex justify-center py-3 sm:py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm sm:text-base font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-300/50 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:scale-100 touch-manipulation"
            >
              {isAuthenticating ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center">
                  <span>Sign In</span>
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

export default Login;