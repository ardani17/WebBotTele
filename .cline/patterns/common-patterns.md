# Common Development Patterns

## Backend Patterns

### 1. Service Pattern
```typescript
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async createUser(data: CreateUserDto): Promise<User> {
    try {
      this.logger.log('Creating user', { telegramId: data.telegramId });
      
      const user = await this.prisma.user.create({
        data: {
          telegramId: data.telegramId,
          username: data.username,
          email: data.email,
        },
      });

      this.logger.log('User created successfully', { userId: user.id });
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', error);
      throw new HttpException(
        'Failed to create user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
```

### 2. Controller Pattern
```typescript
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiTags('Users')
export class UserController {
  constructor(private userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.userService.createUser(createUserDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id') id: string): Promise<User> {
    return this.userService.findById(id);
  }
}
```

### 3. DTO Pattern
```typescript
export class CreateUserDto {
  @ApiProperty({ description: 'Telegram user ID' })
  @IsString()
  @IsNotEmpty()
  telegramId: string;

  @ApiProperty({ description: 'Username', required: false })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ description: 'Email address', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

### 4. Error Handling Pattern
```typescript
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    } else if (exception instanceof PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      message = this.handlePrismaError(exception);
    }

    this.logger.error('Exception caught', {
      path: request.url,
      method: request.method,
      status,
      message,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(status).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

## Frontend Patterns

### 1. Custom Hook Pattern
```typescript
export const useApi = <T>(url: string, options?: RequestInit) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result.data || result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};
```

### 2. Component with Error Boundary Pattern
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<
  PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong.</h2>
          <details>
            {this.state.error && this.state.error.toString()}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 3. Form Handling Pattern
```typescript
export const UserForm: React.FC<{ onSubmit: (data: UserData) => void }> = ({
  onSubmit,
}) => {
  const [formData, setFormData] = useState<UserData>({
    username: '',
    email: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          type="text"
          value={formData.username}
          onChange={(e) =>
            setFormData({ ...formData, username: e.target.value })
          }
          placeholder="Username"
        />
        {errors.username && <span className="error">{errors.username}</span>}
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
};
```

## Bot Development Patterns

### 1. Command Handler Pattern
```typescript
@Injectable()
export class BotCommandHandler {
  private readonly logger = new Logger(BotCommandHandler.name);
  private userStates = new Map<string, UserState>();

  constructor(
    private userService: UserService,
    private locationService: LocationService,
  ) {}

  async handleMessage(update: Update): Promise<void> {
    try {
      const message = update.message;
      if (!message || !message.from) return;

      const telegramId = message.from.id.toString();
      const chatId = message.chat.id;
      const text = message.text;

      // Handle commands
      if (text?.startsWith('/')) {
        await this.handleCommand(telegramId, chatId, text);
        return;
      }

      // Handle regular messages based on user state
      await this.handleUserInput(telegramId, chatId, text || '');
    } catch (error) {
      this.logger.error('Error handling message', error);
    }
  }

  private async handleCommand(
    telegramId: string,
    chatId: number,
    command: string,
  ): Promise<void> {
    const [cmd, ...args] = command.split(' ');

    switch (cmd) {
      case '/start':
        await this.handleStartCommand(telegramId, chatId);
        break;
      case '/location':
        await this.handleLocationCommand(telegramId, chatId);
        break;
      default:
        await this.sendMessage(chatId, 'Unknown command. Type /help for assistance.');
    }
  }
}
```

### 2. State Management Pattern
```typescript
interface UserState {
  mode: 'idle' | 'location' | 'workbook';
  step?: string;
  data?: Record<string, any>;
  timestamp: number;
}

export class BotStateManager {
  private states = new Map<string, UserState>();
  private readonly STATE_TIMEOUT = 10 * 60 * 1000; // 10 minutes

  setState(telegramId: string, state: Partial<UserState>): void {
    const currentState = this.states.get(telegramId) || {
      mode: 'idle',
      timestamp: Date.now(),
    };

    this.states.set(telegramId, {
      ...currentState,
      ...state,
      timestamp: Date.now(),
    });
  }

  getState(telegramId: string): UserState | undefined {
    const state = this.states.get(telegramId);
    
    if (state && Date.now() - state.timestamp > this.STATE_TIMEOUT) {
      this.clearState(telegramId);
      return undefined;
    }

    return state;
  }

  clearState(telegramId: string): void {
    this.states.delete(telegramId);
  }

  cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [telegramId, state] of this.states.entries()) {
      if (now - state.timestamp > this.STATE_TIMEOUT) {
        this.states.delete(telegramId);
      }
    }
  }
}
```

## Database Patterns

### 1. Repository Pattern
```typescript
@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        locations: true,
        workbooks: true,
      },
    });
  }

  async findByTelegramId(telegramId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { telegramId },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    return this.prisma.user.findMany(params);
  }
}
```

### 2. Transaction Pattern
```typescript
@Injectable()
export class UserTransactionService {
  constructor(private prisma: PrismaService) {}

  async createUserWithProfile(
    userData: CreateUserDto,
    profileData: CreateProfileDto,
  ): Promise<{ user: User; profile: Profile }> {
    return this.prisma.$transaction(async (tx) => {
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
  }
}
```

## Testing Patterns

### 1. Service Testing Pattern
```typescript
describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const userData = { telegramId: '123', username: 'test' };
      const expectedUser = { id: '1', ...userData };

      jest.spyOn(prisma.user, 'create').mockResolvedValue(expectedUser as User);

      const result = await service.createUser(userData);

      expect(result).toEqual(expectedUser);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: userData,
      });
    });

    it('should handle creation errors', async () => {
      const userData = { telegramId: '123', username: 'test' };

      jest.spyOn(prisma.user, 'create').mockRejectedValue(new Error('DB Error'));

      await expect(service.createUser(userData)).rejects.toThrow(HttpException);
    });
  });
});
```

### 2. Component Testing Pattern
```typescript
describe('UserList Component', () => {
  const mockUsers = [
    { id: '1', username: 'user1', email: 'user1@test.com' },
    { id: '2', username: 'user2', email: 'user2@test.com' },
  ];

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders user list correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockUsers }),
    });

    render(<UserList />);

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.getByText('user2')).toBeInTheDocument();
    });
  });

  it('handles loading state', () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(<UserList />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    render(<UserList />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

## Configuration Patterns

### 1. Environment Configuration Pattern
```typescript
@Injectable()
export class ConfigService {
  private readonly config: AppConfig;

  constructor() {
    this.config = {
      port: this.getNumber('PORT', 3001),
      database: {
        url: this.getString('DATABASE_URL'),
      },
      telegram: {
        botToken: this.getString('TELEGRAM_BOT_TOKEN'),
        apiId: this.getNumber('TELEGRAM_API_ID'),
        apiHash: this.getString('TELEGRAM_API_HASH'),
      },
      jwt: {
        secret: this.getString('JWT_SECRET'),
        expiresIn: this.getString('JWT_EXPIRES_IN', '24h'),
      },
    };

    this.validateConfig();
  }

  private getString(key: string, defaultValue?: string): string {
    const value = process.env[key] || defaultValue;
    if (!value) {
      throw new Error(`Environment variable ${key} is required`);
    }
    return value;
  }

  private getNumber(key: string, defaultValue?: number): number {
    const value = process.env[key];
    if (!value && defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is required`);
    }
    return value ? parseInt(value, 10) : defaultValue!;
  }

  private validateConfig(): void {
    const requiredFields = [
      'database.url',
      'telegram.botToken',
      'telegram.apiId',
      'telegram.apiHash',
      'jwt.secret',
    ];

    for (const field of requiredFields) {
      const value = this.getNestedValue(this.config, field);
      if (!value) {
        throw new Error(`Configuration field ${field} is missing`);
      }
    }
  }

  get<T = any>(key: string): T {
    return this.getNestedValue(this.config, key);
  }
}
```

These patterns provide a solid foundation for consistent development across the telegram bot application.
