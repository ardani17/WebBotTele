# Configuration Management Workflow

## Overview
This workflow guides the development of a comprehensive configuration management system for the Telegram bot web application, enabling dynamic configuration updates without service restarts.

## Prerequisites
- Understanding of environment variable management
- Knowledge of database encryption and security
- Familiarity with configuration validation patterns
- Understanding of multi-tenant architecture

## Configuration Architecture

### 1. Configuration Layers
```typescript
// Configuration hierarchy (highest to lowest priority)
enum ConfigLayer {
  RUNTIME = 'runtime',        // Dynamic updates via web admin
  DATABASE = 'database',      // Stored configuration
  ENVIRONMENT = 'environment', // Environment variables
  DEFAULT = 'default'         // Default values
}

interface ConfigurationSource {
  layer: ConfigLayer;
  priority: number;
  getValue(key: string): any;
  setValue?(key: string, value: any): Promise<void>;
}
```

### 2. Configuration Schema Definition
```typescript
// Define all configuration options with validation
interface BotConfiguration {
  // Core Bot Settings
  bot: {
    token: string;
    webhookUrl?: string;
    pollingInterval?: number;
    maxConnections?: number;
  };
  
  // Database Configuration
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    ssl?: boolean;
    connectionLimit?: number;
  };
  
  // Redis Configuration
  redis: {
    url: string;
    password?: string;
    db?: number;
    keyPrefix?: string;
  };
  
  // External API Keys
  apis: {
    telegram: {
      apiId: string;
      apiHash: string;
    };
    openRouteService: {
      apiKey: string;
    };
    googleCloudVision: {
      projectId: string;
      keyFile: string;
    };
    mapbox: {
      apiKey: string;
    };
  };
  
  // Feature Access Control
  access: {
    registeredUsers: string[];
    features: {
      location: string[];
      workbook: string[];
      ocr: string[];
      rar: string[];
      kml: string[];
      geotags: string[];
    };
  };
  
  // File Storage Configuration
  storage: {
    basePath: string;
    botApiDataPath: string;
    maxFileSize: number;
    allowedFileTypes: string[];
    cleanupInterval: number;
  };
  
  // Security Settings
  security: {
    otpSecret: string;
    sessionSecret: string;
    jwtSecret: string;
    encryptionKey: string;
    rateLimiting: {
      windowMs: number;
      maxRequests: number;
    };
  };
  
  // Application Settings
  app: {
    port: number;
    environment: 'development' | 'staging' | 'production';
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    corsOrigins: string[];
  };
}
```

