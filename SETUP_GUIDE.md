# Telegram Bot Web App - Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Telegram Bot Token (from @BotFather)

### 1. Clone and Install Dependencies

```bash
# Install dependencies
npm install

# Install backend dependencies
cd apps/backend && npm install

# Install frontend dependencies  
cd ../frontend && npm install
```

### 2. Environment Setup

Create `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/telegram_bot_db"

# Telegram Bot
TELEGRAM_BOT_TOKEN="your_bot_token_from_botfather"

# JWT
JWT_SECRET="your-super-secret-jwt-key"

# Server
PORT=3001
FRONTEND_URL="http://localhost:5173"

# Admin
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="admin123"
```

### 3. Database Setup

```bash
# Generate Prisma client
cd apps/backend
npm run db:generate

# Run database migrations
npm run db:migrate

# (Optional) Seed database
npm run db:seed
```

### 4. Start the Application

```bash
# Start backend (from apps/backend)
npm run start:dev

# Start frontend (from apps/frontend) 
npm run dev
```

## 🤖 Bot Setup

### 1. Create Telegram Bot

1. Message @BotFather on Telegram
2. Send `/newbot`
3. Choose a name and username for your bot
4. Copy the bot token
5. Add token to your `.env` file

### 2. Bot Commands

Set up bot commands with @BotFather:

```
start - Start the bot and get welcome message
location - Share your location with the bot
workbook - Access workbook features
help - Show available commands
```

### 3. Test Your Bot

1. Start your backend server
2. Search for your bot on Telegram
3. Send `/start` to begin

## 🌐 Web Admin Panel

### Access the Admin Panel

1. Open http://localhost:5173
2. Login with admin credentials from `.env`
3. Manage users, bot settings, and view analytics

### Features

- **Dashboard**: View bot statistics and activity
- **Users**: Manage bot users and their data
- **Bot Settings**: Configure bot behavior and commands
- **Real-time Updates**: See bot activity in real-time

## 🔧 Development

### Project Structure

```
telegram-bot-web-app/
├── apps/
│   ├── backend/          # NestJS API server
│   │   ├── src/
│   │   │   ├── telegram/ # Bot logic
│   │   │   ├── prisma/   # Database
│   │   │   └── ...
│   │   └── prisma/       # Database schema
│   └── frontend/         # React admin panel
│       ├── src/
│       │   ├── pages/    # Admin pages
│       │   ├── components/
│       │   └── ...
├── packages/
│   └── shared/           # Shared types and utilities
└── .cline/               # Cline rules and workflows
```

### Available Scripts

**Backend:**
```bash
npm run start:dev    # Start development server
npm run build        # Build for production
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio
```

**Frontend:**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Bot Features

#### 📍 Location Tracking
- Users can share their location
- Locations are stored in database
- Admin can view user locations

#### 📚 Workbook Management
- Users can create workbooks
- Simple text-based content
- CRUD operations via bot

#### 🔐 User Management
- Automatic user registration
- Role-based permissions
- Activity tracking

## 🚀 Deployment

### Using Docker

```bash
# Build and start with Docker Compose
docker-compose up -d
```

### Manual Deployment

1. Build the applications:
```bash
npm run build
```

2. Set up production database

3. Deploy backend to your server

4. Deploy frontend to static hosting

5. Update environment variables

## 🛠 Troubleshooting

### Common Issues

**Bot not responding:**
- Check if TELEGRAM_BOT_TOKEN is correct
- Ensure backend server is running
- Check bot polling status in logs

**Database connection errors:**
- Verify DATABASE_URL is correct
- Ensure PostgreSQL is running
- Check database permissions

**Frontend not loading:**
- Check if backend is running on correct port
- Verify CORS settings
- Check browser console for errors

### Logs

Backend logs are available in the console when running in development mode.

For production, configure proper logging with Winston.

## 📝 Adding New Features

### Bot Commands

1. Add command handler in `telegram.service.ts`
2. Update bot commands with @BotFather
3. Add corresponding database models if needed

### Admin Panel Pages

1. Create new page component in `src/pages/`
2. Add route in `App.tsx`
3. Add navigation link in `Layout.tsx`

### Database Changes

1. Update `prisma/schema.prisma`
2. Run `npm run db:migrate`
3. Update TypeScript types

## 🤝 Contributing

1. Follow the established code patterns
2. Use the Cline workflows for consistency
3. Test both bot and web interface
4. Update documentation as needed

## 📄 License

This project is licensed under the MIT License.
