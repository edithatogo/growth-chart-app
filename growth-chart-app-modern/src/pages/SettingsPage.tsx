import React, { useState, useEffect } from 'react';
import useAppStore, { AppSettings } from '../store/appStore';

const SettingsPage: React.FC = () => {
  const storeSettings = useAppStore((state) => state.settings);
  const updateSettingsInStore = useAppStore((state) => state.updateSettings);

  // Local form state, initialized from store settings
  const [localSettings, setLocalSettings] = useState<AppSettings>(storeSettings);
  const [isSaved, setIsSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Effect to update local form state if storeSettings change (e.g., from another browser tab if using broadcast)
  // Or simply to ensure it's initialized correctly on first load.
  useEffect(() => {
    setLocalSettings(storeSettings);
    setHasChanges(false); // Reset changes status when store settings are reloaded
  }, [storeSettings]);

  const handleChange = (field: keyof AppSettings | `notifications.${keyof AppSettings['notifications']}`, value: any) => {
    setLocalSettings(prev => {
      if (field.startsWith('notifications.')) {
        const notifKey = field.split('.')[1] as keyof AppSettings['notifications'];
        return {
          ...prev,
          notifications: { ...prev.notifications, [notifKey]: value }
        };
      }
      return { ...prev, [field as keyof AppSettings]: value };
    });
    setHasChanges(true); // Mark that there are unsaved changes
    setIsSaved(false);
  };

  const handleSaveSettings = () => {
    updateSettingsInStore(localSettings);
    setIsSaved(true);
    setHasChanges(false); // Reset changes status after saving
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleResetToDefaults = () => {
    // This would ideally reset to initial settings from the store definition or a predefined constant
    // For now, let's assume store's initial state is the default
    const defaultSettings = useAppStore.getState().settings; // Access initial state (or a predefined default const)
    const initialStoreSettings = { // Reconstruct initial settings as defined in the store
        defaultChartType: 'WeightForAge',
        units: 'Metric',
        darkMode: false,
        language: 'English',
        notifications: {
          appointmentReminders: true,
          newDataAlerts: false,
        },
      };
    setLocalSettings(initialStoreSettings);
    updateSettingsInStore(initialStoreSettings); // Also update store immediately
    setHasChanges(false);
    alert("Settings have been reset to defaults.");
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
                value={localSettings.defaultChartType}
                onChange={(e) => handleChange('defaultChartType', e.target.value as AppSettings['defaultChartType'])}
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
                value={localSettings.units}
                onChange={(e) => handleChange('units', e.target.value as AppSettings['units'])}
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
                checked={localSettings.darkMode}
                onChange={(e) => handleChange('darkMode', e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="darkMode" className="ml-2 block text-sm text-gray-900">Enable Dark Mode</label>
            </div>
            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-600 mb-1">Language</label>
              <select
                id="language"
                value={localSettings.language}
                onChange={(e) => handleChange('language', e.target.value as AppSettings['language'])}
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
                checked={localSettings.notifications.appointmentReminders}
                onChange={(e) => handleChange('notifications.appointmentReminders', e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="appointmentReminders" className="ml-2 block text-sm text-gray-900">Appointment Reminders</label>
            </div>
            <div className="flex items-center">
              <input
                id="newDataAlerts"
                type="checkbox"
                checked={localSettings.notifications.newDataAlerts}
                onChange={(e) => handleChange('notifications.newDataAlerts', e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="newDataAlerts" className="ml-2 block text-sm text-gray-900">New Data Alerts</label>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end items-center space-y-3 sm:space-y-0 sm:space-x-3">
          {isSaved && <p className="text-sm text-green-600 order-first sm:order-none">Settings saved successfully!</p>}
           <button
            onClick={handleResetToDefaults}
            type="button"
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-full sm:w-auto"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={!hasChanges}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
