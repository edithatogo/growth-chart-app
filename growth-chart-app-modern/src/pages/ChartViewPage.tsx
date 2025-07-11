import React, { useState, useEffect, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale, Filler } from 'chart.js';
import 'chartjs-adapter-date-fns';
import useAppStore, { useCurrentPatient, useCurrentPatientRecords, GrowthRecord } from '../store/appStore';
import Spinner from '../components/Spinner';
import { getZScoreForMeasurement, LMSDataPoint } from '../utils/zScoreCalculator';
import { generateVelocityDataSeries, VelocityDataPoint } from '../utils/calculations';

ChartJS.register( CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale, Filler );

interface CentilePoint {
  age: number;
  [key: string]: number | undefined;
  l?: number; m?: number; s?: number;
}
interface CentileData {
  source: string; name: string; measurementType: string; sex: 'male' | 'female' | 'any';
  ageUnit: string; measurementUnit: string; centilesAvailable: string[];
  lmsParametersAvailable?: string[]; data: CentilePoint[];
}
interface CentileManifestEntry {
  id: string; name: string; description: string; measurementType: string; sex: 'male' | 'female' | 'any';
  ageRangeMonths: [number, number]; source: string; type: 'percentiles' | 'z-scores'; dataFile: string;
}

const lineColors = [
  'rgb(54, 162, 235)', 'rgb(255, 159, 64)', 'rgb(153, 102, 255)',
  'rgb(201, 203, 207)', 'rgb(255, 205, 86)', 'rgb(75, 192, 75)'
];
const velocityLineColor = 'rgb(255, 99, 71)'; // Tomato color for velocity

