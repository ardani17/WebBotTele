# Mode Isolation Development Workflow

## Overview
This workflow ensures proper implementation of the mode isolation architecture that prevents feature interference and maintains user state separation in the Telegram bot.

## Core Principles

### 1. Single Mode Principle
- Each user can only be in one mode at a time
- Mode switching clears previous mode state
- Commands are only valid within their respective modes
- Mode validation occurs before any command processing

### 2. State Isolation
- Each mode maintains its own state storage
- State is not shared between modes
- State cleanup occurs when exiting modes
- State persistence is mode-specific

### 3. Command Scope Isolation
- Commands only respond in their designated mode
- Cross-mode command execution is prevented
- Mode validation is mandatory for all handlers
- Error messages guide users to correct mode

## Implementation Workflow

### 1. Mode Definition
```typescript
// Define mode constants
export const BOT_MODES = {
  MENU: 'menu',
  LOCATION: 'location',
  WORKBOOK: 'workbook',
  OCR: 'ocr',
  RAR: 'rar',
  KML: 'kml',
  GEOTAGS: 'geotags',
} as const;

export type BotMode = typeof BOT_MODES[keyof typeof BOT_MODES] | null;
```

### 2. Mode Manager Implementation
```typescript
// shared/utils/mode-manager.ts
interface UserModeState {
  userId: number;
  currentMode: BotMode;
  previousMode: BotMode;
  modeStartTime: number;
  lastActivity: number;
}

class ModeManager {
  private userModes = new Map<number, UserModeState>();
  
  setUserMode(userId: number, mode: BotMode): void {
    const currentState = this.userModes.get(userId);
    const previousMode = currentState?.currentMode || null;
    
    // Clean up previous mode state if switching modes
    if (previousMode && previousMode !== mode) {
      this.cleanupModeState(userId, previousMode);
    }
    
    this.userModes.set(userId, {
      userId,
      currentMode: mode,
      previousMode,
      modeStartTime: Date.now(),
      lastActivity: Date.now(),
    });
    
    logger.info('User mode changed', { 
      userId, 
      previousMode, 
      newMode: mode,
      timestamp: Date.now()
    });
  }
  
  getUserMode(userId: number): BotMode {
    const state = this.userModes.get(userId);
    return state?.currentMode || null;
  }
  
  isUserInMode(userId: number, mode: BotMode): boolean {
    return this.getUserMode(userId) === mode;
  }
  
  updateLastActivity(userId: number): void {
    const state = this.userModes.get(userId);
    if (state) {
      state.lastActivity = Date.now();
    }
  }
  
  private cleanupModeState(userId: number, mode: BotMode): void {
    // Emit cleanup event for mode-specific cleanup
    this.emit('modeCleanup', { userId, mode });
  }
  
  // Session timeout management
  cleanupInactiveSessions(timeoutMs: number = 30 * 60 * 1000): void {
    const now = Date.now();
    for (const [userId, state] of this.userModes.entries()) {
      if (now - state.lastActivity > timeoutMs) {
        this.setUserMode(userId, null);
        logger.info('User session timed out', { userId, lastActivity: state.lastActivity });
      }
    }
  }
}

export const modeManager = new ModeManager();
export const { setUserMode, getUserMode, isUserInMode } = modeManager;
```

### 3. Mode Validation Middleware
```typescript
// Create mode validation decorator/middleware
export function requireMode(requiredMode: BotMode) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const msg = args[0] as TelegramBot.Message;
      const userId = msg.from?.id;
      
      if (!userId) {
        return;
      }
      
      const currentMode = getUserMode(userId);
      if (currentMode !== requiredMode) {
        const bot = this.bot || args[1]; // Assuming bot is passed as second arg
        await bot.sendMessage(
          msg.chat.id,
          `Anda harus berada dalam mode ${requiredMode} untuk menggunakan perintah ini. ` +
          `Ketik /${requiredMode} untuk masuk ke mode yang sesuai.`
        );
        return;
      }
      
      // Update last activity
      modeManager.updateLastActivity(userId);
      
      return method.apply(this, args);
    };
  };
}

// Usage example
class FeatureHandler {
  @requireMode(BOT_MODES.WORKBOOK)
  async handleWorkbookCommand(msg: TelegramBot.Message, bot: TelegramBot) {
    // Command implementation
  }
}
```

