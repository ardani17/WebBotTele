import { z } from 'zod';

// User role enum
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
}

// User status enum
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned',
  PENDING = 'pending',
}

// User interface
export interface User {
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
}

// User creation schema
export const CreateUserSchema = z.object({
  telegramId: z.string().min(1, 'Telegram ID is required'),
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(UserRole).default(UserRole.USER),
  status: z.nativeEnum(UserStatus).default(UserStatus.PENDING),
  features: z.array(z.string()).default([]),
});

// User update schema
export const UpdateUserSchema = z.object({
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  features: z.array(z.string()).optional(),
});

// User query schema
export const UserQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'lastActiveAt', 'username']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Type exports
export type CreateUserDto = z.infer<typeof CreateUserSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
export type UserQueryDto = z.infer<typeof UserQuerySchema>;

// User response interface
export interface UserResponse {
  user: User;
  message: string;
}

// Users list response interface
export interface UsersListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
