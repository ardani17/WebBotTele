# Cline Rules untuk Telegram Bot Web Application

## Project Overview
Aplikasi bot telegram dengan web interface menggunakan:
- Frontend: React + Vite + TypeScript
- Backend: NestJS + TypeScript  
- Database: PostgreSQL + Prisma ORM
- Bot API: Telegram Bot API (local server)

## Project Structure Rules

### 1. Monorepo Structure
```
telegram-bot-web-app/
├── apps/
│   ├── frontend/          # React + Vite + TypeScript
│   └── backend/           # NestJS + TypeScript
├── packages/
│   └── shared/            # Shared types, utilities, config
├── scripts/               # Automation scripts
├── docs/                  # Documentation
└── .cline/               # Cline configuration
```

### 2. Frontend Structure (apps/frontend/)
```
src/
├── components/           # Reusable UI components
├── pages/               # Page components
├── hooks/               # Custom React hooks
├── services/            # API service functions
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── styles/              # CSS/styling files
```

### 3. Backend Structure (apps/backend/)
```
src/
├── auth/                # Authentication module
├── users/               # User management
├── telegram/            # Telegram bot logic
│   ├── features/        # Bot feature services
│   └── handlers/        # Message handlers
├── prisma/              # Database service
└── common/              # Shared backend utilities
```

## Code Quality Rules

### 1. TypeScript Rules
- Selalu gunakan TypeScript dengan strict mode enabled
- Definisikan interface/type untuk semua data structures
- Gunakan proper typing untuk function parameters dan return values
- Avoid `any` type, gunakan `unknown` jika diperlukan

### 2. Error Handling Rules
```typescript
// ✅ Good - Proper error handling
try {
  const result = await someAsyncOperation();
  return result;
} catch (error) {
  this.logger.error('Operation failed', error);
  throw new HttpException('Operation failed', HttpStatus.INTERNAL_SERVER_ERROR);
}

// ❌ Bad - No error handling
const result = await someAsyncOperation();
return result;
```

### 3. Logging Rules
```typescript
// ✅ Good - Structured logging
this.logger.info('User created', { userId, telegramId });
this.logger.error('Database operation failed', { error, operation: 'createUser' });

// ❌ Bad - Unstructured logging
console.log('User created');
console.error(error);
```

### 4. Environment Variables Rules
- Semua konfigurasi harus menggunakan environment variables
- Provide default values untuk development
- Validate required environment variables at startup

```typescript
// ✅ Good
const config = {
  port: process.env.PORT || 3001,
  telegramToken: process.env.TELEGRAM_BOT_TOKEN, // Required
  databaseUrl: process.env.DATABASE_URL, // Required
};

// Validate required vars
if (!config.telegramToken) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}
```

## API Development Rules

### 1. RESTful API Conventions
```typescript
// ✅ Good - RESTful endpoints
GET    /api/users           # Get all users
GET    /api/users/:id       # Get user by ID
POST   /api/users           # Create user
PUT    /api/users/:id       # Update user
DELETE /api/users/:id       # Delete user

// ❌ Bad - Non-RESTful
GET    /api/getAllUsers
POST   /api/createNewUser
```

### 2. DTO (Data Transfer Objects) Rules
```typescript
// ✅ Good - Proper DTO with validation
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  telegramId: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}
```

