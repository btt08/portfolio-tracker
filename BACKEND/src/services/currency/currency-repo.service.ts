import fs from 'fs';
import configService from '../config.service';
import loggerService from '../logger.service';
import ICurrency from '../../interfaces/currency.interface';

export class CurrencyRepository {
  private currencyPath = configService.dataPath + '/currencies.json';

  loadCurrencies(): ICurrency[] {
    try {
      const data = fs.readFileSync(this.currencyPath, 'utf-8');
      return JSON.parse(data) as ICurrency[];
    } catch (error) {
      loggerService.error('Error loading currency rates from file:', error as Error);
      return [];
    }
  }

  saveCurrencies(currencies: ICurrency[]): void {
    try {
      loggerService.info('Saving currency rates to file...');
      fs.writeFileSync(this.currencyPath, JSON.stringify(currencies, null, 2));
      loggerService.info('Currency rates saved to file');
    } catch (error) {
      loggerService.error('Error saving currency rates to file:', error as Error);
    }
  }
}

const currencyRepo = new CurrencyRepository();
export default currencyRepo;
