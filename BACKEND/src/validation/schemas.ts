import { z } from 'zod';

export const LotSchema = z.object({
  id: z.string(),
  createdDate: z.string(),
  qtyRemaining: z.number().min(0),
  costPerUnit: z.number().positive(),
  commission: z.number().min(0),
  totalCost: z.number().min(0),
  currency: z.string().default('EUR'),
  exchangeRate: z.number().positive().default(1),
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
  qtyToSell: z.number().positive(),
  sellPrice: z.number().positive(),
  commission: z.number().min(0).default(0),
});

export const TransferSchema = z.object({
  targetIsin: z.string(),
  sourceQtySold: z.number().positive(),
  targetQtyReceived: z.number().positive(),
  commission: z.number().min(0).default(0),
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
