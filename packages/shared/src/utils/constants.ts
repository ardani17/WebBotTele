// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',
  },
  USERS: {
    LIST: '/users',
    CREATE: '/users',
    GET: '/users/:id',
    UPDATE: '/users/:id',
    DELETE: '/users/:id',
    FEATURES: '/users/:id/features',
  },
  BOT: {
    WEBHOOK: '/telegram/webhook',
    STATS: '/bot/stats',
    COMMANDS: '/bot/commands',
    STATE: '/bot/state/:telegramId',
  },
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    SETTINGS: '/admin/settings',
  },
} as const;

// Bot commands
export const BOT_COMMANDS = {
  START: '/start',
  MENU: '/menu',
  HELP: '/help',
  LOCATION: '/location',
  WORKBOOK: '/workbook',
  ADMIN: '/admin',
  CANCEL: '/cancel',
} as const;

// Bot messages
export const BOT_MESSAGES = {
  WELCOME: '🤖 Selamat datang! Saya adalah bot assistant Anda.',
  UNAUTHORIZED: '❌ Anda tidak memiliki akses ke bot ini.',
  INVALID_COMMAND: '❓ Perintah tidak dikenali. Ketik /help untuk bantuan.',
  ERROR: '❌ Terjadi kesalahan. Tim teknis telah diberitahu.',
  CANCELLED: '✅ Operasi dibatalkan.',
  MENU: `
🏠 **Menu Utama**

Pilih fitur yang ingin Anda gunakan:
• /location - Manajemen lokasi
• /workbook - Manajemen workbook
• /help - Bantuan

Ketik perintah atau pilih dari menu di bawah.
  `,
} as const;

// File types
export const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  ARCHIVES: ['application/zip', 'application/x-rar-compressed'],
} as const;

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  ARCHIVE: 20 * 1024 * 1024, // 20MB
} as const;

// Cache keys
export const CACHE_KEYS = {
  USER_STATE: (telegramId: string) => `user_state:${telegramId}`,
  USER_SESSION: (userId: string) => `user_session:${userId}`,
  BOT_STATS: 'bot_stats',
  USER_FEATURES: (userId: string) => `user_features:${userId}`,
} as const;

// Cache TTL (in seconds)
export const CACHE_TTL = {
  USER_STATE: 3600, // 1 hour
  USER_SESSION: 86400, // 24 hours
  BOT_STATS: 300, // 5 minutes
  USER_FEATURES: 1800, // 30 minutes
} as const;

// Rate limiting
export const RATE_LIMITS = {
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
  },
  API: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
  },
  BOT: {
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 messages per minute
  },
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// Environment types
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Error codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
