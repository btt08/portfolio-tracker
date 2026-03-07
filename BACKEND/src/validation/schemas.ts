import { z } from 'zod';

export const LotSchema = z.object({
  id: z.string(),
  createdDate: z.string(),
  qtyRemaining: z.number().positive(),
  costPerUnit: z.number().positive(),
  totalCost: z.number().positive(),
});

export const StoredPortfolioItemSchema = z.object({
  isin: z.string(),
  name: z.string(),
  type: z.string(),
  link: z.string(),
  prevPrice: z.number().optional(),
  currPrice: z.number().optional(),
  lots: z.array(LotSchema),
});

export const PortfolioItemInputSchema = z.object({
  isin: z.string(),
  name: z.string(),
  type: z.string(),
  link: z.string(),
});

export type Lot = z.infer<typeof LotSchema>;
export type StoredPortfolioItem = z.infer<typeof StoredPortfolioItemSchema>;
export type PortfolioItemInput = z.infer<typeof PortfolioItemInputSchema>;
