import React from 'react';
import useAppStore from '../store/appStore';
import { InformationCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/solid'; // Using solid icons

const FHIRStatusDisplay: React.FC = () => {
  const { status, error } = useAppStore((state) => state.fhirContext);
  const setFHIRContext = useAppStore((state) => state.setFHIRContext);

  const handleDismissError = () => {
    setFHIRContext({ error: null, status: 'idle' }); // Reset status to idle or based on previous state if needed
  };

  if (status === 'idle' || status === 'ready') {
    return null; // No display needed for these states
  }

  let message = '';
  let bgColor = 'bg-blue-500'; // Default for loading states
  let textColor = 'text-white';
  let IconComponent: React.ElementType | null = InformationCircleIcon;

  switch (status) {
    case 'initializing':
      message = 'Initializing FHIR connection...';
      break;
    case 'authorizing':
      message = 'Authorizing with FHIR server...';
      break;
    case 'fetch_patient':
      message = 'Fetching patient data...';
      break;
    case 'fetch_growth_data':
      message = 'Fetching growth data...';
      break;
    case 'no_context':
      message = 'Not launched via SMART on FHIR or no patient context found. Standard mode active.';
      bgColor = 'bg-yellow-100 dark:bg-yellow-700/50';
      textColor = 'text-yellow-700 dark:text-yellow-200';
      IconComponent = InformationCircleIcon;
      break;
    case 'error':
      message = error || 'An unknown FHIR error occurred.';
      bgColor = 'bg-red-100 dark:bg-red-700/50';
      textColor = 'text-red-700 dark:text-red-200';
      IconComponent = ExclamationTriangleIcon;
      break;
    default:
      return null; // Should not happen
  }

  // Basic spinner for loading states
  const isLoading = ['initializing', 'authorizing', 'fetch_patient', 'fetch_growth_data'].includes(status);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 p-3 ${bgColor} ${textColor} shadow-md z-50 transition-all duration-300 ease-in-out flex items-center justify-between`}
      role={status === 'error' ? "alert" : "status"}
      aria-live={status === 'error' ? "assertive" : "polite"}
    >
      <div className="flex items-center">
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {IconComponent && !isLoading && <IconComponent className={`h-5 w-5 mr-2 ${textColor}`} />}
        <span>{message}</span>
      </div>
      {status === 'error' && (
        <button
          onClick={handleDismissError}
          className={`p-1 rounded-full hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-${bgColor} focus:ring-white dark:focus:ring-gray-300`}
          aria-label="Dismiss error message"
        >
          <XCircleIcon className={`h-6 w-6 ${textColor}`} />
        </button>
      )}
       {(status === 'no_context') && (
        <button
          onClick={() => setFHIRContext({ status: 'idle' })} // Simple dismiss to idle
          className={`p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-${bgColor} focus:ring-yellow-600 dark:focus:ring-yellow-300`}
          aria-label="Dismiss context message"
        >
          <XCircleIcon className={`h-5 w-5 ${textColor}`} />
        </button>
      )}
    </div>
  );
};

export default FHIRStatusDisplay;
