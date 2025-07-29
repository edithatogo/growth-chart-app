// src/utils/calculations.ts

/**
 * Computes the Body Mass Index (BMI) from weight in kilograms and height in centimeters.
 *
 * Returns the BMI rounded to one decimal place, or NaN if height is zero or negative, or if weight is negative.
 *
 * @param weightKg - Weight in kilograms
 * @param heightCm - Height in centimeters
 * @returns The BMI value rounded to one decimal place, or NaN for invalid inputs
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  if (heightCm <= 0 || weightKg < 0) {
    console.warn(`Invalid input for BMI calculation: Weight ${weightKg}kg, Height ${heightCm}cm`);
    return NaN;
  }
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return parseFloat(bmi.toFixed(1));
}

/**
 * Calculates the precise age in months between a date of birth and an observation date.
 *
 * @param dobString - Date of birth in 'YYYY-MM-DD' format
 * @param observationDateString - Observation date in 'YYYY-MM-DD' or ISO string format
 * @returns Age in months as a decimal rounded to two decimal places, or NaN if dates are invalid or the observation date is before the date of birth
 */
export function calculateAgeInMonths(dobString: string, observationDateString: string): number {
  const dob = new Date(dobString);
  const observationDate = new Date(observationDateString);

  // Set time to noon to avoid timezone issues affecting date comparisons
  dob.setHours(12, 0, 0, 0);
  observationDate.setHours(12, 0, 0, 0);

  if (isNaN(dob.getTime()) || isNaN(observationDate.getTime()) || observationDate.getTime() < dob.getTime()) {
    return NaN; // Invalid dates or observation before DOB
  }
  if (dob.getTime() === observationDate.getTime()) {
    return 0.00;
  }

  let yearDiff = observationDate.getFullYear() - dob.getFullYear();
  let monthDiff = observationDate.getMonth() - dob.getMonth();
  let dayDiff = observationDate.getDate() - dob.getDate();

  if (dayDiff < 0) {
    monthDiff--;
    // Get days in the month *before* the observationDate's current month to add to dayDiff
    const prevMonthLastDay = new Date(observationDate.getFullYear(), observationDate.getMonth(), 0).getDate();
    dayDiff += prevMonthLastDay;
  }

  if (monthDiff < 0) {
    monthDiff += 12;
    yearDiff--;
  }

  const totalWholeMonths = yearDiff * 12 + monthDiff;
  const dayFraction = dayDiff / 30.4375; // Using average days in month for fraction

  const totalMonths = totalWholeMonths + dayFraction;

  return parseFloat(totalMonths.toFixed(2));
}


// --- Growth Velocity Calculations ---

import { GrowthRecord } from '../store/appStore';

export interface VelocityDataPoint {
  ageMonthsMidPoint: number;
  velocity: number;
  velocityUnit: string;
  originalRecord1Date: string;
  originalRecord2Date: string;
}

/**
 * Calculates the annualized growth velocity between two compatible growth records.
 *
 * Returns a velocity data point containing the midpoint age in months, the annualized velocity value (rounded to two decimals), the velocity unit, and the original record dates. Returns `null` if the records have mismatched measurement types or units, if the second record is not chronologically after the first, or if the measurement type is BMI or unknown.
 *
 * @returns A `VelocityDataPoint` with velocity information, or `null` if calculation is not possible.
 */
export function calculateAnnualizedVelocity(
  record1: GrowthRecord,
  record2: GrowthRecord
): VelocityDataPoint | null {
  if (record1.measurementType !== record2.measurementType) {
    console.warn("Velocity calculation: Measurement types do not match.", record1, record2);
    return null;
  }
  if (record1.unit !== record2.unit) {
    console.warn("Velocity calculation: Units do not match.", record1, record2);
    return null;
  }
  if (record2.ageMonths <= record1.ageMonths) {
    return null;
  }

  const deltaAgeYears = (record2.ageMonths - record1.ageMonths) / 12.0;
  if (deltaAgeYears === 0) {
    return null;
  }

  const deltaValue = record2.value - record1.value;
  const velocity = deltaValue / deltaAgeYears;
  let velocityUnit = "";

  switch (record1.measurementType) {
    case 'Height': case 'Length': case 'HeadCircumference':
      velocityUnit = `${record1.unit}/year`;
      break;
    case 'Weight':
      velocityUnit = `${record1.unit}/year`;
      break;
    case 'BMI':
      console.warn("Velocity calculation for BMI is generally not standard in this format.");
      return null;
    default:
      console.warn("Velocity calculation: Unknown measurement type.", record1.measurementType);
      return null;
  }

  const ageMonthsMidPoint = (record1.ageMonths + record2.ageMonths) / 2.0;

  return {
    ageMonthsMidPoint,
    velocity: parseFloat(velocity.toFixed(2)),
    velocityUnit,
    originalRecord1Date: record1.date,
    originalRecord2Date: record2.date,
  };
}

/**
 * Generates a series of annualized growth velocity data points from an array of growth records.
 *
 * The records are sorted by age in months, and velocity is calculated between each consecutive pair using `calculateAnnualizedVelocity`. Only valid velocity points are included in the result.
 *
 * @param records - Array of growth records to process
 * @returns An array of velocity data points representing annualized growth velocities between consecutive records
 */
export function generateVelocityDataSeries(
  records: GrowthRecord[]
): VelocityDataPoint[] {
  if (records.length < 2) {
    return [];
  }
  const velocitySeries: VelocityDataPoint[] = [];
  const sortedRecords = [...records].sort((a, b) => a.ageMonths - b.ageMonths);

  for (let i = 1; i < sortedRecords.length; i++) {
    const record1 = sortedRecords[i-1];
    const record2 = sortedRecords[i];
    const velocityPoint = calculateAnnualizedVelocity(record1, record2);
    if (velocityPoint) {
      velocitySeries.push(velocityPoint);
    }
  }
  return velocitySeries;
}
