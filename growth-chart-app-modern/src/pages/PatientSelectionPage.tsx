import React, { useState } from 'react';
import useAppStore, { Patient } from '../store/appStore'; // Import store and Patient type

const PatientSelectionPage: React.FC = () => {
  const patients = useAppStore((state) => state.patients);
  const selectedPatientId = useAppStore((state) => state.selectedPatientId);
  const addPatient = useAppStore((state) => state.addPatient);
  const selectPatient = useAppStore((state) => state.selectPatient);

  // State for the new patient form
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientDob, setNewPatientDob] = useState('');
  const [newPatientSex, setNewPatientSex] = useState<'Male' | 'Female' | 'Other' | 'Unknown'>('Unknown');

  const handleAddPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim() || !newPatientDob.trim()) {
      alert('Patient name and DOB are required.');
      return;
    }
    addPatient({ name: newPatientName, dob: newPatientDob, sex: newPatientSex });
    setNewPatientName('');
    setNewPatientDob('');
    setNewPatientSex('Unknown');
  };

  const handleSelectPatient = (patientId: string) => {
    selectPatient(patientId);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-6">Patient Selection</h2>

      {/* Add New Patient Form */}
      <div className="mb-8 p-6 bg-white shadow rounded-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-700">Add New Patient</h3>
        <form onSubmit={handleAddPatient} className="space-y-4">
          <div>
            <label htmlFor="newPatientName" className="block text-sm font-medium text-gray-600">Name</label>
            <input
              type="text"
              id="newPatientName"
              value={newPatientName}
              onChange={(e) => setNewPatientName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Patient's full name"
              required
            />
          </div>
          <div>
            <label htmlFor="newPatientDob" className="block text-sm font-medium text-gray-600">Date of Birth</label>
            <input
              type="date" // Using date type for better UX
              id="newPatientDob"
              value={newPatientDob}
              onChange={(e) => setNewPatientDob(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="newPatientSex" className="block text-sm font-medium text-gray-600">Sex</label>
            <select
              id="newPatientSex"
              value={newPatientSex}
              onChange={(e) => setNewPatientSex(e.target.value as Patient['sex'])}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="Unknown">Unknown</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
          >
            Add Patient
          </button>
        </form>
      </div>

      {/* Patient List */}
      <h3 className="text-xl font-semibold mb-4 text-gray-700">Patient List</h3>
      {patients.length > 0 ? (
        <div className="space-y-3">
          {patients.map((patient) => (
            <div
              key={patient.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all duration-150 ease-in-out
                ${selectedPatientId === patient.id
                  ? 'bg-blue-100 border-blue-500 shadow-lg ring-2 ring-blue-500'
                  : 'bg-white hover:bg-gray-50 hover:shadow-md'
                }`}
              onClick={() => handleSelectPatient(patient.id)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && handleSelectPatient(patient.id)} // Accessibility
            >
              <h3 className="text-lg font-medium text-gray-800">{patient.name}</h3>
              <p className="text-sm text-gray-600">DOB: {patient.dob}</p>
              <p className="text-sm text-gray-600">Sex: {patient.sex}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic">No patients found. Please add a new patient using the form above.</p>
      )}

      {selectedPatientId && (
        <div className="mt-8 p-4 bg-green-50 border border-green-300 rounded-lg shadow">
          <p className="text-green-700 font-medium">
            Patient <span className="font-bold">{patients.find(p => p.id === selectedPatientId)?.name}</span> is currently selected.
          </p>
          <p className="text-sm text-green-600">You can now view their charts or add growth data.</p>
        </div>
      )}
    </div>
  );
};

export default PatientSelectionPage;
