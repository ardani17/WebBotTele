import { z } from 'zod';

// Common validation schemas
export const IdSchema = z.string().uuid('Invalid ID format');
export const TelegramIdSchema = z.string().min(1, 'Telegram ID is required');
export const EmailSchema = z.string().email('Invalid email format');
export const PasswordSchema = z.string().min(6, 'Password must be at least 6 characters');

// Pagination schema
export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
});

// Sort schema
export const SortSchema = z.object({
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Search schema
export const SearchSchema = z.object({
  search: z.string().optional(),
});

// Combined query schema
export const QuerySchema = PaginationSchema.merge(SortSchema).merge(SearchSchema);

// File upload validation
export const FileUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  mimetype: z.string().min(1, 'MIME type is required'),
  size: z.number().max(10 * 1024 * 1024, 'File size must be less than 10MB'),
});

// Validation helper functions
export const validateTelegramId = (telegramId: string): boolean => {
  return /^\d+$/.test(telegramId);
};

export const validateUsername = (username: string): boolean => {
  return /^[a-zA-Z0-9_]{3,32}$/.test(username);
};

export const validatePhoneNumber = (phone: string): boolean => {
  return /^\+?[1-9]\d{1,14}$/.test(phone);
};

// Type exports
export type PaginationDto = z.infer<typeof PaginationSchema>;
export type SortDto = z.infer<typeof SortSchema>;
export type SearchDto = z.infer<typeof SearchSchema>;
export type QueryDto = z.infer<typeof QuerySchema>;
export type FileUploadDto = z.infer<typeof FileUploadSchema>;
