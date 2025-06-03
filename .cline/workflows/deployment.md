# Deployment Workflow

## Overview
This workflow guides the deployment of the Telegram bot web application using Docker, CI/CD pipelines, and production best practices.

## Prerequisites
- Docker and Docker Compose knowledge
- Understanding of CI/CD concepts
- Familiarity with environment management
- Knowledge of monitoring and logging

## Deployment Architecture

### 1. Environment Structure
```yaml
# Production environment structure
environments:
  development:
    - Local development with hot reload
    - SQLite or local PostgreSQL
    - Local file storage
    - Debug logging enabled
    
  staging:
    - Production-like environment
    - Shared PostgreSQL instance
    - Cloud storage simulation
    - Info level logging
    
  production:
    - High availability setup
    - Managed PostgreSQL
    - Cloud storage (S3/GCS)
    - Error level logging
    - Monitoring and alerting
```

### 2. Docker Configuration

#### Multi-stage Dockerfile for Backend
```dockerfile
# apps/backend/Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production

FROM node:18-alpine AS runtime
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Copy built application
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/package.json ./package.json

# Create data directories
RUN mkdir -p /app/data/uploads && chown -R nestjs:nodejs /app/data

USER nestjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "dist/main.js"]
```

#### Dockerfile for Frontend
```dockerfile
# apps/frontend/Dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose for Development
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: telegram_bot_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./apps/backend
      dockerfile: Dockerfile
      target: runtime
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/telegram_bot_dev
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./apps/backend/src:/app/src
      - ./data:/app/data
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build:
      context: ./apps/frontend
      dockerfile: Dockerfile
      target: runtime
    ports:
      - "3000:80"
    environment:
      - REACT_APP_API_URL=http://localhost:3001
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### Docker Compose for Production
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    image: ${DOCKER_REGISTRY}/telegram-bot-backend:${VERSION}
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - BOT_TOKEN=${BOT_TOKEN}
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - app_data:/app/data
      - app_logs:/app/logs
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    image: ${DOCKER_REGISTRY}/telegram-bot-frontend:${VERSION}
    ports:
      - "80:80"
      - "443:443"
    environment:
      - REACT_APP_API_URL=${API_URL}
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - nginx_logs:/var/log/nginx
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - nginx_logs:/var/log/nginx
    depends_on:
      - frontend
      - backend

volumes:
  app_data:
  app_logs:
  nginx_logs:
```

### 3. CI/CD Pipeline Configuration

#### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy Application

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  DOCKER_REGISTRY: ghcr.io
  IMAGE_NAME: telegram-bot

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run unit tests
        run: npm run test:unit
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      
      - name: Generate test coverage
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    
    outputs:
      backend-image: ${{ steps.meta-backend.outputs.tags }}
      frontend-image: ${{ steps.meta-frontend.outputs.tags }}
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.DOCKER_REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata for backend
        id: meta-backend
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.DOCKER_REGISTRY }}/${{ github.repository }}/backend
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}
      
      - name: Build and push backend image
        uses: docker/build-push-action@v4
        with:
          context: ./apps/backend
          push: true
          tags: ${{ steps.meta-backend.outputs.tags }}
          labels: ${{ steps.meta-backend.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      
      - name: Extract metadata for frontend
        id: meta-frontend
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.DOCKER_REGISTRY }}/${{ github.repository }}/frontend
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}
      
      - name: Build and push frontend image
        uses: docker/build-push-action@v4
        with:
          context: ./apps/frontend
          push: true
          tags: ${{ steps.meta-frontend.outputs.tags }}
          labels: ${{ steps.meta-frontend.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to staging
        run: |
          echo "Deploying to staging environment..."
          # Add staging deployment commands
      
      - name: Run smoke tests
        run: |
          echo "Running smoke tests..."
          # Add smoke test commands

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to production
        run: |
          echo "Deploying to production environment..."
          # Add production deployment commands
      
      - name: Run health checks
        run: |
          echo "Running health checks..."
          # Add health check commands
      
      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 4. Environment Configuration

#### Environment Variables Template
```bash
# .env.example
# Application Configuration
NODE_ENV=production
PORT=3001
API_URL=https://api.yourdomain.com

# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database
DATABASE_SSL=true
DATABASE_CONNECTION_LIMIT=20

# Redis Configuration
REDIS_URL=redis://username:password@host:port
REDIS_DB=0

# Bot Configuration
BOT_TOKEN=your_bot_token_here
BOT_WEBHOOK_URL=https://yourdomain.com/webhook
BOT_API_DATA_PATH=/app/data/bot-api

# Security Configuration
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
ENCRYPTION_KEY=your_encryption_key_here
OTP_SECRET=your_otp_secret_here

# External API Keys
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
OPENROUTE_SERVICE_API_KEY=your_openroute_api_key
GOOGLE_CLOUD_VISION_PROJECT_ID=your_project_id
GOOGLE_CLOUD_VISION_KEY_FILE=/app/config/gcp-key.json
MAPBOX_API_KEY=your_mapbox_api_key

# File Storage Configuration
BASE_DATA_PATH=/app/data
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,xlsx,xls,csv,rar,zip

# Feature Access Control
REGISTERED_USERS=user1,user2,user3
LOCATION_ACCESS_USERS=user1,user2
WORKBOOK_ACCESS_USERS=user1,user3
OCR_ACCESS_USERS=user1
RAR_ACCESS_USERS=user2
KML_ACCESS_USERS=user1,user2
GEOTAGS_ACCESS_USERS=user1

# Monitoring and Logging
LOG_LEVEL=info
SENTRY_DSN=your_sentry_dsn
PROMETHEUS_METRICS_PORT=9090

# CORS Configuration
CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Kubernetes Deployment
```yaml
# k8s/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: telegram-bot-backend
  labels:
    app: telegram-bot-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: telegram-bot-backend
  template:
    metadata:
      labels:
        app: telegram-bot-backend
    spec:
      containers:
      - name: backend
        image: ghcr.io/your-org/telegram-bot/backend:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        - name: BOT_TOKEN
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: bot-token
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: app-data
          mountPath: /app/data
      volumes:
      - name: app-data
        persistentVolumeClaim:
          claimName: app-data-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: telegram-bot-backend-service
spec:
  selector:
    app: telegram-bot-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: telegram-bot-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: api-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: telegram-bot-backend-service
            port:
              number: 80
```

### 5. Monitoring and Logging

#### Prometheus Configuration
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'telegram-bot-backend'
    static_configs:
      - targets: ['backend:9090']
    metrics_path: /metrics
    scrape_interval: 30s

  - job_name: 'telegram-bot-frontend'
    static_configs:
      - targets: ['frontend:9091']
    metrics_path: /metrics
    scrape_interval: 30s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

#### Grafana Dashboard Configuration
```json
{
  "dashboard": {
    "title": "Telegram Bot Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ]
      }
    ]
  }
}
```

### 6. Backup and Recovery

#### Database Backup Script
```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="telegram_bot_backup_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

# Create database backup
pg_dump ${DATABASE_URL} > ${BACKUP_DIR}/${BACKUP_FILE}

# Compress backup
gzip ${BACKUP_DIR}/${BACKUP_FILE}

# Upload to cloud storage (example with AWS S3)
aws s3 cp ${BACKUP_DIR}/${BACKUP_FILE}.gz s3://your-backup-bucket/database/

# Clean up old local backups (keep last 7 days)
find ${BACKUP_DIR} -name "telegram_bot_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

