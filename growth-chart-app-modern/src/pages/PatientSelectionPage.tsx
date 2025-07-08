import React from 'react';

// Mock patient data type
interface Patient {
  id: string;
  name: string;
  dob: string;
  sex: 'Male' | 'Female' | 'Other';
}

// Mock list of patients
const mockPatients: Patient[] = [
  { id: '1', name: 'John Doe', dob: '2022-01-15', sex: 'Male' },
  { id: '2', name: 'Jane Smith', dob: '2021-11-30', sex: 'Female' },
  { id: '3', name: 'Alex Johnson', dob: '2023-03-10', sex: 'Other' },
  { id: '4', name: 'Emily White', dob: '2022-07-22', sex: 'Female' },
];

const PatientSelectionPage: React.FC = () => {
  // In a real app, selectedPatientId would come from state management (e.g., Zustand)
  const [selectedPatientId, setSelectedPatientId] = React.useState<string | null>(null);

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    // Here you would typically update global state with the selected patient
    console.log(`Patient ${patientId} selected.`);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-6">Patient Selection</h2>

      <div className="mb-6">
        {/* This would be a more complex form in a real app */}
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          onClick={() => alert('Add new patient functionality to be implemented')}
        >
          Add New Patient
        </button>
      </div>

      {mockPatients.length > 0 ? (
        <div className="space-y-4">
          {mockPatients.map((patient) => (
            <div
              key={patient.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all duration-150 ease-in-out
                ${selectedPatientId === patient.id
                  ? 'bg-blue-100 border-blue-500 shadow-md'
                  : 'bg-white hover:bg-gray-50 hover:shadow-sm'
                }`}
              onClick={() => handleSelectPatient(patient.id)}
            >
              <h3 className="text-lg font-medium text-gray-800">{patient.name}</h3>
              <p className="text-sm text-gray-600">Date of Birth: {patient.dob}</p>
              <p className="text-sm text-gray-600">Sex: {patient.sex}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600">No patients found. Please add a new patient.</p>
      )}

      {selectedPatientId && (
        <div className="mt-6 p-4 bg-green-50 border border-green-300 rounded-lg">
          <p className="text-green-700 font-medium">
            Patient {mockPatients.find(p => p.id === selectedPatientId)?.name} is currently selected.
          </p>
          {/* Navigation to other views for this patient would typically be handled by global state change */}
        </div>
      )}
    </div>
  );
};

export default PatientSelectionPage;
