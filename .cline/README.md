# Cline Configuration untuk Telegram Bot Web Application

Direktori ini berisi konfigurasi Cline untuk pengembangan aplikasi bot telegram yang terintegrasi dengan web interface.

## Struktur Direktori

```
.cline/
├── README.md                    # Dokumentasi ini
├── rules.md                     # Aturan pengembangan proyek
├── checklists/                  # Checklist untuk berbagai tahap development
│   └── feature-checklist.md     # Checklist pengembangan fitur
├── patterns/                    # Pattern dan best practices
│   └── common-patterns.md       # Pattern umum untuk development
├── standards/                   # Standar coding dan dokumentasi
│   └── coding-standards.md      # Standar coding untuk proyek
├── templates/                   # Template untuk file-file baru
│   └── frontend-component.template.tsx  # Template komponen React
└── workflows/                   # Workflow pengembangan
    └── feature-development.md   # Workflow pengembangan fitur
```

## Cara Penggunaan

### 1. Rules (Aturan)
File `rules.md` berisi aturan-aturan pengembangan yang harus diikuti:
- Struktur proyek monorepo
- Standar kualitas kode
- Aturan API development
- Aturan database dan security
- Konvensi penamaan file
- Git workflow

### 2. Checklists (Daftar Periksa)
Direktori `checklists/` berisi daftar periksa untuk memastikan semua tahap development dilakukan dengan benar:
- Pre-development checklist
- Backend development checklist
- Bot development checklist
- Frontend development checklist
- Testing checklist
- Quality assurance checklist
- Documentation checklist
- Deployment checklist

### 3. Patterns (Pola)
Direktori `patterns/` berisi pattern dan best practices:
- Service pattern untuk backend
- Controller pattern untuk API
- Custom hooks untuk React
- Error handling patterns
- Database patterns dengan Prisma
- Bot command patterns
- Testing patterns

### 4. Standards (Standar)
Direktori `standards/` berisi standar coding:
- TypeScript standards
- Backend standards (NestJS)
- Frontend standards (React)
- Database standards (Prisma)
- Bot development standards
- Testing standards
- Documentation standards

### 5. Templates (Template)
Direktori `templates/` berisi template untuk file-file baru:
- Template komponen React
- Template service backend
- Template controller API
- Template bot feature

### 6. Workflows (Alur Kerja)
Direktori `workflows/` berisi alur kerja pengembangan:
- Feature development workflow
- Bug fixing workflow
- Testing workflow
- Deployment workflow

## Teknologi Stack

### Frontend
- **React** - Library UI
- **Vite** - Build tool dan dev server
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Shadcn/ui** - UI components

### Backend
- **NestJS** - Framework Node.js
- **TypeScript** - Type safety
- **Prisma** - ORM untuk database
- **PostgreSQL** - Database
- **JWT** - Authentication

### Bot
- **Telegram Bot API** - Local server
- **Node.js** - Runtime untuk bot
- **TypeScript** - Type safety

## Environment Variables

Pastikan environment variables berikut sudah dikonfigurasi:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/telegram_bot"

# Telegram Bot
TELEGRAM_BOT_TOKEN="your_bot_token"
TELEGRAM_API_ID="your_api_id"
TELEGRAM_API_HASH="your_api_hash"

# JWT
JWT_SECRET="your_jwt_secret"
JWT_EXPIRES_IN="24h"

# Application
PORT=3001
FRONTEND_PORT=3000
```

## Quick Start

### 1. Setup Project
```bash
cd telegram-bot-web-app
npm install
```

### 2. Setup Database
```bash
cd apps/backend
npx prisma migrate dev
npx prisma generate
```

### 3. Start Development
```bash
# Start all services
./scripts/start-all.sh

# Or start individually
npm run dev:backend    # Backend API
npm run dev:frontend   # Frontend React
npm run dev:bot        # Telegram Bot
```

### 4. Access Applications
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Telegram Bot API: http://localhost:8081

## Development Guidelines

### 1. Sebelum Memulai Development
- [ ] Baca rules.md untuk memahami aturan proyek
- [ ] Review coding standards di standards/
- [ ] Pahami workflow di workflows/
- [ ] Gunakan checklist yang sesuai

### 2. Saat Development
- [ ] Ikuti pattern yang ada di patterns/
- [ ] Gunakan template untuk file baru
- [ ] Lakukan testing sesuai standar
- [ ] Update dokumentasi jika diperlukan

### 3. Sebelum Commit
- [ ] Jalankan linter dan formatter
- [ ] Pastikan semua test passing
- [ ] Review checklist yang relevan
- [ ] Update CHANGELOG.md jika diperlukan

## Fitur Bot yang Tersedia

### ✅ Sudah Diimplementasi
1. **Location Mode** - Geocoding, reverse geocoding, pengukuran jarak
2. **Workbook Mode** - Manajemen Excel, processing foto

### 🔄 Dalam Development
3. **OCR Mode** - Optical Character Recognition
4. **Archive Mode** - Manajemen arsip file
5. **Geotags Mode** - Ekstrak metadata geolokasi
6. **KML Mode** - Generate dan parse file KML

## Kontribusi

Untuk berkontribusi pada proyek ini:

1. Fork repository
2. Buat feature branch
3. Ikuti rules dan standards yang ada
4. Gunakan checklist untuk memastikan kualitas
5. Submit pull request dengan deskripsi yang jelas

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Pastikan PostgreSQL running
   - Check DATABASE_URL di .env
   - Run `npx prisma migrate dev`

2. **Telegram Bot Not Responding**
   - Check TELEGRAM_BOT_TOKEN
   - Pastikan telegram-bot-api server running
   - Check bot webhook configuration

3. **Frontend Build Error**
   - Run `npm install` di apps/frontend
   - Check TypeScript errors
   - Ensure all dependencies installed

4. **Backend API Error**
   - Check environment variables
   - Ensure database is accessible
   - Check logs for specific errors

## Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [React Documentation](https://react.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## Support

Untuk bantuan atau pertanyaan:
1. Check dokumentasi di direktori `docs/`
2. Review troubleshooting guide
3. Check existing issues di repository
4. Create new issue dengan template yang sesuai

---

**Note**: Dokumentasi ini akan terus diupdate seiring dengan perkembangan proyek. Pastikan untuk selalu menggunakan versi terbaru dari rules, standards, dan workflows.
