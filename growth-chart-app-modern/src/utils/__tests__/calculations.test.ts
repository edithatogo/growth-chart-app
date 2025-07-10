import { calculateBMI } from '../calculations';

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
