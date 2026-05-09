import { describe, expect, it } from 'vitest';
import { TransferSchema } from './schemas';

describe('TransferSchema', () => {
  it('accepts canonical operation fields', () => {
    const result = TransferSchema.safeParse({
      date: '2026-01-01',
      sourceQtySold: 10,
      sourcePPU: 10,
      sourceOpAmount: 100,
      targetIsin: 'TARGET',
      targetQtyReceived: 9.5,
      targetPPU: 10.52631579,
      targetOpAmount: 100,
    });

    expect(result.success).toBe(true);
  });

  it('rejects payload when canonical operation amounts are missing', () => {
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
      sourceOpAmount: 100,
      targetIsin: 'TARGET',
      targetQtyReceived: 9.5,
      targetPPU: 10.52631579,
      targetOpAmount: 100.02,
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid payload values', () => {
    const result = TransferSchema.safeParse({
      date: '2026-01-01',
      sourceQtySold: -1,
      sourcePPU: 10,
      sourceOpAmount: 100,
      targetIsin: 'TARGET',
      targetQtyReceived: 9.5,
      targetPPU: 10.52631579,
      targetOpAmount: 100,
    });

    expect(result.success).toBe(false);
  });
});