### 4. Feature Mode Implementation Pattern
```typescript
// Template for implementing mode-isolated features
export class FeatureModeHandler {
  private readonly MODE_NAME: BotMode;
  private userStates = new Map<number, FeatureState>();
  
  constructor(modeName: BotMode) {
    this.MODE_NAME = modeName;
    
    // Listen for mode cleanup events
    modeManager.on('modeCleanup', ({ userId, mode }) => {
      if (mode === this.MODE_NAME) {
        this.cleanupUserState(userId);
      }
    });
  }
  
  // Entry point for the feature
  async enterMode(userId: number, bot: TelegramBot, chatId: number): Promise<void> {
    try {
      // 1. Validate user access
      const hasAccess = await this.validateUserAccess(userId);
      if (!hasAccess) {
        await bot.sendMessage(chatId, '❌ Anda tidak memiliki akses ke fitur ini.');
        return;
      }
      
      // 2. Set user mode (this will cleanup previous mode automatically)
      setUserMode(userId, this.MODE_NAME);
      
      // 3. Initialize feature state
      this.initializeUserState(userId);
      
      // 4. Send welcome message
      await this.sendWelcomeMessage(bot, chatId);
      
      logger.info(`User entered ${this.MODE_NAME} mode`, { userId });
      
    } catch (error) {
      logger.error(`Error entering ${this.MODE_NAME} mode`, { error, userId });
      await bot.sendMessage(chatId, '❌ Terjadi kesalahan. Tim teknis telah diberitahu.');
    }
  }
  
  // Command handler with automatic mode validation
  async handleCommand(
    command: string,
    msg: TelegramBot.Message,
    bot: TelegramBot
  ): Promise<void> {
    const userId = msg.from?.id;
    const chatId = msg.chat.id;
    
    if (!userId) return;
    
    // Validate mode
    if (!isUserInMode(userId, this.MODE_NAME)) {
      await bot.sendMessage(
        chatId,
        `Anda harus berada dalam mode ${this.MODE_NAME} untuk menggunakan perintah ini.`
      );
      return;
    }
    
    // Update activity
    modeManager.updateLastActivity(userId);
    
    try {
      // Route to specific command handler
      await this.routeCommand(command, msg, bot);
    } catch (error) {
      logger.error(`Error handling command in ${this.MODE_NAME} mode`, { 
        error, 
        userId, 
        command 
      });
      await bot.sendMessage(chatId, 'Terjadi kesalahan saat memproses perintah.');
    }
  }
  
  // Message handler with automatic mode validation
  async handleMessage(msg: TelegramBot.Message, bot: TelegramBot): Promise<void> {
    const userId = msg.from?.id;
    
    if (!userId || !isUserInMode(userId, this.MODE_NAME)) {
      return; // Ignore messages not in this mode
    }
    
    // Update activity
    modeManager.updateLastActivity(userId);
    
    try {
      await this.processMessage(msg, bot);
    } catch (error) {
      logger.error(`Error processing message in ${this.MODE_NAME} mode`, { 
        error, 
        userId 
      });
      await bot.sendMessage(msg.chat.id, 'Terjadi kesalahan saat memproses pesan.');
    }
  }
  
  // State management
  private initializeUserState(userId: number): void {
    const state: FeatureState = {
      userId,
      mode: this.MODE_NAME,
      startTime: Date.now(),
      // Feature-specific state properties
    };
    
    this.userStates.set(userId, state);
    logger.info(`${this.MODE_NAME} state initialized`, { userId });
  }
  
  protected getUserState(userId: number): FeatureState | undefined {
    return this.userStates.get(userId);
  }
  
  private cleanupUserState(userId: number): void {
    this.userStates.delete(userId);
    
    // Cleanup feature-specific resources
    this.cleanupFeatureResources(userId);
    
    logger.info(`${this.MODE_NAME} state cleaned up`, { userId });
  }
  
  // Abstract methods to be implemented by specific features
  protected abstract validateUserAccess(userId: number): Promise<boolean>;
  protected abstract sendWelcomeMessage(bot: TelegramBot, chatId: number): Promise<void>;
  protected abstract routeCommand(command: string, msg: TelegramBot.Message, bot: TelegramBot): Promise<void>;
  protected abstract processMessage(msg: TelegramBot.Message, bot: TelegramBot): Promise<void>;
  protected abstract cleanupFeatureResources(userId: number): void;
}
```

