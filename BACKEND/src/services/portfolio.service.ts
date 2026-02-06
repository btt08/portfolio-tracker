import fs from 'fs';
import path from 'path';
import { IPortfolio, IStoredPortfolioItem, ILot } from '../interfaces/portfolio.interface';
import { PortfolioMapperService } from './portfolio-mapper.service';
import type { Page } from 'puppeteer';
import { setTimeout } from 'node:timers/promises';
import { SafeMathService } from './safe-math.service';
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
  }

  private loadFromFile(): void {
    try {
      const data = fs.readFileSync(this.dataPath, 'utf-8');
      this.rawPortfolio = JSON.parse(data) as IStoredPortfolioItem[];
      this.mappedPortfolio = this.mapper.mapStoredToPortfolio(this.rawPortfolio);
    } catch (error) {
      console.error('Error loading portfolio from file:', error);
      this.rawPortfolio = [];
      this.mappedPortfolio = null;
    }
  }

  private saveToFile(): void {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(this.rawPortfolio, null, 2));
      console.log('Portfolio saved to file');
    } catch (error) {
      console.error('Error saving portfolio to file:', error);
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
    return true;
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
      const concurrency = 10;

      for (let i = 0; i < this.rawPortfolio.length; i += concurrency) {
        const batch = this.rawPortfolio.slice(i, i + concurrency);
        const promises = batch.map(async asset => {
          const page = await this.browser.newPage();
          await page.setViewport({ width: 1280, height: 720 });
          try {
            const price = await this.getInvestingPrice(page, asset.link);
            if (price && price.length === 2 && !isNaN(price[0]) && !isNaN(price[1])) {
              asset.prevPrice = this.math.safeSubtract(price[1], price[0]);
              asset.currPrice = price[1];
              console.log(
                `${asset.name}: ${asset.prevPrice} -> ${price[1]} (${price[0]})  ----- ${asset.link}`
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
      this.mappedPortfolio = this.mapper.mapStoredToPortfolio(this.rawPortfolio);
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
