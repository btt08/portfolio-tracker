import { describe, expect, it } from 'vitest';
import { TransferSchema } from './schemas';

describe('TransferSchema', () => {
  it('accepts canonical operation fields', () => {
    const result = TransferSchema.safeParse({
      date: '2026-01-01',
      sourceQtySold: 10,
      sourcePPU: 10,
      sourceOperationAmount: 100,
      targetIsin: 'TARGET',
      targetQtyReceived: 9.5,
      targetPPU: 10.52631579,
      targetOperationAmount: 100,
    });

    expect(result.success).toBe(true);
  });

  it('accepts legacy amount fields for backward compatibility', () => {
    const result = TransferSchema.safeParse({
      date: '2026-01-01',
      sourceQtySold: 10,
      sourcePPU: 10,
      sourceAmountSold: 100,
      targetIsin: 'TARGET',
      targetQtyReceived: 9.5,
      targetPPU: 10.52631579,
      targetAmountReceived: 100,
    });

    expect(result.success).toBe(true);
  });

  it('rejects payload when operation amounts are missing in both formats', () => {
    const result = TransferSchema.safeParse({
      date: '2026-01-01',
      sourceQtySold: 10,
      sourcePPU: 10,
      targetIsin: 'TARGET',
      targetQtyReceived: 9.5,
      targetPPU: 10.52631579,
    });

    expect(result.success).toBe(false);
  });

  it('rejects payload when operation amount difference exceeds tolerance', () => {
    const result = TransferSchema.safeParse({
      date: '2026-01-01',
      sourceQtySold: 10,
      sourcePPU: 10,
      sourceOperationAmount: 100,
      targetIsin: 'TARGET',
      targetQtyReceived: 9.5,
      targetPPU: 10.52631579,
      targetOperationAmount: 100.02,
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid payload values', () => {
    const result = TransferSchema.safeParse({
      date: '2026-01-01',
      sourceQtySold: -1,
      sourcePPU: 10,
      sourceOperationAmount: 100,
      targetIsin: 'TARGET',
      targetQtyReceived: 9.5,
      targetPPU: 10.52631579,
      targetOperationAmount: 100,
    });

    expect(result.success).toBe(false);
  });
});
