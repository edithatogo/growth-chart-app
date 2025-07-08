import React from 'react';

// Mock data for the table
interface GrowthRecord {
  id: string;
  date: string;
  ageMonths: number;
  measurementType: 'Weight' | 'Height' | 'Head Circumference' | 'BMI';
  value: number;
  unit: 'kg' | 'cm' | 'm²'; // BMI unit would be kg/m² but simplified here
  notes?: string;
}

const mockGrowthData: GrowthRecord[] = [
  { id: 'rec1', date: '2023-01-15', ageMonths: 0, measurementType: 'Weight', value: 3.5, unit: 'kg' },
  { id: 'rec2', date: '2023-01-15', ageMonths: 0, measurementType: 'Height', value: 50, unit: 'cm' },
  { id: 'rec3', date: '2023-02-15', ageMonths: 1, measurementType: 'Weight', value: 4.2, unit: 'kg' },
  { id: 'rec4', date: '2023-02-15', ageMonths: 1, measurementType: 'Height', value: 54, unit: 'cm' },
  { id: 'rec5', date: '2023-04-15', ageMonths: 3, measurementType: 'Weight', value: 5.8, unit: 'kg' },
  { id: 'rec6', date: '2023-04-15', ageMonths: 3, measurementType: 'Height', value: 60, unit: 'cm' },
  { id: 'rec7', date: '2023-04-15', ageMonths: 3, measurementType: 'Head Circumference', value: 40.5, unit: 'cm' },
  { id: 'rec8', date: '2023-07-15', ageMonths: 6, measurementType: 'Weight', value: 7.9, unit: 'kg', notes: 'Started solids' },
  { id: 'rec9', date: '2023-07-15', ageMonths: 6, measurementType: 'Height', value: 66, unit: 'cm' },
];

const TableViewPage: React.FC = () => {
  // In a real app, this data would come from the selected patient's records
  const recordsToDisplay = mockGrowthData;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-6">Growth Data Table View</h2>

      {/* Add filter/sort controls here in a real app */}
      <div className="mb-4 flex space-x-2">
        <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm"
            onClick={() => alert('Add data entry form to be implemented')}
        >
            Add New Entry
        </button>
        <button
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded text-sm"
            onClick={() => alert('Filtering options to be implemented')}
        >
            Filter Data
        </button>
      </div>

      {recordsToDisplay.length > 0 ? (
        <div className="overflow-x-auto bg-white shadow rounded-lg">
          <table className="min-w-full leading-normal">
            <thead>
              <tr className="border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Age (Months)</th>
                <th className="px-5 py-3">Measurement Type</th>
                <th className="px-5 py-3">Value</th>
                <th className="px-5 py-3">Unit</th>
                <th className="px-5 py-3">Notes</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recordsToDisplay.map((record) => (
                <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-5 py-4 text-sm">{record.date}</td>
                  <td className="px-5 py-4 text-sm">{record.ageMonths}</td>
                  <td className="px-5 py-4 text-sm">{record.measurementType}</td>
                  <td className="px-5 py-4 text-sm">{record.value}</td>
                  <td className="px-5 py-4 text-sm">{record.unit}</td>
                  <td className="px-5 py-4 text-sm">{record.notes || 'N/A'}</td>
                  <td className="px-5 py-4 text-sm">
                    <button
                        className="text-indigo-600 hover:text-indigo-900 mr-2 text-xs"
                        onClick={() => alert(`Edit record ${record.id}`)}
                    >
                        Edit
                    </button>
                    <button
                        className="text-red-600 hover:text-red-900 text-xs"
                        onClick={() => alert(`Delete record ${record.id}`)}
                    >
                        Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-600">No growth data available for the selected patient.</p>
      )}
    </div>
  );
};

export default TableViewPage;
