import { Container } from 'inversify';
import PortfolioService from '../services/portfolio.service';
import { PortfolioMapperService } from '../services/portfolio-mapper.service';
import { SafeMathService } from '../services/safe-math.service';
import { RecordMapperService } from '../services/record-mapper.service';
import loggerService from '../services/logger.service';
import configService from '../services/config.service';
import priceScrapingService from '../services/price-scraping.service';

const container = new Container();

container.bind(SafeMathService).toSelf().inSingletonScope();
container.bind(PortfolioMapperService).toSelf().inSingletonScope();
container.bind(RecordMapperService).toSelf().inSingletonScope();
container.bind('PortfolioService').toConstantValue(PortfolioService);

// Services that are already singletons
container.bind('LoggerService').toConstantValue(loggerService);
container.bind('ConfigService').toConstantValue(configService);
container.bind('PriceScrapingService').toConstantValue(priceScrapingService);

export { container };
