import ICurrency from '../../interfaces/currency.interface';
import currencyRepo from './currency-repo.service';

class CurrencyService {
  private currencyData: ICurrency[] = [];

  constructor() {
    this.currencyData = currencyRepo.loadCurrencies();
  }

  getCurrencyData(): ICurrency[] {
    return this.currencyData;
  }

  getExchangeRateForCurrency(code: string): number {
    const currency = this.currencyData.find(c => c.code === code);
    return currency ? currency.exchangeRateToEur : 1;
  }

  updateCurrencyData(newCurrencies: ICurrency[]): void {
    this.currencyData = newCurrencies;
    currencyRepo.saveCurrencies(newCurrencies);
  }
}

const currencyService = new CurrencyService();
export default currencyService;
