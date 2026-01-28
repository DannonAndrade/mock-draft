import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('❌ Error:', error);

  // Default error
  let statusCode = 500;
  let message = 'Internal server error';

  // You can add specific error handling here
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error.message
    })
  });
}