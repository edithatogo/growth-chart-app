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
  TimeScale, // Ensure TimeScale is registered if using time type for x-axis
  Filler // Import Filler for area under line (if needed for centiles)
} from 'chart.js';
import 'chartjs-adapter-date-fns'; // Adapter for date handling

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

// Types for centile data
interface CentilePoint {
  age: number; // months
  [key: string]: number; // p3: value, p50: value, z0: value etc.
}

interface CentileData {
  source: string;
  name: string;
  measurementType: string;
  sex: 'male' | 'female' | 'any';
  ageUnit: string;
  measurementUnit: string;
  centilesAvailable: string[]; // e.g., ["p3", "p15", "p50"] or ["z-2", "z0", "z2"]
  data: CentilePoint[];
}

interface CentileManifestEntry {
  id: string;
  name: string;
  description: string;
  measurementType: string;
  sex: 'male' | 'female' | 'any';
  ageRangeMonths: [number, number];
  source: string;
  type: 'percentiles' | 'z-scores';
  dataFile: string;
}

// Sample patient data (age in months, measurement in cm for length/height)
const samplePatientData = [
  { age: 0, measurement: 50 }, { age: 1, measurement: 54 }, { age: 2, measurement: 57 },
  { age: 3, measurement: 60 }, { age: 6, measurement: 66 }, { age: 9, measurement: 71 },
  { age: 12, measurement: 75 }, { age: 15, measurement: 78 }, { age: 18, measurement: 81 },
  { age: 24, measurement: 86 }, { age: 30, measurement: 90 }, { age: 36, measurement: 95 },
];

// Helper to get distinct colors for lines
const lineColors = [
  'rgb(54, 162, 235)', 'rgb(255, 159, 64)', 'rgb(153, 102, 255)',
  'rgb(201, 203, 207)', 'rgb(255, 205, 86)', 'rgb(75, 192, 75)'
];

