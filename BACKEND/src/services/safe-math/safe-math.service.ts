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

  /** qty * price * exchangeRate */
  static valuate(qty: number, price: number, exchangeRate = 1, commisions = 0): number {
    return SafeMath.multiply(SafeMath.add(SafeMath.multiply(qty, price), commisions), exchangeRate);
  }

  /** qty * (currentPrice - costPerUnit) * exchangeRate */
  static unrealizedPnl(
    qty: number,
    currentPrice: number,
    costPerUnit: number,
    exchangeRate = 1,
    commisions = 0
  ): number {
    return SafeMath.valuate(
      qty,
      SafeMath.subtract(currentPrice, costPerUnit),
      exchangeRate,
      commisions
    );
  }

  static percChange(prevValue: number, currentValue: number): number {
    if (prevValue === 0) return 0;
    return (SafeMath.subtract(currentValue, prevValue) * 100) / prevValue;
  }
}
