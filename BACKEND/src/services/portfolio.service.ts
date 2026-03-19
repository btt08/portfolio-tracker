import fs from 'fs';
import path from 'path';
import { IPortfolio, IStoredPortfolioItem, ILot } from '../interfaces/portfolio.interface';
import { PortfolioMapperService } from './portfolio-mapper.service';
import type { Page } from 'puppeteer';
import { setTimeout } from 'node:timers/promises';
import { SafeMathService } from './safe-math.service';
import loggerService from './logger.service';
const puppeteer = require('puppeteer');
const { addExtra } = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

class PortfolioService {
  private rawPortfolio: IStoredPortfolioItem[] = [];
  private mappedPortfolio: IPortfolio | null = null;
  private dataPath: string;
  private browser: any = null;
  private mapper = new PortfolioMapperService();
  private math = new SafeMathService();

  constructor() {
    this.dataPath = path.resolve(__dirname, '../data/portfolio.json');
    this.loadFromFile();
    setInterval(
      () => {
        this.saveToFile();
      },
      60 * 60 * 1000
    );
    // Watch the portfolio file and reload into memory when it changes on disk
    try {
      fs.watchFile(this.dataPath, { interval: 10000 }, (curr, prev) => {
        if (curr.mtimeMs !== prev.mtimeMs) {
          loggerService.info('Detected change in portfolio file, reloading from disk');
          this.loadFromFile();
        }
      });
    } catch (err) {
      loggerService.error('Failed to set up file watcher for portfolio data', err as Error);
    }
  }

  private loadFromFile(): void {
    try {
      const data = fs.readFileSync(this.dataPath, 'utf-8');
      this.rawPortfolio = JSON.parse(data) as IStoredPortfolioItem[];
      this.mappedPortfolio = this.mapper.mapStoredToPortfolio(this.rawPortfolio);
    } catch (error) {
      loggerService.error('Error loading portfolio from file:', error as Error);
      this.rawPortfolio = [];
      this.mappedPortfolio = null;
    }
  }

  private saveToFile(): void {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(this.rawPortfolio, null, 2));
      loggerService.info('Portfolio saved to file');
    } catch (error) {
      loggerService.error('Error saving portfolio to file:', error as Error);
    }
  }

  public getPortfolio(): IPortfolio | null {
    return this.mappedPortfolio;
  }

  public addPortfolioItem(item: IStoredPortfolioItem): void {
    this.rawPortfolio.push(item);
    this.mappedPortfolio = this.mapper.mapStoredToPortfolio(this.rawPortfolio);
  }

  public addLotToItem(isin: string, lot: ILot): boolean {
    const item = this.rawPortfolio.find(item => item.isin === isin);
    if (!item) return false;
    item.lots.push(lot);
    this.mappedPortfolio = this.mapper.mapStoredToPortfolio(this.rawPortfolio);
    this.saveToFile();
    return true;
  }

  public sellFromItem(
    isin: string,
    qtyToSell: number,
    sellPrice: number,
    commission: number
  ): { success: boolean; message?: string } {
    const item = this.rawPortfolio.find(i => i.isin === isin);
    if (!item) return { success: false, message: 'Item not found' };

    const activeLots = item.lots.filter(l => l.qtyRemaining > 0);
    const totalAvailable = activeLots.reduce((sum, l) => this.math.safeAdd(sum, l.qtyRemaining), 0);

    if (totalAvailable < qtyToSell) {
      return {
        success: false,
        message: `Not enough shares. Available: ${totalAvailable}, requested: ${qtyToSell}`,
      };
    }

    // FIFO: deduct from oldest lots first
    let remaining = qtyToSell;
    for (const lot of activeLots) {
      if (remaining <= 0) break;
      const deducted = Math.min(remaining, lot.qtyRemaining);
      lot.qtyRemaining = this.math.safeSubtract(lot.qtyRemaining, deducted);
      lot.totalCost = this.math.safeMultiply(lot.qtyRemaining, lot.costPerUnit);
      remaining = this.math.safeSubtract(remaining, deducted);
    }

    this.mappedPortfolio = this.mapper.mapStoredToPortfolio(this.rawPortfolio);
    this.saveToFile();
    return { success: true };
  }

  private async getInvestingPrice(page: Page, link: string): Promise<number[]> {
    await page.goto(link.toLowerCase());
    const price: string[] = [];
    let attempts = 0;

    while (attempts < 5) {
      const priceEL = await page.$('#last_last');
      const changeEL = await page.$('#last_last + span');
      const altPriceEL = await page.$('[data-test="instrument-price-last"]');
      const altChangeEL = await page.$('[data-test="instrument-price-change"]');

      if (!priceEL && !changeEL && !altPriceEL && !altChangeEL) {
        loggerService.warn(`Price elements not found, retrying... (${++attempts})`);
        await setTimeout(250);
      } else {
        if (priceEL) {
          price[0] = await page.evaluate((el: any) => el.textContent, changeEL);
          price[1] = await page.evaluate((el: any) => el.textContent, priceEL);
        } else {
          price[0] = await page.evaluate((el: any) => el.textContent, altChangeEL);
          price[1] = await page.evaluate((el: any) => el.textContent, altPriceEL);
        }
        break;
      }
    }
    return price.map(p => parseFloat(p.trim().replace(',', '.')));
  }

  public async refreshPrices(): Promise<void> {
    if (!this.browser) {
      const puppeteerExtra = addExtra(puppeteer);
      puppeteerExtra.use(StealthPlugin());
      this.browser = await puppeteerExtra.launch({ headless: true, args: ['--start-maximized'] });
    }

    try {
      const concurrency = 10;

      for (let i = 0; i < this.rawPortfolio.length; i += concurrency) {
        const batch = this.rawPortfolio.slice(i, i + concurrency);
        const promises = batch.map(async asset => {
          const page = await this.browser.newPage();
          await page.setViewport({ width: 1280, height: 720 });
          try {
            const price = await this.getInvestingPrice(page, asset.link);
            if (price && price.length === 2 && !isNaN(price[0]) && !isNaN(price[1])) {
              const difference = this.math.safeSubtract(price[1], price[0]);
              asset.prevPrice = difference === 0 ? price[1] : difference;
              asset.currPrice = price[1];
              loggerService.info(`${asset.name}: ${asset.prevPrice} -> ${price[1]} (${price[0]})`);
            } else {
              loggerService.warn(`Price not found for ${asset.name}, skipping.`);
            }
          } finally {
            await page.close();
          }
        });
        await Promise.all(promises);
      }
      this.mappedPortfolio = this.mapper.mapStoredToPortfolio(this.rawPortfolio);
      loggerService.info('Prices refreshed successfully');
    } catch (error) {
      loggerService.error('Error refreshing prices:', error as Error);
    }
  }

  public saveOnShutdown(): void {
    this.saveToFile();
    if (this.browser) {
      this.browser.close();
    }
  }
}

const portfolioService = new PortfolioService();

export default portfolioService;
