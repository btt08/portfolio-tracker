import { Page } from 'puppeteer';
import { setTimeout } from 'node:timers/promises';
import loggerService from './logger.service';

export interface PriceData {
  priceDiff: number;
  currPrice: number;
}

export class PriceScrapingService {
  async getInvestingPrice(page: Page, link: string): Promise<PriceData | null> {
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
      priceDiff: parsedPrices[1] - parsedPrices[0],
      currPrice: parsedPrices[1],
    };
  }
}

const priceScrapingService = new PriceScrapingService();
export default priceScrapingService;
