# Bot Feature Development Workflow

## Overview
This workflow guides the development of new bot features following the mode isolation architecture and access control patterns established in the existing codebase.

## Prerequisites
- Understanding of existing bot architecture
- Access to user registration and feature access systems
- Knowledge of mode isolation principles

## Step-by-Step Workflow

### 1. Feature Planning
```markdown
- [ ] Define feature name and mode identifier
- [ ] Identify required user permissions
- [ ] Plan feature-specific commands
- [ ] Design user state structure
- [ ] Plan file handling requirements (if any)
- [ ] Define error scenarios and handling
```

### 2. Create Feature Module
Create new file: `features-bot/{feature-name}-mode.ts`

```typescript
import TelegramBot from 'node-telegram-bot-api';
import * as fs from 'fs-extra';
import * as path from 'path';
import { checkFeatureAccess } from '../services/feature-access';
import { userExists } from '../services/user-auth';
import { setUserMode, getUserMode } from '../../shared/utils/mode-manager';
import logger from '../../shared/utils/logger';
import { env } from '../../config';

// Define feature-specific interfaces
interface User{FeatureName}State {
  mode: string;
  timestamp: number;
  // Add feature-specific properties
}

// In-memory state storage
const user{FeatureName}States = new Map<number, User{FeatureName}State>();

// Helper functions
const initUser{FeatureName}State = (userId: number): User{FeatureName}State => {
  const state: User{FeatureName}State = {
    mode: '{feature_mode}',
    timestamp: Date.now(),
    // Initialize feature-specific properties
  };
  user{FeatureName}States.set(userId, state);
  return state;
};

const getUser{FeatureName}State = (userId: number): User{FeatureName}State => {
  let state = user{FeatureName}States.get(userId);
  if (!state) {
    state = initUser{FeatureName}State(userId);
  }
  return state;
};

// Main feature handler
export async function handle{FeatureName}(bot: TelegramBot, msg: TelegramBot.Message) {
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
    const hasAccess = await checkFeatureAccess(telegramId, '{feature_name}');
    if (!hasAccess) {
      await bot.sendMessage(msg.chat.id, '❌ Anda tidak memiliki akses ke fitur {Feature Name}.');
      return;
    }
    
    logger.info('{FeatureName} command received', { telegramId, userId });
    
    // 3. Set user mode
    setUserMode(userId, '{feature_mode}');
    logger.info('User mode changed', { userId, mode: '{feature_mode}' });
    
    // 4. Initialize feature state
    initUser{FeatureName}State(userId);
    logger.info('{FeatureName} state initialized', { userId });
    
    // 5. Send feature instructions
    await bot.sendMessage(
      msg.chat.id,
      'Anda sekarang dalam mode {Feature Name}. Perintah yang tersedia:\n' +
      '- {command1} - {description1}\n' +
      '- {command2} - {description2}\n\n' +
      'Ketik /menu untuk kembali ke menu utama.'
    );
    
  } catch (error) {
    logger.error('{FeatureName} command failed', { error, telegramId: msg.from!.id });
    await bot.sendMessage(msg.chat.id, '❌ Terjadi kesalahan. Tim teknis telah diberitahu.');
  }
}

// Register feature handlers
export function register{FeatureName}Handlers(bot: TelegramBot) {
  logger.info('Registering {FeatureName} handlers...');
  
  // Command handlers
  bot.onText(/\/{command1}/, async (msg) => {
    const userId = msg.from?.id;
    const chatId = msg.chat.id;
    
    if (!userId) return;
    
    const telegramId = userId.toString();
    const exists = await userExists(telegramId);
    if (!exists) return;
    
    const hasAccess = await checkFeatureAccess(telegramId, '{feature_name}');
    if (!hasAccess) return;
    
    const currentMode = getUserMode(userId);
    if (currentMode !== '{feature_mode}') {
      await bot.sendMessage(
        chatId,
        'Anda harus berada dalam mode {Feature Name} untuk menggunakan perintah ini. Ketik /{feature_command} untuk masuk ke mode {Feature Name}.'
      );
      return;
    }
    
    try {
      // Command implementation
      logger.info('{Command1} executed', { userId });
    } catch (error) {
      logger.error('Error in {command1} command', { error, userId });
      await bot.sendMessage(chatId, 'Terjadi kesalahan saat menjalankan perintah.');
    }
  });
  
  // Message handlers (if needed)
  bot.on('message', async (msg) => {
    const userId = msg.from?.id;
    const chatId = msg.chat.id;
    
    if (!userId || !(await userExists(userId.toString()))) return;
    
    const currentMode = getUserMode(userId);
    if (currentMode !== '{feature_mode}') return;
    
    try {
      // Handle messages in feature mode
      const state = getUser{FeatureName}State(userId);
      
      // Process message based on feature logic
      
    } catch (error) {
      logger.error('Error processing message in {feature_mode} mode', { error, userId });
      await bot.sendMessage(chatId, 'Terjadi kesalahan saat memproses pesan.');
    }
  });
  
  logger.info('{FeatureName} handlers registered successfully');
}
```

### 3. Update Main Bot File
Add feature registration to main bot file:

```typescript
import { handle{FeatureName}, register{FeatureName}Handlers } from './features-bot/{feature-name}-mode';

// Register command handler
bot.onText(/\/{feature_command}/, handle{FeatureName});

// Register feature handlers
register{FeatureName}Handlers(bot);
```

