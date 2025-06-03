/**
 * Template for creating new bot features
 * 
 * Instructions for use:
 * 1. Copy this file to features-bot/{feature-name}-mode.ts
 * 2. Replace all instances of:
 *    - FeatureName with your feature name in PascalCase (e.g., LocationMode)
 *    - feature_name with your feature name in snake_case (e.g., location_mode)
 *    - feature_mode with your mode identifier (e.g., location)
 * 3. Update the interface properties and command handlers as needed
 * 4. Register the handlers in your main bot file
 * 
 * This is a template file - uncomment and modify the code below when creating a new feature.
 */

// Example implementation (uncomment and modify):
/*
import TelegramBot from 'node-telegram-bot-api';
import * as fs from 'fs-extra';
import * as path from 'path';
import { checkFeatureAccess } from '../services/feature-access';
import { userExists } from '../services/user-auth';
import { setUserMode, getUserMode } from '../../shared/utils/mode-manager';
import logger from '../../shared/utils/logger';
import { env } from '../../config';

// Feature-specific interfaces
interface UserFeatureNameState {
  mode: string;
  timestamp: number;
  // Add feature-specific properties here
  step?: string;
  data?: any;
}

// In-memory state storage
const userFeatureNameStates = new Map<number, UserFeatureNameState>();

// Helper functions
const initUserFeatureNameState = (userId: number): UserFeatureNameState => {
  const state: UserFeatureNameState = {
    mode: 'feature_mode',
    timestamp: Date.now(),
    step: 'initial',
    data: {},
  };
  userFeatureNameStates.set(userId, state);
  return state;
};

const getUserFeatureNameState = (userId: number): UserFeatureNameState => {
  let state = userFeatureNameStates.get(userId);
  if (!state) {
    state = initUserFeatureNameState(userId);
  }
  return state;
};

const updateUserFeatureNameState = (userId: number, updates: Partial<UserFeatureNameState>): void => {
  const state = getUserFeatureNameState(userId);
  Object.assign(state, updates);
  userFeatureNameStates.set(userId, state);
};

const cleanupFeatureNameState = (userId: number): void => {
  userFeatureNameStates.delete(userId);
  
  // Clean up any files or resources
  const userDir = path.join(env.BASE_DATA_PATH, `user_${userId}`, 'feature_name_files');
  if (fs.existsSync(userDir)) {
    fs.removeSync(userDir);
  }
  
  logger.info('FeatureName state cleaned up', { userId });
};

// Main feature handler
export async function handleFeatureName(bot: TelegramBot, msg: TelegramBot.Message) {
  try {
    const telegramId = msg.from!.id.toString();
    const userId = msg.from!.id;
    
    // 1. Check user registration
    const exists = await userExists(telegramId);
    if (!exists) {
      const displayName = msg.from?.first_name || msg.from?.username || 'Pengguna';
      await bot.sendMessage(msg.chat.id, `Maaf ${displayName} (${userId}) Anda tidak terdaftar untuk menggunakan bot ini.`);
      return;
    }
    
    // 2. Check feature access
    const hasAccess = await checkFeatureAccess(telegramId, 'feature_name');
    if (!hasAccess) {
      await bot.sendMessage(msg.chat.id, '❌ Anda tidak memiliki akses ke fitur FeatureName.');
      return;
    }
    
    logger.info('FeatureName command received', { telegramId, userId });
    
    // 3. Set user mode
    setUserMode(userId, 'feature_mode');
    logger.info('User mode changed', { userId, mode: 'feature_mode' });
    
    // 4. Initialize feature state
    initUserFeatureNameState(userId);
    logger.info('FeatureName state initialized', { userId });
    
    // 5. Send feature instructions
    await bot.sendMessage(
      msg.chat.id,
      'Anda sekarang dalam mode FeatureName. Perintah yang tersedia:\n' +
      '- /command1 - Description of command 1\n' +
      '- /command2 - Description of command 2\n' +
      '- /help_feature_name - Bantuan untuk fitur ini\n\n' +
      'Ketik /menu untuk kembali ke menu utama.'
    );
    
  } catch (error) {
    logger.error('FeatureName command failed', { error, telegramId: msg.from!.id });
    await bot.sendMessage(msg.chat.id, '❌ Terjadi kesalahan. Tim teknis telah diberitahu.');
  }
}

// Command handlers
async function handleCommand1(bot: TelegramBot, msg: TelegramBot.Message) {
  const userId = msg.from?.id;
  const chatId = msg.chat.id;
  
  if (!userId) return;
  
  const telegramId = userId.toString();
  const exists = await userExists(telegramId);
  if (!exists) return;
  
  const hasAccess = await checkFeatureAccess(telegramId, 'feature_name');
  if (!hasAccess) return;
  
  const currentMode = getUserMode(userId);
  if (currentMode !== 'feature_mode') {
    await bot.sendMessage(
      chatId,
      'Anda harus berada dalam mode FeatureName untuk menggunakan perintah ini. Ketik /feature_name untuk masuk ke mode FeatureName.'
    );
    return;
  }
  
  try {
    const state = getUserFeatureNameState(userId);
    
    // Command implementation here
    await bot.sendMessage(chatId, 'Command 1 executed successfully!');
    
    // Update state if needed
    updateUserFeatureNameState(userId, { step: 'command1_executed' });
    
    logger.info('Command1 executed', { userId });
  } catch (error) {
    logger.error('Error in command1', { error, userId });
    await bot.sendMessage(chatId, 'Terjadi kesalahan saat menjalankan perintah.');
  }
}

async function handleCommand2(bot: TelegramBot, msg: TelegramBot.Message) {
  const userId = msg.from?.id;
  const chatId = msg.chat.id;
  
  if (!userId) return;
  
  const telegramId = userId.toString();
  const exists = await userExists(telegramId);
  if (!exists) return;
  
  const hasAccess = await checkFeatureAccess(telegramId, 'feature_name');
  if (!hasAccess) return;
  
  const currentMode = getUserMode(userId);
  if (currentMode !== 'feature_mode') {
    await bot.sendMessage(
      chatId,
      'Anda harus berada dalam mode FeatureName untuk menggunakan perintah ini. Ketik /feature_name untuk masuk ke mode FeatureName.'
    );
    return;
  }
  
  try {
    const state = getUserFeatureNameState(userId);
    
    // Command implementation here
    await bot.sendMessage(chatId, 'Command 2 executed successfully!');
    
    // Update state if needed
    updateUserFeatureNameState(userId, { step: 'command2_executed' });
    
    logger.info('Command2 executed', { userId });
  } catch (error) {
    logger.error('Error in command2', { error, userId });
    await bot.sendMessage(chatId, 'Terjadi kesalahan saat menjalankan perintah.');
  }
}

async function handleHelp(bot: TelegramBot, msg: TelegramBot.Message) {
  const userId = msg.from?.id;
  const chatId = msg.chat.id;
  
  if (!userId) return;
  
  const telegramId = userId.toString();
  const exists = await userExists(telegramId);
  if (!exists) return;
  
  const hasAccess = await checkFeatureAccess(telegramId, 'feature_name');
  if (!hasAccess) return;
  
  const helpText = `
🔧 **Bantuan Fitur FeatureName**

**Perintah yang tersedia:**
• /command1 - Description of command 1
• /command2 - Description of command 2
• /help_feature_name - Menampilkan bantuan ini

**Cara menggunakan:**
1. Pastikan Anda sudah dalam mode FeatureName
2. Gunakan perintah sesuai kebutuhan
3. Ikuti instruksi yang diberikan bot

**Tips:**
- Tip 1 for using this feature
- Tip 2 for using this feature

Ketik /menu untuk kembali ke menu utama.
  `;
  
  await bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
}

// Message handler for feature mode
async function handleMessage(bot: TelegramBot, msg: TelegramBot.Message) {
  const userId = msg.from?.id;
  const chatId = msg.chat.id;
  
  if (!userId || !(await userExists(userId.toString()))) return;
  
  const currentMode = getUserMode(userId);
  if (currentMode !== 'feature_mode') return;
  
  try {
    const state = getUserFeatureNameState(userId);
    
    // Handle different message types based on current step
    switch (state.step) {
      case 'waiting_for_input':
        await handleUserInput(bot, msg, state);
        break;
      
      case 'waiting_for_file':
        await handleFileInput(bot, msg, state);
        break;
      
      default:
        // Default message handling
        await bot.sendMessage(
          chatId,
          'Gunakan perintah yang tersedia atau ketik /help_feature_name untuk bantuan.'
        );
    }
    
  } catch (error) {
    logger.error('Error processing message in feature_mode mode', { error, userId });
    await bot.sendMessage(chatId, 'Terjadi kesalahan saat memproses pesan.');
  }
}

// Helper function to handle user text input
async function handleUserInput(bot: TelegramBot, msg: TelegramBot.Message, state: UserFeatureNameState) {
  const userId = msg.from!.id;
  const chatId = msg.chat.id;
  const text = msg.text;
  
  if (!text) {
    await bot.sendMessage(chatId, 'Mohon kirim teks yang valid.');
    return;
  }
  
  // Process the user input
  updateUserFeatureNameState(userId, {
    step: 'input_received',
    data: { ...state.data, userInput: text }
  });
  
  await bot.sendMessage(chatId, `Input diterima: ${text}`);
  
  logger.info('User input processed', { userId, input: text });
}

// Helper function to handle file input
async function handleFileInput(bot: TelegramBot, msg: TelegramBot.Message, state: UserFeatureNameState) {
  const userId = msg.from!.id;
  const chatId = msg.chat.id;
  
  // Check if message contains a file
  const file = msg.document || msg.photo?.[msg.photo.length - 1];
  
  if (!file) {
    await bot.sendMessage(chatId, 'Mohon kirim file yang valid.');
    return;
  }
  
  try {
    // Process the file
    const fileId = file.file_id;
    const fileName = msg.document?.file_name || `photo_${Date.now()}.jpg`;
    
    // Download and process file here
    await bot.sendMessage(chatId, `File ${fileName} diterima dan sedang diproses...`);
    
    updateUserFeatureNameState(userId, {
      step: 'file_received',
      data: { ...state.data, fileName, fileId }
    });
    
    logger.info('File processed', { userId, fileName, fileId });
    
  } catch (error) {
    logger.error('Error processing file', { error, userId });
    await bot.sendMessage(chatId, 'Terjadi kesalahan saat memproses file.');
  }
}

// Register feature handlers
export function registerFeatureNameHandlers(bot: TelegramBot) {
  logger.info('Registering FeatureName handlers...');
  
  // Command handlers
  bot.onText(/\/command1/, handleCommand1);
  bot.onText(/\/command2/, handleCommand2);
  bot.onText(/\/help_feature_name/, handleHelp);
  
  // Message handler
  bot.on('message', handleMessage);
  
  logger.info('FeatureName handlers registered successfully');
}

// Export cleanup function for mode manager
export function cleanupFeatureNameUserState(userId: number) {
  cleanupFeatureNameState(userId);
}
*/

// This file serves as a template - copy and modify for actual feature implementation
export {};
