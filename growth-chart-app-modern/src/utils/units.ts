// src/utils/units.ts

// Conversion Factors
const KG_TO_LBS = 2.20462262185;
const LBS_TO_KG = 1 / KG_TO_LBS;
const CM_TO_INCHES = 1 / 2.54;
const INCHES_TO_CM = 2.54;

// --- Weight Conversions ---

/**
 * Converts a weight value from kilograms to pounds.
 *
 * Returns `NaN` if the input is not a valid number. The result is not rounded; display functions handle any necessary rounding.
 *
 * @returns The equivalent weight in pounds.
 */
export function kgToLbs(kg: number): number {
  if (isNaN(kg)) return NaN;
  // Return with more precision, display functions will handle final rounding
  return kg * KG_TO_LBS;
}

/**
 * Converts a weight value from pounds to kilograms.
 *
 * @param lbs - The weight in pounds
 * @returns The equivalent weight in kilograms, or NaN if the input is not a number
 */
export function lbsToKg(lbs: number): number {
  if (isNaN(lbs)) return NaN;
  // Return with more precision
  return lbs * LBS_TO_KG;
}

// --- Height/Length Conversions ---

/**
 * Converts a value in centimeters to inches.
 *
 * @param cm - The length or height in centimeters.
 * @returns The equivalent length or height in inches, or NaN if the input is not a number.
 */
export function cmToInches(cm: number): number {
  if (isNaN(cm)) return NaN;
  // Return with more precision
  return cm * CM_TO_INCHES;
}

/**
 * Converts a length from inches to centimeters.
 *
 * @param inches - The value in inches to convert
 * @returns The equivalent length in centimeters, or NaN if the input is not a number
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
 * Converts a weight value to the appropriate unit and format for the specified display system.
 *
 * If converting to Metric, pounds are converted to kilograms and rounded to 2 decimal places; kilograms are rounded to 2 decimal places.  
 * If converting to Imperial, kilograms are converted to pounds and rounded to 1 decimal place; pounds are rounded to 1 decimal place.
 *
 * @param value - The weight value to convert
 * @param originalUnit - The original unit of the weight ('kg' or 'lbs')
 * @param targetSystem - The target display system ('Metric' or 'Imperial')
 * @returns An object containing the converted value and its unit string
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
 * Converts a height or length value to the appropriate unit and format for the specified display system.
 *
 * If converting to Metric and the original unit is inches, the value is converted to centimeters; otherwise, centimeters are rounded to one decimal place.  
 * If converting to Imperial and the original unit is centimeters, the value is converted to inches; otherwise, inches are rounded to one decimal place.
 *
 * @param value - The height or length value to convert
 * @param originalUnit - The original unit of the value ('cm' or 'in')
 * @param targetSystem - The target display system ('Metric' or 'Imperial')
 * @returns An object containing the converted value and its unit string
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
 * Converts a measurement value to its metric equivalent (kg, cm, or kg/m²) for calculation purposes.
 *
 * Converts pounds to kilograms and inches to centimeters. Returns the original value if the unit is already metric or is BMI (kg/m²). If the unit is unsupported, logs a warning and returns the original value.
 *
 * @param value - The measurement value to convert
 * @param unit - The unit of the measurement ('kg', 'lbs', 'cm', 'in', or 'kg/m²')
 * @returns The value converted to metric units, or the original value if already metric or unsupported
 */
export function convertToMetricForCalc(value: number, unit: 'kg' | 'lbs' | 'cm' | 'in' | 'kg/m²'): number {
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
