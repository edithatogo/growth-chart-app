import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// Import page components
import DashboardPage from './pages/DashboardPage';
import PatientSelectionPage from './pages/PatientSelectionPage';
import ChartViewPage from './pages/ChartViewPage';
import TableViewPage from './pages/TableViewPage';
import ParentalViewPage from './pages/ParentalViewPage';
import SettingsPage from './pages/SettingsPage';

const App: React.FC = () => {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-50">
          <div className="container mx-auto flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold hover:text-blue-200 transition-colors">Modern Growth Chart</Link>
            {/* Could add a user profile/login icon here */}
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex flex-1 container mx-auto mt-4 mb-4">
          {/* Sidebar Navigation */}
          <nav className="w-64 bg-white p-4 shadow rounded-lg mr-4 flex-shrink-0 self-start sticky top-20"> {/* self-start and sticky top-20 for nav */}
            <ul className="space-y-2">
              <li><Link to="/patients" className="block p-2 text-blue-700 hover:bg-blue-100 rounded transition-colors">Patient Selection</Link></li>
              <li><Link to="/chart-view" className="block p-2 text-blue-700 hover:bg-blue-100 rounded transition-colors">Chart View</Link></li>
              <li><Link to="/table-view" className="block p-2 text-blue-700 hover:bg-blue-100 rounded transition-colors">Table View</Link></li>
              <li><Link to="/parental-view" className="block p-2 text-blue-700 hover:bg-blue-100 rounded transition-colors">Parental View</Link></li>
              <li><Link to="/settings" className="block p-2 text-blue-700 hover:bg-blue-100 rounded transition-colors">Settings</Link></li>
            </ul>
          </nav>

          {/* Page Content */}
          <main className="flex-1 bg-white p-6 shadow rounded-lg overflow-y-auto">
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
        <footer className="bg-gray-800 text-white text-center p-4">
          <p>&copy; {new Date().getFullYear()} Growth Chart App. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  );
};

export default App;