### 5. Mode Transition Handling
```typescript
// Handle safe mode transitions
export class ModeTransitionManager {
  static async transitionToMode(
    userId: number,
    newMode: BotMode,
    bot: TelegramBot,
    chatId: number
  ): Promise<boolean> {
    try {
      const currentMode = getUserMode(userId);
      
      // If already in the target mode, just send current mode info
      if (currentMode === newMode) {
        await this.sendCurrentModeInfo(newMode, bot, chatId);
        return true;
      }
      
      // Confirm mode switch if user is in another mode
      if (currentMode && currentMode !== BOT_MODES.MENU) {
        const confirmed = await this.confirmModeSwitch(currentMode, newMode, bot, chatId);
        if (!confirmed) {
          return false;
        }
      }
      
      // Perform the transition
      setUserMode(userId, newMode);
      
      // Initialize new mode
      await this.initializeMode(newMode, userId, bot, chatId);
      
      return true;
      
    } catch (error) {
      logger.error('Mode transition failed', { error, userId, newMode });
      await bot.sendMessage(chatId, '❌ Gagal beralih mode. Silakan coba lagi.');
      return false;
    }
  }
  
  private static async confirmModeSwitch(
    currentMode: BotMode,
    newMode: BotMode,
    bot: TelegramBot,
    chatId: number
  ): Promise<boolean> {
    // For now, auto-confirm. In future, could implement user confirmation
    await bot.sendMessage(
      chatId,
      `Beralih dari mode ${currentMode} ke mode ${newMode}...`
    );
    return true;
  }
  
  private static async sendCurrentModeInfo(
    mode: BotMode,
    bot: TelegramBot,
    chatId: number
  ): Promise<void> {
    await bot.sendMessage(chatId, `Anda sudah berada dalam mode ${mode}.`);
  }
  
  private static async initializeMode(
    mode: BotMode,
    userId: number,
    bot: TelegramBot,
    chatId: number
  ): Promise<void> {
    // Route to appropriate mode initializer
    switch (mode) {
      case BOT_MODES.LOCATION:
        // Initialize location mode
        break;
      case BOT_MODES.WORKBOOK:
        // Initialize workbook mode
        break;
      // ... other modes
    }
  }
}
```

### 6. Mode Monitoring and Analytics
```typescript
// Track mode usage and transitions
export class ModeAnalytics {
  private modeUsage = new Map<string, number>();
  private modeTransitions = new Map<string, number>();
  private userSessions = new Map<number, ModeSession[]>();
  
  trackModeEntry(userId: number, mode: BotMode): void {
    const key = `${mode}_entries`;
    this.modeUsage.set(key, (this.modeUsage.get(key) || 0) + 1);
    
    // Track user session
    const sessions = this.userSessions.get(userId) || [];
    sessions.push({
      mode,
      startTime: Date.now(),
      endTime: null,
    });
    this.userSessions.set(userId, sessions);
    
    logger.info('Mode entry tracked', { userId, mode });
  }
  
  trackModeExit(userId: number, mode: BotMode): void {
    const sessions = this.userSessions.get(userId) || [];
    const currentSession = sessions.find(s => s.mode === mode && !s.endTime);
    
    if (currentSession) {
      currentSession.endTime = Date.now();
      const duration = currentSession.endTime - currentSession.startTime;
      
      logger.info('Mode exit tracked', { userId, mode, duration });
    }
  }
  
  trackModeTransition(fromMode: BotMode, toMode: BotMode): void {
    const key = `${fromMode}_to_${toMode}`;
    this.modeTransitions.set(key, (this.modeTransitions.get(key) || 0) + 1);
  }
  
  getModeStatistics(): ModeStatistics {
    return {
      usage: Object.fromEntries(this.modeUsage),
      transitions: Object.fromEntries(this.modeTransitions),
      activeSessions: this.getActiveSessions(),
    };
  }
  
  private getActiveSessions(): number {
    let activeCount = 0;
    for (const sessions of this.userSessions.values()) {
      if (sessions.some(s => !s.endTime)) {
        activeCount++;
      }
    }
    return activeCount;
  }
}
```

