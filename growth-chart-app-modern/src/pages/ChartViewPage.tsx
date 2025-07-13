import React, { useState, useEffect, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale, Filler, ChartDataset } from 'chart.js'; // Added ChartDataset
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
  // Add a flag for 'Other' chart types if we make them selectable in manifest
  isOtherMeasurementChart?: boolean;
  otherMeasurementName?: string;
}

const lineColors = [
  'rgb(54, 162, 235)', 'rgb(255, 159, 64)', 'rgb(153, 102, 255)',
  'rgb(201, 203, 207)', 'rgb(255, 205, 86)', 'rgb(75, 192, 75)'
];
const velocityLineColor = 'rgb(255, 99, 71)';
const interventionPointColor = 'rgb(138, 43, 226)'; // Purple for intervention markers

const ChartViewPage: React.FC = () => {
  const currentPatient = useCurrentPatient();
  const patientRecords = useCurrentPatientRecords(); // These are all records for the patient
  const appSettings = useAppStore((state) => state.settings);
  const darkMode = appSettings.darkMode;
  const displayUnitSystem = appSettings.units;

  const [manifest, setManifest] = useState<CentileManifestEntry[]>([]);
  const [selectedCentileId, setSelectedCentileId] = useState<string>(''); // ID of selected centile chart OR an "Other" measurement name
  const [currentCentileData, setCurrentCentileData] = useState<CentileData | null>(null); // For standard charts
  const [isOtherChartSelected, setIsOtherChartSelected] = useState(false);

  const [chartData, setChartData] = useState<any>({ datasets: [] });
  const [isLoadingManifest, setIsLoadingManifest] = useState<boolean>(false);
  const [isLoadingCentiles, setIsLoadingCentiles] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filteredManifest, setFilteredManifest] = useState<CentileManifestEntry[]>([]);
  const [velocitySeries, setVelocitySeries] = useState<VelocityDataPoint[]>([]);
  const [chartOptions, setChartOptions] = useState<any>({});

  // Extract unique 'Other' measurement names for the current patient
  const otherMeasurementTypes = React.useMemo(() => {
    if (!currentPatient) return [];
    const otherRecords = patientRecords.filter(r => r.measurementType === 'Other' && r.otherMeasurementName);
    return [...new Set(otherRecords.map(r => r.otherMeasurementName!))];
  }, [patientRecords, currentPatient]);


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
      const standardCharts = manifest.filter(entry =>
        (entry.sex === currentPatient.sex.toLowerCase() || entry.sex === 'any') &&
        (!currentPatient.condition || !entry.id.includes(currentPatient.condition.toLowerCase().replace(/\s/g,'_'))) // Basic exclusion if condition specific charts are named
      );
      // Potentially add condition-specific charts here if manifest supports it
      // For now, just standard sex-based filtering.
      setFilteredManifest(standardCharts);

      if (!standardCharts.find(entry => entry.id === selectedCentileId) &&
          !otherMeasurementTypes.includes(selectedCentileId) && // also check if it's an "Other" type
          standardCharts.length > 0) {
        // Auto-select logic can be added here if desired
      } else if (standardCharts.length === 0 && otherMeasurementTypes.length === 0) {
          setSelectedCentileId('');
      }
    } else if (!currentPatient) {
      setFilteredManifest(manifest); setSelectedCentileId(''); setCurrentCentileData(null); setIsOtherChartSelected(false);
    } else {
      setFilteredManifest(manifest);
    }
  }, [currentPatient, manifest, selectedCentileId, otherMeasurementTypes]);

  useEffect(() => { /* ... currentCentileData fetching ... */
    if (!selectedCentileId) {
        setCurrentCentileData(null);
        setIsOtherChartSelected(false);
        return;
    }

    const standardChartEntry = manifest.find(entry => entry.id === selectedCentileId);
    if (standardChartEntry) {
        setIsOtherChartSelected(false);
        const fetchCentileFile = async () => {
          setIsLoadingCentiles(true);
          try {
            const response = await fetch(standardChartEntry.dataFile);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${standardChartEntry.dataFile}`);
            const data: CentileData = await response.json();
            setCurrentCentileData(data); setError(null);
          } catch (e) {
            console.error(`Failed to fetch centile data for ${standardChartEntry.name}:`, e);
            setError(`Failed to load data for ${standardChartEntry.name}.`); setCurrentCentileData(null);
          } finally { setIsLoadingCentiles(false); }
        };
        fetchCentileFile();
    } else if (otherMeasurementTypes.includes(selectedCentileId)) {
        // It's an "Other" measurement type selected
        setIsOtherChartSelected(true);
        setCurrentCentileData(null); // No centile data for "Other" types
        setError(null);
        setIsLoadingCentiles(false);
    } else {
        // Selected ID not found in manifest or other types
        setCurrentCentileData(null);
        setIsOtherChartSelected(false);
        // setError(`Chart definition for "${selectedCentileId}" not found.`);
    }
  }, [selectedCentileId, manifest, otherMeasurementTypes]);

  const updateChartDataAndOptions = useCallback(() => {
    let patientDataForChart: { x: number; y: number; zScore?: number; originalUnit: GrowthRecord['unit']; interventionType?: string; interventionDetails?: string; }[] = [];
    let patientLabel = 'Patient Measurements';
    let calculatedVelocitySeries: VelocityDataPoint[] = [];
    const datasets: ChartDataset<'line', any[]>[] = [];

    const activeMeasurementType = isOtherChartSelected ? 'Other' : currentCentileData?.measurementType;
    const activeOtherMeasurementName = isOtherChartSelected ? selectedCentileId : undefined;

    if (currentPatient && (currentCentileData || isOtherChartSelected)) {
      const hasLMS = !isOtherChartSelected && currentCentileData?.lmsParametersAvailable?.every(p => ['l','m','s'].includes(p));

      const relevantPatientRecords = patientRecords.filter(r => {
        if (isOtherChartSelected) {
            return r.measurementType === 'Other' && r.otherMeasurementName === activeOtherMeasurementName;
        }
        if (!currentCentileData) return false; // Should not happen if !isOtherChartSelected
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
          const metricValueForZScore = convertToMetricForCalc(r.value, r.unit as GrowthRecord['unit']);
          if (hasLMS && currentCentileData?.data && !isNaN(metricValueForZScore)) {
            const lmsReferenceData = currentCentileData.data as LMSDataPoint[];
            zScoreVal = getZScoreForMeasurement(metricValueForZScore, r.ageMonths, lmsReferenceData);
          }
          return {
            x: r.ageMonths, y: r.value,
            zScore: zScoreVal, originalUnit: r.unit,
            interventionType: r.interventionType,
            interventionDetails: r.interventionDetails
          };
        })
        .sort((a,b) => a.x - b.x);

      if (!isOtherChartSelected && (currentCentileData?.measurementType === 'length_for_age' || currentCentileData?.measurementType === 'weight_for_age')) {
        const metricRecordsForVelocity = relevantPatientRecords.map(rec => ({
            ...rec,
            value: convertToMetricForCalc(rec.value, rec.unit as GrowthRecord['unit']),
            unit: (rec.unit === 'kg' || rec.unit === 'lbs') ? 'kg' : 'cm',
        }));
        calculatedVelocitySeries = generateVelocityDataSeries(metricRecordsForVelocity);
      }
      setVelocitySeries(calculatedVelocitySeries);

      patientLabel = `${currentPatient.name} - ${isOtherChartSelected ? activeOtherMeasurementName : currentCentileData?.measurementType.replace(/_/g, ' ')}`;

    } else if (currentPatient && patientRecords.length > 0 && !currentCentileData && !isOtherChartSelected) {
        patientLabel = `${currentPatient.name} - Select a chart type`;
        setVelocitySeries([]);
    } else {
        setVelocitySeries([]);
    }

    const patientDataset: ChartDataset<'line', any[]> = {
      label: patientLabel, data: patientDataForChart,
      borderColor: 'rgb(239, 68, 68)', backgroundColor: 'rgba(239, 68, 68, 0.5)',
      tension: 0.1, pointRadius: 5, order: 0, yAxisID: 'yPrimary',
      pointStyle: patientDataForChart.map(p => p.interventionType ? 'star' : 'circle'), // Different style for intervention points
      pointRadius: patientDataForChart.map(p => p.interventionType ? 8 : 5),
      pointBorderColor: patientDataForChart.map(p => p.interventionType ? interventionPointColor : 'rgb(239, 68, 68)'),
    };
    datasets.push(patientDataset);

    if (currentCentileData && !isOtherChartSelected) { // Only add centiles if it's a standard chart
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

    if (isOtherChartSelected) {
        const firstOtherRecord = patientDataForChart.length > 0 ? patientRecords.find(r => r.measurementType === 'Other' && r.otherMeasurementName === activeOtherMeasurementName && r.ageMonths === patientDataForChart[0].x) : null;
        yPrimaryLabel = firstOtherRecord?.unit || 'Value'; // Use entered unit for "Other"
    } else if (currentCentileData) {
        if (displayUnitSystem === 'Imperial') {
            if (currentCentileData.measurementUnit === 'cm') yPrimaryLabel = `${currentCentileData.measurementType.replace(/_/g, ' ')} (in)`;
            else if (currentCentileData.measurementUnit === 'kg') yPrimaryLabel = `${currentCentileData.measurementType.replace(/_/g, ' ')} (lbs)`;
            else yPrimaryLabel = `${currentCentileData.measurementType.replace(/_/g, ' ')} (${currentCentileData.measurementUnit})`;
        } else {
             yPrimaryLabel = `${currentCentileData.measurementType.replace(/_/g, ' ')} (${currentCentileData.measurementUnit})`;
        }
    }

    const chartTitleText = isOtherChartSelected ?
        `${activeOtherMeasurementName} for ${currentPatient?.name || 'Patient'}` :
        (currentCentileData ? currentCentileData.name : (currentPatient ? `${currentPatient.name} - Growth Chart` : 'Growth Chart'));

    const options: any = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' as const, labels: { color: currentTitleColor } },
            title: { display: true, text: chartTitleText, color: currentTitleColor },
            tooltip: {
                callbacks: {
                    label: function(context: any) {
                        let tooltipLabelLines: string[] = [];
                        const datasetLabel = context.dataset.label || '';
                        const pointData = context.raw as any;

                        if (context.parsed.y !== null) {
                            let displayValue = context.parsed.y;
                            let displayUnitLabel = '';

                            if (context.dataset.yAxisID === 'yVelocity') {
                                const vPoint = velocitySeries.find(v => v.ageMonthsMidPoint.toFixed(1) === pointData.x.toFixed(1) && v.velocity.toFixed(1) === pointData.y.toFixed(1));
                                displayUnitLabel = vPoint?.velocityUnit || (velocitySeries.length > 0 ? velocitySeries[0].velocityUnit : '');
                                tooltipLabelLines.push(`${datasetLabel}: ${displayValue.toFixed(1)} ${displayUnitLabel}`);
                                tooltipLabelLines.push(`Interval Age: ${context.parsed.x.toFixed(1)} months (midpoint)`);
                            } else if (context.datasetIndex === 0 && pointData?.originalUnit) { // Patient's main measurement
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
                                } else { // Handles 'Other' type units or unknown
                                    displayValue = rawValue; displayUnitLabel = originalUnit || '';
                                }
                                tooltipLabelLines.push(`${datasetLabel}: ${displayValue.toFixed(1)} ${displayUnitLabel}`);
                                tooltipLabelLines.push(`Age: ${context.parsed.x.toFixed(1)} months`);

                                if (pointData.zScore !== undefined && !isNaN(pointData.zScore) && !isOtherChartSelected) {
                                    tooltipLabelLines.push(`Z-Score: ${pointData.zScore.toFixed(2)}`);
                                }
                                if (pointData.interventionType) {
                                    tooltipLabelLines.push(`Intervention: ${pointData.interventionType}`);
                                    if (pointData.interventionDetails) {
                                        tooltipLabelLines.push(`Details: ${pointData.interventionDetails}`);
                                    }
                                }
                            } else { // Centile lines
                                displayUnitLabel = currentCentileData?.measurementUnit || '';
                                if (displayUnitSystem === 'Imperial' && !isOtherChartSelected) { // Other charts use their own unit
                                    if (displayUnitLabel === 'cm') {
                                        displayValue = cmToInches(displayValue); displayUnitLabel = 'in';
                                    } else if (displayUnitLabel === 'kg') {
                                        displayValue = kgToLbs(displayValue); displayUnitLabel = 'lbs';
                                    }
                                }
                                tooltipLabelLines.push(`${datasetLabel}: ${displayValue.toFixed(1)} ${displayUnitLabel}`);
                                tooltipLabelLines.push(`Age: ${context.parsed.x.toFixed(1)} months`);
                            }
                        }
                        return tooltipLabelLines; // Return array for multi-line tooltips
                    }
                },
                bodyColor: darkMode ? '#ddd' : '#333', titleColor: darkMode ? '#fff' : '#000',
                backgroundColor: darkMode ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.9)',
                borderColor: darkMode ? 'rgba(200,200,200,0.9)' : 'rgba(0,0,0,0.2)', borderWidth: 1,
            }
        },
        scales: {
            x: { type: 'linear' as const, title: { display: true, text: `Age (${ isOtherChartSelected ? 'Months' : (currentCentileData?.ageUnit || 'Months')})`, color: currentTitleColor }, min: 0, ticks: { color: currentTickColor }, grid: { color: currentGridColor } },
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

  }, [currentPatient, patientRecords, currentCentileData, darkMode, velocitySeries, displayUnitSystem, isOtherChartSelected, selectedCentileId]);

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
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
        <span>Sex: {currentPatient.sex}</span> | <span>DOB: {currentPatient.dob}</span> | <span className="capitalize">Display: {displayUnitSystem} Units</span>
      </div>
      {currentPatient.condition && (
        <p className="text-sm text-purple-600 dark:text-purple-400 mb-4">Condition: <span className="font-semibold">{currentPatient.condition}</span></p>
      )}

      <div className={`mb-6 p-4 bg-white dark:bg-gray-700/50 shadow rounded-lg ${!currentPatient.condition ? 'mt-4' : ''}`}>
        <label htmlFor="centileSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Select Growth Chart / Measurement:
        </label>
        <select
          id="centileSelect" value={selectedCentileId}
          onChange={(e) => setSelectedCentileId(e.target.value)}
          disabled={isLoadingManifest || (filteredManifest.length === 0 && otherMeasurementTypes.length === 0)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-800 dark:text-gray-200 disabled:opacity-60 dark:disabled:opacity-50"
        >
          <option value="" disabled>
            {isLoadingManifest ? 'Loading options...' : (filteredManifest.length === 0 && otherMeasurementTypes.length === 0 && !error) ? `No charts/measurements available` : 'Select a chart or measurement'}
          </option>
          <optgroup label="Standard Growth Charts">
            {filteredManifest.map(entry => ( <option key={entry.id} value={entry.id}> {entry.name} ({entry.source}) </option> ))}
          </optgroup>
          {otherMeasurementTypes.length > 0 && (
            <optgroup label="Other Patient Measurements">
              {otherMeasurementTypes.map(name => ( <option key={name} value={name}> {name} (Custom) </option> ))}
            </optgroup>
          )}
        </select>
        {error && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{error}</p>}
      </div>

      <div className="bg-white dark:bg-gray-700/60 p-2 md:p-6 rounded-lg shadow relative h-[500px] md:h-[600px]">
        { (isLoadingCentiles && selectedCentileId && !isOtherChartSelected) && ( // Show spinner only for centile loading
          <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-50 dark:bg-opacity-60 flex flex-col items-center justify-center z-10 rounded-lg">
            <Spinner size="lg" />
            <p className="mt-3 text-lg text-gray-700 dark:text-gray-200">Loading chart data...</p>
          </div>
        )}
        { !isLoadingCentiles && ((selectedCentileId && (currentCentileData || isOtherChartSelected)) || patientRecords.length > 0) ? (
            (chartData.datasets && chartData.datasets.length > 0 && chartOptions.plugins) ? <Line options={chartOptions} data={chartData} /> : <div className="flex items-center justify-center h-full"><p className="text-gray-500 dark:text-gray-400">Chart data is being prepared...</p></div>
        ) : !selectedCentileId && patientRecords.length > 0 ? (
            <div className="flex items-center justify-center h-full"><p className="text-gray-500 dark:text-gray-400">Please select a chart or measurement from the dropdown to view data.</p></div>
        ) : patientRecords.length === 0 && !selectedCentileId ? (
             <div className="flex items-center justify-center h-full"><p className="text-gray-500 dark:text-gray-400">No growth records found for this patient. Add some in the 'Table View'.</p></div>
        ) : error && selectedCentileId && !isOtherChartSelected ? (
            <div className="flex items-center justify-center h-full"><p className="text-red-500 dark:text-red-400">{error}</p></div>
        ) : (
            <div className="flex items-center justify-center h-full"><p className="text-gray-500 dark:text-gray-400">Select a chart or measurement to view data.</p></div>
        )}
      </div>
    </div>
  );
};

export default ChartViewPage;
