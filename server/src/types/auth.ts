import { Request } from 'express';

export interface JWTPayload {
  id: string;
  userId: string;
  email: string;
  role: string;
  subscriptionTier?: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
  usageInfo?: {
    action: 'message' | 'token' | 'voice' | 'translation';
    amount: number;
    remaining?: number;
    resetDate?: Date;
  };
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: any;
    accessToken: string;
    refreshToken: string;
  };
}