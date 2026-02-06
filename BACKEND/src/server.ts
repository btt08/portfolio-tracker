import app from './app';
import config from './config/config';
import portfolioService from './services/portfolio.service';

const server = app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});

const shutdown = () => {
  console.log('Shutting down server...');
  portfolioService.saveOnShutdown();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
