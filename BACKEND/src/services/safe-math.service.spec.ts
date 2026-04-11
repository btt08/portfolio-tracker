import { describe, it, expect } from 'vitest';
import { SafeMath } from './safe-math.service';

describe('SafeMath', () => {
  describe('add', () => {
    it('adds two integers', () => {
      expect(SafeMath.add(1, 2)).toBe(3);
    });

    it('handles floating point correctly', () => {
      expect(SafeMath.add(0.1, 0.2)).toBe(0.3);
    });

    it('handles negative numbers', () => {
      expect(SafeMath.add(-5, 3)).toBe(-2);
    });
  });

  describe('subtract', () => {
    it('subtracts two numbers', () => {
      expect(SafeMath.subtract(5, 3)).toBe(2);
    });

    it('handles floating point correctly', () => {
      expect(SafeMath.subtract(0.3, 0.1)).toBe(0.2);
    });
  });

  describe('multiply', () => {
    it('multiplies two numbers', () => {
      expect(SafeMath.multiply(3, 4)).toBe(12);
    });

    it('handles floating point correctly', () => {
      expect(SafeMath.multiply(0.1, 0.2)).toBe(0.02);
    });
  });

  describe('divide', () => {
    it('divides two numbers', () => {
      expect(SafeMath.divide(10, 3, 2)).toBe(3.33);
    });

    it('returns 0 for division by zero', () => {
      expect(SafeMath.divide(10, 0)).toBe(0);
    });
  });

  describe('valuate', () => {
    it('calculates qty * price', () => {
      expect(SafeMath.valuate(10, 50)).toBe(500);
    });

    it('applies exchange rate', () => {
      expect(SafeMath.valuate(10, 50, 1.1)).toBe(550);
    });

    it('applies commission', () => {
      expect(SafeMath.valuate(10, 50, 1, 10)).toBe(510);
    });
  });

  describe('unrealizedPnl', () => {
    it('calculates positive PnL', () => {
      expect(SafeMath.unrealizedPnl(10, 60, 50)).toBe(100);
    });

    it('calculates negative PnL', () => {
      expect(SafeMath.unrealizedPnl(10, 40, 50)).toBe(-100);
    });

    it('applies exchange rate', () => {
      expect(SafeMath.unrealizedPnl(10, 60, 50, 2)).toBe(200);
    });
  });

  describe('percChange', () => {
    it('calculates positive change', () => {
      expect(SafeMath.percChange(100, 110)).toBe(10);
    });

    it('calculates negative change', () => {
      expect(SafeMath.percChange(100, 90)).toBe(-10);
    });

    it('returns 0 when previous value is 0', () => {
      expect(SafeMath.percChange(0, 100)).toBe(0);
    });
  });
});
