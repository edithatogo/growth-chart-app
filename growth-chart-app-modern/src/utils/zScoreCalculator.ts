// src/utils/zScoreCalculator.ts

export interface LMSDataPoint {
  age: number; // Typically in months
  l: number;
  m: number;
  s: number;
  [key: string]: number; // Allow for other percentile/z-score data if present
}

/**
 * Performs linear interpolation between two points.
 * @param x The point at which to interpolate.
 * @param x0 Lower bound x-value.
 * @param y0 Lower bound y-value.
 * @param x1 Upper bound x-value.
 * @param y1 Upper bound y-value.
 * @returns The interpolated y-value.
 */
function linearInterpolate(x: number, x0: number, y0: number, x1: number, y1: number): number {
  if (x0 === x1) {
    return y0; // Avoid division by zero, return one of the points
  }
  return y0 + (x - x0) * (y1 - y0) / (x1 - x0);
}

/**
 * Finds or interpolates LMS values for a given age from a sorted array of LMSDataPoints.
 * @param age The age for which to find/interpolate LMS values.
 * @param lmsDataSorted Array of LMSDataPoint objects, sorted by age.
 * @returns An object { l, m, s } or null if age is out of bounds or data is insufficient.
 */
export function getLMSForAge(age: number, lmsDataSorted: LMSDataPoint[]): { l: number; m: number; s: number } | null {
  if (!lmsDataSorted || lmsDataSorted.length === 0) {
    return null;
  }

  // Find exact match or bounding points for interpolation
  let lowerBound: LMSDataPoint | null = null;
  let upperBound: LMSDataPoint | null = null;

  for (const point of lmsDataSorted) {
    if (point.age === age) {
      return { l: point.l, m: point.m, s: point.s }; // Exact match
    }
    if (point.age < age) {
      if (!lowerBound || point.age > lowerBound.age) {
        lowerBound = point;
      }
    }
    if (point.age > age) {
      if (!upperBound || point.age < upperBound.age) {
        upperBound = point;
      }
    }
  }

  // Interpolate if both bounds are found
  if (lowerBound && upperBound) {
    // Ensure l, m, s are present on both bounds
    if (lowerBound.l === undefined || lowerBound.m === undefined || lowerBound.s === undefined ||
        upperBound.l === undefined || upperBound.m === undefined || upperBound.s === undefined) {
        console.warn("LMS parameters missing for interpolation at age:", age, lowerBound, upperBound);
        return null; // Cannot interpolate if LMS values are missing
    }

    const l = linearInterpolate(age, lowerBound.age, lowerBound.l, upperBound.age, upperBound.l);
    const m = linearInterpolate(age, lowerBound.age, lowerBound.m, upperBound.age, upperBound.m);
    const s = linearInterpolate(age, lowerBound.age, lowerBound.s, upperBound.age, upperBound.s);
    return { l, m, s };
  }

  // Handle cases where age is outside the range of the provided data (extrapolation not typically done)
  // Or if only one bound is found (e.g. age is less than first data point or more than last)
  // For simplicity, if exact match or interpolation isn't possible, return null.
  // More sophisticated handling might use the closest point if appropriate for the standard.
  if (lmsDataSorted.length === 1 && lmsDataSorted[0].age === age) { // Single point, exact match
      return { l: lmsDataSorted[0].l, m: lmsDataSorted[0].m, s: lmsDataSorted[0].s };
  }

  // If age is less than the smallest age in data, or greater than the largest,
  // some standards might use the LMS of the closest boundary. For now, strict interpolation/match.
  // console.warn(`Age ${age} is outside the range of provided LMS data or cannot be interpolated.`);
  return null;
}


/**
 * Calculates the Z-score for a given measurement value using L, M, S parameters.
 * @param value The patient's measurement (e.g., height, weight).
 * @param l L parameter (Box-Cox power).
 * @param m M parameter (Median).
 * @param s S parameter (Coefficient of Variation).
 * @returns The calculated Z-score, or NaN if parameters are invalid.
 */
export function calculateZScore(value: number, l: number, m: number, s: number): number {
  if (s === 0) { // S should not be zero, indicates an issue with data or applicability
    console.warn("S value is zero, Z-score calculation is not possible.");
    return NaN;
  }
  if (m <= 0) { // Median should be positive for most growth measurements
      console.warn("M value is zero or negative, Z-score calculation might be invalid.");
      // Depending on the context, this might be an error or a specific case
  }
   if (value <= 0 && l !== 0 && (value / m)**l <=0 ) { // Avoid issues with non-positive base for fractional L
      console.warn("Invalid value for Z-score calculation (value/M)^L would be non-positive.");
      return NaN;
   }


  let z: number;
  if (Math.abs(l) < 1e-5) { // Treat L as effectively zero if it's very small
    if (value <= 0 || m <= 0) { // log requires positive values
        console.warn("Cannot calculate Z-score with L=0 for non-positive value or M.");
        return NaN;
    }
    z = Math.log(value / m) / s;
  } else {
    z = (Math.pow(value / m, l) - 1) / (l * s);
  }
  return z;
}

/**
 * Convenience function to get LMS values and calculate Z-score.
 * @param value Patient's measurement value.
 * @param age Patient's age (e.g., in months).
 * @param lmsDataSorted Array of LMSDataPoint objects, sorted by age, for the specific sex and measurement type.
 * @returns The calculated Z-score, or NaN if LMS not found or calculation fails.
 */
export function getZScoreForMeasurement(value: number, age: number, lmsDataSorted: LMSDataPoint[]): number {
    const lms = getLMSForAge(age, lmsDataSorted);
    if (!lms) {
        // console.warn(`LMS parameters not found for age ${age}. Cannot calculate Z-score.`);
        return NaN;
    }
    return calculateZScore(value, lms.l, lms.m, lms.s);
}
