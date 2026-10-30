import { env } from "../config/env";
import jwt from "jsonwebtoken";
import { asyncHandler, UnauthorizedError } from "../utils";
import { Request, Response, NextFunction } from "express";

export const authenticate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Bearer token is missing or malformed");
  }

  const token = authHeader.split(" ")[1];
  try {
    const decodedToken: any = jwt.verify(token, env.JWT_SECRET);
    (req as any).user = {
      user_id: decodedToken.user_id,
      email: decodedToken.email,
      role: decodedToken.role,
    };
    next();
  } catch (err) {
    throw new UnauthorizedError("Invalid or expired token");
  }
});

export const optionalAuthenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const decodedToken: any = jwt.verify(token, env.JWT_SECRET);
    (req as any).user = {
      user_id: decodedToken.user_id,
      email: decodedToken.email,
      role: decodedToken.role,
    };
  } catch (err) {
    // Gracefully ignore token errors for optional auth
  }
  return next();
};