# 🤖 Telegram Bot Web Application

Aplikasi bot Telegram yang terintegrasi dengan web interface, dibangun menggunakan **React + Vite + TypeScript** untuk frontend dan **NestJS + TypeScript + PostgreSQL** untuk backend.

## 🚀 Fitur Utama

### 📱 Bot Telegram Features
- **Location Mode** - Geocoding, routing, pengukuran jarak
- **Workbook Mode** - Manajemen Excel, processing foto
- **OCR Mode** - Optical Character Recognition dari gambar
- **Archive Mode** - Kompresi/ekstraksi file ZIP/RAR
- **Geotags Mode** - Photo geotagging dengan lokasi
- **KML Mode** - Generate/parse file KML untuk GPS data

### 🌐 Web Interface
- Dashboard dengan statistik bot real-time
- Manajemen pengguna bot
- Konfigurasi bot settings
- Monitoring fitur bot
- Sistem autentikasi JWT

## 🛠️ Tech Stack

### Frontend
- **React 18** dengan TypeScript
- **Vite** untuk build tool
- **Tailwind CSS** untuk styling
- **React Router** untuk routing
- **Axios** untuk HTTP client

### Backend
- **NestJS** dengan TypeScript
- **Prisma ORM** untuk database
- **PostgreSQL** sebagai database
- **JWT** untuk autentikasi
- **Node Telegram Bot API**

### Infrastructure
- **Telegram Bot API Server** (local)
- **Docker** support (optional)
- **PM2** untuk process management

## 📋 Prerequisites

Pastikan Anda telah menginstall:
- **Node.js** (v18 atau lebih baru)
- **PostgreSQL** (v13 atau lebih baru)
- **npm** atau **yarn**
- **Git**

## ⚙️ Setup & Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd telegram-bot-web-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
```bash
cp .env.example .env
```

Edit file `.env` dan isi dengan konfigurasi Anda:
```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/telegram_bot"

# Telegram Bot (Wajib)
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_API_ID=your_api_id_here
TELEGRAM_API_HASH=your_api_hash_here

# JWT Secret
JWT_SECRET=your_jwt_secret_here

# Optional API Keys untuk fitur enhanced
OPENROUTESERVICE_API_KEY=your_openrouteservice_key_here
MAPBOX_API_KEY=your_mapbox_key_here
```

### 4. Setup Database
```bash
cd apps/backend
npx prisma migrate dev
npx prisma generate
cd ../..
```

### 5. Build Telegram Bot API (Optional)
Jika Anda ingin menggunakan local Telegram Bot API server:
```bash
# Install telegram-bot-api binary
# Lihat: https://github.com/tdlib/telegram-bot-api#installation
```

## 🚀 Menjalankan Aplikasi

### Development Mode

#### Opsi 1: Start All Services (Recommended)
```bash
./scripts/start-all.sh
```

#### Opsi 2: Start Manual
```bash
# Terminal 1: Start Telegram Bot API (optional)
./scripts/start-telegram-bot-api.sh

# Terminal 2: Start Backend
cd apps/backend
npm run start:dev

# Terminal 3: Start Frontend
cd apps/frontend
npm run dev
```

### Production Mode
```bash
# Build aplikasi
npm run build

# Start production
npm run start:prod
```

## 📱 Akses Aplikasi

- **Frontend Web**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Telegram Bot API**: http://localhost:8081 (jika menggunakan local)

## 🔧 Konfigurasi Bot Telegram

### 1. Buat Bot Baru
1. Chat dengan [@BotFather](https://t.me/botfather) di Telegram
2. Gunakan command `/newbot`
3. Ikuti instruksi untuk membuat bot
4. Simpan **Bot Token** yang diberikan

### 2. Dapatkan API Credentials
1. Kunjungi [my.telegram.org](https://my.telegram.org)
2. Login dengan akun Telegram Anda
3. Buat aplikasi baru
4. Simpan **API ID** dan **API Hash**

### 3. Setup Webhook (Optional)
```bash
# Set webhook untuk production
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://yourdomain.com/webhook"}'
```

## 📚 Dokumentasi API

### Authentication Endpoints
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user
- `GET /auth/profile` - Get user profile

### Bot Management Endpoints
- `GET /bot/stats` - Get bot statistics
- `GET /bot/features` - Get bot features status
- `POST /bot/settings` - Update bot settings

### User Management Endpoints
- `GET /users` - Get all users
- `POST /users` - Create new user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

## 🤖 Bot Commands

### Core Commands
- `/start` - Mulai menggunakan bot
- `/menu` - Tampilkan menu utama
- `/help` - Bantuan penggunaan

### Feature Commands
- `/lokasi` - Masuk ke mode lokasi
- `/workbook` - Masuk ke mode workbook
- `/ocr` - Masuk ke mode OCR
- `/archive` - Masuk ke mode archive
- `/geotags` - Masuk ke mode geotags
- `/kml` - Masuk ke mode KML

## 🗂️ Struktur Proyek

```
telegram-bot-web-app/
├── apps/
│   ├── frontend/          # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   └── package.json
│   └── backend/           # NestJS backend
│       ├── src/
│       │   ├── auth/
│       │   ├── telegram/
│       │   │   └── features/
│       │   ├── users/
│       │   └── prisma/
│       └── package.json
├── scripts/               # Startup scripts
├── .cline/               # Cline development rules
├── .env.example          # Environment template
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## 🔒 Security

### Environment Variables
- Jangan pernah commit file `.env` ke repository
- Gunakan `.env.example` sebagai template
- Simpan credentials dengan aman

### Database Security
- Gunakan strong password untuk database
- Enable SSL untuk production
- Regular backup database

### Bot Security
- Jangan share Bot Token
- Gunakan webhook dengan HTTPS di production
- Implement rate limiting

## 🚀 Deployment

### Using PM2
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit
```

### Using Docker
```bash
# Build image
docker build -t telegram-bot-app .

# Run container
docker run -p 3000:3000 -p 3001:3001 telegram-bot-app
```

### Environment Variables untuk Production
```bash
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@host:5432/db"
TELEGRAM_BOT_TOKEN=your_production_token
JWT_SECRET=your_strong_jwt_secret
FRONTEND_URL=https://yourdomain.com
```

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Error
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

#### Bot Not Responding
1. Check Bot Token validity
2. Verify webhook/polling configuration
3. Check bot permissions
4. Review logs: `npm run logs`

#### Build Errors
```bash
# Clear cache
npm run clean

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📝 Development

### Adding New Bot Feature
1. Create service in `apps/backend/src/telegram/features/`
2. Follow template in `.cline/templates/`
3. Update feature registration
4. Add tests
5. Update documentation

### Code Standards
- Follow ESLint configuration
- Use TypeScript strictly
- Write unit tests
- Document API endpoints

## 🤝 Contributing

1. Fork repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push branch: `git push origin feature/new-feature`
5. Submit Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

Jika Anda mengalami masalah:
1. Check [Issues](../../issues) untuk masalah yang sudah ada
2. Buat [New Issue](../../issues/new) jika belum ada
3. Sertakan log error dan langkah reproduksi

## 🙏 Acknowledgments

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [NestJS](https://nestjs.com/)
- [React](https://reactjs.org/)
- [Prisma](https://prisma.io/)
- [Vite](https://vitejs.dev/)

---

**Happy Coding! 🚀**