### 3. Configuration Manager Implementation
```typescript
// Core configuration manager
export class ConfigurationManager {
  private sources: ConfigurationSource[] = [];
  private cache = new Map<string, any>();
  private validators = new Map<string, (value: any) => boolean>();
  private changeListeners = new Map<string, ((value: any) => void)[]>();
  
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService
  ) {
    this.initializeSources();
    this.setupValidators();
  }
  
  private initializeSources(): void {
    // Add configuration sources in priority order
    this.sources = [
      new RuntimeConfigSource(),
      new DatabaseConfigSource(this.prisma, this.encryption),
      new EnvironmentConfigSource(),
      new DefaultConfigSource(),
    ];
  }
  
  async get<T = any>(key: string): Promise<T> {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    // Try each source in priority order
    for (const source of this.sources) {
      try {
        const value = await source.getValue(key);
        if (value !== undefined) {
          this.cache.set(key, value);
          return value;
        }
      } catch (error) {
        logger.warn(`Error getting config from ${source.layer}`, { key, error });
      }
    }
    
    throw new Error(`Configuration key not found: ${key}`);
  }
  
  async set(key: string, value: any, layer: ConfigLayer = ConfigLayer.DATABASE): Promise<void> {
    // Validate the value
    if (!this.validate(key, value)) {
      throw new Error(`Invalid configuration value for key: ${key}`);
    }
    
    // Find the appropriate source
    const source = this.sources.find(s => s.layer === layer && s.setValue);
    if (!source || !source.setValue) {
      throw new Error(`Cannot set configuration in layer: ${layer}`);
    }
    
    // Set the value
    await source.setValue(key, value);
    
    // Update cache
    this.cache.set(key, value);
    
    // Notify listeners
    this.notifyListeners(key, value);
    
    logger.info('Configuration updated', { key, layer, value: this.sanitizeForLog(key, value) });
  }
  
  async getAll(): Promise<BotConfiguration> {
    const config: any = {};
    
    // Get all configuration keys
    const allKeys = await this.getAllKeys();
    
    for (const key of allKeys) {
      try {
        const value = await this.get(key);
        this.setNestedValue(config, key, value);
      } catch (error) {
        logger.warn(`Failed to get configuration key: ${key}`, { error });
      }
    }
    
    return config as BotConfiguration;
  }
  
  async reload(): Promise<void> {
    // Clear cache to force reload from sources
    this.cache.clear();
    
    // Reload all sources
    for (const source of this.sources) {
      if (source.reload) {
        await source.reload();
      }
    }
    
    logger.info('Configuration reloaded');
  }
  
  onConfigChange(key: string, listener: (value: any) => void): void {
    if (!this.changeListeners.has(key)) {
      this.changeListeners.set(key, []);
    }
    this.changeListeners.get(key)!.push(listener);
  }
  
  private validate(key: string, value: any): boolean {
    const validator = this.validators.get(key);
    return validator ? validator(value) : true;
  }
  
  private notifyListeners(key: string, value: any): void {
    const listeners = this.changeListeners.get(key) || [];
    listeners.forEach(listener => {
      try {
        listener(value);
      } catch (error) {
        logger.error('Error in config change listener', { key, error });
      }
    });
  }
  
  private sanitizeForLog(key: string, value: any): any {
    // Don't log sensitive values
    const sensitiveKeys = ['password', 'secret', 'key', 'token'];
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      return '[REDACTED]';
    }
    return value;
  }
  
  private setupValidators(): void {
    // Bot token validation
    this.validators.set('bot.token', (value: string) => {
      return typeof value === 'string' && value.match(/^\d+:[A-Za-z0-9_-]+$/);
    });
    
    // Database port validation
    this.validators.set('database.port', (value: number) => {
      return Number.isInteger(value) && value > 0 && value <= 65535;
    });
    
    // Email validation for user IDs (if needed)
    this.validators.set('access.registeredUsers', (value: string[]) => {
      return Array.isArray(value) && value.every(id => typeof id === 'string');
    });
    
    // Add more validators as needed
  }
}
```

### 4. Configuration Sources Implementation

#### Database Configuration Source
```typescript
export class DatabaseConfigSource implements ConfigurationSource {
  layer = ConfigLayer.DATABASE;
  priority = 2;
  
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService
  ) {}
  
  async getValue(key: string): Promise<any> {
    const config = await this.prisma.configuration.findUnique({
      where: { key },
    });
    
    if (!config) {
      return undefined;
    }
    
    // Decrypt sensitive values
    if (config.isEncrypted) {
      return this.encryption.decrypt(config.value);
    }
    
    return JSON.parse(config.value);
  }
  
  async setValue(key: string, value: any): Promise<void> {
    const isEncrypted = this.shouldEncrypt(key);
    const serializedValue = isEncrypted 
      ? this.encryption.encrypt(JSON.stringify(value))
      : JSON.stringify(value);
    
    await this.prisma.configuration.upsert({
      where: { key },
      update: {
        value: serializedValue,
        isEncrypted,
        updatedAt: new Date(),
      },
      create: {
        key,
        value: serializedValue,
        isEncrypted,
      },
    });
  }
  
  private shouldEncrypt(key: string): boolean {
    const sensitiveKeys = [
      'bot.token',
      'database.password',
      'redis.password',
      'security.otpSecret',
      'security.sessionSecret',
      'security.jwtSecret',
      'security.encryptionKey',
      'apis.telegram.apiHash',
      'apis.openRouteService.apiKey',
      'apis.googleCloudVision.keyFile',
      'apis.mapbox.apiKey',
    ];
    
    return sensitiveKeys.includes(key);
  }
}
```