### 3. Response Format Rules
```typescript
// ✅ Good - Consistent response format
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}

// For errors
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Database Rules

### 1. Prisma Schema Rules
```prisma
// ✅ Good - Proper model definition
model User {
  id          String   @id @default(cuid())
  telegramId  String   @unique
  username    String?
  email       String?  @unique
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  locations   Location[]
  workbooks   Workbook[]

  @@map("users")
}
```

### 2. Migration Rules
- Selalu buat migration untuk schema changes
- Review migration files sebelum apply
- Backup database sebelum major migrations
- Test migrations di development environment dulu

### 3. Query Rules
```typescript
// ✅ Good - Efficient query with proper error handling
async findUserByTelegramId(telegramId: string): Promise<User | null> {
  try {
    return await this.prisma.user.findUnique({
      where: { telegramId },
      include: {
        locations: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  } catch (error) {
    this.logger.error('Failed to find user', { telegramId, error });
    throw error;
  }
}
```

## Security Rules

### 1. Authentication Rules
- Implementasi JWT authentication untuk web interface
- Validate Telegram webhook dengan secret token
- Rate limiting untuk API endpoints
- Input validation untuk semua user inputs

### 2. Data Sanitization Rules
```typescript
// ✅ Good - Sanitize user input
const sanitizedInput = input.trim().toLowerCase();
const validatedData = await validateDto(CreateUserDto, sanitizedInput);
```

### 3. Environment Security Rules
- Jangan commit secrets ke repository
- Gunakan .env files untuk development
- Gunakan proper secret management untuk production

## Bot Development Rules

### 1. Command Handler Rules
```typescript
// ✅ Good - Structured command handler
@Injectable()
export class LocationService {
  async handleLocationCommand(telegramId: string, chatId: number): Promise<string> {
    try {
      // Validate user
      const user = await this.validateUser(telegramId);
      
      // Initialize feature state
      this.initUserState(telegramId);
      
      // Return help message
      return this.getLocationHelpMessage();
    } catch (error) {
      this.logger.error('Location command failed', { telegramId, error });
      return 'Terjadi kesalahan. Silakan coba lagi.';
    }
  }
}
```

### 2. State Management Rules
- Gunakan in-memory state untuk session data
- Implement cleanup untuk expired sessions
- Persist important data ke database

### 3. Message Format Rules
```typescript
// ✅ Good - Consistent message format
return `🗺️ Mode Lokasi Diaktifkan

Perintah yang tersedia:
• /alamat [alamat] - Mendapatkan koordinat dari alamat
• /koordinat [lat] [long] - Mendapatkan alamat dari koordinat

Ketik /menu untuk kembali ke menu utama.`;
```

## Testing Rules

### 1. Unit Testing Rules
- Test semua service methods
- Mock external dependencies
- Test error scenarios
- Maintain minimum 80% code coverage

### 2. Integration Testing Rules
- Test API endpoints end-to-end
- Test database operations
- Test bot command flows

### 3. E2E Testing Rules
- Test complete user workflows
- Test frontend-backend integration
- Test bot functionality with real Telegram API

## Performance Rules

### 1. Database Performance
- Implement proper indexing
- Use pagination untuk large datasets
- Optimize N+1 query problems
- Monitor query performance

### 2. API Performance
- Implement caching where appropriate
- Use compression for responses
- Implement rate limiting
- Monitor response times

### 3. Bot Performance
- Implement queue system untuk heavy operations
- Add delays untuk rate limiting compliance
- Optimize file processing workflows

## Deployment Rules

### 1. Environment Setup
- Development: Local dengan Docker Compose
- Staging: Mirror production environment
- Production: Secure cloud deployment

### 2. CI/CD Rules
- Automated testing pada setiap commit
- Automated deployment ke staging
- Manual approval untuk production deployment

### 3. Monitoring Rules
- Log semua important operations
- Monitor application metrics
- Set up alerts untuk critical errors
- Regular health checks

## Documentation Rules

### 1. Code Documentation
- Document semua public methods
- Include usage examples
- Document complex business logic
- Keep documentation up-to-date

### 2. API Documentation
- Use Swagger/OpenAPI untuk API docs
- Include request/response examples
- Document error codes
- Provide integration guides

### 3. User Documentation
- Setup guides untuk development
- Deployment instructions
- Feature documentation
- Troubleshooting guides

## File Naming Conventions

### 1. TypeScript Files
- Services: `user.service.ts`
- Controllers: `user.controller.ts`
- DTOs: `create-user.dto.ts`
- Interfaces: `user.interface.ts`
- Types: `user.types.ts`

### 2. React Components
- Components: `UserList.tsx`
- Pages: `Dashboard.tsx`
- Hooks: `useUsers.ts`
- Utils: `api.utils.ts`

### 3. Database Files
- Migrations: `20231201_create_users_table.sql`
- Seeds: `users.seed.ts`
- Schema: `schema.prisma`

## Git Workflow Rules

### 1. Branch Naming
- Features: `feature/user-management`
- Bugfixes: `bugfix/login-error`
- Hotfixes: `hotfix/security-patch`

### 2. Commit Messages
```
feat: add user management API
fix: resolve login authentication issue
docs: update API documentation
refactor: optimize database queries
```

### 3. Pull Request Rules
- Include description of changes
- Link related issues
- Ensure tests pass
- Request code review
- Update documentation if needed
