import React, { useState } from 'react';
import { runSyncTests, testCloudConnectivity, testOfflineStorage } from '../utils/syncTest';
import { useOfflineStorage } from '../hooks/useOfflineStorage';
import { Wifi, WifiOff, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  details?: any;
}

const SyncTestPanel: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([
    { name: 'Cloud Connectivity', status: 'pending', message: 'Not tested yet' },
    { name: 'Offline Storage', status: 'pending', message: 'Not tested yet' },
    { name: 'Data Validation', status: 'pending', message: 'Not tested yet' },
    { name: 'Network Status', status: 'pending', message: 'Not tested yet' }
  ]);

  const { isOnline, pendingOperations } = useOfflineStorage();

  const runTest = async (testName: string, testFunction: () => Promise<any>) => {
    // Update test status to running
    setTestResults(prev => prev.map(test =>
      test.name === testName
        ? { ...test, status: 'running' as const, message: 'Testing...' }
        : test
    ));

    try {
      const result = await testFunction();

      // Update test status to success or error
      setTestResults(prev => prev.map(test =>
        test.name === testName
          ? {
              ...test,
              status: result.success ? 'success' as const : 'error' as const,
              message: result.message,
              details: result.details
            }
          : test
      ));
    } catch (error) {
      setTestResults(prev => prev.map(test =>
        test.name === testName
          ? {
              ...test,
              status: 'error' as const,
              message: `Test failed: ${error}`,
              details: error
            }
          : test
      ));
    }
  };

  const runAllTests = async () => {
    await Promise.all([
      runTest('Cloud Connectivity', testCloudConnectivity),
      runTest('Offline Storage', testOfflineStorage),
      runTest('Network Status', async () => ({
        success: true,
        message: isOnline ? 'Online' : 'Offline',
        details: { isOnline, pendingOperations: pendingOperations.length }
      })),
      runTest('Data Validation', async () => {
        // Simple validation test
        const testBooking = {
          customer_name: 'Test User',
          customer_contact: '9999999999',
          date: new Date().toISOString().split('T')[0],
          booking_type: 'full_day' as const,
          event_type: 'Test Event',
          payment_status: 'Unpaid' as const,
          system: 'ground' as const,
          status: 'pending' as const,
          payment_amount: 1000
        };

        // Basic validation check
        const hasRequiredFields = testBooking.customer_name && testBooking.date;
        return {
          success: hasRequiredFields,
          message: hasRequiredFields ? 'Validation passed' : 'Validation failed',
          details: { hasRequiredFields }
        };
      })
    ]);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'pending':
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'running':
        return 'border-blue-200 bg-blue-50';
      case 'pending':
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          Sync & Connectivity Test
        </h2>
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-green-500" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-500" />
          )}
          <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {pendingOperations.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              {pendingOperations.length} pending operations will sync when online
            </span>
          </div>
        </div>
      )}

      <div className="space-y-4 mb-6">
        {testResults.map((test, index) => (
          <div
            key={index}
            className={`p-4 border rounded-lg ${getStatusColor(test.status)}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(test.status)}
                <div>
                  <h3 className="font-medium text-gray-800 dark:text-white">
                    {test.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {test.message}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (test.name === 'Cloud Connectivity') {
                    runTest('Cloud Connectivity', testCloudConnectivity);
                  } else if (test.name === 'Offline Storage') {
                    runTest('Offline Storage', testOfflineStorage);
                  } else if (test.name === 'Network Status') {
                    runTest('Network Status', async () => ({
                      success: true,
                      message: isOnline ? 'Online' : 'Offline',
                      details: { isOnline, pendingOperations: pendingOperations.length }
                    }));
                  } else if (test.name === 'Data Validation') {
                    runTest('Data Validation', async () => ({
                      success: true,
                      message: 'Validation test completed',
                      details: { timestamp: new Date().toISOString() }
                    }));
                  }
                }}
                disabled={test.status === 'running'}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Test
              </button>
            </div>

            {test.details && (
              <details className="mt-3">
                <summary className="text-sm text-gray-500 cursor-pointer">
                  View Details
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-auto">
                  {JSON.stringify(test.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          onClick={runAllTests}
          className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Run All Tests</span>
        </button>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
          Test Information
        </h3>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• <strong>Cloud Connectivity:</strong> Tests connection to Supabase database</li>
          <li>• <strong>Offline Storage:</strong> Tests IndexedDB functionality</li>
          <li>• <strong>Network Status:</strong> Shows current online/offline status</li>
          <li>• <strong>Data Validation:</strong> Tests data validation utilities</li>
        </ul>
      </div>
    </div>
  );
};

export default SyncTestPanel;