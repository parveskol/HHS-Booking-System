import React from 'react';
import { X, LogOut, ArrowLeft } from 'lucide-react';

interface ExitConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  canGoBack: boolean;
  exitType?: 'back-button' | 'exit-button';
}

const ExitConfirmationDialog: React.FC<ExitConfirmationDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  canGoBack,
  exitType = 'back-button',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-auto animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Exit App
          </h3>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mx-auto mb-4">
            <LogOut className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-center text-gray-600 dark:text-gray-400">
            {exitType === 'exit-button' ? (
              canGoBack
                ? "You're about to exit the app. Would you like to go back instead?"
                : "Are you sure you want to exit the Harvard House Sports app?"
            ) : (
              canGoBack
                ? "Would you like to go back to the previous screen or exit the app?"
                : "Are you sure you want to exit the app?"
            )}
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          {canGoBack && (
            <button
              onClick={onCancel}
              className="w-full flex items-center justify-center space-x-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              <ArrowLeft size={18} />
              <span>Go Back</span>
            </button>
          )}

          <button
            onClick={onConfirm}
            className="w-full bg-red-500 text-white px-4 py-3 rounded-xl hover:bg-red-600 transition-colors font-medium"
          >
            Exit App
          </button>

          <button
            onClick={onCancel}
            className="w-full text-gray-500 dark:text-gray-400 text-sm hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            You can also close the app using your device's app switcher
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExitConfirmationDialog;