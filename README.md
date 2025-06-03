# Telegram Bot Web Application

Aplikasi web terintegrasi dengan bot Telegram yang dibangun menggunakan React + Vite + TypeScript untuk frontend dan NestJS + TypeScript untuk backend, dengan PostgreSQL + Prisma ORM sebagai database.

## 🏗️ Arsitektur

```
telegram-bot-web-app/
├── apps/
│   ├── backend/          # NestJS API Server
│   └── frontend/         # React + Vite Web App
├── packages/
│   └── shared/           # Shared types dan utilities
├── .cline/              # Cline rules dan workflows
├── docs/                # Dokumentasi
└── scripts/             # Build dan deployment scripts
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker & Docker Compose
- PostgreSQL (jika tidak menggunakan Docker)

### 1. Clone dan Setup

```bash
# Clone repository
git clone <repository-url>
cd telegram-bot-web-app

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### 2. Konfigurasi Environment

Edit file `.env` dan sesuaikan dengan konfigurasi Anda:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/telegram_bot_db"

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-telegram-bot-token-from-botfather

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Application
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### 3. Setup Database

```bash
# Start PostgreSQL dengan Docker
npm run docker:up

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# (Optional) Seed database
npm run db:seed
```

### 4. Start Development

```bash
# Start semua services (backend + frontend)
npm run dev

# Atau start individual:
npm run dev:backend  # Backend only (port 3001)
npm run dev:frontend # Frontend only (port 3000)
```

### 5. Akses Aplikasi

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs
- **Prisma Studio**: `npm run db:studio`

## 🤖 Setup Telegram Bot

### 1. Buat Bot Baru

1. Chat dengan [@BotFather](https://t.me/botfather) di Telegram
2. Gunakan command `/newbot`
3. Ikuti instruksi untuk membuat bot
4. Simpan token yang diberikan

### 2. Konfigurasi Bot

```bash
# Set bot commands
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setMyCommands" \
-H "Content-Type: application/json" \
-d '{
  "commands": [
    {"command": "start", "description": "Mulai menggunakan bot"},
    {"command": "menu", "description": "Tampilkan menu utama"},
    {"command": "location", "description": "Manajemen lokasi"},
    {"command": "workbook", "description": "Manajemen workbook"},
    {"command": "help", "description": "Bantuan"}
  ]
}'
```

### 3. Set Webhook (Production)

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
-H "Content-Type: application/json" \
-d '{"url": "https://your-domain.com/api/telegram/webhook"}'
```

## 📁 Struktur Project

### Backend (NestJS)

```
apps/backend/src/
├── auth/              # Authentication & authorization
├── users/             # User management
├── telegram/          # Telegram webhook handler
├── bot/               # Bot logic & commands
├── admin/             # Admin panel API
├── prisma/            # Database service
├── redis/             # Redis cache service
├── logger/            # Logging service
└── main.ts            # Application entry point
```

### Frontend (React + Vite)

```
apps/frontend/src/
├── components/        # Reusable components
├── pages/            # Page components
├── hooks/            # Custom React hooks
├── services/         # API services
├── store/            # State management
├── utils/            # Utility functions
└── main.tsx          # Application entry point
```

### Shared Package

```
packages/shared/src/
├── types/            # TypeScript interfaces
└── utils/            # Shared utilities
```

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev                 # Start all services
npm run dev:backend        # Start backend only
npm run dev:frontend       # Start frontend only

# Build
npm run build              # Build all packages
npm run build:backend      # Build backend only
npm run build:frontend     # Build frontend only

# Database
npm run db:generate        # Generate Prisma client
npm run db:migrate         # Run migrations
npm run db:studio          # Open Prisma Studio
npm run db:seed            # Seed database

# Testing
npm run test               # Run all tests
npm run test:backend       # Backend tests
npm run test:frontend      # Frontend tests

# Linting & Formatting
npm run lint               # Lint all code
npm run format             # Format all code

# Docker
npm run docker:up          # Start services
npm run docker:down        # Stop services
npm run docker:logs        # View logs
```

### Code Quality

Project ini menggunakan:

- **ESLint** untuk linting
- **Prettier** untuk formatting
- **TypeScript** untuk type safety
- **Jest** untuk testing
- **Husky** untuk git hooks

### Database Schema

Lihat `apps/backend/prisma/schema.prisma` untuk detail schema database.

Key models:
- `User` - User data dan permissions
- `UserBotState` - Bot state management
- `BotMessage` - Message history
- `BotCommand` - Available commands
- `SystemConfig` - Application configuration

## 🚀 Deployment

### Docker Production

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment

1. **Build aplikasi**:
   ```bash
   npm run build
   ```

2. **Setup database**:
   ```bash
   npm run db:deploy
   ```

3. **Start services**:
   ```bash
   npm run start:prod
   ```

## 🔒 Security

- JWT authentication untuk API
- Rate limiting untuk mencegah abuse
- Input validation dengan Zod
- CORS configuration
- Helmet untuk security headers
- Environment variables untuk sensitive data

## 📊 Monitoring

- Winston untuk logging
- Health check endpoints
- Prisma query logging
- Error tracking dan reporting

## 🤝 Contributing

1. Fork repository
2. Buat feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buat Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

Jika mengalami masalah:

1. Cek [dokumentasi](./docs/)
2. Lihat [troubleshooting guide](./docs/troubleshooting.md)
3. Buat issue di repository
4. Contact: [your-email@example.com]

## 🔄 Changelog

Lihat [CHANGELOG.md](./CHANGELOG.md) untuk history perubahan.
