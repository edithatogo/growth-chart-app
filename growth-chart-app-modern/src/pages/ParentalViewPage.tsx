import React from 'react';
import { ArrowTrendingUpIcon, BeakerIcon, ScaleIcon, UserIcon } from '@heroicons/react/24/outline'; // Example icons

// Assume data for a selected patient is available (e.g., from Zustand store)
const mockParentalData = {
  name: 'Alex Johnson',
  age: '1 year 3 months',
  lastVisit: '2024-06-15',
  weight: { value: '10.2 kg', trend: 'normal', percentile: 'P60' },
  height: { value: '78 cm', trend: 'normal', percentile: 'P55' },
  headCircumference: { value: '45 cm', trend: 'normal', percentile: 'P50', applicable: true },
  bmi: { value: '16.7 kg/m²', status: 'Healthy Weight', applicable: true },
  nextAppointment: '2024-09-15 (Routine Checkup)',
  milestones: [
    'Started walking',
    'Can say several single words',
    'Responds to simple instructions'
  ],
  recommendations: [
    'Continue offering a variety of healthy foods.',
    'Encourage active play for at least 1 hour a day.',
    'Read books together daily.'
  ]
};

const ParentalViewPage: React.FC = () => {
  const patientData = mockParentalData; // In a real app, this would come from state

  const getTrendIndicator = (trend: string) => {
    if (trend === 'above average') return <ArrowTrendingUpIcon className="w-5 h-5 text-yellow-500 inline mr-1" />;
    if (trend === 'below average') return <ArrowTrendingUpIcon className="w-5 h-5 text-yellow-500 inline mr-1 transform rotate-90" />; // Placeholder for different icon
    return <ScaleIcon className="w-5 h-5 text-green-500 inline mr-1" />; // normal
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-6 text-gray-700">Growth Summary for {patientData.name}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Basic Info */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-blue-600 mb-3 flex items-center">
            <UserIcon className="w-6 h-6 mr-2" /> Basic Information
          </h3>
          <p><strong>Age:</strong> {patientData.age}</p>
          <p><strong>Last Visit:</strong> {patientData.lastVisit}</p>
          <p><strong>Next Appointment:</strong> {patientData.nextAppointment}</p>
        </div>

        {/* Growth Metrics */}
        <div className="bg-white p-6 rounded-lg shadow space-y-3">
          <h3 className="text-xl font-semibold text-green-600 mb-3 flex items-center">
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

      {/* Milestones & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {patientData.milestones.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-purple-600 mb-3">Recent Milestones</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {patientData.milestones.map((milestone, index) => (
                <li key={index}>{milestone}</li>
              ))}
            </ul>
          </div>
        )}

        {patientData.recommendations.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-teal-600 mb-3 flex items-center">
              <BeakerIcon className="w-6 h-6 mr-2" /> Recommendations
            </h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {patientData.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-8 text-sm text-gray-500">
        <p>This view provides a simplified summary of your child's growth. For detailed charts and data, please see the "Chart View" or "Table View". Always discuss any concerns with your healthcare provider.</p>
      </div>
    </div>
  );
};

export default ParentalViewPage;
