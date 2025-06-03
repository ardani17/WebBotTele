import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as TelegramBot from 'node-telegram-bot-api';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: TelegramBot;
  private isPolling = false;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not found. Bot will not start.');
      return;
    }

    this.bot = new TelegramBot(token, { polling: false });
    await this.startPolling();
    this.setupMessageHandlers();
  }

  async onModuleDestroy() {
    await this.stopPolling();
  }

  async startPolling() {
    if (this.isPolling) {
      this.logger.warn('Bot is already polling');
      return;
    }

    try {
      await this.bot.startPolling();
      this.isPolling = true;
      this.logger.log('Telegram bot started polling');
    } catch (error) {
      this.logger.error('Failed to start polling:', error);
    }
  }

  async stopPolling() {
    if (!this.isPolling) {
      return;
    }

    try {
      await this.bot.stopPolling();
      this.isPolling = false;
      this.logger.log('Telegram bot stopped polling');
    } catch (error) {
      this.logger.error('Failed to stop polling:', error);
    }
  }

  private setupMessageHandlers() {
    // Handle /start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      const username = msg.from?.username;
      const firstName = msg.from?.first_name;
      const lastName = msg.from?.last_name;

      try {
        // Save or update user in database
        await this.prisma.user.upsert({
          where: { telegramId: userId?.toString() || '' },
          update: {
            username,
            firstName,
            lastName,
            lastActiveAt: new Date(),
          },
          create: {
            telegramId: userId?.toString() || '',
            username,
            firstName,
            lastName,
            email: `${username || userId}@telegram.local`,
            lastActiveAt: new Date(),
          },
        });

        const welcomeMessage = `
🤖 Welcome to the Bot!

Hi ${firstName || username || 'there'}! I'm here to help you with:

📍 /location - Share your location
📚 /workbook - Manage your workbooks
❓ /help - Show all available commands

Let's get started! 🚀
        `;

        await this.bot.sendMessage(chatId, welcomeMessage);
        this.logger.log(`User ${username || userId} started the bot`);
      } catch (error) {
        this.logger.error('Error handling /start command:', error);
        await this.bot.sendMessage(chatId, 'Sorry, something went wrong. Please try again.');
      }
    });

    // Handle /help command
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      
      const helpMessage = `
📋 Available Commands:

🏠 /start - Start the bot and get welcome message
📍 /location - Share your location with the bot
📚 /workbook - Access workbook features
❓ /help - Show this help message

💡 You can also send me your location directly using the location sharing feature in Telegram!
      `;

      await this.bot.sendMessage(chatId, helpMessage);
    });

    // Handle /location command
    this.bot.onText(/\/location/, async (msg) => {
      const chatId = msg.chat.id;
      
      const locationMessage = `
📍 Location Sharing

Please share your location using one of these methods:

1. Click the 📎 attachment button
2. Select "Location"
3. Choose "Send My Current Location" or "Send Live Location"

Or you can type your address and I'll help you find it! 🗺️
      `;

      const keyboard = {
        keyboard: [
          [{ text: '📍 Share Location', request_location: true }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      };

      await this.bot.sendMessage(chatId, locationMessage, {
        reply_markup: keyboard
      });
    });

    // Handle /workbook command
    this.bot.onText(/\/workbook/, async (msg) => {
      const chatId = msg.chat.id;
      
      const workbookMessage = `
📚 Workbook Features

Choose what you'd like to do:

📝 Create a new workbook
📖 View your workbooks
✏️ Edit existing workbook
🗑️ Delete a workbook

What would you like to do?
      `;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📝 Create New', callback_data: 'workbook_create' },
            { text: '📖 View All', callback_data: 'workbook_list' }
          ],
          [
            { text: '✏️ Edit', callback_data: 'workbook_edit' },
            { text: '🗑️ Delete', callback_data: 'workbook_delete' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, workbookMessage, {
        reply_markup: keyboard
      });
    });

    // Handle location messages
    this.bot.on('location', async (msg) => {
      const chatId = msg.chat.id;
      const location = msg.location;
      const userId = msg.from?.id;

      try {
        // Save location to database
        await this.prisma.location.create({
          data: {
            userId: userId?.toString() || '',
            latitude: location?.latitude || 0,
            longitude: location?.longitude || 0,
            address: `${location?.latitude}, ${location?.longitude}`,
            createdAt: new Date(),
          },
        });

        const responseMessage = `
📍 Location Received!

Latitude: ${location?.latitude}
Longitude: ${location?.longitude}

Thank you for sharing your location! I've saved it for you. 🗺️
        `;

        await this.bot.sendMessage(chatId, responseMessage);
        this.logger.log(`Location received from user ${userId}: ${location?.latitude}, ${location?.longitude}`);
      } catch (error) {
        this.logger.error('Error handling location:', error);
        await this.bot.sendMessage(chatId, 'Sorry, I couldn\'t save your location. Please try again.');
      }
    });

    // Handle callback queries (inline keyboard buttons)
    this.bot.on('callback_query', async (callbackQuery) => {
      const msg = callbackQuery.message;
      const chatId = msg?.chat.id;
      const data = callbackQuery.data;
      const userId = callbackQuery.from.id;

      if (!chatId) return;

      try {
        switch (data) {
          case 'workbook_create':
            await this.bot.sendMessage(chatId, '📝 Creating a new workbook...\n\nPlease send me the title for your new workbook:');
            break;
          
          case 'workbook_list':
            // Fetch user's workbooks from database
            const workbooks = await this.prisma.workbook.findMany({
              where: { userId: userId.toString() },
              orderBy: { createdAt: 'desc' },
            });

            if (workbooks.length === 0) {
              await this.bot.sendMessage(chatId, '📚 You don\'t have any workbooks yet.\n\nUse /workbook to create your first one!');
            } else {
              const workbookList = workbooks.map((wb, index) => 
                `${index + 1}. ${wb.title} (${wb.createdAt.toLocaleDateString()})`
              ).join('\n');
              
              await this.bot.sendMessage(chatId, `📚 Your Workbooks:\n\n${workbookList}`);
            }
            break;
          
          case 'workbook_edit':
            await this.bot.sendMessage(chatId, '✏️ Edit workbook feature coming soon!');
            break;
          
          case 'workbook_delete':
            await this.bot.sendMessage(chatId, '🗑️ Delete workbook feature coming soon!');
            break;
        }

        // Answer the callback query to remove loading state
        await this.bot.answerCallbackQuery(callbackQuery.id);
      } catch (error) {
        this.logger.error('Error handling callback query:', error);
        await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Something went wrong!' });
      }
    });

    // Handle text messages (for workbook creation)
    this.bot.on('message', async (msg) => {
      // Skip if it's a command or location
      if (msg.text?.startsWith('/') || msg.location) {
        return;
      }

      const chatId = msg.chat.id;
      const text = msg.text;
      const userId = msg.from?.id;

      if (!text || !userId) return;

      try {
        // Simple workbook creation logic
        // In a real app, you'd want to track conversation state
        if (text.length > 3 && !text.includes('workbook')) {
          await this.prisma.workbook.create({
            data: {
              userId: userId.toString(),
              title: text,
              content: `# ${text}\n\nThis is your new workbook. Start adding content here!`,
              createdAt: new Date(),
            },
          });

          await this.bot.sendMessage(chatId, `📚 Workbook "${text}" created successfully!\n\nUse /workbook to manage your workbooks.`);
          this.logger.log(`Workbook created by user ${userId}: ${text}`);
        }
      } catch (error) {
        this.logger.error('Error handling text message:', error);
      }
    });

    this.logger.log('Message handlers setup complete');
  }

  async sendMessage(chatId: number, text: string, options?: any) {
    if (!this.bot) {
      throw new Error('Bot not initialized');
    }
    return this.bot.sendMessage(chatId, text, options);
  }

  getBotInfo() {
    return {
      isPolling: this.isPolling,
      botToken: this.configService.get<string>('TELEGRAM_BOT_TOKEN') ? 'Set' : 'Not set',
    };
  }
}