#### Environment Configuration Source
```typescript
export class EnvironmentConfigSource implements ConfigurationSource {
  layer = ConfigLayer.ENVIRONMENT;
  priority = 3;
  
  getValue(key: string): any {
    // Convert dot notation to environment variable format
    const envKey = this.keyToEnvVar(key);
    const value = process.env[envKey];
    
    if (value === undefined) {
      return undefined;
    }
    
    // Try to parse as JSON, fallback to string
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  
  private keyToEnvVar(key: string): string {
    // Convert 'bot.token' to 'BOT_TOKEN'
    return key.toUpperCase().replace(/\./g, '_');
  }
}
```

### 5. Web Admin Configuration Interface

#### Configuration Controller
```typescript
@Controller('api/configuration')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ConfigurationController {
  constructor(
    private configManager: ConfigurationManager,
    private auditService: AuditService
  ) {}
  
  @Get()
  async getConfiguration(): Promise<BotConfiguration> {
    return this.configManager.getAll();
  }
  
  @Get(':key')
  async getConfigValue(@Param('key') key: string): Promise<{ key: string; value: any }> {
    const value = await this.configManager.get(key);
    return { key, value };
  }
  
  @Put(':key')
  async updateConfigValue(
    @Param('key') key: string,
    @Body() body: { value: any },
    @Req() req: any
  ): Promise<{ message: string }> {
    const oldValue = await this.configManager.get(key).catch(() => null);
    
    await this.configManager.set(key, body.value);
    
    // Audit the change
    await this.auditService.logConfigChange({
      key,
      oldValue,
      newValue: body.value,
      changedBy: req.user.id,
      timestamp: new Date(),
    });
    
    return { message: 'Configuration updated successfully' };
  }
  
  @Post('reload')
  async reloadConfiguration(): Promise<{ message: string }> {
    await this.configManager.reload();
    return { message: 'Configuration reloaded successfully' };
  }
  
  @Post('validate')
  async validateConfiguration(
    @Body() config: Partial<BotConfiguration>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // Validate each configuration section
    if (config.bot?.token && !this.isValidBotToken(config.bot.token)) {
      errors.push('Invalid bot token format');
    }
    
    if (config.database?.port && !this.isValidPort(config.database.port)) {
      errors.push('Invalid database port');
    }
    
    // Add more validations
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  @Get('backup/export')
  async exportConfiguration(): Promise<{ config: BotConfiguration; timestamp: string }> {
    const config = await this.configManager.getAll();
    
    // Remove sensitive data from export
    const sanitizedConfig = this.sanitizeConfigForExport(config);
    
    return {
      config: sanitizedConfig,
      timestamp: new Date().toISOString(),
    };
  }
  
  @Post('backup/import')
  async importConfiguration(
    @Body() body: { config: BotConfiguration; overwrite?: boolean },
    @Req() req: any
  ): Promise<{ message: string; imported: number }> {
    const { config, overwrite = false } = body;
    let imported = 0;
    
    for (const [key, value] of Object.entries(this.flattenConfig(config))) {
      try {
        if (overwrite || !(await this.configManager.get(key).catch(() => null))) {
          await this.configManager.set(key, value);
          imported++;
        }
      } catch (error) {
        logger.warn(`Failed to import config key: ${key}`, { error });
      }
    }
    
    // Audit the import
    await this.auditService.logConfigImport({
      importedBy: req.user.id,
      itemsImported: imported,
      timestamp: new Date(),
    });
    
    return {
      message: `Configuration imported successfully. ${imported} items updated.`,
      imported,
    };
  }
  
  private isValidBotToken(token: string): boolean {
    return /^\d+:[A-Za-z0-9_-]+$/.test(token);
  }
  
  private isValidPort(port: number): boolean {
    return Number.isInteger(port) && port > 0 && port <= 65535;
  }
  
  private sanitizeConfigForExport(config: BotConfiguration): BotConfiguration {
    // Create a deep copy and remove sensitive data
    const sanitized = JSON.parse(JSON.stringify(config));
    
    // Remove sensitive fields
    if (sanitized.bot?.token) sanitized.bot.token = '[REDACTED]';
    if (sanitized.database?.password) sanitized.database.password = '[REDACTED]';
    if (sanitized.security) sanitized.security = '[REDACTED]';
    
    return sanitized;
  }
  
  private flattenConfig(config: any, prefix = ''): Record<string, any> {
    const flattened: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(config)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenConfig(value, fullKey));
      } else {
        flattened[fullKey] = value;
      }
    }
    
    return flattened;
  }
}
```

