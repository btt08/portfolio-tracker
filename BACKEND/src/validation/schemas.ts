import { z } from 'zod';

const OPERATION_AMOUNT_TOLERANCE = 0.01;

export const LotSchema = z.object({
  id: z.string(),
  createdDate: z.string(),
  qtyRemaining: z.number().min(0),
  costPerUnit: z.number().positive(),
  commission: z.number().min(0),
  totalCost: z.number().min(0),
  currency: z.string().default('EUR'),
  exchangeRate: z.number().positive().default(1),
  transferDate: z.string().optional(),
  sourceIsin: z.string().optional(),
  sourceLotId: z.string().optional(),
  operationPPU: z.number().positive().optional(),
  operationAmount: z.number().positive().optional(),
  isTransfer: z.boolean().optional(),
});

export const StoredPortfolioItemSchema = z.object({
  isin: z.string(),
  name: z.string(),
  type: z.string(),
  link: z.string(),
  prevPrice: z.number().optional(),
  currPrice: z.number().optional(),
  lots: z.array(LotSchema),
  priceUnit: z.number().positive().default(1),
});

export const PortfolioItemInputSchema = z.object({
  isin: z.string(),
  name: z.string(),
  type: z.string(),
  link: z.string(),
  lots: z.array(LotSchema).optional(),
});

export const SellSchema = z.object({
  date: z.string(),
  qtyToSell: z.number().positive(),
  sellPrice: z.number().positive(),
  commission: z.number().min(0).default(0),
});

export const TransferSchema = z
  .object({
    date: z.string(),
    sourceQtySold: z.number().positive(),
    sourcePPU: z.number().positive(),
    sourceOperationAmount: z.number().positive().optional(),
    sourceAmountSold: z.number().positive().optional(),
    targetIsin: z.string(),
    targetQtyReceived: z.number().positive(),
    targetPPU: z.number().positive(),
    targetOperationAmount: z.number().positive().optional(),
    targetAmountReceived: z.number().positive().optional(),
  })
  .superRefine((data, ctx) => {
    const sourceOperationAmount = data.sourceOperationAmount ?? data.sourceAmountSold;
    const targetOperationAmount = data.targetOperationAmount ?? data.targetAmountReceived;

    if (sourceOperationAmount === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['sourceOperationAmount'],
        message: 'sourceOperationAmount (or sourceAmountSold) is required',
      });
    }

    if (targetOperationAmount === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['targetOperationAmount'],
        message: 'targetOperationAmount (or targetAmountReceived) is required',
      });
    }

    if (sourceOperationAmount !== undefined && targetOperationAmount !== undefined) {
      const diff = Math.abs(sourceOperationAmount - targetOperationAmount);
      if (diff > OPERATION_AMOUNT_TOLERANCE) {
        ctx.addIssue({
          code: 'custom',
          path: ['targetOperationAmount'],
          message: `Operation amounts differ by ${diff.toFixed(4)}, max tolerance is ${OPERATION_AMOUNT_TOLERANCE}`,
        });
      }
    }
  });

const LotConsumedSchema = z.object({
  lotId: z.string(),
  qty: z.number(),
  costPerUnit: z.number(),
});

const TransactionSchema = z.object({
  id: z.string(),
  date: z.string(),
  type: z.enum(['buy', 'sell', 'transfer_out', 'transfer_in']),
  qty: z.number(),
  pricePerUnit: z.number(),
  costBasis: z.number(),
  proceeds: z.number(),
  commission: z.number(),
  realizedPnl: z.number(),
  counterpartyIsin: z.string().optional(),
  lotsConsumed: z.array(LotConsumedSchema),
  operationAmount: z.number().optional(),
  operationPPU: z.number().optional(),
  transferBreakdown: z
    .array(
      z.object({
        sourceLotId: z.string(),
        sourceCreatedDate: z.string(),
        sourceCostPerUnit: z.number(),
        consumedQty: z.number(),
        consumedFiscalCost: z.number(),
        targetQty: z.number(),
        targetCostPerUnit: z.number(),
        operationAmount: z.number().optional(),
      })
    )
    .optional(),
});

export const ImportPortfolioSchema = z.array(
  z.object({
    isin: z.string(),
    name: z.string(),
    type: z.string(),
    link: z.string(),
    prevPrice: z.number().default(0),
    currPrice: z.number().default(0),
    lots: z.array(LotSchema),
    priceUnit: z.number().positive().default(1),
    realizedPnl: z.number().default(0),
    transactions: z.array(TransactionSchema).default([]),
  })
);

export type Lot = z.infer<typeof LotSchema>;
export type StoredPortfolioItem = z.infer<typeof StoredPortfolioItemSchema>;
export type PortfolioItemInput = z.infer<typeof PortfolioItemInputSchema>;
export type Sell = z.infer<typeof SellSchema>;
export type Transfer = z.infer<typeof TransferSchema>;
