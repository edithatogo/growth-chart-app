import React, { useState } from 'react';
import useAppStore, { GrowthRecord, NewGrowthRecordData, useCurrentPatient, useCurrentPatientRecords } from '../store/appStore';

const TableViewPage: React.FC = () => {
  const currentPatient = useCurrentPatient();
  const recordsToDisplay = useCurrentPatientRecords();
  const addGrowthRecord = useAppStore((state) => state.addGrowthRecord);

  // State for the new growth record form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecordDate, setNewRecordDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [newRecordAgeMonths, setNewRecordAgeMonths] = useState<number | ''>('');
  const [newRecordType, setNewRecordType] = useState<GrowthRecord['measurementType']>('Weight');
  const [newRecordValue, setNewRecordValue] = useState<number | ''>('');
  const [newRecordUnit, setNewRecordUnit] = useState<GrowthRecord['unit']>('kg');
  const [newRecordNotes, setNewRecordNotes] = useState('');

  const handleUnitChangeBasedOnType = (type: GrowthRecord['measurementType']) => {
    switch (type) {
      case 'Weight': setNewRecordUnit('kg'); break;
      case 'Height':
      case 'Length':
      case 'HeadCircumference': setNewRecordUnit('cm'); break;
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
    if (!currentPatient) {
      alert('No patient selected.');
      return;
    }
    if (newRecordAgeMonths === '' || newRecordValue === '') {
      alert('Age at measurement and value are required.');
      return;
    }

    const recordData: NewGrowthRecordData = {
      patientId: currentPatient.id,
      date: newRecordDate,
      ageMonths: Number(newRecordAgeMonths),
      measurementType: newRecordType,
      value: Number(newRecordValue),
      unit: newRecordUnit,
      notes: newRecordNotes.trim() || undefined,
    };
    addGrowthRecord(recordData);

    // Reset form
    setNewRecordDate(new Date().toISOString().split('T')[0]);
    setNewRecordAgeMonths('');
    setNewRecordType('Weight');
    setNewRecordValue('');
    setNewRecordUnit('kg');
    setNewRecordNotes('');
    setShowAddForm(false);
  };

  if (!currentPatient) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-2xl font-semibold mb-6 text-gray-700">Growth Data Table</h2>
        <p className="text-gray-500">Please select a patient from the "Patient Selection" page to view and add growth records.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-2">Growth Data for: <span className="text-blue-600">{currentPatient.name}</span></h2>
      <p className="text-sm text-gray-500 mb-6">DOB: {currentPatient.dob} | Sex: {currentPatient.sex}</p>

      <div className="mb-6">
        <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm focus:outline-none focus:shadow-outline transition-colors"
        >
            {showAddForm ? 'Cancel Adding Entry' : 'Add New Growth Entry'}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-8 p-6 bg-white shadow rounded-lg">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">Add New Growth Record</h3>
          <form onSubmit={handleAddRecord} className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <label htmlFor="newRecordDate" className="block text-sm font-medium text-gray-600">Date of Measurement</label>
              <input type="date" id="newRecordDate" value={newRecordDate} onChange={(e) => setNewRecordDate(e.target.value)} required className="mt-1 input-field"/>
            </div>
            <div>
              <label htmlFor="newRecordAgeMonths" className="block text-sm font-medium text-gray-600">Age at Measurement (Months)</label>
              <input type="number" id="newRecordAgeMonths" value={newRecordAgeMonths} onChange={(e) => setNewRecordAgeMonths(Number(e.target.value))} placeholder="e.g., 6" required className="mt-1 input-field"/>
            </div>
            <div>
              <label htmlFor="newRecordType" className="block text-sm font-medium text-gray-600">Measurement Type</label>
              <select id="newRecordType" value={newRecordType} onChange={handleMeasurementTypeChange} required className="mt-1 select-field">
                <option value="Weight">Weight</option>
                <option value="Height">Height (standing)</option>
                <option value="Length">Length (lying)</option>
                <option value="HeadCircumference">Head Circumference</option>
                <option value="BMI">BMI</option>
              </select>
            </div>
            <div>
              <label htmlFor="newRecordValue" className="block text-sm font-medium text-gray-600">Value</label>
              <input type="number" step="any" id="newRecordValue" value={newRecordValue} onChange={(e) => setNewRecordValue(Number(e.target.value))} required className="mt-1 input-field"/>
            </div>
            <div>
              <label htmlFor="newRecordUnit" className="block text-sm font-medium text-gray-600">Unit</label>
              <select id="newRecordUnit" value={newRecordUnit} onChange={(e) => setNewRecordUnit(e.target.value as GrowthRecord['unit'])} required className="mt-1 select-field">
                {newRecordType === 'Weight' && <> <option value="kg">kg</option> <option value="lbs">lbs</option> </>}
                {(newRecordType === 'Height' || newRecordType === 'Length' || newRecordType === 'HeadCircumference') && <> <option value="cm">cm</option> <option value="in">in</option> </>}
                {newRecordType === 'BMI' && <option value="kg/m²">kg/m²</option>}
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="newRecordNotes" className="block text-sm font-medium text-gray-600">Notes (Optional)</label>
              <textarea id="newRecordNotes" value={newRecordNotes} onChange={(e) => setNewRecordNotes(e.target.value)} rows={3} className="mt-1 input-field" placeholder="Any relevant notes..."></textarea>
            </div>
            <div className="md:col-span-2 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Cancel
                </button>
                <button type="submit" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Save Record
                </button>
            </div>
          </form>
        </div>
      )}

      {recordsToDisplay.length > 0 ? (
        <div className="overflow-x-auto bg-white shadow rounded-lg">
          <table className="min-w-full leading-normal">
            <thead className="bg-gray-50">
              <tr className="border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Age (Months)</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Value</th>
                <th className="px-5 py-3">Unit</th>
                <th className="px-5 py-3">Notes</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recordsToDisplay.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.ageMonths - a.ageMonths) // Sort by date desc, then age
                .map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 text-sm text-gray-700">{record.date}</td>
                  <td className="px-5 py-4 text-sm text-gray-700">{record.ageMonths}</td>
                  <td className="px-5 py-4 text-sm text-gray-700">{record.measurementType}</td>
                  <td className="px-5 py-4 text-sm text-gray-700">{record.value}</td>
                  <td className="px-5 py-4 text-sm text-gray-700">{record.unit}</td>
                  <td className="px-5 py-4 text-sm text-gray-700 whitespace-pre-wrap max-w-xs truncate" title={record.notes}>{record.notes || 'N/A'}</td>
                  <td className="px-5 py-4 text-sm">
                    <button className="text-indigo-600 hover:text-indigo-900 mr-2 text-xs" onClick={() => alert(`Edit record ${record.id} - TBD`)}>Edit</button>
                    <button className="text-red-600 hover:text-red-900 text-xs" onClick={() => alert(`Delete record ${record.id} - TBD`)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 italic text-center py-4">No growth records found for {currentPatient.name}. Add one using the form above.</p>
      )}
      <style jsx>{`
        .input-field {
          @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm;
        }
        .select-field {
          @apply block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md;
        }
      `}</style>
    </div>
  );
};

export default TableViewPage;
