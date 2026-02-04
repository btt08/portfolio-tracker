import express from 'express';
import cors from 'cors';
import portfolioRoutes from './routes/portfolio.route';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/portfolio', portfolioRoutes);
app.use(errorHandler);

export default app;
