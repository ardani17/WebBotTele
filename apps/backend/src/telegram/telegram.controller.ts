import { Controller, Get, Post, Body } from '@nestjs/common';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Get('status')
  getBotStatus() {
    return this.telegramService.getBotInfo();
  }

  @Post('start')
  async startBot() {
    await this.telegramService.startPolling();
    return { message: 'Bot started successfully' };
  }

  @Post('stop')
  async stopBot() {
    await this.telegramService.stopPolling();
    return { message: 'Bot stopped successfully' };
  }

  @Post('send-message')
  async sendMessage(@Body() body: { chatId: number; message: string }) {
    const { chatId, message } = body;
    await this.telegramService.sendMessage(chatId, message);
    return { message: 'Message sent successfully' };
  }
}