const ChartViewPage: React.FC = () => {
  const [manifest, setManifest] = useState<CentileManifestEntry[]>([]);
  const [selectedCentileId, setSelectedCentileId] = useState<string>('');
  const [currentCentileData, setCurrentCentileData] = useState<CentileData | null>(null);
  const [chartData, setChartData] = useState<any>({ datasets: [] }); // For Chart.js data prop
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch manifest on component mount
  useEffect(() => {
    const fetchManifest = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/data/centile_manifest.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data: CentileManifestEntry[] = await response.json();
        setManifest(data);
        if (data.length > 0) {
          // setSelectedCentileId(data[0].id); // Auto-select first one
        }
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

  // Fetch selected centile data when selectedCentileId changes
  useEffect(() => {
    if (!selectedCentileId) {
      setCurrentCentileData(null); // Clear data if no selection
      return;
    }

    const selectedEntry = manifest.find(entry => entry.id === selectedCentileId);
    if (!selectedEntry) return;

    const fetchCentileFile = async () => {
      try {
        setIsLoading(true);
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

  // Update Chart.js data object when patient or centile data changes
  const updateChartData = useCallback(() => {
    const patientDataset = {
      label: 'Patient Measurements', // This could be dynamic based on measurement type
      data: samplePatientData.map(p => ({ x: p.age, y: p.measurement })),
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.5)',
      tension: 0.1,
      pointRadius: 5,
      order: 0, // Ensure patient data is drawn on top
    };

    const centileDatasets = [];
    if (currentCentileData) {
      const available = currentCentileData.centilesAvailable || [];
      available.forEach((centileKey, index) => {
        centileDatasets.push({
          label: `${currentCentileData.name} - ${centileKey.toUpperCase()}`,
          data: currentCentileData.data.map(p => ({ x: p.age, y: p[centileKey] })),
          borderColor: lineColors[index % lineColors.length],
          borderDash: [5, 5],
          tension: 0.1,
          pointRadius: 2,
          fill: false,
          order: index + 1,
        });
      });
    }

    // Determine measurement type for axis labels
    let yAxisLabel = 'Measurement';
    if (currentCentileData) {
        yAxisLabel = `${currentCentileData.measurementType.replace(/_/g, ' ')} (${currentCentileData.measurementUnit})`;
    } else if (manifest.find(m => m.id === selectedCentileId)) {
        const selected = manifest.find(m => m.id === selectedCentileId);
        if (selected) {
             // Attempt to get from manifest if currentCentileData not loaded yet
            const type = selected.measurementType.replace(/_/g, ' ');
            const unit = selected.id.includes("length") ? "cm" : selected.id.includes("weight") ? "kg" : "units"; // Basic inference
            yAxisLabel = `${type} (${unit})`;
        }
    }


    setChartData({
      datasets: [patientDataset, ...centileDatasets],
    });

    // Update options dynamically too, especially axis labels
    setChartOptions(prevOptions => ({
        ...prevOptions,
        plugins: {
            ...prevOptions.plugins,
            title: {
                display: true,
                text: currentCentileData ? `Growth Chart: ${currentCentileData.name}` : 'Patient Growth Chart',
            },
        },
        scales: {
            ...prevOptions.scales,
            x: {
                ...prevOptions.scales.x,
                title: {
                    display: true,
                    text: `Age (${currentCentileData?.ageUnit || 'Months'})`,
                },
            },
            y: {
                ...prevOptions.scales.y,
                title: {
                    display: true,
                    text: yAxisLabel,
                },
            },
        },
    }));

  }, [samplePatientData, currentCentileData, selectedCentileId, manifest]);

  useEffect(() => {
    updateChartData();
  }, [updateChartData]);

  // Initial chart options (can be partly dynamic)
  const [chartOptions, setChartOptions] = useState<any>({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Patient Growth Chart' },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              const unit = context.dataset.label?.includes("cm") || context.dataset.label?.includes("Length") ? "cm" :
                           context.dataset.label?.includes("kg") || context.dataset.label?.includes("Weight") ? "kg" : "";
              label += `${context.parsed.y} ${unit} at ${context.parsed.x} months`;
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'linear' as const,
        title: { display: true, text: 'Age (Months)' },
        min: 0, // Example: Start x-axis at 0
      },
      y: {
        title: { display: true, text: 'Measurement' },
        beginAtZero: false,
      },
    },
    interaction: {
        mode: 'index' as const, // Show tooltips for all datasets at that x-index
        intersect: false,
    },
  });


  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4">Growth Chart View</h2>

      <div className="mb-6 p-4 bg-white shadow rounded-lg">
        <label htmlFor="centileSelect" className="block text-sm font-medium text-gray-700 mb-1">
          Select Growth Chart / Centile Set:
        </label>
        <select
          id="centileSelect"
          value={selectedCentileId}
          onChange={(e) => setSelectedCentileId(e.target.value)}
          disabled={isLoading || manifest.length === 0}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-100"
        >
          <option value="" disabled>
            {isLoading ? 'Loading options...' : manifest.length === 0 && !error ? 'No charts found' : 'Select a chart'}
          </option>
          {manifest.map(entry => (
            <option key={entry.id} value={entry.id}>
              {entry.name} ({entry.sex}, {entry.source})
            </option>
          ))}
        </select>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>

      {selectedCentileId && currentCentileData ? (
        <div className="bg-white p-2 md:p-6 rounded-lg shadow relative h-[500px] md:h-[600px]">
          <Line options={chartOptions} data={chartData} />
        </div>
      ) : selectedCentileId && isLoading ? (
        <div className="text-center p-10">Loading chart data...</div>
      ) : selectedCentileId && !isLoading && !currentCentileData ? (
         <div className="text-center p-10 text-red-600">Could not load data for the selected chart.</div>
      ) : (
        <div className="text-center p-10 text-gray-500">Please select a chart from the dropdown above to view data.</div>
      )}
    </div>
  );
};

export default ChartViewPage;
