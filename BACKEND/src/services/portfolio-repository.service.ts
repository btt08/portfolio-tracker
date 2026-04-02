import fs from 'fs';
import { IStoredPortfolioItem } from '../interfaces/portfolio.interface';
import configService from './config.service';
import loggerService from './logger.service';

export class PortfolioRepository {
  private dataPath = configService.dataPath;

  load(): IStoredPortfolioItem[] {
    try {
      const data = fs.readFileSync(this.dataPath, 'utf-8');
      const parsed = JSON.parse(data) as IStoredPortfolioItem[];
      return parsed.map(item => ({
        ...item,
        realizedPnl: item.realizedPnl ?? 0,
        transactions: item.transactions ?? [],
      }));
    } catch (error) {
      loggerService.error('Error loading portfolio from file:', error as Error);
      return [];
    }
  }

  save(portfolio: IStoredPortfolioItem[]): void {
    try {
      loggerService.info('Saving portfolio to file...');
      fs.writeFileSync(this.dataPath, JSON.stringify(portfolio, null, 2));
      loggerService.info('Portfolio saved to file');
    } catch (error) {
      loggerService.error('Error saving portfolio to file:', error as Error);
    }
  }

  watch(onChange: () => void): void {
    try {
      fs.watchFile(this.dataPath, { interval: 10000 }, (curr, prev) => {
        if (curr.mtimeMs !== prev.mtimeMs) {
          loggerService.info('Detected change in portfolio file, reloading from disk');
          onChange();
        }
      });
    } catch (err) {
      loggerService.error('Failed to set up file watcher for portfolio data', err as Error);
    }
  }
}
