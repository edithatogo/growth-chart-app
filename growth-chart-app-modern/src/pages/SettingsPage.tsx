import React, { useState, useEffect } from 'react';
import useAppStore, { AppSettings } from '../store/appStore';

const SettingsPage: React.FC = () => {
  const storeSettings = useAppStore((state) => state.settings);
  const updateSettingsInStore = useAppStore((state) => state.updateSettings);

  const [localSettings, setLocalSettings] = useState<AppSettings>(storeSettings);
  const [isSaved, setIsSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalSettings(storeSettings);
    setHasChanges(false);
  }, [storeSettings]);

  const handleChange = (field: keyof AppSettings | `notifications.${keyof AppSettings['notifications']}`, value: any) => {
    setLocalSettings(prev => {
      if (field.startsWith('notifications.')) {
        const notifKey = field.split('.')[1] as keyof AppSettings['notifications'];
        return { ...prev, notifications: { ...prev.notifications, [notifKey]: value } };
      }
      return { ...prev, [field as keyof AppSettings]: value };
    });
    setHasChanges(true);
    setIsSaved(false);
  };

  const handleSaveSettings = () => {
    updateSettingsInStore(localSettings);
    setIsSaved(true);
    setHasChanges(false);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleResetToDefaults = () => {
    const initialStoreSettings = {
        defaultChartType: 'WeightForAge', units: 'Metric', darkMode: false, language: 'English',
        notifications: { appointmentReminders: true, newDataAlerts: false },
      };
    setLocalSettings(initialStoreSettings);
    updateSettingsInStore(initialStoreSettings);
    setHasChanges(false);
    alert("Settings have been reset to defaults.");
  };

  // Common input/select classes for Tailwind
  const inputFieldClass = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-800 dark:text-gray-200";
  const selectFieldClass = "mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-800 dark:text-gray-200";
  const labelClass = "block text-sm font-medium text-gray-600 dark:text-gray-300";
  const checkboxLabelClass = "ml-2 block text-sm text-gray-900 dark:text-gray-200";
  const checkboxClass = "h-4 w-4 text-indigo-600 dark:text-indigo-500 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-800";


  return (
    <div className="p-4 text-gray-800 dark:text-gray-200">
      <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Application Settings</h2>

      <div className="space-y-8 max-w-2xl">
        <div className="bg-white dark:bg-gray-700/50 p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-3 text-gray-700 dark:text-gray-100">Chart Preferences</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="defaultChartType" className={labelClass}>Default Chart Type</label>
              <select id="defaultChartType" value={localSettings.defaultChartType} onChange={(e) => handleChange('defaultChartType', e.target.value as AppSettings['defaultChartType'])} className={selectFieldClass} >
                <option value="WeightForAge">Weight for Age</option> <option value="HeightForAge">Height/Length for Age</option>
                <option value="HCForAge">Head Circumference for Age</option> <option value="BMIForAge">BMI for Age</option>
              </select>
            </div>
            <div>
              <label htmlFor="units" className={labelClass}>Units of Measurement</label>
              <select id="units" value={localSettings.units} onChange={(e) => handleChange('units', e.target.value as AppSettings['units'])} className={selectFieldClass} >
                <option value="Metric">Metric (kg, cm)</option> <option value="Imperial">Imperial (lbs, inches)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700/50 p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-3 text-gray-700 dark:text-gray-100">Appearance</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <input id="darkMode" type="checkbox" checked={localSettings.darkMode} onChange={(e) => handleChange('darkMode', e.target.checked)} className={checkboxClass} />
              <label htmlFor="darkMode" className={checkboxLabelClass}>Enable Dark Mode</label>
            </div>
            <div>
              <label htmlFor="language" className={labelClass}>Language</label>
              <select id="language" value={localSettings.language} onChange={(e) => handleChange('language', e.target.value as AppSettings['language'])} className={selectFieldClass} >
                <option value="English">English</option> <option value="Spanish">Español</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700/50 p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-3 text-gray-700 dark:text-gray-100">Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <input id="appointmentReminders" type="checkbox" checked={localSettings.notifications.appointmentReminders} onChange={(e) => handleChange('notifications.appointmentReminders', e.target.checked)} className={checkboxClass}/>
              <label htmlFor="appointmentReminders" className={checkboxLabelClass}>Appointment Reminders</label>
            </div>
            <div className="flex items-center">
              <input id="newDataAlerts" type="checkbox" checked={localSettings.notifications.newDataAlerts} onChange={(e) => handleChange('notifications.newDataAlerts', e.target.checked)} className={checkboxClass} />
              <label htmlFor="newDataAlerts" className={checkboxLabelClass}>New Data Alerts</label>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end items-center space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
          {isSaved && <p className="text-sm text-green-600 dark:text-green-400 order-first sm:order-none animate-pulse">Settings saved!</p>}
           <button onClick={handleResetToDefaults} type="button"
            className="px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 w-full sm:w-auto transition-colors"
          > Reset to Defaults </button>
          <button onClick={handleSaveSettings} disabled={!hasChanges}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto transition-colors"
          > Save Settings </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
