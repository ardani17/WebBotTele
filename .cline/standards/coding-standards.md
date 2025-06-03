# Coding Standards

## General Principles

### 1. Code Readability
- Write self-documenting code with clear variable and function names
- Use meaningful comments for complex business logic
- Keep functions small and focused on single responsibility
- Use consistent indentation (2 spaces for TypeScript/JavaScript)

### 2. Error Handling
- Always handle errors explicitly
- Use try-catch blocks for async operations
- Log errors with sufficient context
- Return user-friendly error messages

### 3. Performance
- Avoid N+1 query problems
- Use database indexes appropriately
- Implement pagination for large datasets
- Cache frequently accessed data

## TypeScript Standards

### 1. Type Definitions
```typescript
// ✅ Good - Explicit interface definitions
interface User {
  id: string;
  telegramId: string;
  username?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ Good - Union types for specific values
type UserRole = 'admin' | 'user' | 'moderator';

// ❌ Bad - Using any type
const userData: any = { ... };

// ✅ Good - Using unknown for uncertain types
const userData: unknown = await fetchUserData();
```

### 2. Function Signatures
```typescript
// ✅ Good - Clear parameter and return types
async function createUser(
  data: CreateUserDto,
  options?: CreateUserOptions
): Promise<User> {
  // Implementation
}

// ✅ Good - Generic types when appropriate
function processItems<T>(
  items: T[],
  processor: (item: T) => T
): T[] {
  return items.map(processor);
}
```

### 3. Enum Usage
```typescript
// ✅ Good - String enums for better debugging
enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

// ✅ Good - Const assertions for readonly arrays
const SUPPORTED_LANGUAGES = ['en', 'id', 'es'] as const;
type Language = typeof SUPPORTED_LANGUAGES[number];
```

## Backend Standards (NestJS)

### 1. Module Structure
```typescript
@Module({
  imports: [
    PrismaModule,
    ConfigModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
  ],
  exports: [UserService],
})
export class UserModule {}
```

### 2. Service Implementation
```typescript
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async findById(id: string): Promise<User | null> {
    try {
      this.logger.debug(`Finding user by ID: ${id}`);
      
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        this.logger.warn(`User not found: ${id}`);
        return null;
      }

      this.logger.debug(`User found: ${user.id}`);
      return user;
    } catch (error) {
      this.logger.error(`Failed to find user: ${id}`, error);
      throw new HttpException(
        'Failed to retrieve user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
```

### 3. Controller Implementation
```typescript
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiTags('Users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User found', type: UserDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserDto> {
    const user = await this.userService.findById(id);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToDto(user);
  }

  private mapToDto(user: User): UserDto {
    return {
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
```

### 4. DTO Validation
```typescript
export class CreateUserDto {
  @ApiProperty({ description: 'Telegram user ID' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  telegramId: string;

  @ApiProperty({ description: 'Username', required: false })
  @IsString()
  @IsOptional()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  username?: string;

  @ApiProperty({ description: 'Email address', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;
}
```

## Frontend Standards (React)

### 1. Component Structure
```typescript
interface UserListProps {
  filters?: UserFilters;
  onUserSelect?: (user: User) => void;
  className?: string;
}

export const UserList: React.FC<UserListProps> = ({
  filters,
  onUserSelect,
  className = '',
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom hooks for data fetching
  const { data, loading: apiLoading, error: apiError, refetch } = useUsers(filters);

  useEffect(() => {
    if (data) {
      setUsers(data);
    }
    setLoading(apiLoading);
    setError(apiError);
  }, [data, apiLoading, apiError]);

  const handleUserClick = useCallback((user: User) => {
    onUserSelect?.(user);
  }, [onUserSelect]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }

  return (
    <div className={`user-list ${className}`}>
      {users.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          onClick={handleUserClick}
        />
      ))}
    </div>
  );
};
```

### 2. Custom Hooks
```typescript
export const useUsers = (filters?: UserFilters) => {
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (filters?.search) {
        queryParams.append('search', filters.search);
      }
      if (filters?.status) {
        queryParams.append('status', filters.status);
      }

      const response = await fetch(`/api/users?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { data, loading, error, refetch: fetchUsers };
};
```

### 3. State Management
```typescript
// Context for global state
interface AppContextType {
  user: User | null;
  theme: 'light' | 'dark';
  setUser: (user: User | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

// Local state with useReducer for complex state
interface UserFormState {
  data: Partial<User>;
  errors: Record<string, string>;
  loading: boolean;
}

type UserFormAction =
  | { type: 'SET_FIELD'; field: string; value: any }
  | { type: 'SET_ERRORS'; errors: Record<string, string> }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'RESET' };

const userFormReducer = (state: UserFormState, action: UserFormAction): UserFormState => {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        data: { ...state.data, [action.field]: action.value },
        errors: { ...state.errors, [action.field]: '' },
      };
    case 'SET_ERRORS':
      return { ...state, errors: action.errors };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'RESET':
      return { data: {}, errors: {}, loading: false };
    default:
      return state;
  }
};
```

## Database Standards (Prisma)

### 1. Schema Design
```prisma
model User {
  id          String   @id @default(cuid())
  telegramId  String   @unique @map("telegram_id")
  username    String?
  email       String?  @unique
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  locations   Location[]
  workbooks   Workbook[]

  @@map("users")
  @@index([telegramId])
  @@index([email])
}

