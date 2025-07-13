import React from 'react';
import { ArrowTrendingUpIcon, BeakerIcon, ScaleIcon, UserIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import useAppStore, { useCurrentPatient } from '../store/appStore'; // Assuming you might want to use real data eventually

const ParentalViewPage: React.FC = () => {
  const currentPatient = useCurrentPatient(); // Example: use real patient if selected

  // Mock data, potentially overridden or supplemented by store data if patient is selected
  const mockParentalData = {
    name: currentPatient?.name || 'Alex Johnson (Sample)',
    age: '1 year 3 months', // This would need calculation based on currentPatient.dob
    lastVisit: '2024-06-15',
    weight: { value: '10.2 kg', trend: 'normal', percentile: 'P60' },
    height: { value: '78 cm', trend: 'normal', percentile: 'P55' },
    headCircumference: { value: '45 cm', trend: 'normal', percentile: 'P50', applicable: true },
    bmi: { value: '16.7 kg/m²', status: 'Healthy Weight', applicable: true },
    nextAppointment: '2024-09-15 (Routine Checkup)',
    milestones: [
      'Started walking', 'Can say several single words', 'Responds to simple instructions'
    ],
    recommendations: [
      'Continue offering a variety of healthy foods.', 'Encourage active play for at least 1 hour a day.', 'Read books together daily.'
    ]
  };

  const patientData = currentPatient ? {
      ...mockParentalData, // Use mock as a base
      name: currentPatient.name,
      // age: calculateAge(currentPatient.dob), // TODO: Implement age calculation
      // Potentially fetch and map real records to weight, height etc. if available in store
  } : mockParentalData;


  const getTrendIndicator = (trend: string) => {
    if (trend === 'above average') return <ArrowTrendingUpIcon className="w-5 h-5 text-yellow-500 dark:text-yellow-400 inline mr-1" />;
    if (trend === 'below average') return <ArrowTrendingUpIcon className="w-5 h-5 text-yellow-500 dark:text-yellow-400 inline mr-1 transform rotate-90" />;
    return <ScaleIcon className="w-5 h-5 text-green-500 dark:text-green-400 inline mr-1" />;
  };

  if (!currentPatient && false) { // Set to true to enforce patient selection for this view
      return (
          <div className="p-4 text-center text-gray-800 dark:text-gray-200">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Parental Growth Summary</h2>
            <InformationCircleIcon className="w-12 h-12 mx-auto text-blue-500 dark:text-blue-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Please select a patient from the "Patient Selection" page to view their growth summary.</p>
          </div>
        );
  }


  return (
    <div className="p-4 text-gray-800 dark:text-gray-200">
      <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Growth Summary for {patientData.name}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-700/50 p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-300 mb-3 flex items-center">
            <UserIcon className="w-6 h-6 mr-2" /> Basic Information
          </h3>
          <p><strong>Age:</strong> {patientData.age}</p>
          <p><strong>Last Visit:</strong> {patientData.lastVisit}</p>
          <p><strong>Next Appointment:</strong> {patientData.nextAppointment}</p>
        </div>

        <div className="bg-white dark:bg-gray-700/50 p-6 rounded-lg shadow space-y-3">
          <h3 className="text-xl font-semibold text-green-600 dark:text-green-300 mb-3 flex items-center">
            <ArrowTrendingUpIcon className="w-6 h-6 mr-2" /> Growth Metrics
          </h3>
          <div>
            <strong>Weight:</strong> {patientData.weight.value} ({patientData.weight.percentile})
            {getTrendIndicator(patientData.weight.trend)}
          </div>
          <div>
            <strong>Height/Length:</strong> {patientData.height.value} ({patientData.height.percentile})
            {getTrendIndicator(patientData.height.trend)}
          </div>
          {patientData.headCircumference.applicable && (
            <div>
              <strong>Head Circumference:</strong> {patientData.headCircumference.value} ({patientData.headCircumference.percentile})
              {getTrendIndicator(patientData.headCircumference.trend)}
            </div>
          )}
          {patientData.bmi.applicable && (
            <div>
              <strong>BMI:</strong> {patientData.bmi.value} ({patientData.bmi.status})
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {patientData.milestones.length > 0 && (
          <div className="bg-white dark:bg-gray-700/50 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-purple-600 dark:text-purple-300 mb-3">Recent Milestones</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
              {patientData.milestones.map((milestone, index) => (
                <li key={index}>{milestone}</li>
              ))}
            </ul>
          </div>
        )}

        {patientData.recommendations.length > 0 && (
          <div className="bg-white dark:bg-gray-700/50 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-teal-600 dark:text-teal-300 mb-3 flex items-center">
              <BeakerIcon className="w-6 h-6 mr-2" /> Recommendations
            </h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
              {patientData.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
        <p>This view provides a simplified summary of your child's growth. For detailed charts and data, please see the "Chart View" or "Table View". Always discuss any concerns with your healthcare provider.</p>
      </div>
    </div>
  );
};

export default ParentalViewPage;
