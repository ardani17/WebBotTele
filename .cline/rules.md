# Cline Development Rules - Telegram Bot Web App

## Core Principles

### 1. Mode Isolation Architecture
- **Single Mode Principle**: Each user can only be in one mode at a time
- **Feature Isolation**: Features are completely isolated from each other
- **State Separation**: Each mode maintains its own state management
- **Command Scope**: Commands are only valid within their respective modes

### 2. Access Control System
- **User Registration**: Only registered Telegram IDs can access the bot
- **Feature-based Access**: Each feature has its own access control list
- **Granular Permissions**: Users can have access to specific features only
- **Owner-only Registration**: Only owners can register new tenants

### 3. Security First
- **Input Validation**: Always validate and sanitize user inputs
- **Environment Variables**: Store sensitive data in environment variables
- **Encryption**: Encrypt sensitive configuration data in database
- **Audit Logging**: Log all configuration changes and access attempts

## Development Standards

### TypeScript Standards
- Use TypeScript strict mode (`"strict": true`)
- Define explicit interfaces for all data structures
- Use proper type annotations for function parameters and return types
- Avoid `any` type - use proper typing or `unknown`
- Use enums for constants and string literals

### Code Organization
```typescript
// File structure pattern
src/
├── features/           # Bot feature modules
├── services/          # Business logic services
├── shared/            # Shared utilities
├── config/            # Configuration management
└── types/             # TypeScript type definitions
```

### Naming Conventions
- **Files**: kebab-case (e.g., `location-mode.ts`, `user-auth.service.ts`)
- **Classes**: PascalCase (e.g., `UserService`, `ConfigManager`)
- **Functions**: camelCase (e.g., `getUserMode`, `checkFeatureAccess`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `BOT_TOKEN`, `MAX_FILE_SIZE`)
- **Interfaces**: PascalCase with descriptive names (e.g., `UserModeState`, `BotConfiguration`)

## Bot Feature Development Rules

### 1. Feature Module Structure
Every bot feature must follow this pattern:

```typescript
// feature-name-mode.ts
import TelegramBot from 'node-telegram-bot-api';
import { checkFeatureAccess } from '../services/feature-access';
import { userExists } from '../services/user-auth';
import { setUserMode, getUserMode } from '../../shared/utils/mode-manager';
import logger from '../../shared/utils/logger';

// Feature-specific interfaces
interface UserFeatureState {
  // Define state properties
}

// In-memory state storage
const userFeatureStates = new Map<number, UserFeatureState>();

// Main feature handler
export async function handleFeature(bot: TelegramBot, msg: TelegramBot.Message) {
  try {
    const telegramId = msg.from!.id.toString();
    const userId = msg.from!.id;
    
    // 1. Check user registration
    const exists = await userExists(telegramId);
    if (!exists) {
      await bot.sendMessage(msg.chat.id, 'Maaf, Anda tidak terdaftar untuk menggunakan bot ini.');
      return;
    }
    
    // 2. Check feature access
    const hasAccess = await checkFeatureAccess(telegramId, 'feature_name');
    if (!hasAccess) {
      await bot.sendMessage(msg.chat.id, '❌ Anda tidak memiliki akses ke fitur ini.');
      return;
    }
    
    // 3. Set user mode
    setUserMode(userId, 'feature_mode');
    
    // 4. Initialize feature state
    initUserFeatureState(userId);
    
    // 5. Send feature instructions
    await bot.sendMessage(msg.chat.id, 'Feature activated...');
    
    logger.info('Feature activated', { telegramId, userId });
  } catch (error) {
    logger.error('Feature activation failed', { error, telegramId: msg.from!.id });
    await bot.sendMessage(msg.chat.id, '❌ Terjadi kesalahan. Tim teknis telah diberitahu.');
  }
}

// Register feature handlers
export function registerFeatureHandlers(bot: TelegramBot) {
  // Register all command handlers for this feature
}
```

### 2. Command Handler Pattern
```typescript
bot.onText(/\/command/, async (msg) => {
  const userId = msg.from?.id;
  const chatId = msg.chat.id;
  
  if (!userId) return;
  
  // 1. Validate user registration
  const telegramId = userId.toString();
  const exists = await userExists(telegramId);
  if (!exists) return;
  
  // 2. Validate feature access
  const hasAccess = await checkFeatureAccess(telegramId, 'feature_name');
  if (!hasAccess) return;
  
  // 3. Validate current mode
  const currentMode = getUserMode(userId);
  if (currentMode !== 'expected_mode') {
    await bot.sendMessage(chatId, 'Anda harus berada dalam mode yang sesuai.');
    return;
  }
  
  try {
    // Command implementation
    logger.info('Command executed', { userId, command: 'command_name' });
  } catch (error) {
    logger.error('Command failed', { error, userId, command: 'command_name' });
    await bot.sendMessage(chatId, 'Terjadi kesalahan saat menjalankan perintah.');
  }
});
```

### 3. State Management Rules
- Use Map-based in-memory storage for user states
- Initialize state when user enters mode
- Clean up state when user exits mode
- Include timestamp for state expiration
- Log state changes for debugging

