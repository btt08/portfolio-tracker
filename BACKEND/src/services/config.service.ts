import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  dataPath: string;
  saveInterval: number;
  excludedIsins: string[];
  exchangeRateComissionPerc: number;
  puppeteer: {
    headless: boolean;
    args: string[];
  };
  server: {
    port: number;
  };
}

export class ConfigService {
  private config: AppConfig;

  constructor() {
    this.config = {
      dataPath: path.resolve(__dirname, '../data'),
      saveInterval: 60 * 60 * 1000, // 1 hour
      excludedIsins: ['ES0128520006'],
      exchangeRateComissionPerc: 0.3, // 0.3% commission for currency conversion
      puppeteer: {
        headless: true,
        args: ['--start-maximized'],
      },
      server: {
        port: parseInt(process.env.PORT || '3000', 10),
      },
    };
  }

  getConfig(): AppConfig {
    return this.config;
  }

  get dataPath(): string {
    return this.config.dataPath;
  }

  get saveInterval(): number {
    return this.config.saveInterval;
  }

  get excludedIsins(): string[] {
    return this.config.excludedIsins;
  }

  get exchangeRateComissionPerc(): number {
    return this.config.exchangeRateComissionPerc;
  }

  get puppeteerConfig() {
    return this.config.puppeteer;
  }

  get serverConfig() {
    return this.config.server;
  }
}

const configService = new ConfigService();
export default configService;