## Testing Mode Isolation

### 1. Unit Tests
```typescript
describe('Mode Isolation', () => {
  let modeManager: ModeManager;
  
  beforeEach(() => {
    modeManager = new ModeManager();
  });
  
  test('should set user mode correctly', () => {
    const userId = 123;
    modeManager.setUserMode(userId, BOT_MODES.WORKBOOK);
    
    expect(modeManager.getUserMode(userId)).toBe(BOT_MODES.WORKBOOK);
    expect(modeManager.isUserInMode(userId, BOT_MODES.WORKBOOK)).toBe(true);
    expect(modeManager.isUserInMode(userId, BOT_MODES.LOCATION)).toBe(false);
  });
  
  test('should cleanup previous mode when switching', () => {
    const userId = 123;
    const cleanupSpy = jest.spyOn(modeManager, 'cleanupModeState');
    
    modeManager.setUserMode(userId, BOT_MODES.WORKBOOK);
    modeManager.setUserMode(userId, BOT_MODES.LOCATION);
    
    expect(cleanupSpy).toHaveBeenCalledWith(userId, BOT_MODES.WORKBOOK);
  });
  
  test('should handle session timeout', () => {
    const userId = 123;
    modeManager.setUserMode(userId, BOT_MODES.WORKBOOK);
    
    // Mock time passage
    jest.advanceTimersByTime(31 * 60 * 1000); // 31 minutes
    
    modeManager.cleanupInactiveSessions();
    
    expect(modeManager.getUserMode(userId)).toBe(null);
  });
});
```

### 2. Integration Tests
```typescript
describe('Mode Isolation Integration', () => {
  test('should reject commands from wrong mode', async () => {
    const userId = 123;
    const chatId = 456;
    const mockBot = createMockBot();
    
    // Set user to location mode
    setUserMode(userId, BOT_MODES.LOCATION);
    
    // Try to execute workbook command
    const workbookHandler = new WorkbookHandler();
    await workbookHandler.handleCommand('create_sheet', mockMessage, mockBot);
    
    // Should receive mode error message
    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      chatId,
      expect.stringContaining('mode workbook')
    );
  });
  
  test('should allow commands in correct mode', async () => {
    const userId = 123;
    const mockBot = createMockBot();
    
    // Set user to workbook mode
    setUserMode(userId, BOT_MODES.WORKBOOK);
    
    // Execute workbook command
    const workbookHandler = new WorkbookHandler();
    await workbookHandler.handleCommand('create_sheet', mockMessage, mockBot);
    
    // Should process command successfully
    expect(mockBot.sendMessage).not.toHaveBeenCalledWith(
      expect.any(Number),
      expect.stringContaining('mode workbook')
    );
  });
});
```

## Best Practices

### 1. Mode Design
- Keep modes focused on single functionality
- Avoid mode dependencies or cross-mode operations
- Design clear entry and exit points
- Implement proper state cleanup

### 2. User Experience
- Provide clear mode indicators
- Guide users to correct modes
- Implement graceful mode transitions
- Show current mode status when needed

### 3. Error Handling
- Handle mode validation errors gracefully
- Provide helpful error messages
- Log mode-related errors for debugging
- Implement fallback mechanisms

### 4. Performance
- Minimize mode state storage
- Implement efficient state cleanup
- Use appropriate data structures
- Monitor memory usage

### 5. Security
- Validate mode permissions
- Prevent mode bypass attempts
- Audit mode transitions
- Implement session timeouts

## Troubleshooting

### Common Issues
1. **Commands not working**: Check mode validation logic
2. **State not cleaning up**: Verify cleanup event handlers
3. **Mode not switching**: Check setUserMode implementation
4. **Memory leaks**: Ensure proper state cleanup
5. **Cross-mode interference**: Review mode isolation implementation

### Debugging Tips
1. Add comprehensive logging for mode operations
2. Monitor mode transition patterns
3. Track state cleanup execution
4. Use debug commands to inspect current modes
5. Implement mode analytics for insights
