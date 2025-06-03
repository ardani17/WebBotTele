import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TelegramModule } from './telegram/telegram.module';
import { BotModule } from './bot/bot.module';
import { AdminModule } from './admin/admin.module';
import { RedisModule } from './redis/redis.module';
import { LoggerModule } from './logger/logger.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ttl: configService.get('RATE_LIMIT_WINDOW_MS') || 60000,
        limit: configService.get('RATE_LIMIT_MAX_REQUESTS') || 10,
      }),
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // Core modules
    PrismaModule,
    RedisModule,
    LoggerModule,

    // Feature modules
    AuthModule,
    UsersModule,
    TelegramModule,
    BotModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
