import {
  kgToLbs,
  lbsToKg,
  cmToInches,
  inchesToCm,
  convertWeightForDisplay,
  convertHeightForDisplay,
  convertToMetricForCalc,
  WeightUnit,
  HeightUnit,
  DisplayUnits
} from '../units';
import { GrowthRecord } from '../../store/appStore'; // For GrowthRecord['unit'] type

describe('Unit Conversion Utilities', () => {
  describe('Core Converters', () => {
    it('kgToLbs correctly converts and rounds', () => {
      expect(kgToLbs(1)).toBeCloseTo(2.20, 2); // 2.2046...
      expect(kgToLbs(10)).toBeCloseTo(22.05, 2);
      expect(kgToLbs(0)).toBe(0);
      expect(kgToLbs(NaN)).toBeNaN();
    });

    it('lbsToKg correctly converts and rounds', () => {
      expect(lbsToKg(2.20462)).toBeCloseTo(1.000, 3);
      expect(lbsToKg(22.0462)).toBeCloseTo(10.000, 3);
      expect(lbsToKg(0)).toBe(0);
      expect(lbsToKg(NaN)).toBeNaN();
    });

    it('cmToInches correctly converts and rounds', () => {
      expect(cmToInches(2.54)).toBeCloseTo(1.0, 1);
      expect(cmToInches(100)).toBeCloseTo(39.4, 1); // 39.3701...
      expect(cmToInches(0)).toBe(0);
      expect(cmToInches(NaN)).toBeNaN();
    });

    it('inchesToCm correctly converts and rounds', () => {
      expect(inchesToCm(1)).toBeCloseTo(2.5, 1); // 2.54
      expect(inchesToCm(10)).toBeCloseTo(25.4, 1);
      expect(inchesToCm(0)).toBe(0);
      expect(inchesToCm(NaN)).toBeNaN();
    });
  });

  describe('convertWeightForDisplay', () => {
    it('converts kg to lbs for Imperial display', () => {
      const result = convertWeightForDisplay(10, 'kg', 'Imperial');
      expect(result.value).toBeCloseTo(22.0, 1); // kgToLbs rounds to 2dp, this matches current toFixed(1) in convertWeightForDisplay
      expect(result.unit).toBe('lbs');
    });
    it('keeps kg as kg for Metric display and standardizes rounding', () => {
      const result = convertWeightForDisplay(10.123, 'kg', 'Metric');
      expect(result.value).toBe(10.12);
      expect(result.unit).toBe('kg');
    });
    it('converts lbs to kg for Metric display', () => {
      const result = convertWeightForDisplay(22.0462, 'lbs', 'Metric');
      expect(result.value).toBeCloseTo(10.000, 3);
      expect(result.unit).toBe('kg');
    });
    it('keeps lbs as lbs for Imperial display and standardizes rounding', () => {
      const result = convertWeightForDisplay(22.046, 'lbs', 'Imperial');
      expect(result.value).toBe(22.0);
      expect(result.unit).toBe('lbs');
    });
  });

  describe('convertHeightForDisplay', () => {
    it('converts cm to inches for Imperial display', () => {
      const result = convertHeightForDisplay(100, 'cm', 'Imperial');
      expect(result.value).toBeCloseTo(39.4, 1);
      expect(result.unit).toBe('in');
    });
    it('keeps cm as cm for Metric display and standardizes rounding', () => {
      const result = convertHeightForDisplay(100.123, 'cm', 'Metric');
      expect(result.value).toBe(100.1);
      expect(result.unit).toBe('cm');
    });
    it('converts inches to cm for Metric display', () => {
      const result = convertHeightForDisplay(39.3701, 'in', 'Metric');
      expect(result.value).toBeCloseTo(100.0, 1);
      expect(result.unit).toBe('cm');
    });
    it('keeps inches as inches for Imperial display and standardizes rounding', () => {
      const result = convertHeightForDisplay(39.37, 'in', 'Imperial');
      expect(result.value).toBe(39.4);
      expect(result.unit).toBe('in');
    });
  });

  describe('convertToMetricForCalc', () => {
    it('converts lbs to kg (unrounded)', () => {
      const lbs = 22.0462262185;
      const expectedKg = 10;
      // lbsToKg rounds to 3, so we test against that internal rounding for this specific path
      expect(convertToMetricForCalc(lbs, 'lbs')).toBeCloseTo(expectedKg, 3);
    });
    it('converts inches to cm (unrounded)', () => {
      const inches = 39.3700787402;
      const expectedCm = 100;
      // inchesToCm rounds to 1, test against that for this path
      expect(convertToMetricForCalc(inches, 'in')).toBeCloseTo(expectedCm,1);
    });
    it('returns kg as is', () => {
      expect(convertToMetricForCalc(10, 'kg')).toBe(10);
    });
    it('returns cm as is', () => {
      expect(convertToMetricForCalc(100, 'cm')).toBe(100);
    });
    it('returns BMI unit value as is', () => {
      expect(convertToMetricForCalc(22.5, 'kg/m²')).toBe(22.5);
    });
     it('handles unknown unit by returning value and warning (manual check for warning)', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      // @ts-expect-error Testing invalid unit
      expect(convertToMetricForCalc(50, 'stone')).toBe(50);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Unsupported unit for metric conversion: stone');
      consoleWarnSpy.mockRestore();
    });
  });
});
