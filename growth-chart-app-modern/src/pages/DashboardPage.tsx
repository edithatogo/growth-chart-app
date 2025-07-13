import React from 'react';

const DashboardPage: React.FC = () => (
  <div className="p-4 text-gray-800 dark:text-gray-200">
    <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Welcome to the Modern Growth Chart App!</h1>
    <p className="text-lg mb-4">
      This application allows you to track and visualize pediatric growth data using various charts and views.
    </p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-blue-50 dark:bg-blue-900/50 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-blue-700 dark:text-blue-300 mb-2">Track Patient Growth</h2>
        <p className="text-gray-700 dark:text-gray-300">Enter and manage patient measurements over time. Visualize data on standard growth charts (WHO, CDC) and specialized charts for specific conditions.</p>
      </div>
      <div className="bg-green-50 dark:bg-green-900/50 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-green-700 dark:text-green-300 mb-2">Customizable Centiles</h2>
        <p className="text-gray-700 dark:text-gray-300">Select different centile sets appropriate for various populations or specific health conditions to get a more accurate assessment.</p>
      </div>
      <div className="bg-yellow-50 dark:bg-yellow-900/50 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-yellow-700 dark:text-yellow-300 mb-2">Multiple Views</h2>
        <p className="text-gray-700 dark:text-gray-300">Explore data through interactive charts, detailed table views, and a simplified parental view designed for easy understanding.</p>
      </div>
      <div className="bg-indigo-50 dark:bg-indigo-900/50 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-indigo-700 dark:text-indigo-300 mb-2">Data-Driven Insights</h2>
        <p className="text-gray-700 dark:text-gray-300">Gain insights into growth patterns to support clinical decision-making and parental education.</p>
      </div>
    </div>
    <p className="mt-8 text-md">
      Use the navigation panel on the left to select a patient, view charts, or adjust settings.
    </p>
  </div>
);

export default DashboardPage;
