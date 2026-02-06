import fs from 'fs';
import path from 'path';
import { IPortfolioItem } from '../interfaces/portfolio.interface';
import type { Page } from 'puppeteer';
import { setTimeout } from 'node:timers/promises';
const puppeteer = require('puppeteer');
const { addExtra } = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

class PortfolioService {
  private portfolio: IPortfolioItem[] = [];
  private dataPath: string;
  private browser: any = null;

  constructor() {
    this.dataPath = path.resolve(__dirname, '../data/portfolio.json');
    this.loadFromFile();
    setInterval(
      () => {
        this.saveToFile();
      },
      60 * 60 * 1000
    );
  }

  private loadFromFile(): void {
    try {
      const data = fs.readFileSync(this.dataPath, 'utf-8');
      this.portfolio = JSON.parse(data) as IPortfolioItem[];
    } catch (error) {
      console.error('Error loading portfolio from file:', error);
      this.portfolio = [];
    }
  }

  private saveToFile(): void {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(this.portfolio, null, 2));
      console.log('Portfolio saved to file');
    } catch (error) {
      console.error('Error saving portfolio to file:', error);
    }
  }

  public getPortfolioItems(): IPortfolioItem[] {
    return this.portfolio;
  }

  public addPortfolioItem(item: IPortfolioItem): void {
    this.portfolio.push(item);
  }

  public addRecordToItem(isin: string, record: any): boolean {
    const item = this.portfolio.find(item => item.isin === isin);
    if (!item) return false;
    item.records.push(record);
    return true;
  }

  private safeSubtract(a: number, b: number, decimals: number = 3): number {
    const scale = Math.pow(10, decimals);
    const scaledA = Math.round(a * scale);
    const scaledB = Math.round(b * scale);
    const result = scaledA - scaledB;
    return result / scale;
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
        console.log(`Price elements not found, retrying... (${++attempts})`);
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

    return price.map(p => parseFloat(p.trim().replace(/\./g, '').replace(',', '.')));
  }

  public async refreshPrices(): Promise<void> {
    if (!this.browser) {
      const puppeteerExtra = addExtra(puppeteer);
      puppeteerExtra.use(StealthPlugin());
      this.browser = await puppeteerExtra.launch({ headless: true, args: ['--start-maximized'] });
    }

    try {
      const baseURL = 'https://es.investing.com';
      const concurrency = 10;

      for (let i = 0; i < this.portfolio.length; i += concurrency) {
        const batch = this.portfolio.slice(i, i + concurrency);
        const promises = batch.map(async asset => {
          const page = await this.browser.newPage();
          await page.setViewport({ width: 1280, height: 720 });
          try {
            const url = `${baseURL}/${asset.type}/${asset.link}`;
            const price = await this.getInvestingPrice(page, url);
            if (price && price.length === 2 && !isNaN(price[0]) && !isNaN(price[1])) {
              asset.prevPrice = this.safeSubtract(price[1], price[0]);
              asset.currPrice = price[1];
              console.log(
                `${asset.name}: ${asset.prevPrice} -> ${price[1]} (${price[0]})  ----- ${url}`
              );
            } else {
              console.log(`Price not found for ${asset.name}, skipping.`);
            }
          } finally {
            await page.close();
          }
        });
        await Promise.all(promises);
      }
      console.log('Prices refreshed successfully');
    } catch (error) {
      console.error('Error refreshing prices:', error);
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