#### Application Data Backup
```bash
#!/bin/bash
# scripts/backup-app-data.sh

set -e

DATA_DIR="/app/data"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="app_data_backup_${TIMESTAMP}.tar.gz"

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

# Create compressed archive of application data
tar -czf ${BACKUP_DIR}/${BACKUP_FILE} -C ${DATA_DIR} .

# Upload to cloud storage
aws s3 cp ${BACKUP_DIR}/${BACKUP_FILE} s3://your-backup-bucket/app-data/

# Clean up old local backups
find ${BACKUP_DIR} -name "app_data_backup_*.tar.gz" -mtime +7 -delete

echo "App data backup completed: ${BACKUP_FILE}"
```

### 7. Health Checks and Monitoring

#### Health Check Endpoint
```typescript
// apps/backend/src/health/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService
  ) {}

  @Get()
  async check(): Promise<HealthCheckResult> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkDiskSpace(),
      this.checkMemory(),
    ]);

    const results = checks.map((check, index) => ({
      name: ['database', 'redis', 'disk', 'memory'][index],
      status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      details: check.status === 'fulfilled' ? check.value : check.reason,
    }));

    const overallStatus = results.every(r => r.status === 'healthy') 
      ? 'healthy' 
      : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results,
    };
  }

  @Get('ready')
  async readiness(): Promise<{ status: string }> {
    // Check if application is ready to serve traffic
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready' };
    } catch (error) {
      throw new ServiceUnavailableException('Application not ready');
    }
  }

  private async checkDatabase(): Promise<any> {
    const start = Date.now();
    await this.prisma.$queryRaw`SELECT 1`;
    const duration = Date.now() - start;
    
    return {
      status: 'connected',
      responseTime: `${duration}ms`,
    };
  }

  private async checkRedis(): Promise<any> {
    const start = Date.now();
    await this.redis.ping();
    const duration = Date.now() - start;
    
    return {
      status: 'connected',
      responseTime: `${duration}ms`,
    };
  }

  private async checkDiskSpace(): Promise<any> {
    const stats = await fs.promises.statfs('/app/data');
    const free = stats.bavail * stats.bsize;
    const total = stats.blocks * stats.bsize;
    const used = total - free;
    const usagePercent = (used / total) * 100;

    return {
      total: `${Math.round(total / 1024 / 1024 / 1024)}GB`,
      used: `${Math.round(used / 1024 / 1024 / 1024)}GB`,
      free: `${Math.round(free / 1024 / 1024 / 1024)}GB`,
      usagePercent: `${Math.round(usagePercent)}%`,
    };
  }

  private async checkMemory(): Promise<any> {
    const usage = process.memoryUsage();
    
    return {
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`,
    };
  }
}
```

## Deployment Checklist

### Pre-deployment
```markdown
- [ ] All tests pass in CI/CD pipeline
- [ ] Security scan completed without critical issues
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] SSL certificates valid
- [ ] Backup strategy in place
- [ ] Monitoring and alerting configured
- [ ] Load testing completed
- [ ] Documentation updated
```

### Deployment
```markdown
- [ ] Deploy to staging environment first
- [ ] Run smoke tests in staging
- [ ] Verify all features work correctly
- [ ] Check performance metrics
- [ ] Deploy to production with blue-green strategy
- [ ] Verify health checks pass
- [ ] Monitor error rates and response times
- [ ] Verify bot functionality
- [ ] Check web admin interface
```

### Post-deployment
```markdown
- [ ] Monitor application metrics for 24 hours
- [ ] Verify backup systems are working
- [ ] Check log aggregation
- [ ] Validate alerting rules
- [ ] Update runbooks if needed
- [ ] Notify stakeholders of successful deployment
```

## Troubleshooting

### Common Deployment Issues
1. **Container startup failures**: Check environment variables and dependencies
2. **Database connection issues**: Verify connection strings and network access
3. **File permission errors**: Ensure proper user permissions in containers
4. **Memory/CPU limits**: Monitor resource usage and adjust limits
5. **SSL certificate issues**: Verify certificate validity and configuration

### Debugging Tips
1. Use `docker logs` to check container logs
2. Monitor health check endpoints
3. Check resource utilization metrics
4. Verify network connectivity between services
5. Use application performance monitoring tools
