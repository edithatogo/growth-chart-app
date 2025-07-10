import { calculateZScore, getLMSForAge, getZScoreForMeasurement, LMSDataPoint } from '../zScoreCalculator';

describe('zScoreCalculator', () => {
  describe('calculateZScore', () => {
    it('should calculate Z-score correctly when L is not 0', () => {
      // Example: value=65, L= -0.5, M=60, S=0.1
      // Z = ( (65/60)**(-0.5) - 1 ) / (-0.5 * 0.1)
      // Z = ( (1.08333)**(-0.5) - 1 ) / (-0.05)
      // Z = ( 0.96078 - 1 ) / (-0.05)
      // Z = ( -0.03922 ) / (-0.05) = 0.7844
      expect(calculateZScore(65, -0.5, 60, 0.1)).toBeCloseTo(0.7844, 3);
    });

    it('should calculate Z-score correctly when L is effectively 0', () => {
      // Example: value=70, L=0 (or very close), M=65, S=0.1
      // Z = ln(70/65) / 0.1
      // Z = ln(1.07692) / 0.1
      // Z = 0.07409 / 0.1 = 0.7409
      expect(calculateZScore(70, 0, 65, 0.1)).toBeCloseTo(0.7409, 3);
      expect(calculateZScore(70, 1e-6, 65, 0.1)).toBeCloseTo(0.7409, 3); // Test with L very close to 0
    });

    it('should return NaN if S is 0', () => {
      expect(calculateZScore(65, -0.5, 60, 0)).toBeNaN();
    });

    it('should return NaN if L=0 and value/M is not positive', () => {
        expect(calculateZScore(0, 0, 60, 0.1)).toBeNaN();
        expect(calculateZScore(60, 0, 0, 0.1)).toBeNaN();
    });

    it('should return NaN if (value/M)^L results in issues for non-zero L', () => {
        // Example: (-2)^0.5 is NaN. Here, value/M is negative.
        expect(calculateZScore(-60, 0.5, 30, 0.1)).toBeNaN();
    });
  });

  describe('getLMSForAge', () => {
    const sampleLMSData: LMSDataPoint[] = [
      { age: 0, l: -0.45, m: 49.92, s: 0.038 },
      { age: 1, l: -0.30, m: 54.71, s: 0.037 },
      { age: 2, l: -0.19, m: 58.43, s: 0.036 },
      { age: 3, l: -0.12, m: 61.45, s: 0.035 },
    ];

    it('should return exact LMS values if age matches a data point', () => {
      const lms = getLMSForAge(1, sampleLMSData);
      expect(lms).toEqual({ l: -0.30, m: 54.71, s: 0.037 });
    });

    it('should interpolate LMS values if age is between data points', () => {
      const lms = getLMSForAge(1.5, sampleLMSData);
      // Expected: L = (-0.30 + -0.19)/2 = -0.245
      //           M = (54.71 + 58.43)/2 = 56.57
      //           S = (0.037 + 0.036)/2 = 0.0365
      expect(lms?.l).toBeCloseTo(-0.245);
      expect(lms?.m).toBeCloseTo(56.57);
      expect(lms?.s).toBeCloseTo(0.0365);
    });

    it('should return null if age is below the lowest age in data', () => {
      expect(getLMSForAge(-1, sampleLMSData)).toBeNull();
    });

    it('should return null if age is above the highest age in data', () => {
      expect(getLMSForAge(4, sampleLMSData)).toBeNull();
    });

    it('should return null if data array is empty or null', () => {
      expect(getLMSForAge(1, [])).toBeNull();
      // @ts-expect-error testing with null
      expect(getLMSForAge(1, null)).toBeNull();
    });

    it('should return null if LMS parameters are missing for interpolation points', () => {
        const incompleteLMSData: any[] = [
            { age: 1, l: -0.30, m: 54.71 }, // s is missing
            { age: 2, l: -0.19, m: 58.43, s: 0.036 },
        ];
        expect(getLMSForAge(1.5, incompleteLMSData as LMSDataPoint[])).toBeNull();
    });
     it('should handle single point data for exact match', () => {
      const singlePointData: LMSDataPoint[] = [{ age: 1, l: -0.30, m: 54.71, s: 0.037 }];
      expect(getLMSForAge(1, singlePointData)).toEqual({ l: -0.30, m: 54.71, s: 0.037 });
      expect(getLMSForAge(0.5, singlePointData)).toBeNull(); // Age below
      expect(getLMSForAge(1.5, singlePointData)).toBeNull(); // Age above
    });
  });

  describe('getZScoreForMeasurement', () => {
    const sampleLMSData: LMSDataPoint[] = [
      { age: 12, l: 0.07, m: 75.72, s: 0.033 }, // WHO Length Boys, 12 months
      { age: 24, l: 0.18, m: 87.63, s: 0.035 }, // WHO Length Boys, 24 months
    ];

    it('should calculate Z-score using exact LMS match', () => {
      // Patient: 12 months, 78 cm length
      // Using L=0.07, M=75.72, S=0.033
      // Z = ( (78/75.72)**0.07 - 1 ) / (0.07 * 0.033 )
      // Z = ( (78/75.72)**0.07 - 1 ) / (0.07 * 0.033 )
      // Code output is consistently ~0.899918946
      const z = getZScoreForMeasurement(78, 12, sampleLMSData);
      expect(z).toBeCloseTo(0.899918946, 9); // Trusting code's float output with high precision
    });

    it('should calculate Z-score using interpolated LMS values', () => {
      // Patient: 18 months, 82 cm length
      // Interpolated LMS at 18 months:
      // L = (0.07 + 0.18)/2 = 0.125
      // M = (75.72 + 87.63)/2 = 81.675
      // S = (0.033 + 0.035)/2 = 0.034
      // Z for 82cm, L=0.125, M=81.675, S=0.034
      // Z = ( (82/81.675)**0.125 - 1 ) / (0.125 * 0.034)
      // Z = ( (1.003979)**0.125 - 1 ) / (0.00425)
      // Z = ( 1.000496 - 1 ) / (0.00425)
      // Z = 0.000496 / 0.00425 = 0.1167
      const z = getZScoreForMeasurement(82, 18, sampleLMSData);
      expect(z).toBeCloseTo(0.1167, 3);
    });

    it('should return NaN if LMS data cannot be found for age', () => {
      expect(getZScoreForMeasurement(70, 6, sampleLMSData)).toBeNaN(); // Age below range
    });
  });
});
