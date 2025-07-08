import React, { useState } from 'react';
import useAppStore, { GrowthRecord, NewGrowthRecordData, useCurrentPatient, useCurrentPatientRecords } from '../store/appStore';
import { PlusCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'; // For buttons

const TableViewPage: React.FC = () => {
  const currentPatient = useCurrentPatient();
  const recordsToDisplay = useCurrentPatientRecords();
  const addGrowthRecord = useAppStore((state) => state.addGrowthRecord);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecordDate, setNewRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [newRecordAgeMonths, setNewRecordAgeMonths] = useState<number | ''>('');
  const [newRecordType, setNewRecordType] = useState<GrowthRecord['measurementType']>('Weight');
  const [newRecordValue, setNewRecordValue] = useState<number | ''>('');
  const [newRecordUnit, setNewRecordUnit] = useState<GrowthRecord['unit']>('kg');
  const [newRecordNotes, setNewRecordNotes] = useState('');
  const [addRecordSuccess, setAddRecordSuccess] = useState(false);

  const handleUnitChangeBasedOnType = (type: GrowthRecord['measurementType']) => {
    switch (type) {
      case 'Weight': setNewRecordUnit('kg'); break;
      case 'Height': case 'Length': case 'HeadCircumference': setNewRecordUnit('cm'); break;
      case 'BMI': setNewRecordUnit('kg/m²'); break;
      default: setNewRecordUnit('kg');
    }
  };

  const handleMeasurementTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as GrowthRecord['measurementType'];
    setNewRecordType(type);
    handleUnitChangeBasedOnType(type);
  };

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient) { alert('No patient selected.'); return; }
    if (newRecordAgeMonths === '' || newRecordValue === '') { alert('Age at measurement and value are required.'); return; }

    const recordData: NewGrowthRecordData = {
      patientId: currentPatient.id, date: newRecordDate, ageMonths: Number(newRecordAgeMonths),
      measurementType: newRecordType, value: Number(newRecordValue), unit: newRecordUnit,
      notes: newRecordNotes.trim() || undefined,
    };
    const newRecord = addGrowthRecord(recordData);
    if (newRecord) {
        setNewRecordDate(new Date().toISOString().split('T')[0]);
        setNewRecordAgeMonths('');
        setNewRecordType('Weight'); // Default back to weight
        handleUnitChangeBasedOnType('Weight'); // Reset unit based on default type
        setNewRecordValue('');
        setNewRecordNotes('');
        // setShowAddForm(false); // Keep form open to show success, or set a timer to close it
        setAddRecordSuccess(true);
        setTimeout(() => {
            setAddRecordSuccess(false);
        }, 3000);
    } else {
        alert("Failed to add growth record."); // Should ideally not happen with current store
    }
  };

  // Common input/select classes for Tailwind
  const inputFieldClass = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-800 dark:text-gray-200 disabled:opacity-70 dark:disabled:opacity-50";
  const selectFieldClass = "mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-800 dark:text-gray-200 disabled:opacity-70 dark:disabled:opacity-50";
  const labelClass = "block text-sm font-medium text-gray-600 dark:text-gray-300";

  if (!currentPatient) {
    return (
      <div className="p-4 text-center text-gray-800 dark:text-gray-200">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Growth Data Table</h2>
        <p className="text-gray-500 dark:text-gray-400">Please select a patient from the "Patient Selection" page to view and add growth records.</p>
      </div>
    );
  }

  return (
    <div className="p-4 text-gray-800 dark:text-gray-200">
      <h2 className="text-2xl font-semibold mb-1 text-gray-900 dark:text-white">Growth Data for: <span className="text-blue-600 dark:text-blue-400">{currentPatient.name}</span></h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">DOB: {currentPatient.dob} | Sex: {currentPatient.sex}</p>

      <div className="mb-6">
        <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center bg-blue-500 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:shadow-outline transition-colors"
        >
            {showAddForm ?
                <><XCircleIcon className="h-5 w-5 mr-2"/> Cancel Adding Entry</> :
                <><PlusCircleIcon className="h-5 w-5 mr-2"/> Add New Growth Entry</>
            }
        </button>
      </div>

      {showAddForm && (
        <div className="mb-8 p-6 bg-white dark:bg-gray-700/50 shadow rounded-lg">
          <h3 className="text-xl font-semibold mb-6 text-gray-700 dark:text-gray-100">Add New Growth Record</h3>
          <form onSubmit={handleAddRecord} className="space-y-5"> {/* Increased general vertical spacing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5"> {/* Increased gap */}
                <div>
                  <label htmlFor="newRecordDate" className={labelClass}>Date of Measurement</label>
                  <input type="date" id="newRecordDate" value={newRecordDate} onChange={(e) => setNewRecordDate(e.target.value)} required className={`${inputFieldClass} [color-scheme:light] dark:[color-scheme:dark]`} />
                </div>
                <div>
                  <label htmlFor="newRecordAgeMonths" className={labelClass}>Age at Measurement (Months)</label>
                  <input type="number" id="newRecordAgeMonths" value={newRecordAgeMonths} onChange={(e) => setNewRecordAgeMonths(Number(e.target.value))} placeholder="e.g., 6" required className={inputFieldClass} min="0" step="0.1"/>
                </div>
                <div>
                  <label htmlFor="newRecordType" className={labelClass}>Measurement Type</label>
                  <select id="newRecordType" value={newRecordType} onChange={handleMeasurementTypeChange} required className={selectFieldClass}>
                    <option value="Weight">Weight</option> <option value="Height">Height (standing)</option>
                    <option value="Length">Length (lying)</option> <option value="HeadCircumference">Head Circumference</option>
                    <option value="BMI">BMI</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="newRecordValue" className={labelClass}>Value</label>
                  <input type="number" step="any" id="newRecordValue" value={newRecordValue} onChange={(e) => setNewRecordValue(Number(e.target.value))} required className={inputFieldClass} placeholder="e.g., 10.2"/>
                </div>
                <div className="md:col-span-2"> {/* Unit dropdown spans full on small, half on medium if preferred, but full is fine */}
                  <label htmlFor="newRecordUnit" className={labelClass}>Unit</label>
                  <select id="newRecordUnit" value={newRecordUnit} onChange={(e) => setNewRecordUnit(e.target.value as GrowthRecord['unit'])} required className={selectFieldClass} disabled={newRecordType === 'BMI'}> {/* Disable for BMI */}
                    {newRecordType === 'Weight' && <> <option value="kg">kg</option> <option value="lbs">lbs</option> </>}
                    {(newRecordType === 'Height' || newRecordType === 'Length' || newRecordType === 'HeadCircumference') && <> <option value="cm">cm</option> <option value="in">in</option> </>}
                    {newRecordType === 'BMI' && <option value="kg/m²">kg/m²</option>}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="newRecordNotes" className={labelClass}>Notes (Optional)</label>
                  <textarea id="newRecordNotes" value={newRecordNotes} onChange={(e) => setNewRecordNotes(e.target.value)} rows={3} className={inputFieldClass} placeholder="Any relevant notes..."></textarea>
                </div>
            </div>
            <div className="pt-3 flex justify-end items-center space-x-3"> {/* Added items-center for message alignment */}
                {addRecordSuccess && (
                    <p className="text-sm text-green-600 dark:text-green-400 animate-pulse">Record added successfully!</p>
                )}
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-colors">
                    Cancel
                </button>
                <button type="submit" className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors">
                    Save Record
                </button>
            </div>
          </form>
        </div>
      )}

      {recordsToDisplay.length > 0 ? (
        <div className="overflow-x-auto bg-white dark:bg-gray-700/50 shadow rounded-lg">
          <table className="min-w-full leading-normal">
            {/* Table head and body remain largely the same, dark mode styles already applied */}
            <thead className="bg-gray-50 dark:bg-gray-600">
              <tr className="border-b-2 border-gray-200 dark:border-gray-500 text-left text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wider">
                <th className="px-5 py-3">Date</th> <th className="px-5 py-3">Age (Months)</th>
                <th className="px-5 py-3">Type</th> <th className="px-5 py-3">Value</th>
                <th className="px-5 py-3">Unit</th> <th className="px-5 py-3">Notes</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {recordsToDisplay.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.ageMonths - a.ageMonths)
                .map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-600/70">
                  <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{record.date}</td>
                  <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{record.ageMonths}</td>
                  <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{record.measurementType}</td>
                  <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{record.value}</td>
                  <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{record.unit}</td>
                  <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap max-w-xs truncate" title={record.notes}>{record.notes || 'N/A'}</td>
                  <td className="px-5 py-4 text-sm">
                    <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-2 text-xs" onClick={() => alert(`Edit record ${record.id} - TBD`)}>Edit</button>
                    <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-xs" onClick={() => alert(`Delete record ${record.id} - TBD`)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No growth records</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by adding a new growth record for {currentPatient.name}.</p>
        </div>
      )}
    </div>
  );
};

export default TableViewPage;
