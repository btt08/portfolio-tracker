import type { ElementHandle, Page } from 'puppeteer';
import { setTimeout } from 'node:timers/promises';
import type { IPortfolioItem } from '../interfaces/portfolio.interface';
const puppeteer = require('puppeteer');
const { addExtra } = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

const assets: IPortfolioItem[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/portfolio.json'), 'utf8')
);

const baseURL = 'https://es.investing.com';
const puppeteerExtra = addExtra(puppeteer);
puppeteerExtra.use(StealthPlugin());

function safeSubtract(a: number, b: number, decimals: number = 3): number {
  const scale = Math.pow(10, decimals);
  const scaledA = Math.round(a * scale);
  const scaledB = Math.round(b * scale);
  const result = scaledA - scaledB;
  return result / scale;
}

async function getInvestingPrice(page: Page, link: string): Promise<number[]> {
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

puppeteerExtra
  .launch({ headless: true, args: ['--start-maximized'] })
  .then(async (browser: any) => {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    try {
      // console.time('Loop');
      for (const asset of assets) {
        const url = `${baseURL}/${asset.type}/${asset.link}`;
        const price = await getInvestingPrice(page, url);
        if (!price || price.length < 2 || isNaN(price[0]) || isNaN(price[1])) {
          console.log(`Price not found for ${asset.name}, skipping.`);
          continue;
        }
        asset.prevPrice = safeSubtract(price[1], price[0]);
        asset.currPrice = price[1];
        console.log(`${asset.name}: ${asset.prevPrice} -> ${price[1]} (${price[0]})  ----- ${url}`);
      }

      fs.writeFileSync(
        path.join(__dirname, '../data/portfolio.json'),
        JSON.stringify(assets, null, 2)
      );

      // console.timeEnd('Loop');
      // const today = new Date();
      // const time =
      //   today.getHours() + ":" + ("0" + today.getMinutes()).slice(-2);
      // console.log(`All done. At: ${time}`);

      await browser.close();
    } catch (error) {
      console.error(error);
    }
  });
