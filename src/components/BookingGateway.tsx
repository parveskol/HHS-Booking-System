import React from 'react';
import { ArrowRight } from 'lucide-react';
import CricketGroundIcon from './CricketGroundIcon';
import IndoorNetIcon from './IndoorNetIcon';

interface BookingGatewayProps {
  onSelectSystem: (system: 'ground' | 'net') => void;
  customerName: string;
}

const BookingGateway: React.FC<BookingGatewayProps> = ({ onSelectSystem, customerName }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Simplified background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-orange-500/15 to-red-600/15 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-blue-500/15 to-purple-600/15 rounded-full blur-2xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-[95vw] sm:max-w-3xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl shadow-2xl p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6 border border-white/20 animate-slideInUp">
        {/* Compact Header */}
        <div className="text-center space-y-1 sm:space-y-2">
          <div className="relative">
            <img src="logo.png" alt="Harvard House Sports Logo" className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 mx-auto" />
          </div>
          <h1 className="text-lg sm:text-2xl md:text-3xl font-display font-bold text-gray-800 dark:text-white">
            Harvard House Sports
          </h1>
          <div className="space-y-0.5 sm:space-y-1">
            <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base font-medium">
              Welcome back, <span className="text-orange-600 dark:text-orange-400 font-semibold">{customerName}</span>!
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
              Customer Portal
            </p>
          </div>
        </div>

        {/* Compact Gateway Selection */}
        <div className="space-y-2 sm:space-y-3">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-center text-gray-800 dark:text-white">
            Choose Booking System
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mt-2 sm:mt-4">
            {/* Ground Booking Option */}
            <div
              onClick={() => onSelectSystem('ground')}
              className="group relative bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-3 sm:p-4 md:p-5 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-xl border-2 border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700"
            >
              {/* Simple glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/5 to-red-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              <div className="relative z-10 text-center space-y-2 sm:space-y-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <CricketGroundIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 dark:text-white mb-0.5 sm:mb-1">
                    Ground Booking
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm leading-tight">
                    Outdoor facilities for matches, training & events
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-2 text-orange-600 dark:text-orange-400 group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors">
                  <span className="font-semibold text-xs sm:text-sm">Select</span>
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform duration-200 flex-shrink-0" />
                </div>
              </div>
            </div>

            {/* Indoor Net Booking Option */}
            <div
              onClick={() => onSelectSystem('net')}
              className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-3 sm:p-4 md:p-5 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-xl border-2 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700"
            >
              {/* Simple glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 to-indigo-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              <div className="relative z-10 text-center space-y-2 sm:space-y-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <IndoorNetIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 dark:text-white mb-0.5 sm:mb-1">
                    Indoor Net Booking
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm leading-tight">
                    Indoor nets for practice & small group activities
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-2 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                  <span className="font-semibold text-xs sm:text-sm">Select</span>
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform duration-200 flex-shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Minimal Footer */}
        <div className="text-center pt-1 sm:pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Select your preferred booking system
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookingGateway;