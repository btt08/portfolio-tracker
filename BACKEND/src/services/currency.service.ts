import { ICurrency } from '../interfaces/currency.interface';
import { CurrencyRepo } from './currency-repo.service';

class CurrencyService {
  private currencyRepo = new CurrencyRepo();
  private currencyData: ICurrency[] = [];

  constructor() {
    this.currencyData = this.currencyRepo.loadCurrencies();
  }

  getCurrencyData(): ICurrency[] {
    return this.currencyData;
  }

  updateCurrencyData(newCurrencies: ICurrency[]): void {
    this.currencyData = newCurrencies;
    this.currencyRepo.saveCurrencies(newCurrencies);
  }
}

const currencyService = new CurrencyService();
export default currencyService;