#### Frontend Configuration Management
```typescript
// Configuration management page
export const ConfigurationManagement: React.FC = () => {
  const [config, setConfig] = useState<BotConfiguration | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { data: configData, refetch } = useQuery({
    queryKey: ['configuration'],
    queryFn: configApi.getAll,
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) =>
      configApi.update(key, value),
    onSuccess: () => {
      refetch();
      setEditingKey(null);
      toast.success('Configuration updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update configuration');
    },
  });
  
  const reloadMutation = useMutation({
    mutationFn: configApi.reload,
    onSuccess: () => {
      refetch();
      toast.success('Configuration reloaded successfully');
    },
  });
  
  const renderConfigSection = (section: string, data: any) => {
    return (
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 capitalize">
          {section} Configuration
        </h3>
        <div className="space-y-4">
          {Object.entries(data).map(([key, value]) => (
            <ConfigField
              key={key}
              fullKey={`${section}.${key}`}
              label={key}
              value={value}
              isEditing={editingKey === `${section}.${key}`}
              onEdit={() => setEditingKey(`${section}.${key}`)}
              onSave={(newValue) => {
                updateMutation.mutate({
                  key: `${section}.${key}`,
                  value: newValue,
                });
              }}
              onCancel={() => setEditingKey(null)}
            />
          ))}
        </div>
      </div>
    );
  };
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Configuration Management</h1>
        <div className="space-x-3">
          <Button
            onClick={() => reloadMutation.mutate()}
            isLoading={reloadMutation.isLoading}
            variant="secondary"
          >
            Reload Configuration
          </Button>
          <Button onClick={() => {/* Export logic */}}>
            Export Configuration
          </Button>
        </div>
      </div>
      
      {configData && (
        <div>
          {Object.entries(configData).map(([section, data]) => (
            <div key={section}>
              {renderConfigSection(section, data)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### 6. Configuration Validation and Migration

#### Configuration Validator
```typescript
export class ConfigurationValidator {
  private schema: any;
  
  constructor() {
    this.schema = this.buildValidationSchema();
  }
  
  validate(config: Partial<BotConfiguration>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      this.schema.validateSync(config, { abortEarly: false });
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        errors.push(...error.errors);
      }
    }
    
    // Additional custom validations
    this.validateBotToken(config.bot?.token, errors);
    this.validateDatabaseConnection(config.database, errors, warnings);
    this.validateApiKeys(config.apis, errors, warnings);
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  private buildValidationSchema() {
    return yup.object({
      bot: yup.object({
        token: yup.string().required('Bot token is required'),
        webhookUrl: yup.string().url().optional(),
        pollingInterval: yup.number().min(100).max(10000).optional(),
      }),
      database: yup.object({
        host: yup.string().required('Database host is required'),
        port: yup.number().min(1).max(65535).required('Database port is required'),
        username: yup.string().required('Database username is required'),
        password: yup.string().required('Database password is required'),
        database: yup.string().required('Database name is required'),
      }),
      // Add more schema definitions
    });
  }
  
  private validateBotToken(token: string | undefined, errors: string[]): void {
    if (token && !/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
      errors.push('Invalid bot token format');
    }
  }
  
  private validateDatabaseConnection(
    dbConfig: any,
    errors: string[],
    warnings: string[]
  ): void {
    if (dbConfig?.host === 'localhost' && process.env.NODE_ENV === 'production') {
      warnings.push('Using localhost database in production environment');
    }
  }
  
  private validateApiKeys(
    apiConfig: any,
    errors: string[],
    warnings: string[]
  ): void {
    // Validate API key formats and warn about missing optional keys
    if (apiConfig?.openRouteService?.apiKey && 
        apiConfig.openRouteService.apiKey.length < 32) {
      warnings.push('OpenRouteService API key appears to be invalid');
    }
  }
}
```

#### Configuration Migration System
```typescript
export class ConfigurationMigrator {
  private migrations: ConfigMigration[] = [];
  
  constructor(private configManager: ConfigurationManager) {
    this.registerMigrations();
  }
  