model Location {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  latitude  Float
  longitude Float
  address   String?
  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("locations")
  @@index([userId])
  @@index([latitude, longitude])
}
```

### 2. Query Optimization
```typescript
// ✅ Good - Include related data efficiently
const usersWithLocations = await prisma.user.findMany({
  include: {
    locations: {
      take: 5,
      orderBy: { createdAt: 'desc' },
    },
  },
  where: {
    isActive: true,
  },
  orderBy: { createdAt: 'desc' },
  take: 20,
});

// ✅ Good - Use select for specific fields
const userSummary = await prisma.user.findMany({
  select: {
    id: true,
    username: true,
    _count: {
      select: {
        locations: true,
        workbooks: true,
      },
    },
  },
});

// ✅ Good - Use transactions for related operations
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({
    data: userData,
  });

  const profile = await tx.profile.create({
    data: {
      ...profileData,
      userId: user.id,
    },
  });

  return { user, profile };
});
```

## Bot Development Standards

### 1. Command Structure
```typescript
@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private userStates = new Map<string, UserLocationState>();

  async handleLocationCommand(telegramId: string, chatId: number): Promise<string> {
    try {
      // Validate user exists
      const user = await this.validateUser(telegramId);
      
      // Initialize state
      this.initUserState(telegramId);
      
      // Log command usage
      this.logger.log('Location command initiated', { telegramId, chatId });
      
      return this.getLocationHelpMessage();
    } catch (error) {
      this.logger.error('Location command failed', { telegramId, error });
      return 'Terjadi kesalahan. Silakan coba lagi nanti.';
    }
  }

  private getLocationHelpMessage(): string {
    return `🗺️ Mode Lokasi Diaktifkan

Perintah yang tersedia:
• /alamat [alamat] - Mendapatkan koordinat dari alamat
• /koordinat [lat] [long] - Mendapatkan alamat dari koordinat
• /ukur - Mengukur jarak antara dua titik

Ketik /menu untuk kembali ke menu utama.`;
  }
}
```

### 2. State Management
```typescript
interface UserLocationState {
  isActive: boolean;
  mode: 'idle' | 'measuring' | 'geocoding';
  firstPoint?: LocationPoint;
  secondPoint?: LocationPoint;
  timestamp: number;
}

private initUserState(telegramId: string): void {
  this.userStates.set(telegramId, {
    isActive: true,
    mode: 'idle',
    timestamp: Date.now(),
  });
}

private cleanupExpiredStates(): void {
  const now = Date.now();
  const timeout = 10 * 60 * 1000; // 10 minutes

  for (const [telegramId, state] of this.userStates.entries()) {
    if (now - state.timestamp > timeout) {
      this.userStates.delete(telegramId);
    }
  }
}
```

## Testing Standards

### 1. Unit Test Structure
```typescript
describe('UserService', () => {
  let service: UserService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: createMockPrismaService(),
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get(PrismaService);
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      // Arrange
      const userData = { telegramId: '123', username: 'test' };
      const expectedUser = { id: '1', ...userData, createdAt: new Date() };
      
      prisma.user.create.mockResolvedValue(expectedUser as User);

      // Act
      const result = await service.createUser(userData);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: userData,
      });
    });

    it('should handle database errors', async () => {
      // Arrange
      const userData = { telegramId: '123', username: 'test' };
      prisma.user.create.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.createUser(userData)).rejects.toThrow(HttpException);
    });
  });
});
```

### 2. Integration Test Structure
```typescript
describe('UserController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    
    await app.init();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('/users (POST)', () => {
    it('should create a new user', async () => {
      const userData = {
        telegramId: '123456789',
        username: 'testuser',
        email: 'test@example.com',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        telegramId: userData.telegramId,
        username: userData.username,
        email: userData.email,
      });

      // Verify in database
      const user = await prisma.user.findUnique({
        where: { telegramId: userData.telegramId },
      });
      expect(user).toBeTruthy();
    });
  });
});
```

## Documentation Standards

### 1. Code Comments
```typescript
/**
 * Creates a new user in the system
 * 
 * @param data - User creation data
 * @param options - Additional options for user creation
 * @returns Promise resolving to the created user
 * @throws HttpException when user creation fails
 * 
 * @example
 * ```typescript
 * const user = await userService.createUser({
 *   telegramId: '123456789',
 *   username: 'john_doe'
 * });
 * ```
 */
async createUser(
  data: CreateUserDto,
  options?: CreateUserOptions
): Promise<User> {
  // Implementation
}
```

### 2. API Documentation
```typescript
@ApiOperation({
  summary: 'Create a new user',
  description: 'Creates a new user account with the provided information',
})
@ApiBody({
  type: CreateUserDto,
  description: 'User creation data',
  examples: {
    basic: {
      summary: 'Basic user creation',
      value: {
        telegramId: '123456789',
        username: 'john_doe',
      },
    },
    complete: {
      summary: 'Complete user creation',
      value: {
        telegramId: '123456789',
        username: 'john_doe',
        email: 'john@example.com',
      },
    },
  },
})
@ApiResponse({
  status: 201,
  description: 'User created successfully',
  type: UserDto,
})
@ApiResponse({
  status: 400,
  description: 'Invalid input data',
  schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      error: { type: 'string', example: 'Validation failed' },
      details: {
        type: 'array',
        items: { type: 'string' },
        example: ['telegramId is required'],
      },
    },
  },
})
```

These standards ensure consistent, maintainable, and high-quality code across the entire telegram bot application.
