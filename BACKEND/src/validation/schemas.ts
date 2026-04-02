import { z } from 'zod';

export const LotSchema = z.object({
  id: z.string(),
  createdDate: z.string(),
  qtyRemaining: z.number().positive(),
  costPerUnit: z.number().positive(),
  commission: z.number().min(0),
  totalCost: z.number().positive(),
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

export type Lot = z.infer<typeof LotSchema>;
export type StoredPortfolioItem = z.infer<typeof StoredPortfolioItemSchema>;
export type PortfolioItemInput = z.infer<typeof PortfolioItemInputSchema>;
export type Sell = z.infer<typeof SellSchema>;
export type Transfer = z.infer<typeof TransferSchema>;
