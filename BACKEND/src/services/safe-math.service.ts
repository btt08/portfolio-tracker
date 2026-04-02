export class SafeMath {
  static add(a: number, b: number): number {
    const numOfDecimalsA = (a.toString().split('.')[1] || '').length;
    const numOfDecimalsB = (b.toString().split('.')[1] || '').length;
    const factor = Math.pow(10, Math.max(numOfDecimalsA, numOfDecimalsB));
    return (Math.round(a * factor) + Math.round(b * factor)) / factor;
  }

  static subtract(a: number, b: number): number {
    const numOfDecimalsA = (a.toString().split('.')[1] || '').length;
    const numOfDecimalsB = (b.toString().split('.')[1] || '').length;
    const factor = Math.pow(10, Math.max(numOfDecimalsA, numOfDecimalsB));
    return (Math.round(a * factor) - Math.round(b * factor)) / factor;
  }

  static multiply(a: number, b: number): number {
    const numOfDecimalsA = (a.toString().split('.')[1] || '').length;
    const numOfDecimalsB = (b.toString().split('.')[1] || '').length;
    const factor = Math.pow(10, numOfDecimalsA + numOfDecimalsB);
    return Math.round(a * b * factor) / factor;
  }

  static divide(a: number, b: number, precision = 8): number {
    if (b === 0) return 0;
    const numOfDecimalsA = (a.toString().split('.')[1] || '').length;
    const numOfDecimalsB = (b.toString().split('.')[1] || '').length;
    const decimals = Math.max(numOfDecimalsA, numOfDecimalsB, precision);
    return Number((a / b).toFixed(decimals));
  }
}
