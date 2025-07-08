import React, { useState } from 'react';
import useAppStore, { Patient } from '../store/appStore';

const PatientSelectionPage: React.FC = () => {
  const patients = useAppStore((state) => state.patients);
  const selectedPatientId = useAppStore((state) => state.selectedPatientId);
  const addPatient = useAppStore((state) => state.addPatient);
  const selectPatient = useAppStore((state) => state.selectPatient);

  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientDob, setNewPatientDob] = useState('');
  const [newPatientSex, setNewPatientSex] = useState<'Male' | 'Female' | 'Other' | 'Unknown'>('Unknown');
  const [addPatientSuccess, setAddPatientSuccess] = useState(false);

  const handleAddPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim() || !newPatientDob.trim()) {
      alert('Patient name and DOB are required.');
      return;
    }
    const newPatient = addPatient({ name: newPatientName, dob: newPatientDob, sex: newPatientSex });
    if (newPatient) {
        setNewPatientName('');
        setNewPatientDob('');
        setNewPatientSex('Unknown');
        setAddPatientSuccess(true);
        setTimeout(() => setAddPatientSuccess(false), 3000);
    } else {
        alert("Failed to add patient."); // Should not happen with current store logic
    }
  };

  const handleSelectPatient = (patientId: string) => {
    selectPatient(patientId);
  };

  const inputBaseClass = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-800 dark:text-gray-200";
  const labelBaseClass = "block text-sm font-medium text-gray-600 dark:text-gray-300";


  return (
    <div className="p-4 text-gray-800 dark:text-gray-200">
      <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Patient Management</h2>

      <div className="mb-8 p-6 bg-white dark:bg-gray-700/50 shadow rounded-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-100">Add New Patient</h3>
        <form onSubmit={handleAddPatient} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="newPatientName" className={labelBaseClass}>Full Name</label>
              <input
                type="text" id="newPatientName" value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
                className={inputBaseClass} placeholder="Patient's full name" required
              />
            </div>
            <div>
              <label htmlFor="newPatientDob" className={labelBaseClass}>Date of Birth</label>
              <input
                type="date" id="newPatientDob" value={newPatientDob}
                onChange={(e) => setNewPatientDob(e.target.value)}
                className={`${inputBaseClass} [color-scheme:light] dark:[color-scheme:dark]`} required
              />
            </div>
            <div className="md:col-span-2"> {/* Sex dropdown can span full width or be part of grid */}
              <label htmlFor="newPatientSex" className={labelBaseClass}>Sex</label>
              <select
                id="newPatientSex" value={newPatientSex}
                onChange={(e) => setNewPatientSex(e.target.value as Patient['sex'])}
                className={`${inputBaseClass} mt-1`}
              >
                <option value="Unknown">Unknown</option> <option value="Male">Male</option>
                <option value="Female">Female</option> <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="pt-2 flex justify-end items-center space-x-3"> {/* Added items-center and space-x for message */}
            {addPatientSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400 animate-pulse">Patient added successfully!</p>
            )}
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:shadow-outline transition-colors"
            >
              Add Patient
            </button>
          </div>
        </form>
      </div>

      <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-100">Patient List</h3>
      {patients.length > 0 ? (
        <div className="space-y-3">
          {patients.map((patient) => (
            <div
              key={patient.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all duration-150 ease-in-out flex justify-between items-center
                ${selectedPatientId === patient.id
                  ? 'bg-blue-100 dark:bg-blue-900/70 border-blue-500 dark:border-blue-400 shadow-lg ring-2 ring-blue-500 dark:ring-blue-400'
                  : 'bg-white dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600/70 hover:shadow-md'
                }`}
              onClick={() => handleSelectPatient(patient.id)}
              role="button" tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && handleSelectPatient(patient.id)}
            >
              <div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">{patient.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">DOB: {patient.dob} | Sex: {patient.sex}</p>
              </div>
              {selectedPatientId === patient.id && (
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-300 bg-blue-200 dark:bg-blue-700 px-2 py-1 rounded-full">Selected</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No patients</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by adding a new patient.</p>
        </div>
      )}

      {selectedPatientId && patients.find(p => p.id === selectedPatientId) && ( // Ensure patient exists before showing confirmation
        <div className="mt-8 p-4 bg-green-100 dark:bg-green-900/60 border border-green-300 dark:border-green-700 rounded-lg shadow text-center">
          <p className="text-green-700 dark:text-green-300 font-medium">
            Patient <span className="font-bold">{patients.find(p => p.id === selectedPatientId)?.name}</span> is currently selected.
          </p>
          <p className="text-sm text-green-600 dark:text-green-400">You can now view their charts or add growth data.</p>
        </div>
      )}
    </div>
  );
};

export default PatientSelectionPage;
