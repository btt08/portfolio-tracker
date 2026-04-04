import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

export const validate =
  (schema: ZodType, source: 'body' | 'params' = 'body') =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(source === 'body' ? req.body : req.params);
    if (!result.success) {
      res
        .status(400)
        .json({ success: false, message: 'Invalid input', errors: result.error.issues });
      return;
    }
    req.validated = result.data;
    next();
  };

declare global {
  namespace Express {
    interface Request {
      validated?: any;
    }
  }
}