### 4. Error Handling Rules
- Always wrap main logic in try-catch blocks
- Log errors with context (userId, operation, parameters)
- Send user-friendly error messages
- Never expose internal error details to users
- Use consistent error message format

### 5. File Handling Rules
- Support both local Bot API and HTTP download
- Always validate file types and sizes
- Use proper file naming with timestamps
- Clean up temporary files after processing
- Log file operations for debugging

## Web Development Rules

### 1. React Component Structure
```typescript
// Component naming: PascalCase
interface ComponentProps {
  // Define props with proper types
}

export const ComponentName: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // Component implementation
  return (
    <div className="tailwind-classes">
      {/* Component JSX */}
    </div>
  );
};
```

### 2. Tailwind CSS Standards
- Use utility-first approach
- Create custom components for repeated patterns
- Use responsive design classes
- Follow consistent spacing scale
- Use semantic color names

### 3. State Management
- Use React Query for server state
- Use React Hook Form for form state
- Use Context API for global app state
- Avoid prop drilling with proper state placement

### 4. API Integration
- Use consistent API response formats
- Implement proper error handling
- Use loading states for better UX
- Implement retry mechanisms for failed requests

## Backend Development Rules

### 1. NestJS Structure
```typescript
// Controller pattern
@Controller('api/feature')
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}
  
  @Get()
  async getFeatures(): Promise<FeatureResponse> {
    // Implementation
  }
}

// Service pattern
@Injectable()
export class FeatureService {
  // Business logic implementation
}
```

### 2. Database Rules
- Use Prisma ORM for type-safe database access
- Define proper relationships between models
- Use transactions for multi-table operations
- Implement soft deletes where appropriate
- Use database migrations for schema changes

### 3. API Design Standards
- Use RESTful conventions
- Implement proper HTTP status codes
- Use consistent response formats
- Implement pagination for list endpoints
- Use proper validation decorators

## Configuration Management Rules

### 1. Environment Variables
- Store all sensitive data in environment variables
- Use validation for required environment variables
- Provide default values where appropriate
- Document all environment variables

### 2. Database Configuration
- Encrypt sensitive configuration data
- Implement configuration versioning
- Provide configuration backup/restore
- Log all configuration changes

### 3. Multi-tenant Support
- Separate database per tenant
- Shared user registry in main database
- Tenant-specific configuration isolation
- Proper tenant data segregation

## Security Rules

### 1. Authentication & Authorization
- Use JWT tokens for web authentication
- Implement role-based access control
- Validate user permissions on every request
- Use secure session management

### 2. Data Protection
- Encrypt sensitive data at rest
- Use HTTPS for all communications
- Implement proper input validation
- Sanitize user inputs to prevent injection attacks

### 3. Bot Security
- Validate Telegram user IDs
- Implement rate limiting
- Use webhook validation
- Secure file upload handling

## Testing Rules

### 1. Unit Testing
- Test all business logic functions
- Mock external dependencies
- Use descriptive test names
- Achieve minimum 80% code coverage

### 2. Integration Testing
- Test API endpoints
- Test database operations
- Test bot command handlers
- Test file upload/download operations

### 3. E2E Testing
- Test critical user workflows
- Test bot interactions
- Test web interface functionality
- Test configuration management

## Performance Rules

### 1. Bot Performance
- Use efficient state management
- Implement proper cleanup mechanisms
- Optimize file processing operations
- Use connection pooling for database

### 2. Web Performance
- Implement code splitting
- Use lazy loading for components
- Optimize bundle sizes
- Implement proper caching strategies

### 3. Database Performance
- Use proper indexing
- Optimize query performance
- Implement connection pooling
- Use read replicas where appropriate

## Deployment Rules

### 1. Environment Management
- Use separate environments (dev, staging, prod)
- Implement proper CI/CD pipelines
- Use environment-specific configurations
- Implement proper monitoring and logging

### 2. Docker Configuration
- Use multi-stage builds
- Optimize image sizes
- Use proper health checks
- Implement proper secrets management

### 3. Monitoring & Logging
- Implement structured logging
- Use proper log levels
- Monitor application metrics
- Set up alerting for critical issues

## Code Review Checklist

### Before Submitting PR
- [ ] All tests pass
- [ ] Code follows naming conventions
- [ ] Error handling is implemented
- [ ] Logging is added for important operations
- [ ] Documentation is updated
- [ ] Security considerations are addressed

### During Code Review
- [ ] Code follows established patterns
- [ ] Business logic is properly tested
- [ ] Error scenarios are handled
- [ ] Performance implications are considered
- [ ] Security vulnerabilities are checked
- [ ] Documentation is accurate and complete

## Maintenance Rules

### 1. Regular Maintenance
- Update dependencies regularly
- Monitor security vulnerabilities
- Clean up unused code and files
- Review and update documentation

### 2. Performance Monitoring
- Monitor application performance
- Track user engagement metrics
- Monitor error rates and response times
- Implement proper alerting

### 3. Backup & Recovery
- Implement regular database backups
- Test backup restoration procedures
- Document recovery procedures
- Implement disaster recovery plans
