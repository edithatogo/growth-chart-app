import React, { useState, useEffect, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale, Filler } from 'chart.js';
import 'chartjs-adapter-date-fns';
import useAppStore, { useCurrentPatient, useCurrentPatientRecords, GrowthRecord, AppSettings } from '../store/appStore';
import Spinner from '../components/Spinner';
import { getZScoreForMeasurement, LMSDataPoint } from '../utils/zScoreCalculator';
import { generateVelocityDataSeries, VelocityDataPoint } from '../utils/calculations';
import { convertWeightForDisplay, convertHeightForDisplay, WeightUnit, HeightUnit, DisplayUnits, convertToMetricForCalc } from '../utils/units';


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
const velocityLineColor = 'rgb(255, 99, 71)';

const ChartViewPage: React.FC = () => {
  const currentPatient = useCurrentPatient();
  const patientRecords = useCurrentPatientRecords();
  const appSettings = useAppStore((state) => state.settings);
  const darkMode = appSettings.darkMode;
  const displayUnitSystem = appSettings.units;


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

  useEffect(() => {
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

  useEffect(() => {
    if (currentPatient && manifest.length > 0) {
      const newFiltered = manifest.filter(entry => entry.sex === currentPatient.sex.toLowerCase() || entry.sex === 'any');
      setFilteredManifest(newFiltered);
      if (!newFiltered.find(entry => entry.id === selectedCentileId) && newFiltered.length > 0) {
      } else if (newFiltered.length === 0) { setSelectedCentileId(''); }
    } else if (!currentPatient) {
      setFilteredManifest(manifest); setSelectedCentileId(''); setCurrentCentileData(null);
    } else { setFilteredManifest(manifest); }
  }, [currentPatient, manifest, selectedCentileId]);

  useEffect(() => {
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
    let patientDataForChart: { x: number; y: number; zScore?: number; originalUnit: GrowthRecord['unit'] }[] = [];
    let patientLabel = 'Patient Measurements';
    let calculatedVelocitySeries: VelocityDataPoint[] = [];
    const datasets = [];

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
          // Convert value to metric for Z-score calculation, as LMS params are metric-based
          const metricValueForZScore = convertToMetricForCalc(r.value, r.unit as GrowthRecord['unit']);

          if (hasLMS && currentCentileData.data && !isNaN(metricValueForZScore)) {
            const lmsReferenceData = currentCentileData.data as LMSDataPoint[];
            zScoreVal = getZScoreForMeasurement(metricValueForZScore, r.ageMonths, lmsReferenceData);
          }
          // Store original value (y) and originalUnit for plotting and display conversion
          return { x: r.ageMonths, y: r.value, zScore: zScoreVal, originalUnit: r.unit };
        })
        .sort((a,b) => a.x - b.x);

      if (currentCentileData.measurementType === 'length_for_age' || currentCentileData.measurementType === 'weight_for_age') {
        // Convert records to metric before calculating velocity for consistent velocity unit (e.g. cm/year, kg/year)
        const metricRecordsForVelocity = relevantPatientRecords.map(rec => ({
            ...rec, // Spread original record
            value: convertToMetricForCalc(rec.value, rec.unit as GrowthRecord['unit']), // Convert value to metric
            unit: (rec.unit === 'kg' || rec.unit === 'lbs') ? 'kg' : 'cm', // Standardize unit to metric for velocity calc
        }));
        calculatedVelocitySeries = generateVelocityDataSeries(metricRecordsForVelocity);
      }
      setVelocitySeries(calculatedVelocitySeries);
      patientLabel = `${currentPatient.name} - ${currentCentileData.measurementType.replace(/_/g, ' ')}`;

    } else if (currentPatient && patientRecords.length > 0 && !currentCentileData) {
        patientLabel = `${currentPatient.name} - Select a chart type`;
        setVelocitySeries([]);
    } else {
        setVelocitySeries([]);
    }

    const patientDataset = {
      label: patientLabel, data: patientDataForChart,
      borderColor: 'rgb(239, 68, 68)', backgroundColor: 'rgba(239, 68, 68, 0.5)',
      tension: 0.1, pointRadius: 5, order: 0, yAxisID: 'yPrimary',
    };
    datasets.push(patientDataset);

    if (currentCentileData) {
      const available = currentCentileData.centilesAvailable || [];
      available.forEach((centileKey, index) => {
        datasets.push({
          label: `${centileKey.toUpperCase()}`,
          data: currentCentileData.data.map(p => ({ x: p.age, y: p[centileKey] })).sort((a,b) => a.x - b.x),
          borderColor: lineColors[index % lineColors.length],
          borderDash: [5, 5], tension: 0.1, pointRadius: 2, fill: false, order: index + 1, yAxisID: 'yPrimary',
        });
      });
    }

    let velocityYAxisLabel = 'Velocity';
    if (velocitySeries.length > 0) {
        // Velocity is calculated based on metric, so unit is metric/year
        const velUnit = velocitySeries[0].velocityUnit.startsWith('kg') ? 'kg/year' : 'cm/year';
        velocityYAxisLabel = `Velocity (${velUnit})`;
        datasets.push({
            label: `${currentPatient?.name || 'Patient'} - Velocity (${velUnit})`,
            data: velocitySeries.map(v => ({ x: v.ageMonthsMidPoint, y: v.velocity })),
            borderColor: velocityLineColor, backgroundColor: 'rgba(255, 99, 71, 0.3)',
            tension: 0.1, pointRadius: 4, borderWidth: 2, yAxisID: 'yVelocity', order: -1
        });
    }
    setChartData({ datasets });

    const currentTickColor = darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
    const currentGridColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const currentTitleColor = darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)';
    let yPrimaryLabel = 'Measurement';
    if (currentCentileData) {
        // For primary Y axis label, use the display unit system
        if (displayUnitSystem === 'Imperial') {
            if (currentCentileData.measurementUnit === 'cm') yPrimaryLabel = `${currentCentileData.measurementType.replace(/_/g, ' ')} (in)`;
            else if (currentCentileData.measurementUnit === 'kg') yPrimaryLabel = `${currentCentileData.measurementType.replace(/_/g, ' ')} (lbs)`;
            else yPrimaryLabel = `${currentCentileData.measurementType.replace(/_/g, ' ')} (${currentCentileData.measurementUnit})`; // BMI or other
        } else {
             yPrimaryLabel = `${currentCentileData.measurementType.replace(/_/g, ' ')} (${currentCentileData.measurementUnit})`;
        }
    }


    const options: any = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' as const, labels: { color: currentTitleColor } },
            title: { display: true, text: currentCentileData ? `${currentCentileData.name}` : (currentPatient ? `${currentPatient.name} - Growth Chart` : 'Growth Chart'), color: currentTitleColor },
            tooltip: {
                callbacks: {
                    label: function(context: any) {
                        let tooltipLabel = context.dataset.label || '';
                        if (tooltipLabel) tooltipLabel += ': ';
                        if (context.parsed.y !== null) {
                            let displayValue = context.parsed.y;
                            let displayUnitLabel = '';
                            const pointData = context.raw as any;

                            if (context.dataset.yAxisID === 'yVelocity') {
                                const vPoint = velocitySeries.find(v => v.ageMonthsMidPoint.toFixed(1) === pointData.x.toFixed(1) && v.velocity.toFixed(1) === pointData.y.toFixed(1));
                                displayUnitLabel = vPoint?.velocityUnit || (velocitySeries.length > 0 ? velocitySeries[0].velocityUnit : '');
                                tooltipLabel += `${displayValue.toFixed(1)} ${displayUnitLabel} at ${context.parsed.x.toFixed(1)} months (midpoint)`;
                            } else if (context.datasetIndex === 0 && pointData?.originalUnit) {
                                const rawValue = pointData.y;
                                const originalUnit = pointData.originalUnit as GrowthRecord['unit'];

                                if (originalUnit === 'kg' || originalUnit === 'lbs') {
                                    const converted = convertWeightForDisplay(rawValue, originalUnit as WeightUnit, displayUnitSystem);
                                    displayValue = converted.value; displayUnitLabel = converted.unit;
                                } else if (originalUnit === 'cm' || originalUnit === 'in') {
                                    const converted = convertHeightForDisplay(rawValue, originalUnit as HeightUnit, displayUnitSystem);
                                    displayValue = converted.value; displayUnitLabel = converted.unit;
                                } else if (originalUnit === 'kg/m²') {
                                    displayValue = rawValue; displayUnitLabel = 'kg/m²';
                                } else {
                                    displayValue = rawValue; displayUnitLabel = currentCentileData?.measurementUnit || '';
                                }
                                tooltipLabel += `${displayValue.toFixed(1)} ${displayUnitLabel} at ${context.parsed.x.toFixed(1)} months`;
                                if (pointData.zScore !== undefined && !isNaN(pointData.zScore)) {
                                    tooltipLabel += ` (Z: ${pointData.zScore.toFixed(2)})`;
                                }
                            } else { // Centile lines
                                displayUnitLabel = currentCentileData?.measurementUnit || '';
                                // Centile data is always metric, convert for display if needed
                                if (displayUnitSystem === 'Imperial') {
                                    if (displayUnitLabel === 'cm') {
                                        displayValue = cmToInches(displayValue); displayUnitLabel = 'in';
                                    } else if (displayUnitLabel === 'kg') {
                                        displayValue = kgToLbs(displayValue); displayUnitLabel = 'lbs';
                                    }
                                }
                                tooltipLabel += `${displayValue.toFixed(1)} ${displayUnitLabel} at ${context.parsed.x.toFixed(1)} months`;
                            }
                        }
                        return tooltipLabel;
                    }
                },
                bodyColor: darkMode ? '#ddd' : '#333', titleColor: darkMode ? '#fff' : '#000',
                backgroundColor: darkMode ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.9)',
                borderColor: darkMode ? 'rgba(200,200,200,0.9)' : 'rgba(0,0,0,0.2)', borderWidth: 1,
            }
        },
        scales: {
            x: { type: 'linear' as const, title: { display: true, text: `Age (${currentCentileData?.ageUnit || 'Months'})`, color: currentTitleColor }, min: 0, ticks: { color: currentTickColor }, grid: { color: currentGridColor } },
            yPrimary: { type: 'linear' as const, position: 'left' as const, title: { display: true, text: yPrimaryLabel, color: currentTitleColor }, beginAtZero: false, ticks: { color: currentTickColor }, grid: { color: currentGridColor } }
        },
        interaction: { mode: 'index' as const, intersect: false, axis: 'x' as const },
    };

    if (velocitySeries.length > 0) {
        options.scales.yVelocity = {
            type: 'linear' as const, position: 'right' as const,
            title: { display: true, text: velocityYAxisLabel, color: currentTitleColor },
            ticks: { color: currentTickColor },
            grid: { drawOnChartArea: false, color: currentGridColor },
        };
    }
    setChartOptions(options);

  }, [currentPatient, patientRecords, currentCentileData, darkMode, velocitySeries, displayUnitSystem]);

  useEffect(() => { updateChartDataAndOptions(); }, [updateChartDataAndOptions]);

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
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Sex: {currentPatient.sex} | DOB: {currentPatient.dob} | Displaying Units: <span className="font-semibold">{displayUnitSystem}</span></p>

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
