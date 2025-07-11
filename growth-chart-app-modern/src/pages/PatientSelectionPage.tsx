import React, { useState } from 'react';
import useAppStore, { Patient } from '@/store/appStore'; // Using @ alias
import { TrashIcon, PencilSquareIcon } from '@heroicons/react/24/outline';

const PatientSelectionPage: React.FC = () => {
  const patients = useAppStore((state) => state.patients);
  const selectedPatientId = useAppStore((state) => state.selectedPatientId);
  const addPatientAction = useAppStore((state) => state.addPatient);
  const updatePatientAction = useAppStore((state) => state.updatePatient);
  const selectPatient = useAppStore((state) => state.selectPatient);
  const deletePatientAction = useAppStore((state) => state.deletePatient);

  const [formPatientId, setFormPatientId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDob, setFormDob] = useState('');
  const [formSex, setFormSex] = useState<'Male' | 'Female' | 'Other' | 'Unknown'>('Unknown');
  const [formCondition, setFormCondition] = useState('');
  const [formMessage, setFormMessage] = useState<{type: 'success' | 'error', text: string, field?: string} | null>(null);

  const isEditing = formPatientId !== null;

  const resetForm = () => {
    setFormPatientId(null);
    setFormName('');
    setFormDob('');
    setFormSex('Unknown');
    setFormCondition('');
    // Keep formMessage for a moment if it was a success message from submit
    // It will be cleared by its own timeout or on next submit attempt
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);

    if (!formName.trim()) {
      setFormMessage({type: 'error', text: 'Patient name is required.', field: 'formName'}); return;
    }
    if (formName.trim().length > 100) {
      setFormMessage({type: 'error', text: 'Patient name cannot exceed 100 characters.', field: 'formName'}); return;
    }
    if (!formDob.trim()) {
      setFormMessage({type: 'error', text: 'Date of Birth is required.', field: 'formDob'}); return;
    }
    const dobDate = new Date(formDob);
    const today = new Date(); today.setHours(0,0,0,0);
    if (isNaN(dobDate.getTime())) {
        setFormMessage({type: 'error', text: 'Invalid Date of Birth format.', field: 'formDob'}); return;
    }
    if (dobDate > today) {
        setFormMessage({type: 'error', text: 'Date of Birth cannot be in the future.', field: 'formDob'}); return;
    }
    if (formCondition.trim().length > 100) {
      setFormMessage({type: 'error', text: 'Condition cannot exceed 100 characters.', field: 'formCondition'}); return;
    }

    const patientPayload: Omit<Patient, 'id'> & { id?: string } = {
        name: formName.trim(), dob: formDob, sex: formSex,
        condition: formCondition.trim() || undefined,
    };

    try {
        let successMessageText = '';
        if (isEditing && formPatientId) {
            updatePatientAction({ ...patientPayload, id: formPatientId } as Patient);
            successMessageText = 'Patient updated successfully!';
        } else {
            const newPatient = addPatientAction(patientPayload as Omit<Patient, 'id'>);
            successMessageText = `Patient "${newPatient.name}" added successfully!`;
        }
        resetForm();
        setFormMessage({type: 'success', text: successMessageText}); // Set success message AFTER resetForm (which shouldn't clear it now)
        setTimeout(() => setFormMessage(null), 3000);
    } catch (error) {
        console.error("Error submitting patient form:", error);
        setFormMessage({type: 'error', text: 'An unexpected error occurred. Please try again.'});
    }
  };

  const handleEditPatient = (e: React.MouseEvent, patient: Patient) => {
    e.stopPropagation();
    setFormPatientId(patient.id);
    setFormName(patient.name);
    setFormDob(patient.dob);
    setFormSex(patient.sex);
    setFormCondition(patient.condition || '');
    setFormMessage(null);
    document.getElementById('patientFormHeading')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    resetForm();
    setFormMessage(null); // Explicitly clear message on cancel
  }

  const handleSelectPatient = (patientId: string) => {
    selectPatient(patientId);
    if (isEditing && formPatientId !== patientId) {
        resetForm();
        setFormMessage(null);
    }
  };

  const handleDeletePatient = (e: React.MouseEvent, patientId: string, patientName: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete patient "${patientName}" and all their associated records? This action cannot be undone.`)) {
      deletePatientAction(patientId);
      if(formPatientId === patientId) { // If deleting the patient currently in edit form
        resetForm();
        setFormMessage(null);
      }
    }
  };

  const inputBaseClass = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-800 dark:text-gray-200";
  const labelBaseClass = "block text-sm font-medium text-gray-600 dark:text-gray-300";

  return (
    <div className="p-4 text-gray-800 dark:text-gray-200">
      <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Patient Management</h2>

      <div className="mb-8 p-6 bg-white dark:bg-gray-700/50 shadow rounded-lg">
        <h3 id="patientFormHeading" className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-100">
          {isEditing ? 'Edit Patient' : 'Add New Patient'}
        </h3>
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="formName" className={labelBaseClass}>Full Name</label>
              <input
                type="text" id="formName" value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className={`${inputBaseClass} ${formMessage?.field === 'formName' ? 'border-red-500 dark:border-red-400' : ''}`}
                placeholder="Patient's full name" required
              />
              {formMessage?.field === 'formName' && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formMessage.text}</p>}
            </div>
            <div>
              <label htmlFor="formDob" className={labelBaseClass}>Date of Birth</label>
              <input
                type="date" id="formDob" value={formDob}
                onChange={(e) => setFormDob(e.target.value)}
                className={`${inputBaseClass} [color-scheme:light] dark:[color-scheme:dark] ${formMessage?.field === 'formDob' ? 'border-red-500 dark:border-red-400' : ''}`} required
              />
              {formMessage?.field === 'formDob' && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formMessage.text}</p>}
            </div>
            <div>
              <label htmlFor="formCondition" className={labelBaseClass}>Condition (Optional)</label>
              <input
                type="text" id="formCondition" value={formCondition}
                onChange={(e) => setFormCondition(e.target.value)}
                className={`${inputBaseClass} ${formMessage?.field === 'formCondition' ? 'border-red-500 dark:border-red-400' : ''}`}
                placeholder="e.g., Turner Syndrome, Down Syndrome"
              />
              {formMessage?.field === 'formCondition' && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formMessage.text}</p>}
            </div>
            <div>
              <label htmlFor="formSex" className={labelBaseClass}>Sex</label>
              <select
                id="formSex" value={formSex}
                onChange={(e) => setFormSex(e.target.value as Patient['sex'])}
                className={`${inputBaseClass} mt-1`}
              >
                <option value="Unknown">Unknown</option> <option value="Male">Male</option>
                <option value="Female">Female</option> <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row justify-end items-center space-y-2 sm:space-y-0 sm:space-x-3">
            {formMessage && (formMessage.type === 'success' || (formMessage.type === 'error' && !formMessage.field) ) && (
              <p className={`text-sm ${formMessage.type === 'success' ? 'text-green-600 dark:text-green-400 animate-pulse' : 'text-red-600 dark:text-red-400'}`}>
                {formMessage.text}
              </p>
            )}
            {isEditing && (
              <button
                type="button" onClick={handleCancelEdit}
                className="w-full sm:w-auto px-6 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Cancel Edit
              </button>
            )}
            <button
              type="submit"
              className="w-full sm:w-auto bg-blue-500 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:shadow-outline transition-colors"
            >
              {isEditing ? 'Update Patient' : 'Add Patient'}
            </button>
          </div>
        </form>
      </div>

      <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-100">Patient List</h3>
      {patients && patients.length > 0 ? ( // Check if patients is an array
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
              <div className="flex-grow">
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">{patient.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">DOB: {patient.dob} | Sex: {patient.sex}</p>
                {patient.condition && (
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Condition: {patient.condition}</p>
                )}
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                {selectedPatientId === patient.id && (
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-300 bg-blue-200 dark:bg-blue-700 px-2 py-1 rounded-full self-center">Selected</span>
                )}
                <button
                  onClick={(e) => handleEditPatient(e, patient)}
                  className="p-1 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-gray-800 rounded-md"
                  aria-label={`Edit patient ${patient.name}`}
                >
                  <PencilSquareIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => handleDeletePatient(e, patient.id, patient.name)}
                  className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 dark:focus:ring-offset-gray-800 rounded-md"
                  aria-label={`Delete patient ${patient.name}`}
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
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

      {selectedPatientId && patients && patients.find(p => p.id === selectedPatientId) && (
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
