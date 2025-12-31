import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  console.error(`[${new Date().toISOString()}] Error ${statusCode}: ${message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(error.stack);
  }

  res.status(statusCode).json({
    error: {
      message,
      code: error.code,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  });
};
