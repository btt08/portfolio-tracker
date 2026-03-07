import app from './app';
import config from './config/config';
import portfolioService from './services/portfolio.service';
import loggerService from './services/logger.service';

const server = app.listen(config.port, () => {
  loggerService.info(`Server is running on port ${config.port}`);
});

const shutdown = () => {
  loggerService.info('Shutting down server...');
  portfolioService.saveOnShutdown();
  server.close(() => {
    loggerService.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
