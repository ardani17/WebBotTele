import { z } from 'zod';
import { UserRole } from './user';

// Auth interfaces
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role: UserRole;
  features: string[];
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
  message: string;
}

// Auth schemas
export const LoginSchema = z.object({
  telegramId: z.string().min(1, 'Telegram ID is required'),
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Current password must be at least 6 characters'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Type exports
export type LoginDto = z.infer<typeof LoginSchema>;
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;

// JWT payload interface
export interface JwtPayload {
  sub: string; // user id
  telegramId: string;
  role: UserRole;
  features: string[];
  iat?: number;
  exp?: number;
}

// Permission interface
export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

// Role permissions mapping
export const RolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    { resource: '*', action: '*' }, // Admin has all permissions
  ],
  [UserRole.MODERATOR]: [
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'update', conditions: { not: { role: UserRole.ADMIN } } },
    { resource: 'bot', action: 'read' },
    { resource: 'bot', action: 'manage' },
    { resource: 'messages', action: 'read' },
    { resource: 'messages', action: 'delete' },
  ],
  [UserRole.USER]: [
    { resource: 'profile', action: 'read' },
    { resource: 'profile', action: 'update' },
    { resource: 'bot', action: 'use' },
  ],
};
