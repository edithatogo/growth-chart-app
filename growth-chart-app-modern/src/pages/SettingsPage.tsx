import React, { useState } from 'react';

// Example settings structure
interface AppSettings {
  defaultChartType: 'WeightForAge' | 'HeightForAge' | 'HCForAge' | 'BMIForAge';
  units: 'Metric' | 'Imperial';
  darkMode: boolean;
  language: 'English' | 'Spanish'; // Example languages
  notifications: {
    appointmentReminders: boolean;
    newDataAlerts: boolean;
  };
}

// Mock current settings - in a real app, this would come from Zustand/localStorage
const initialSettings: AppSettings = {
  defaultChartType: 'WeightForAge',
  units: 'Metric',
  darkMode: false,
  language: 'English',
  notifications: {
    appointmentReminders: true,
    newDataAlerts: false,
  },
};

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [isSaved, setIsSaved] = useState(false);

  const handleChange = (field: keyof AppSettings, value: any) => {
    // For nested settings like notifications
    if (field === 'notifications' && typeof value === 'object') {
      setSettings(prev => ({
        ...prev,
        notifications: { ...prev.notifications, ...value }
      }));
    } else {
      setSettings(prev => ({ ...prev, [field]: value }));
    }
    setIsSaved(false); // Reset saved status on change
  };

  const handleSaveSettings = () => {
    // Here you would persist settings (e.g., to localStorage or a backend)
    console.log('Settings saved:', settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000); // Hide message after 3s
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-6">Application Settings</h2>

      <div className="space-y-8 max-w-2xl">
        {/* Chart Settings */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-3 text-gray-700">Chart Preferences</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="defaultChartType" className="block text-sm font-medium text-gray-600 mb-1">Default Chart Type</label>
              <select
                id="defaultChartType"
                value={settings.defaultChartType}
                onChange={(e) => handleChange('defaultChartType', e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="WeightForAge">Weight for Age</option>
                <option value="HeightForAge">Height/Length for Age</option>
                <option value="HCForAge">Head Circumference for Age</option>
                <option value="BMIForAge">BMI for Age</option>
              </select>
            </div>
            <div>
              <label htmlFor="units" className="block text-sm font-medium text-gray-600 mb-1">Units of Measurement</label>
              <select
                id="units"
                value={settings.units}
                onChange={(e) => handleChange('units', e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="Metric">Metric (kg, cm)</option>
                <option value="Imperial">Imperial (lbs, inches)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-3 text-gray-700">Appearance</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                id="darkMode"
                type="checkbox"
                checked={settings.darkMode}
                onChange={(e) => handleChange('darkMode', e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="darkMode" className="ml-2 block text-sm text-gray-900">Enable Dark Mode</label>
            </div>
            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-600 mb-1">Language</label>
              <select
                id="language"
                value={settings.language}
                onChange={(e) => handleChange('language', e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="English">English</option>
                <option value="Spanish">Español</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-3 text-gray-700">Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                id="appointmentReminders"
                type="checkbox"
                checked={settings.notifications.appointmentReminders}
                onChange={(e) => handleChange('notifications', { appointmentReminders: e.target.checked })}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="appointmentReminders" className="ml-2 block text-sm text-gray-900">Appointment Reminders</label>
            </div>
            <div className="flex items-center">
              <input
                id="newDataAlerts"
                type="checkbox"
                checked={settings.notifications.newDataAlerts}
                onChange={(e) => handleChange('notifications', { newDataAlerts: e.target.checked })}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="newDataAlerts" className="ml-2 block text-sm text-gray-900">New Data Alerts</label>
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center">
          {isSaved && <p className="text-sm text-green-600 mr-4">Settings saved successfully!</p>}
          <button
            onClick={handleSaveSettings}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
