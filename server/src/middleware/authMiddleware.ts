import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const protect: RequestHandler = (req, res: Response, next: NextFunction): void => {
  // Read at call-time so dotenv.config() in index.ts has already run
  const JWT_SECRET = process.env.JWT_SECRET!;

  const authReq = req as AuthenticatedRequest;
  let token: string | undefined;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authorized, token missing' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    authReq.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Not authorized, token invalid or expired' });
  }
};