### 4. Update Feature Access Configuration
Add feature to access control system:

```typescript
// In services/feature-access.ts or equivalent
const FEATURE_ACCESS_MAP = {
  // ... existing features
  '{feature_name}': env.{FEATURE_NAME}_ACCESS_USERS?.split(',') || [],
};
```

### 5. Update Environment Configuration
Add environment variables for feature access:

```bash
# .env
{FEATURE_NAME}_ACCESS_USERS=731289973,5269990963,492999484
```

### 6. Testing Checklist
```markdown
- [ ] Test user registration validation
- [ ] Test feature access control
- [ ] Test mode isolation (commands only work in correct mode)
- [ ] Test state management (initialization, updates, cleanup)
- [ ] Test error handling scenarios
- [ ] Test file operations (if applicable)
- [ ] Test command responses and user feedback
- [ ] Test logging and debugging information
```

### 7. Documentation
```markdown
- [ ] Update feature documentation
- [ ] Add command descriptions
- [ ] Document configuration requirements
- [ ] Add troubleshooting guide
- [ ] Update user manual
```

## File Handling Features

### For features that handle files:

```typescript
// Add file handling utilities
import { getLocalFilePath, copyFileToUserDir, isUsingLocalBotApi } from '../../shared/utils/local-bot-api';

// Helper function to ensure user data directory
const ensureUserDataDir = (userId: number): string => {
  const userDir = path.join(env.BASE_DATA_PATH, `user_${userId}`);
  fs.ensureDirSync(userDir);
  return userDir;
};

// File download function
const getFileForFeature = async (fileId: string, bot: TelegramBot, userId: number, filename: string): Promise<string> => {
  try {
    logger.info('Starting file download for {feature_name}', { fileId, userId, filename });

    // 1. Try local Bot API first
    if (isUsingLocalBotApi()) {
      try {
        const fileInfo: any = await bot.getFile(fileId);
        if (fileInfo?.file_path) {
          let localPath = fileInfo.file_path as string;
          if (!path.isAbsolute(localPath)) {
            localPath = path.join(env.BOT_API_DATA_PATH!, localPath);
          }
          
          if (await fs.pathExists(localPath)) {
            const stats = await fs.stat(localPath);
            if (stats.size > 0 && stats.isFile()) {
              const copiedPath = await copyFileToUserDir(localPath, userId, '{feature_name}_files', filename);
              logger.info('File copied from local Bot API', { copiedPath });
              return copiedPath;
            }
          }
        }
      } catch (err) {
        logger.error('Local Bot API file access failed', { err, fileId });
      }
    }

    // 2. Fallback to HTTP download
    const fileLink = await bot.getFileLink(fileId);
    const userDir = ensureUserDataDir(userId);
    const featureDir = path.join(userDir, '{feature_name}_files');
    fs.ensureDirSync(featureDir);
    const filePath = path.join(featureDir, filename);
    
    // Download file
    const response = await axios({
      url: fileLink,
      method: 'GET',
      responseType: 'stream'
    });
    
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
    logger.info('File downloaded via HTTP', { filePath });
    return filePath;
    
  } catch (error) {
    logger.error('Error downloading file for {feature_name}', { error, fileId, userId });
    throw error;
  }
};
```

## Common Patterns

### State Cleanup
```typescript
// Clean up user state when exiting mode
const cleanup{FeatureName}State = (userId: number): void => {
  user{FeatureName}States.delete(userId);
  
  // Clean up files if needed
  const userDir = ensureUserDataDir(userId);
  const featureDir = path.join(userDir, '{feature_name}_files');
  if (fs.existsSync(featureDir)) {
    fs.removeSync(featureDir);
  }
  
  logger.info('{FeatureName} state cleaned up', { userId });
};
```

### Progress Tracking
```typescript
// For long-running operations
const updateProgress = async (chatId: number, current: number, total: number, operation: string) => {
  if (current % 10 === 0 || current === total) {
    await bot.sendMessage(chatId, `${operation}: ${current}/${total} selesai...`);
  }
};
```

### Batch Processing
```typescript
// For processing multiple items
const processBatch = async (items: any[], processor: (item: any) => Promise<void>, batchSize: number = 5) => {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(processor));
    
    // Add delay between batches to prevent rate limiting
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
};
```

## Best Practices

1. **Always validate user access** before processing any commands
2. **Use consistent error messages** and logging patterns
3. **Clean up resources** when users exit modes
4. **Implement progress feedback** for long operations
5. **Handle rate limiting** for batch operations
6. **Use descriptive logging** for debugging
7. **Follow existing naming conventions** and patterns
8. **Test edge cases** and error scenarios
9. **Document configuration requirements** clearly
10. **Maintain backward compatibility** with existing features

## Troubleshooting

### Common Issues
1. **Mode not switching**: Check if `setUserMode` is called correctly
2. **Commands not working**: Verify mode validation logic
3. **File download fails**: Check Bot API configuration and permissions
4. **State not persisting**: Ensure state is properly initialized and stored
5. **Access denied**: Verify user is in feature access list

### Debugging Tips
1. Check logs for error messages and context
2. Verify environment variables are set correctly
3. Test with different user IDs and access levels
4. Use debug commands to inspect state
5. Monitor file system for proper file handling
