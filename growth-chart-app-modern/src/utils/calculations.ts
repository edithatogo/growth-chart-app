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
