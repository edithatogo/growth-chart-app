// src/utils/calculations.ts

/**
 * Calculates Body Mass Index (BMI).
 * BMI = weight (kg) / (height (m))^2
 *
 * @param weightKg Weight in kilograms.
 * @param heightCm Height in centimeters.
 * @returns The calculated BMI, or NaN if inputs are invalid (e.g., height is 0).
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  if (heightCm <= 0 || weightKg < 0) { // Weight can be 0, but not negative. Height must be positive.
    console.warn(`Invalid input for BMI calculation: Weight ${weightKg}kg, Height ${heightCm}cm`);
    return NaN;
  }

  const heightM = heightCm / 100; // Convert height from cm to meters
  const bmi = weightKg / (heightM * heightM);

  // BMI is typically rounded to one decimal place in clinical practice
  return parseFloat(bmi.toFixed(1));
}

// --- Growth Velocity Calculations ---

import { GrowthRecord } from '../store/appStore'; // Assuming GrowthRecord is exported from your store

export interface VelocityDataPoint {
  ageMonthsMidPoint: number;
  velocity: number;
  velocityUnit: string;
  originalRecord1Date: string; // For reference or detailed tooltips
  originalRecord2Date: string; // For reference or detailed tooltips
}

/**
 * Calculates the annualized velocity between two growth records.
 * @param record1 The earlier growth record.
 * @param record2 The later growth record.
 * @returns VelocityDataPoint object or null if calculation is not possible.
 */
export function calculateAnnualizedVelocity(
  record1: GrowthRecord,
  record2: GrowthRecord
): VelocityDataPoint | null {
  // 1. Validate inputs
  if (record1.measurementType !== record2.measurementType) {
    console.warn("Velocity calculation: Measurement types do not match.", record1, record2);
    return null;
  }
  if (record1.unit !== record2.unit) {
    // For now, assume units must match. Future enhancement: unit conversion.
    console.warn("Velocity calculation: Units do not match.", record1, record2);
    return null;
  }
  if (record2.ageMonths <= record1.ageMonths) {
    // console.warn("Velocity calculation: record2 must be later than record1 and ages must differ.", record1, record2);
    return null; // No time difference or record2 is earlier
  }

  // 2. Calculate age difference in years
  const deltaAgeYears = (record2.ageMonths - record1.ageMonths) / 12.0;
  if (deltaAgeYears === 0) { // Should be caught by ageMonths check, but as safeguard
    return null;
  }

  // 3. Calculate value difference
  const deltaValue = record2.value - record1.value;

  // 4. Calculate velocity
  const velocity = deltaValue / deltaAgeYears;

  // 5. Determine velocityUnit
  let velocityUnit = "";
  switch (record1.measurementType) {
    case 'Height':
    case 'Length':
    case 'HeadCircumference':
      velocityUnit = `${record1.unit}/year`; // e.g., "cm/year" or "in/year"
      break;
    case 'Weight':
      velocityUnit = `${record1.unit}/year`; // e.g., "kg/year" or "lbs/year"
      break;
    case 'BMI':
      // BMI velocity is typically not calculated/charted this simply.
      // It could be "BMI points/year".
      console.warn("Velocity calculation for BMI is generally not standard in this format.");
      return null; // Or handle as "points/year" if desired
    default:
      console.warn("Velocity calculation: Unknown measurement type.", record1.measurementType);
      return null;
  }

  // 6. Calculate ageMonthsMidPoint
  const ageMonthsMidPoint = (record1.ageMonths + record2.ageMonths) / 2.0;

  return {
    ageMonthsMidPoint,
    velocity: parseFloat(velocity.toFixed(2)), // Round velocity to 2 decimal places
    velocityUnit,
    originalRecord1Date: record1.date,
    originalRecord2Date: record2.date,
  };
}

/**
 * Generates a series of velocity data points from a sorted array of GrowthRecords.
 * @param records Array of GrowthRecord objects, sorted by ageMonths, for a single patient and measurementType.
 * @returns Array of VelocityDataPoint objects.
 */
export function generateVelocityDataSeries(
  records: GrowthRecord[]
): VelocityDataPoint[] {
  if (records.length < 2) {
    return [];
  }

  const velocitySeries: VelocityDataPoint[] = [];
  // Ensure records are sorted by ageMonths, as this is critical
  const sortedRecords = [...records].sort((a, b) => a.ageMonths - b.ageMonths);

  for (let i = 1; i < sortedRecords.length; i++) {
    const record1 = sortedRecords[i-1];
    const record2 = sortedRecords[i];

    // Optional: Add a minimum time gap for meaningful velocity, e.g., 1 month (0.083 years)
    // const minAgeDiffYears = 1 / 12;
    // if (((record2.ageMonths - record1.ageMonths) / 12.0) < minAgeDiffYears) {
    //   continue;
    // }

    const velocityPoint = calculateAnnualizedVelocity(record1, record2);
    if (velocityPoint) {
      velocitySeries.push(velocityPoint);
    }
  }
  return velocitySeries;
}