const ChartViewPage: React.FC = () => {
  const currentPatient = useCurrentPatient();
  const patientRecords = useCurrentPatientRecords();
  const darkMode = useAppStore((state) => state.settings.darkMode);

  const [manifest, setManifest] = useState<CentileManifestEntry[]>([]);
  const [selectedCentileId, setSelectedCentileId] = useState<string>('');
  const [currentCentileData, setCurrentCentileData] = useState<CentileData | null>(null);
  const [chartData, setChartData] = useState<any>({ datasets: [] });
  const [isLoadingManifest, setIsLoadingManifest] = useState<boolean>(false);
  const [isLoadingCentiles, setIsLoadingCentiles] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filteredManifest, setFilteredManifest] = useState<CentileManifestEntry[]>([]);
  const [velocitySeries, setVelocitySeries] = useState<VelocityDataPoint[]>([]);
  const [chartOptions, setChartOptions] = useState<any>({});

  useEffect(() => { /* ... manifest fetching ... */
    const fetchManifest = async () => {
      setIsLoadingManifest(true);
      try {
        const response = await fetch('/data/centile_manifest.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data: CentileManifestEntry[] = await response.json();
        setManifest(data); setError(null);
      } catch (e) {
        console.error("Failed to fetch centile manifest:", e);
        setError("Failed to load centile selection options."); setManifest([]);
      } finally { setIsLoadingManifest(false); }
    };
    fetchManifest();
  }, []);

  useEffect(() => { /* ... filteredManifest update ... */
    if (currentPatient && manifest.length > 0) {
      const newFiltered = manifest.filter(entry => entry.sex === currentPatient.sex.toLowerCase() || entry.sex === 'any');
      setFilteredManifest(newFiltered);
      if (!newFiltered.find(entry => entry.id === selectedCentileId) && newFiltered.length > 0) {
        // Auto-select logic can be added here if desired
      } else if (newFiltered.length === 0) { setSelectedCentileId(''); }
    } else if (!currentPatient) {
      setFilteredManifest(manifest); setSelectedCentileId(''); setCurrentCentileData(null);
    } else { setFilteredManifest(manifest); }
  }, [currentPatient, manifest, selectedCentileId]);

  useEffect(() => { /* ... currentCentileData fetching ... */
    if (!selectedCentileId) { setCurrentCentileData(null); return; }
    const selectedEntry = manifest.find(entry => entry.id === selectedCentileId);
    if (!selectedEntry) return;
    const fetchCentileFile = async () => {
      setIsLoadingCentiles(true);
      try {
        const response = await fetch(selectedEntry.dataFile);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${selectedEntry.dataFile}`);
        const data: CentileData = await response.json();
        setCurrentCentileData(data); setError(null);
      } catch (e) {
        console.error(`Failed to fetch centile data for ${selectedEntry.name}:`, e);
        setError(`Failed to load data for ${selectedEntry.name}.`); setCurrentCentileData(null);
      } finally { setIsLoadingCentiles(false); }
    };
    fetchCentileFile();
  }, [selectedCentileId, manifest]);

  const updateChartDataAndOptions = useCallback(() => {
    let patientDataForChart: { x: number; y: number; zScore?: number }[] = [];
    let patientLabel = 'Patient Measurements';
    let calculatedVelocitySeries: VelocityDataPoint[] = [];

    const datasets = []; // Start with an empty array for datasets

    if (currentPatient && currentCentileData) {
      const hasLMS = currentCentileData.lmsParametersAvailable &&
                     currentCentileData.lmsParametersAvailable.includes('l') &&
                     currentCentileData.lmsParametersAvailable.includes('m') &&
                     currentCentileData.lmsParametersAvailable.includes('s');

      const relevantPatientRecords = patientRecords.filter(r => {
        let recordMeasurementMapped = '';
        if (r.measurementType === 'Length' || r.measurementType === 'Height') recordMeasurementMapped = 'length_for_age';
        else if (r.measurementType === 'Weight') recordMeasurementMapped = 'weight_for_age';
        else if (r.measurementType === 'HeadCircumference') recordMeasurementMapped = 'hc_for_age';
        else if (r.measurementType === 'BMI') recordMeasurementMapped = 'bmi_for_age';
        return recordMeasurementMapped === currentCentileData.measurementType ||
               r.measurementType.toLowerCase().replace(/\s/g, '_') === currentCentileData.measurementType;
      });

      patientDataForChart = relevantPatientRecords
        .map(r => {
          let zScoreVal: number | undefined = undefined;
          if (hasLMS && currentCentileData.data) {
            const lmsReferenceData = currentCentileData.data as LMSDataPoint[];
            zScoreVal = getZScoreForMeasurement(r.value, r.ageMonths, lmsReferenceData);
          }
          return { x: r.ageMonths, y: r.value, zScore: zScoreVal };
        })
        .sort((a,b) => a.x - b.x);

      if (currentCentileData.measurementType === 'length_for_age' || currentCentileData.measurementType === 'weight_for_age') {
        calculatedVelocitySeries = generateVelocityDataSeries(relevantPatientRecords);
      }
      setVelocitySeries(calculatedVelocitySeries);
      patientLabel = `${currentPatient.name} - ${currentCentileData.measurementType.replace(/_/g, ' ')}`;

    } else if (currentPatient && patientRecords.length > 0 && !currentCentileData) {
        patientLabel = `${currentPatient.name} - Select a chart type`;
        setVelocitySeries([]);
    } else {
        setVelocitySeries([]);
    }

    // Patient's absolute measurement dataset
    const patientDataset = {
      label: patientLabel, data: patientDataForChart,
      borderColor: 'rgb(239, 68, 68)', backgroundColor: 'rgba(239, 68, 68, 0.5)',
      tension: 0.1, pointRadius: 5, order: 0,
      yAxisID: 'yPrimary', // Assign to primary Y-axis
    };
    datasets.push(patientDataset);

    // Centile datasets
    if (currentCentileData) {
      const available = currentCentileData.centilesAvailable || [];
      available.forEach((centileKey, index) => {
        datasets.push({
          label: `${centileKey.toUpperCase()}`,
          data: currentCentileData.data.map(p => ({ x: p.age, y: p[centileKey] })).sort((a,b) => a.x - b.x),
          borderColor: lineColors[index % lineColors.length],
          borderDash: [5, 5], tension: 0.1, pointRadius: 2, fill: false, order: index + 1,
          yAxisID: 'yPrimary', // Assign to primary Y-axis
        });
      });
    }

    // Patient's velocity dataset (if data exists)
    let velocityYAxisLabel = 'Velocity';
    if (velocitySeries.length > 0) {
        velocityYAxisLabel = `Velocity (${velocitySeries[0].velocityUnit})`;
        datasets.push({
            label: `${currentPatient?.name || 'Patient'} - Velocity (${velocitySeries[0].velocityUnit})`,
            data: velocitySeries.map(v => ({ x: v.ageMonthsMidPoint, y: v.velocity })),
            borderColor: velocityLineColor,
            backgroundColor: 'rgba(255, 99, 71, 0.3)',
            tension: 0.1,
            pointRadius: 4,
            borderWidth: 2,
            yAxisID: 'yVelocity', // Assign to secondary Y-axis
            order: -1 // Draw velocity behind main patient data for clarity
        });
    }

    setChartData({ datasets });

    // Define Colors based on dark mode
    const currentTickColor = darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
    const currentGridColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const currentTitleColor = darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)';

    let yPrimaryLabel = 'Measurement';
    if (currentCentileData) { yPrimaryLabel = `${currentCentileData.measurementType.replace(/_/g, ' ')} (${currentCentileData.measurementUnit})`; }


    // Define Chart Options, including secondary Y-axis for velocity
    const options: any = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' as const, labels: { color: currentTitleColor } },
            title: { display: true, text: currentCentileData ? `${currentCentileData.name}` : (currentPatient ? `${currentPatient.name} - Growth Chart` : 'Growth Chart'), color: currentTitleColor },
            tooltip: {
                callbacks: {
                    label: function(context: any) {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.parsed.y !== null) {
                            let unit = '';
                            if (context.dataset.yAxisID === 'yVelocity' && velocitySeries.length > 0) {
                                unit = velocitySeries[0].velocityUnit;
                                label += `${context.parsed.y.toFixed(1)} ${unit} at ${context.parsed.x.toFixed(1)} months (midpoint)`;
                            } else {
                                unit = currentCentileData?.measurementUnit || (context.datasetIndex === 0 && patientRecords.length > 0 ? patientRecords[0].unit : '');
                                label += `${context.parsed.y.toFixed(1)} ${unit} at ${context.parsed.x.toFixed(1)} months`;
                                if (context.datasetIndex === 0 && context.raw?.zScore !== undefined && !isNaN(context.raw.zScore)) {
                                    label += ` (Z: ${context.raw.zScore.toFixed(2)})`;
                                }
                            }
                        }
                        return label;
                    }
                },
                bodyColor: darkMode ? '#ddd' : '#333', titleColor: darkMode ? '#fff' : '#000',
                backgroundColor: darkMode ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.9)',
                borderColor: darkMode ? 'rgba(200,200,200,0.9)' : 'rgba(0,0,0,0.2)', borderWidth: 1,
            }
        },
        scales: {
            x: {
                type: 'linear' as const,
                title: { display: true, text: `Age (${currentCentileData?.ageUnit || 'Months'})`, color: currentTitleColor },
                min: 0,
                ticks: { color: currentTickColor },
                grid: { color: currentGridColor }
            },
            yPrimary: { // Primary Y-axis for measurements and centiles
                type: 'linear' as const,
                position: 'left' as const,
                title: { display: true, text: yPrimaryLabel, color: currentTitleColor },
                beginAtZero: false,
                ticks: { color: currentTickColor },
                grid: { color: currentGridColor }
            }
        },
        interaction: { mode: 'index' as const, intersect: false, axis: 'x' as const },
    };

    if (velocitySeries.length > 0) {
        options.scales.yVelocity = { // Secondary Y-axis for velocity
            type: 'linear' as const,
            position: 'right' as const,
            title: { display: true, text: velocityYAxisLabel, color: currentTitleColor },
            ticks: { color: currentTickColor },
            grid: { drawOnChartArea: false, color: currentGridColor }, // Only show grid lines for primary axis or style differently
            // beginAtZero: true, // Velocity can be negative
        };
    }
    setChartOptions(options);

  }, [currentPatient, patientRecords, currentCentileData, darkMode, velocitySeries]); // Added velocitySeries to dependency array

  useEffect(() => { updateChartDataAndOptions(); }, [updateChartDataAndOptions]);

  // ... rest of the component (return statement) remains the same
  if (!currentPatient) {
    return (
      <div className="p-4 text-center text-gray-800 dark:text-gray-200">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Growth Chart View</h2>
        <p className="text-gray-500 dark:text-gray-400">Please select a patient from the "Patient Selection" page to view their growth chart.</p>
      </div>
    );
  }

  return (
    <div className="p-4 text-gray-800 dark:text-gray-200">
      <h2 className="text-2xl font-semibold mb-1 text-gray-900 dark:text-white">Growth Chart for: <span className="text-blue-600 dark:text-blue-400">{currentPatient.name}</span></h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Sex: {currentPatient.sex} | DOB: {currentPatient.dob}</p>

      <div className="mb-6 p-4 bg-white dark:bg-gray-700/50 shadow rounded-lg">
        <label htmlFor="centileSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Select Growth Chart / Centile Set:
        </label>
        <select
          id="centileSelect" value={selectedCentileId}
          onChange={(e) => setSelectedCentileId(e.target.value)}
          disabled={isLoadingManifest || filteredManifest.length === 0}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-800 dark:text-gray-200 disabled:opacity-60 dark:disabled:opacity-50"
        >
          <option value="" disabled>
            {isLoadingManifest ? 'Loading options...' : filteredManifest.length === 0 && !error ? `No charts for ${currentPatient.sex || 'selected criteria'}` : 'Select a chart'}
          </option>
          {filteredManifest.map(entry => ( <option key={entry.id} value={entry.id}> {entry.name} ({entry.source}) </option> ))}
        </select>
        {error && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{error}</p>}
        {filteredManifest.length === 0 && !isLoadingManifest && manifest.length > 0 && <p className="text-orange-500 dark:text-orange-400 text-xs mt-1">No specific charts found for patient's sex. Showing all available or implement more specific filters.</p>}
      </div>

      <div className="bg-white dark:bg-gray-700/60 p-2 md:p-6 rounded-lg shadow relative h-[500px] md:h-[600px]">
        { isLoadingCentiles && selectedCentileId && (
          <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-50 dark:bg-opacity-60 flex flex-col items-center justify-center z-10 rounded-lg">
            <Spinner size="lg" />
            <p className="mt-3 text-lg text-gray-700 dark:text-gray-200">Loading chart data...</p>
          </div>
        )}
        { !isLoadingCentiles && ((selectedCentileId && currentCentileData) || patientRecords.length > 0) ? (
            (chartData.datasets && chartData.datasets.length > 0 && chartOptions.plugins) ? <Line options={chartOptions} data={chartData} /> : <div className="flex items-center justify-center h-full"><p className="text-gray-500 dark:text-gray-400">Chart data is being prepared...</p></div>
        ) : !selectedCentileId && patientRecords.length > 0 ? (
            <div className="flex items-center justify-center h-full"><p className="text-gray-500 dark:text-gray-400">Please select a chart from the dropdown to view data.</p></div>
        ) : patientRecords.length === 0 && !selectedCentileId ? (
             <div className="flex items-center justify-center h-full"><p className="text-gray-500 dark:text-gray-400">No growth records found for this patient. Add some in the 'Table View'.</p></div>
        ) : error && selectedCentileId ? (
            <div className="flex items-center justify-center h-full"><p className="text-red-500 dark:text-red-400">{error}</p></div>
        ) : (
            <div className="flex items-center justify-center h-full"><p className="text-gray-500 dark:text-gray-400">Select a chart to view data.</p></div>
        )}
      </div>
    </div>
  );
};

export default ChartViewPage;
