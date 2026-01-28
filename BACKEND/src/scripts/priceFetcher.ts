const puppeteer = require('puppeteer');
const { addExtra } = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
import type { Page } from 'puppeteer';
import type { IPortfolioItem } from '../interfaces/portfolio.interface';

const assets: IPortfolioItem[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/portfolio.json'), 'utf8'),
);

const baseURL = 'https://es.investing.com';
const puppeteerExtra = addExtra(puppeteer);
puppeteerExtra.use(StealthPlugin());

async function getInvestingPrice(
  page: Page,
  link: string,
): Promise<string | null> {
  await page.goto(link.toLowerCase());
  let price: string | null = null;
  const priceElement = await page.$('#last_last');
  if (priceElement) {
    price = await page.evaluate((el: any) => el.textContent, priceElement);
  }

  const altPriceElement = await page.$('[data-test="instrument-price-last"]');
  if (altPriceElement) {
    price = await page.evaluate((el: any) => el.textContent, altPriceElement);
  }

  return price;
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
        let price = await getInvestingPrice(page, url);
        if (!price) {
          console.log(`Price not found for ${asset.name}, retrying.`);
          price = await getInvestingPrice(page, asset.link);
        }
        if (price === null) {
          console.log(`Price not found for ${asset.name}, skipping.`);
          continue;
        }
        asset.currPrice = parseFloat(
          price.replace(/\./g, '').replace(',', '.'),
        );
        console.log(`${asset.name}: ${price} ----- ${url}`);
      }

      fs.writeFileSync(
        path.join(__dirname, '../data/portfolio.json'),
        JSON.stringify(assets, null, 2),
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
