import app from './app';
import configService from './services/config.service';
import portfolioService from './services/portfolio.service';
import loggerService from './services/logger.service';

const { port } = configService.serverConfig;

const server = app.listen(port, () => {
  loggerService.info(`Server is running on port ${port}`);
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
