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
    // Only initialize if not already attempted or if there was an error previously and we want to retry (e.g. on reload)
    if (!fhirContext.isRetrieved || fhirContext.error) {
        initializeFHIR().then(client => {
            if (client && client.patient?.id) { // Check if client and patient id are available
                // Successfully initialized and have patient context
                console.log("FHIR client initialized in App.tsx, attempting to fetch patient data.");
                fetchFHIRPatient(); // Fetch patient data after client is ready
            } else if (client) {
                // Client initialized but no patient context from launch (e.g., practitioner launch)
                console.log("FHIR client initialized in App.tsx, but no patient context in launch.");
                // Here, app might show a patient selection screen or other UI
            }
            // If client is null, initializeFHIR would have set an error in store or marked as no context found
        });
    }
  }, [initializeFHIR, fetchFHIRPatient, fhirContext.isRetrieved, fhirContext.error]);


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

        {/* Main Content Area */}
        <div className="flex flex-1 container mx-auto mt-4 mb-4">
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
