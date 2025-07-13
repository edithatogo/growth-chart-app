// src/utils/units.ts

// Conversion Factors
const KG_TO_LBS = 2.20462262185;
const LBS_TO_KG = 1 / KG_TO_LBS;
const CM_TO_INCHES = 1 / 2.54;
const INCHES_TO_CM = 2.54;

// --- Weight Conversions ---

/**
 * Converts kilograms to pounds.
 * @param kg Weight in kilograms.
 * @returns Weight in pounds, rounded to a suitable number of decimal places (e.g., 1 or 2).
 */
export function kgToLbs(kg: number): number {
  if (isNaN(kg)) return NaN;
  // Return with more precision, display functions will handle final rounding
  return kg * KG_TO_LBS;
}

/**
 * Converts pounds to kilograms.
 * @param lbs Weight in pounds.
 * @returns Weight in kilograms, with more precision.
 */
export function lbsToKg(lbs: number): number {
  if (isNaN(lbs)) return NaN;
  // Return with more precision
  return lbs * LBS_TO_KG;
}

// --- Height/Length Conversions ---

/**
 * Converts centimeters to inches.
 * @param cm Height/length in centimeters.
 * @returns Height/length in inches, with more precision.
 */
export function cmToInches(cm: number): number {
  if (isNaN(cm)) return NaN;
  // Return with more precision
  return cm * CM_TO_INCHES;
}

/**
 * Converts inches to centimeters.
 * @param inches Height/length in inches.
 * @returns Height/length in centimeters, with more precision.
 */
export function inchesToCm(inches: number): number {
  if (isNaN(inches)) return NaN;
  // Return with more precision
  return inches * INCHES_TO_CM;
}

// --- General Converters for Growth Records ---
// These could be more complex if handling many unit types or more sophisticated rounding.

export type WeightUnit = 'kg' | 'lbs';
export type HeightUnit = 'cm' | 'in';
export type DisplayUnits = 'Metric' | 'Imperial';

/**
 * Converts a weight value to the target display system if necessary.
 * @param value The weight value.
 * @param originalUnit The original unit of the weight ('kg' or 'lbs').
 * @param targetSystem The target display system ('Metric' or 'Imperial').
 * @returns Object with converted value and its unit string.
 */
export function convertWeightForDisplay(
    value: number,
    originalUnit: WeightUnit,
    targetSystem: DisplayUnits
): { value: number; unit: string } {
    if (targetSystem === 'Metric') {
        if (originalUnit === 'lbs') return { value: lbsToKg(value), unit: 'kg' };
        // If already kg, ensure it's rounded as per typical metric display (e.g. 2 decimal places for kg)
        return { value: parseFloat(value.toFixed(2)), unit: 'kg' };
    } else { // Imperial
        const lbsValue = (originalUnit === 'kg') ? kgToLbs(value) : value;
        // Standardize lbs display to 1 decimal place
        return { value: parseFloat(lbsValue.toFixed(1)), unit: 'lbs' };
    }
}

/**
 * Converts a height/length value to the target display system if necessary.
 * @param value The height/length value.
 * @param originalUnit The original unit of the height/length ('cm' or 'in').
 * @param targetSystem The target display system ('Metric' or 'Imperial').
 * @returns Object with converted value and its unit string.
 */
export function convertHeightForDisplay(
    value: number,
    originalUnit: HeightUnit,
    targetSystem: DisplayUnits
): { value: number; unit: string } {
    if (targetSystem === 'Metric') {
        if (originalUnit === 'in') return { value: inchesToCm(value), unit: 'cm' };
        return { value: parseFloat(value.toFixed(1)), unit: 'cm' }; // Standardize cm display
    } else { // Imperial
        if (originalUnit === 'cm') return { value: cmToInches(value), unit: 'in' };
        return { value: parseFloat(value.toFixed(1)), unit: 'in' }; // Standardize inches display
    }
}

/**
 * Converts a stored growth value to metric units (kg or cm) for calculations.
 * @param value The measurement value.
 * @param unit The unit of the measurement ('kg', 'lbs', 'cm', 'in').
 * @returns The value in metric units (kg or cm), or original value if already metric or unknown unit.
 */
export function convertToMetricForCalc(value: number, unit: GrowthRecord['unit']): number {
    switch (unit) {
        case 'lbs':
            return lbsToKg(value); // Raw value for calculation, not display rounded
        case 'in':
            return inchesToCm(value); // Raw value for calculation
        case 'kg':
        case 'cm':
        case 'kg/m²': // BMI is already metric calculation based
            return value;
        default:
            // Should not happen with defined types, but as a fallback
            console.warn(`Unsupported unit for metric conversion: ${unit}`);
            return value;
    }
}
