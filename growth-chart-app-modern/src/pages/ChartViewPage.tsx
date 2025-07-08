import React, { useState, useEffect, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { useCurrentPatient, useCurrentPatientRecords, GrowthRecord } from '../store/appStore'; // Import store hooks

// Register Chart.js components
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale, Filler
);

// Types for centile data (remains the same)
interface CentilePoint { age: number; [key: string]: number; }
interface CentileData {
  source: string; name: string; measurementType: string; sex: 'male' | 'female' | 'any';
  ageUnit: string; measurementUnit: string; centilesAvailable: string[]; data: CentilePoint[];
}
interface CentileManifestEntry {
  id: string; name: string; description: string; measurementType: string; sex: 'male' | 'female' | 'any';
  ageRangeMonths: [number, number]; source: string; type: 'percentiles' | 'z-scores'; dataFile: string;
}

// Helper to get distinct colors for lines (remains the same)
const lineColors = [
  'rgb(54, 162, 235)', 'rgb(255, 159, 64)', 'rgb(153, 102, 255)',
  'rgb(201, 203, 207)', 'rgb(255, 205, 86)', 'rgb(75, 192, 75)'
];

const ChartViewPage: React.FC = () => {
  const currentPatient = useCurrentPatient();
  const patientRecords = useCurrentPatientRecords();

  const [manifest, setManifest] = useState<CentileManifestEntry[]>([]);
  const [selectedCentileId, setSelectedCentileId] = useState<string>('');
  const [currentCentileData, setCurrentCentileData] = useState<CentileData | null>(null);
  const [chartData, setChartData] = useState<any>({ datasets: [] });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filtered manifest based on selected patient's sex (basic example)
  const [filteredManifest, setFilteredManifest] = useState<CentileManifestEntry[]>([]);

  useEffect(() => {
    const fetchManifest = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/data/centile_manifest.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data: CentileManifestEntry[] = await response.json();
        setManifest(data);
        setError(null);
      } catch (e) {
        console.error("Failed to fetch centile manifest:", e);
        setError("Failed to load centile selection options.");
        setManifest([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchManifest();
  }, []);

  useEffect(() => {
    if (currentPatient && manifest.length > 0) {
      const newFiltered = manifest.filter(entry =>
        entry.sex === currentPatient.sex.toLowerCase() || entry.sex === 'any'
      );
      setFilteredManifest(newFiltered);
      // If current selection is no longer valid or not set, try to pick a default
      if (!newFiltered.find(entry => entry.id === selectedCentileId) && newFiltered.length > 0) {
        // Basic: pick first compatible one, could be smarter
        // setSelectedCentileId(newFiltered[0].id);
      } else if (newFiltered.length === 0) {
        setSelectedCentileId(''); // No compatible charts
      }

    } else if (!currentPatient) {
      setFilteredManifest(manifest); // Show all if no patient selected
      setSelectedCentileId(''); // Clear selection if no patient
      setCurrentCentileData(null);
    } else {
      setFilteredManifest(manifest) // If manifest loads after patient, show all initially
    }
  }, [currentPatient, manifest, selectedCentileId]);


  useEffect(() => {
    if (!selectedCentileId) {
      setCurrentCentileData(null);
      return;
    }
    const selectedEntry = manifest.find(entry => entry.id === selectedCentileId); // Use original manifest for finding
    if (!selectedEntry) return;

    const fetchCentileFile = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(selectedEntry.dataFile);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${selectedEntry.dataFile}`);
        const data: CentileData = await response.json();
        setCurrentCentileData(data);
        setError(null);
      } catch (e) {
        console.error(`Failed to fetch centile data for ${selectedEntry.name}:`, e);
        setError(`Failed to load data for ${selectedEntry.name}.`);
        setCurrentCentileData(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCentileFile();
  }, [selectedCentileId, manifest]);

  const updateChartData = useCallback(() => {
    let patientDataForChart: { x: number; y: number }[] = [];
    let patientLabel = 'Patient Measurements';

    if (currentPatient && currentCentileData) {
      // Filter patient records to match the measurement type of the selected centile chart
      patientDataForChart = patientRecords
        .filter(r => {
            // Map store measurementType to centileData.measurementType (e.g. 'Length' or 'Height' to 'length_for_age')
            let recordMeasurement = '';
            if (r.measurementType === 'Length' || r.measurementType === 'Height') recordMeasurement = 'length_for_age';
            else if (r.measurementType === 'Weight') recordMeasurement = 'weight_for_age';
            else if (r.measurementType === 'HeadCircumference') recordMeasurement = 'hc_for_age'; // Assuming this mapping
            else if (r.measurementType === 'BMI') recordMeasurement = 'bmi_for_age'; // Assuming

            // A more robust mapping might be needed if centile measurementType strings vary more
            return recordMeasurement === currentCentileData.measurementType ||
                   r.measurementType.toLowerCase().replace(/\s/g, '_') === currentCentileData.measurementType;

        })
        .map(r => ({ x: r.ageMonths, y: r.value }))
        .sort((a,b) => a.x - b.x); // Sort by age

      patientLabel = `${currentPatient.name} - ${currentCentileData.measurementType.replace(/_/g, ' ')}`;
    } else if (currentPatient && patientRecords.length > 0 && !currentCentileData) {
        // If no centile chart is selected, but there is a patient with records,
        // plot all their records of a common type (e.g., weight or height) or just show nothing specific.
        // For simplicity, we'll just make the patient dataset empty if no centile chart is active to drive the type.
        // Or, we could default to showing, say, weight.
        patientLabel = `${currentPatient.name} - Select a chart type`;
    }


    const patientDataset = {
      label: patientLabel,
      data: patientDataForChart,
      borderColor: 'rgb(239, 68, 68)', // Red color for patient
      backgroundColor: 'rgba(239, 68, 68, 0.5)',
      tension: 0.1,
      pointRadius: 5,
      order: 0,
    };

    const centileDatasets = [];
    if (currentCentileData) {
      const available = currentCentileData.centilesAvailable || [];
      available.forEach((centileKey, index) => {
        centileDatasets.push({
          label: `${centileKey.toUpperCase()}`, // Simpler label for legend
          data: currentCentileData.data.map(p => ({ x: p.age, y: p[centileKey] })).sort((a,b) => a.x - b.x),
          borderColor: lineColors[index % lineColors.length],
          borderDash: [5, 5],
          tension: 0.1,
          pointRadius: 2,
          fill: false,
          order: index + 1,
        });
      });
    }

    let yAxisLabel = 'Measurement';
    if (currentCentileData) {
        yAxisLabel = `${currentCentileData.measurementType.replace(/_/g, ' ')} (${currentCentileData.measurementUnit})`;
    }

    setChartData({ datasets: [patientDataset, ...centileDatasets] });

    setChartOptions(prevOptions => ({
        ...prevOptions,
        plugins: {
            ...prevOptions.plugins,
            title: {
                display: true,
                text: currentCentileData ? `${currentCentileData.name}` : (currentPatient ? `${currentPatient.name} - Growth Chart` : 'Growth Chart'),
            },
        },
        scales: {
            ...prevOptions.scales,
            x: { ...prevOptions.scales.x, title: { display: true, text: `Age (${currentCentileData?.ageUnit || 'Months'})` } },
            y: { ...prevOptions.scales.y, title: { display: true, text: yAxisLabel } },
        },
    }));

  }, [currentPatient, patientRecords, currentCentileData]);

  useEffect(() => {
    updateChartData();
  }, [updateChartData]);

  const [chartOptions, setChartOptions] = useState<any>({
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const }, title: { display: true, text: 'Growth Chart' },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              const unit = currentCentileData?.measurementUnit || (context.datasetIndex === 0 && patientRecords.length > 0 ? patientRecords[0].unit : '');
              label += `${context.parsed.y.toFixed(1)} ${unit} at ${context.parsed.x} months`;
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: { type: 'linear' as const, title: { display: true, text: 'Age (Months)' }, min: 0 },
      y: { title: { display: true, text: 'Measurement' }, beginAtZero: false }
    },
    interaction: { mode: 'index' as const, intersect: false },
  });

  if (!currentPatient) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-2xl font-semibold mb-6">Growth Chart View</h2>
        <p className="text-gray-500">Please select a patient from the "Patient Selection" page to view their growth chart.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-1">Growth Chart for: <span className="text-blue-600">{currentPatient.name}</span></h2>
      <p className="text-sm text-gray-500 mb-4">Sex: {currentPatient.sex} | DOB: {currentPatient.dob}</p>

      <div className="mb-6 p-4 bg-white shadow rounded-lg">
        <label htmlFor="centileSelect" className="block text-sm font-medium text-gray-700 mb-1">
          Select Growth Chart / Centile Set:
        </label>
        <select
          id="centileSelect" value={selectedCentileId}
          onChange={(e) => setSelectedCentileId(e.target.value)}
          disabled={isLoading || filteredManifest.length === 0}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-100"
        >
          <option value="" disabled>
            {isLoading ? 'Loading options...' : filteredManifest.length === 0 && !error ? `No charts for ${currentPatient.sex || 'selected criteria'}` : 'Select a chart'}
          </option>
          {filteredManifest.map(entry => (
            <option key={entry.id} value={entry.id}>
              {entry.name} ({entry.source})
            </option>
          ))}
        </select>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        {filteredManifest.length === 0 && !isLoading && manifest.length > 0 && <p className="text-orange-500 text-xs mt-1">No specific charts found for patient's sex. Showing all available or implement more specific filters.</p>}
      </div>

      {(selectedCentileId && currentCentileData) || patientRecords.length > 0 ? (
        <div className="bg-white p-2 md:p-6 rounded-lg shadow relative h-[500px] md:h-[600px]">
          { (isLoading && selectedCentileId) && <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10"><p>Loading chart data...</p></div> }
          <Line options={chartOptions} data={chartData} />
        </div>
      ) : selectedCentileId && isLoading ? (
        <div className="text-center p-10">Loading chart data...</div>
      ) : selectedCentileId && !isLoading && !currentCentileData ? (
         <div className="text-center p-10 text-red-600">Could not load data for the selected chart.</div>
      ) : (
        <div className="text-center p-10 text-gray-500">
            {patientRecords.length === 0 && "No growth records found for this patient. Add some in the 'Table View'."}
            {patientRecords.length > 0 && "Please select a chart from the dropdown to view data."}
        </div>
      )}
    </div>
  );
};

export default ChartViewPage;
