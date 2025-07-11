import { calculateBMI, calculateAnnualizedVelocity, generateVelocityDataSeries, VelocityDataPoint } from '../calculations';
import { GrowthRecord } from '../../store/appStore'; // Import GrowthRecord type for mock

describe('BMI Calculator', () => {
  describe('calculateBMI', () => {
    it('should calculate BMI correctly with valid inputs', () => {
      // Example 1: Weight 10kg, Height 75cm (0.75m)
      // BMI = 10 / (0.75 * 0.75) = 10 / 0.5625 = 17.777... -> rounded to 17.8
      expect(calculateBMI(10, 75)).toBe(17.8);

      // Example 2: Weight 68kg, Height 165cm (1.65m)
      // BMI = 68 / (1.65 * 1.65) = 68 / 2.7225 = 24.977... -> rounded to 25.0
      expect(calculateBMI(68, 165)).toBe(25.0);
    });

    it('should handle zero weight correctly', () => {
      expect(calculateBMI(0, 100)).toBe(0.0);
    });

    it('should return NaN for invalid inputs', () => {
      expect(calculateBMI(10, 0)).toBeNaN(); // Zero height
      expect(calculateBMI(10, -5)).toBeNaN(); // Negative height
      expect(calculateBMI(-5, 100)).toBeNaN(); // Negative weight
    });

    it('should round BMI to one decimal place', () => {
      // 20kg / (1.123m * 1.123m) = 20 / 1.261129 = 15.858... -> 15.9
      expect(calculateBMI(20, 112.3)).toBe(15.9);
      // 20kg / (1.128m * 1.128m) = 20 / 1.272384 = 15.718... -> 15.7
      expect(calculateBMI(20, 112.8)).toBe(15.7);
    });
  });
});

// Mock GrowthRecord type for testing velocity functions
const mockGrowthRecord = (
    ageMonths: number,
    value: number,
    type: 'Weight' | 'Height' | 'Length' | 'HeadCircumference' | 'BMI' = 'Height',
    unit: 'kg' | 'lbs' | 'cm' | 'in' | 'kg/m²' = 'cm',
    dateSuffix: string = '01' // To make dates slightly different for testing
): GrowthRecord => ({
    id: `rec-${Math.random()}`,
    patientId: 'test-patient',
    date: `2023-${String(Math.floor(ageMonths / 12) * 1 + 1).padStart(2, '0')}-${dateSuffix}`, // Construct a plausible date
    ageMonths,
    measurementType: type,
    value,
    unit,
});


