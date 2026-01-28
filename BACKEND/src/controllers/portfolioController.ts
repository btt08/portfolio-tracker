import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { getPortfolioItems } from '../models/portfolio.model';
import { IPortfolioItem } from '../interfaces/portfolio.interface';

export const addPortfolioItem = (req: Request, res: Response): void => {
  try {
    const newItem: IPortfolioItem = req.body;
    const filePath = path.join(__dirname, '../data/portfolio.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    const items: IPortfolioItem[] = JSON.parse(data);
    items.push(newItem);
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
    res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getPortfolio = (req: Request, res: Response): void => {
  try {
    const items = getPortfolioItems();
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const addRecordToItem = (req: Request, res: Response): void => {
  try {
    const { isin } = req.params;
    const newRecord = req.body;
    const filePath = path.join(__dirname, '../data/portfolio.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    const items: IPortfolioItem[] = JSON.parse(data);
    const item = items.find((item) => item.isin === isin);
    if (!item) {
      res.status(404).json({ success: false, message: 'Item not found' });
      return;
    }
    item.records.push(newRecord);
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const refreshPortfolioPrices = (req: Request, res: Response): void => {
  try {
    const scriptPath = path.join(__dirname, '../scripts/priceFetcher.ts');
    exec(`ts-node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing script: ${error.message}`);
        res
          .status(500)
          .json({ success: false, message: 'Error refreshing prices' });
        return;
      }
      if (stderr) {
        console.error(`Script stderr: ${stderr}`);
      }
      console.log(`Script output: ${stdout}`);
      res
        .status(200)
        .json({ success: true, message: 'Prices refreshed successfully' });
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
