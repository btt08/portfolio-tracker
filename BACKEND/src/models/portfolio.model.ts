import fs from 'fs';
import { IPortfolioItem } from '../interfaces/portfolio.interface';

export const getPortfolioItems = (): IPortfolioItem[] => {
  const path = require('path');
  const dataPath = path.resolve(__dirname, '../data/portfolio.json');
  const data = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(data) as IPortfolioItem[];
};