describe('Growth Velocity Calculator', () => {
  describe('calculateAnnualizedVelocity', () => {
    it('should calculate velocity correctly for height over a year', () => {
      const record1 = mockGrowthRecord(12, 75, 'Height', 'cm'); // 12 months, 75cm
      const record2 = mockGrowthRecord(24, 87, 'Height', 'cm'); // 24 months, 87cm (12cm gain in 1 year)
      const result = calculateAnnualizedVelocity(record1, record2);
      expect(result).not.toBeNull();
      expect(result?.velocity).toBeCloseTo(12.00); // 12 cm / 1 year
      expect(result?.velocityUnit).toBe('cm/year');
      expect(result?.ageMonthsMidPoint).toBe(18);
    });

    it('should calculate velocity correctly for weight over 6 months', () => {
      const record1 = mockGrowthRecord(6, 7.5, 'Weight', 'kg'); // 6 months, 7.5kg
      const record2 = mockGrowthRecord(12, 10.0, 'Weight', 'kg'); // 12 months, 10kg (2.5kg gain in 0.5 year)
      // Expected velocity: 2.5kg / 0.5year = 5kg/year
      const result = calculateAnnualizedVelocity(record1, record2);
      expect(result).not.toBeNull();
      expect(result?.velocity).toBeCloseTo(5.00);
      expect(result?.velocityUnit).toBe('kg/year');
      expect(result?.ageMonthsMidPoint).toBe(9);
    });

    it('should return null if measurement types do not match', () => {
      const record1 = mockGrowthRecord(12, 75, 'Height', 'cm');
      const record2 = mockGrowthRecord(24, 12, 'Weight', 'kg');
      expect(calculateAnnualizedVelocity(record1, record2)).toBeNull();
    });

    it('should return null if units do not match', () => {
      const record1 = mockGrowthRecord(12, 75, 'Height', 'cm');
      // @ts-expect-error testing different units
      const record2 = mockGrowthRecord(24, 30, 'Height', 'in');
      expect(calculateAnnualizedVelocity(record1, record2)).toBeNull();
    });

    it('should return null if record2 is not later than record1', () => {
      const record1 = mockGrowthRecord(12, 75, 'Height', 'cm');
      const record2 = mockGrowthRecord(12, 76, 'Height', 'cm'); // Same age
      const record3 = mockGrowthRecord(11, 74, 'Height', 'cm'); // Earlier age
      expect(calculateAnnualizedVelocity(record1, record2)).toBeNull();
      expect(calculateAnnualizedVelocity(record1, record3)).toBeNull();
    });

    it('should return null for BMI measurement type', () => {
      const record1 = mockGrowthRecord(24, 17.0, 'BMI', 'kg/m²');
      const record2 = mockGrowthRecord(36, 16.5, 'BMI', 'kg/m²');
      expect(calculateAnnualizedVelocity(record1, record2)).toBeNull();
    });

    it('should round velocity to two decimal places', () => {
      const record1 = mockGrowthRecord(12, 75.0, 'Height', 'cm');
      const record2 = mockGrowthRecord(15, 78.2, 'Height', 'cm'); // 3.2cm gain in 3 months (0.25 year)
      // Velocity = 3.2 / 0.25 = 12.8
      const result = calculateAnnualizedVelocity(record1, record2);
      expect(result?.velocity).toBe(12.80);

      const record3 = mockGrowthRecord(12, 10.0, 'Weight', 'kg');
      const record4 = mockGrowthRecord(13, 10.12345, 'Weight', 'kg'); // 0.12345kg gain in 1 month (1/12 year)
      // Velocity = 0.12345 / (1/12) = 0.12345 * 12 = 1.4814
      const result2 = calculateAnnualizedVelocity(record3, record4);
      expect(result2?.velocity).toBe(1.48);
    });
  });

  describe('generateVelocityDataSeries', () => {
    it('should return an empty array if less than 2 records', () => {
      expect(generateVelocityDataSeries([])).toEqual([]);
      const record1 = mockGrowthRecord(12, 75);
      expect(generateVelocityDataSeries([record1])).toEqual([]);
    });

    it('should generate a series of velocity points', () => {
      const records: GrowthRecord[] = [
        mockGrowthRecord(12, 75, 'Height', 'cm', '01'),
        mockGrowthRecord(15, 78, 'Height', 'cm', '02'), // 3 months later, 3cm gain -> 12cm/yr @ 13.5m
        mockGrowthRecord(18, 81, 'Height', 'cm', '03'), // 3 months later, 3cm gain -> 12cm/yr @ 16.5m
        mockGrowthRecord(24, 87, 'Height', 'cm', '04'), // 6 months later, 6cm gain -> 12cm/yr @ 21m
      ];
      const series = generateVelocityDataSeries(records);
      expect(series.length).toBe(3);
      expect(series[0].velocity).toBeCloseTo(12.00);
      expect(series[0].ageMonthsMidPoint).toBe(13.5);
      expect(series[1].velocity).toBeCloseTo(12.00);
      expect(series[1].ageMonthsMidPoint).toBe(16.5);
      expect(series[2].velocity).toBeCloseTo(12.00);
      expect(series[2].ageMonthsMidPoint).toBe(21);
    });

    it('should correctly sort records before processing', () => {
        const recordsUnsorted: GrowthRecord[] = [
            mockGrowthRecord(18, 81, 'Height', 'cm'),
            mockGrowthRecord(12, 75, 'Height', 'cm'),
            mockGrowthRecord(24, 87, 'Height', 'cm'),
        ];
        const series = generateVelocityDataSeries(recordsUnsorted);
        expect(series.length).toBe(2);
        // First velocity point should be between age 12 and 18 (mid 15)
        expect(series[0].ageMonthsMidPoint).toBe(15);
        expect(series[0].velocity).toBeCloseTo(12.00); // (81-75) / (0.5yr) = 6 / 0.5 = 12
        // Second velocity point should be between age 18 and 24 (mid 21)
        expect(series[1].ageMonthsMidPoint).toBe(21);
        expect(series[1].velocity).toBeCloseTo(12.00); // (87-81) / (0.5yr) = 6 / 0.5 = 12
    });

    it('should handle records with same age by skipping velocity calculation between them', () => {
      const records: GrowthRecord[] = [
        mockGrowthRecord(12, 75, 'Height', 'cm', '01'),
        mockGrowthRecord(12, 75.1, 'Height', 'cm', '02'), // Same age, different value
        mockGrowthRecord(15, 78, 'Height', 'cm', '03'),
      ];
      const series = generateVelocityDataSeries(records);
      expect(series.length).toBe(1); // Only one valid interval (12 to 15 months)
                                     // The two 12-month records are sorted, so one will be record1, one record2.
                                     // calculateAnnualizedVelocity returns null if ages are same.
      // Velocity between the distinct 12m record and 15m record.
      // It depends on which 12m record is chosen after sort (stable sort assumed based on input order if ages same)
      // (78 - 75.1) / ( (15-12)/12 ) = 2.9 / 0.25 = 11.6
      expect(series[0].velocity).toBeCloseTo(11.6);
      expect(series[0].ageMonthsMidPoint).toBe(13.5);
    });
  });
});
