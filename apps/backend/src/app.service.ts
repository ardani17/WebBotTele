import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getHealth(): { message: string; timestamp: string; uptime: number } {
    return {
      message: 'Telegram Bot Web App API is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  getVersion(): { version: string; name: string; environment: string } {
    return {
      version: '1.0.0',
      name: 'Telegram Bot Web App',
      environment: this.configService.get('NODE_ENV') || 'development',
    };
  }
}
