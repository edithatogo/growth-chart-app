import React, { useEffect } from 'react'; // Added useEffect
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import useAppStore from './store/appStore';

// Import page components
import DashboardPage from './pages/DashboardPage';
import PatientSelectionPage from './pages/PatientSelectionPage';
import ChartViewPage from './pages/ChartViewPage';
import TableViewPage from './pages/TableViewPage';
import ParentalViewPage from './pages/ParentalViewPage';
import SettingsPage from './pages/SettingsPage';
import FHIRStatusDisplay from './components/FHIRStatusDisplay'; // Import the status display component

const App: React.FC = () => {
  const darkMode = useAppStore((state) => state.settings.darkMode);

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Initialize FHIR client on app load
  const initializeFHIR = useAppStore((state) => state.initializeFHIRClient);
  const fetchFHIRPatient = useAppStore((state) => state.fetchFHIRPatientData);
  const fhirContext = useAppStore((state) => state.fhirContext);

  useEffect(() => {
    // Initialize FHIR if status is 'idle' (initial load)
    // or if it's 'no_context' (meaning prior init found no EHR launch, user might have navigated to launch.html manually)
    // or if it's 'error' (allowing a retry on reload, though a manual retry button would be better UX for subsequent errors)
    if (fhirContext.status === 'idle' || fhirContext.status === 'no_context' || fhirContext.status === 'error') {
      console.log(`App.tsx: FHIR status is '${fhirContext.status}', attempting initialization.`);
      initializeFHIR().then(client => {
        // initializeFHIR now sets the status to 'ready', 'no_context', or 'error'.
        // It also updates isAuthorized and isRetrieved.
        if (getAppStore().fhirContext.status === 'ready' && client?.patient?.id) {
          console.log("App.tsx: FHIR client ready with patient context, attempting to fetch patient data.");
          fetchFHIRPatient(); // This will set status to 'fetch_patient' then 'fetch_growth_data' then 'ready' or 'error'
        } else if (getAppStore().fhirContext.status === 'ready') {
          console.log("App.tsx: FHIR client ready, but no patient context in launch (e.g., practitioner launch).");
          // App can now show specific UI for this case, e.g., a patient search if applicable.
        } else {
          // Status will be 'no_context' or 'error', FHIRStatusDisplay will show appropriate message.
          console.log(`App.tsx: FHIR initialization completed with status: ${getAppStore().fhirContext.status}. Error: ${getAppStore().fhirContext.error || 'none'}`);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initializeFHIR, fetchFHIRPatient, fhirContext.status]); // Depend only on status for re-triggering logic
  // Added getAppStore to read latest state directly after async initializeFHIR call.
  // This is a bit of a workaround for not having the latest state immediately in the .then() closure.
  // A more robust solution might involve initializeFHIR returning the new status or client.

  const getAppStore = useAppStore.getState; // Helper to get current state


  return (
    <Router>
      {/* Apply a base background color that respects dark mode at a high level */}
      <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
        {/* Header */}
        <header className="bg-blue-600 dark:bg-blue-800 text-white p-4 shadow-md sticky top-0 z-50">
          <div className="container mx-auto flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold hover:text-blue-200 dark:hover:text-blue-300 transition-colors">Modern Growth Chart</Link>
            {/* User profile/login icon could also adapt to dark mode */}
          </div>
        </header>

        <FHIRStatusDisplay /> {/* Display FHIR status messages/errors */}

        {/* Main Content Area */}
        <div className="flex flex-1 container mx-auto mt-4 mb-4"> {/* mt-4 provides some space from header/banner */}
          {/* Sidebar Navigation */}
          <nav className="w-64 bg-white dark:bg-gray-800 p-4 shadow rounded-lg mr-4 flex-shrink-0 self-start sticky top-20">
            <ul className="space-y-2">
              <li><Link to="/patients" className="block p-2 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-gray-700 rounded transition-colors">Patient Selection</Link></li>
              <li><Link to="/chart-view" className="block p-2 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-gray-700 rounded transition-colors">Chart View</Link></li>
              <li><Link to="/table-view" className="block p-2 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-gray-700 rounded transition-colors">Table View</Link></li>
              <li><Link to="/parental-view" className="block p-2 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-gray-700 rounded transition-colors">Parental View</Link></li>
              <li><Link to="/settings" className="block p-2 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-gray-700 rounded transition-colors">Settings</Link></li>
            </ul>
          </nav>

          {/* Page Content Wrapper with dark mode background */}
          <main className="flex-1 bg-white dark:bg-gray-800 p-6 shadow rounded-lg overflow-y-auto">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/patients" element={<PatientSelectionPage />} />
              <Route path="/chart-view" element={<ChartViewPage />} />
              <Route path="/table-view" element={<TableViewPage />} />
              <Route path="/parental-view" element={<ParentalViewPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>

        {/* Footer */}
        <footer className="bg-gray-800 dark:bg-black text-white dark:text-gray-300 text-center p-4">
          <p>&copy; {new Date().getFullYear()} Growth Chart App. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  );
};

export default App;
