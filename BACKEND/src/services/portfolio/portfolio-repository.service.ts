import fs from 'fs';
import { IStoredPortfolioItem } from '../../interfaces/portfolio.interface';
import configService from '../config.service';
import loggerService from '../logger.service';

export class PortfolioRepository {
  private portfolioPath = configService.dataPath + '/portfolio.json';

  loadPortfolio(): IStoredPortfolioItem[] {
    try {
      const portfolio = fs.readFileSync(this.portfolioPath, 'utf-8');
      const parsed = JSON.parse(portfolio) as IStoredPortfolioItem[];
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
      fs.writeFileSync(this.portfolioPath, JSON.stringify(portfolio, null, 2));
      loggerService.info('Portfolio saved to file');
    } catch (error) {
      loggerService.error('Error saving portfolio to file:', error as Error);
    }
  }

  watch(onChange: () => void): void {
    try {
      fs.watchFile(this.portfolioPath, { interval: 10000 }, (curr, prev) => {
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

const portfolioRepo = new PortfolioRepository();
export default portfolioRepo;
