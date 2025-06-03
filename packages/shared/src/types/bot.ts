import { z } from 'zod';

// Bot mode enum
export enum BotMode {
  MENU = 'menu',
  LOCATION = 'location',
  WORKBOOK = 'workbook',
  ADMIN = 'admin',
}

// Bot feature enum
export enum BotFeature {
  LOCATION_TRACKING = 'location_tracking',
  WORKBOOK_MANAGEMENT = 'workbook_management',
  FILE_UPLOAD = 'file_upload',
  ADMIN_PANEL = 'admin_panel',
}

// User bot state interface
export interface UserBotState {
  userId: string;
  telegramId: string;
  currentMode: BotMode;
  previousMode?: BotMode;
  step?: string;
  data?: Record<string, any>;
  timestamp: Date;
}

// Bot command interface
export interface BotCommand {
  command: string;
  description: string;
  feature: BotFeature;
  adminOnly: boolean;
}

// Bot message interface
export interface BotMessage {
  id: string;
  telegramId: string;
  messageId: number;
  chatId: number;
  text?: string;
  type: 'text' | 'photo' | 'document' | 'location' | 'contact';
  fileId?: string;
  fileName?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  createdAt: Date;
}

// Bot state update schema
export const UpdateBotStateSchema = z.object({
  currentMode: z.nativeEnum(BotMode),
  step: z.string().optional(),
  data: z.record(z.any()).optional(),
});

// Bot command schema
export const BotCommandSchema = z.object({
  command: z.string().min(1),
  description: z.string().min(1),
  feature: z.nativeEnum(BotFeature),
  adminOnly: z.boolean().default(false),
});

// Type exports
export type UpdateBotStateDto = z.infer<typeof UpdateBotStateSchema>;
export type BotCommandDto = z.infer<typeof BotCommandSchema>;

// Bot statistics interface
export interface BotStatistics {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  messagesLast24h: number;
  popularCommands: Array<{
    command: string;
    count: number;
  }>;
  usersByMode: Record<BotMode, number>;
}
