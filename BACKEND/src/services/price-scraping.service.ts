import { Page } from 'puppeteer';
import { setTimeout } from 'node:timers/promises';
import loggerService from './logger.service';
import configService from './config.service';
import { SafeMath } from './safe-math/safe-math.service';
const puppeteer = require('puppeteer');
const { addExtra } = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

export interface IPriceData {
  prevClose: number;
  currPrice: number;
}

export class PriceScrapingService {
  private browser: any = null;

  private async ensureBrowser(): Promise<any> {
    if (!this.browser) {
      const puppeteerExtra = addExtra(puppeteer);
      puppeteerExtra.use(StealthPlugin());
      this.browser = await puppeteerExtra.launch(configService.puppeteerConfig);
    }
    return this.browser;
  }

  async getInvestingPrice(page: Page, link: string): Promise<IPriceData | null> {
    await page.goto(link.toLowerCase());
    const price: string[] = [];
    let attempts = 0;

    while (attempts < 5) {
      const priceEL = await page.$('#last_last');
      const changeEL = await page.$('#last_last + span');
      const altPriceEL = await page.$('[data-test="instrument-price-last"]');
      const altChangeEL = await page.$('[data-test="instrument-price-change"]');

      if (!priceEL && !changeEL && !altPriceEL && !altChangeEL) {
        loggerService.warn(`Price elements not found, retrying... (${++attempts})`, { link });
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

    if (price.length !== 2) {
      loggerService.warn('Price not found', { link });
      return null;
    }

    const parsedPrices = price.map(p => parseFloat(p.trim().replace(/\./g, '').replace(',', '.')));
    if (parsedPrices.some(isNaN)) {
      loggerService.warn('Invalid price data', { link, prices: price });
      return null;
    }

    return {
      prevClose: SafeMath.subtract(parsedPrices[1], parsedPrices[0]),
      currPrice: parsedPrices[1],
    };
  }

  async getExchangeRates(page: Page, link: string): Promise<number | null> {
    await page.goto(link.toLowerCase());
    const rateEL = await page.$('#last_last');
    const altRateEL = await page.$('[data-test="instrument-price-last"]');
    const rateText = rateEL
      ? await page.evaluate((el: any) => el.textContent, rateEL)
      : altRateEL
        ? await page.evaluate((el: any) => el.textContent, altRateEL)
        : null;

    if (!rateText) {
      loggerService.warn('Exchange rate not found', { link });
      return null;
    }

    const parsedRate = parseFloat(rateText.trim().replace(/\./g, '').replace(',', '.'));
    if (isNaN(parsedRate)) {
      loggerService.warn('Invalid exchange rate data', { link, rate: rateText });
      return null;
    }

    return parsedRate;
  }

  async createPage(): Promise<Page> {
    const browser = await this.ensureBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    return page;
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

const priceScrapingService = new PriceScrapingService();
export default priceScrapingService;