  async migrate(): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    const targetVersion = this.getLatestVersion();
    
    if (currentVersion >= targetVersion) {
      logger.info('Configuration is up to date', { currentVersion, targetVersion });
      return;
    }
    
    logger.info('Starting configuration migration', { currentVersion, targetVersion });
    
    for (const migration of this.migrations) {
      if (migration.version > currentVersion && migration.version <= targetVersion) {
        await this.runMigration(migration);
      }
    }
    
    await this.setCurrentVersion(targetVersion);
    logger.info('Configuration migration completed', { targetVersion });
  }
  
  private async runMigration(migration: ConfigMigration): Promise<void> {
    try {
      logger.info(`Running migration: ${migration.name}`, { version: migration.version });
      await migration.up(this.configManager);
      logger.info(`Migration completed: ${migration.name}`);
    } catch (error) {
      logger.error(`Migration failed: ${migration.name}`, { error });
      throw error;
    }
  }
  
  private registerMigrations(): void {
    this.migrations = [
      {
        version: 1,
        name: 'Initial configuration structure',
        up: async (config) => {
          // Initial setup
        },
      },
      {
        version: 2,
        name: 'Add security configuration',
        up: async (config) => {
          const jwtSecret = await config.get('security.jwtSecret').catch(() => null);
          if (!jwtSecret) {
            await config.set('security.jwtSecret', this.generateSecret());
          }
        },
      },
      // Add more migrations
    ];
  }
  
  private generateSecret(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }
}
```

## Testing Configuration Management

### 1. Unit Tests
```typescript
describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;
  let mockPrisma: jest.Mocked<PrismaService>;
  
  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    configManager = new ConfigurationManager(mockPrisma, mockEncryption);
  });
  
  test('should get configuration from database', async () => {
    mockPrisma.configuration.findUnique.mockResolvedValue({
      key: 'bot.token',
      value: '"test-token"',
      isEncrypted: false,
    });
    
    const value = await configManager.get('bot.token');
    expect(value).toBe('test-token');
  });
  
  test('should set configuration in database', async () => {
    await configManager.set('bot.token', 'new-token');
    
    expect(mockPrisma.configuration.upsert).toHaveBeenCalledWith({
      where: { key: 'bot.token' },
      update: expect.objectContaining({
        value: '"new-token"',
        isEncrypted: true,
      }),
      create: expect.objectContaining({
        key: 'bot.token',
        value: '"new-token"',
        isEncrypted: true,
      }),
    });
  });
});
```

### 2. Integration Tests
```typescript
describe('Configuration API', () => {
  test('should update configuration via API', async () => {
    const response = await request(app)
      .put('/api/configuration/bot.token')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ value: 'new-token' })
      .expect(200);
    
    expect(response.body.message).toBe('Configuration updated successfully');
  });
  
  test('should validate configuration before saving', async () => {
    const response = await request(app)
      .put('/api/configuration/bot.token')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ value: 'invalid-token' })
      .expect(400);
    
    expect(response.body.error).toContain('Invalid configuration value');
  });
});
```

## Best Practices

### 1. Security
- Encrypt sensitive configuration values
- Use proper access controls for configuration management
- Audit all configuration changes
- Validate configuration values before applying

### 2. Performance
- Cache frequently accessed configuration values
- Use efficient data structures for configuration storage
- Implement lazy loading for large configurations
- Monitor configuration access patterns

### 3. Reliability
- Implement configuration validation
- Use database transactions for configuration updates
- Provide configuration backup and restore
- Test configuration changes in staging environment

### 4. Maintainability
- Use clear naming conventions for configuration keys
- Document all configuration options
- Implement configuration migration system
- Provide configuration templates and examples

## Troubleshooting

### Common Issues
1. **Configuration not updating**: Check cache invalidation
2. **Validation errors**: Review validation rules and input format
3. **Encryption failures**: Verify encryption key configuration
4. **Database connection issues**: Check database configuration and connectivity
5. **Permission errors**: Verify user roles and access controls

### Debugging Tips
1. Enable debug logging for configuration operations
2. Monitor configuration change audit logs
3. Test configuration validation separately
4. Use configuration export/import for debugging
5. Verify environment variable loading
