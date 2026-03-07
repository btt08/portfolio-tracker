import { Request, Response, NextFunction } from 'express';
import { AppError } from '../interfaces/error.interface';
import loggerService from '../services/logger.service';

export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
  loggerService.error('Unhandled error', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
};
