import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Interface for tracking user geotags state
interface UserGeotagsState {
  pendingPhotoFileId?: string;
  alwaysTagLocation?: { latitude: number; longitude: number };
  isWaitingForStickyLocation?: boolean;
  customDateTime?: Date;
  timestamp: number;
}

@Injectable()
export class GeotagsService {
  private readonly logger = new Logger(GeotagsService.name);
  private userStates = new Map<string, UserGeotagsState>();
  private readonly STATE_TIMEOUT = 10 * 60 * 1000; // 10 minutes

  constructor(private prisma: PrismaService) {}

  async handleGeotagsCommand(telegramId: string, chatId: number): Promise<string> {
    try {
      // Validate user exists
      const user = await this.validateUser(telegramId);
      
      // Initialize state
      this.initUserState(telegramId);
      
      // Log command usage
      this.logger.log('Geotags command initiated', { telegramId, chatId });
      
      return this.getGeotagsHelpMessage();
    } catch (error) {
      this.logger.error('Geotags command failed', { telegramId, error });
      return 'Terjadi kesalahan. Silakan coba lagi nanti.';
    }
  }

  async toggleAlwaysTag(telegramId: string): Promise<string> {
    try {
      const state = this.getUserState(telegramId);
      
      if (state.alwaysTagLocation) {
        delete state.alwaysTagLocation;
        delete state.isWaitingForStickyLocation;
        this.logger.log('AlwaysTag mode disabled', { telegramId });
        return '📍 AlwaysTag mode NONAKTIF. Setiap foto akan memerlukan lokasi baru.';
      } else {
        state.isWaitingForStickyLocation = true;
        delete state.alwaysTagLocation;
        this.logger.log('AlwaysTag mode enabled, waiting for location', { telegramId });
        return '📍 AlwaysTag mode AKTIF.\nSilakan kirim lokasi yang ingin Anda gunakan untuk beberapa foto ke depan. Untuk menonaktifkan, ketik /alwaystag lagi.';
      }
    } catch (error) {
      this.logger.error('Error toggling AlwaysTag', { telegramId, error });
      return 'Terjadi kesalahan saat mengubah mode AlwaysTag.';
    }
  }

  async setCustomTime(telegramId: string, timeString?: string): Promise<string> {
    try {
      const state = this.getUserState(telegramId);
      
      if (!timeString) {
        return 'Gunakan format: /set_time YYYY-MM-DD HH:MM\nContoh: /set_time 2024-01-20 10:30\nAtau /set_time reset untuk menggunakan waktu saat ini.';
      }

      if (timeString.toLowerCase() === 'reset') {
        delete state.customDateTime;
        this.logger.log('Custom time reset', { telegramId });
        return '⏱️ Pengaturan waktu manual dihapus. Bot akan menggunakan waktu saat ini.';
      }

      const parsedDate = this.parseCustomDate(timeString);
      if (parsedDate) {
        state.customDateTime = parsedDate;
        this.logger.log('Custom time set', { telegramId, customDateTime: parsedDate });
        return `⏱️ Waktu manual diatur ke: ${parsedDate.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}`;
      } else {
        return 'Format tanggal/waktu tidak valid. Gunakan YYYY-MM-DD HH:MM\nContoh: /set_time 2024-01-20 10:30';
      }
    } catch (error) {
      this.logger.error('Error setting custom time', { telegramId, timeString, error });
      return 'Terjadi kesalahan saat mengatur waktu.';
    }
  }

  async handlePhoto(telegramId: string, chatId: number, photoFileId: string): Promise<string> {
    try {
      const state = this.getUserState(telegramId);
      
      if (state.alwaysTagLocation && !state.isWaitingForStickyLocation) {
        // Process immediately with always tag location
        const result = await this.processPhotoWithGeotag(
          telegramId, 
          photoFileId, 
          state.alwaysTagLocation, 
          state.customDateTime
        );
        this.logger.log('Photo processed with AlwaysTag location', { telegramId, photoFileId });
        return '✔️ Foto diterima dan diproses dengan lokasi AlwaysTag.';
      } else {
        // Store photo and wait for location
        state.pendingPhotoFileId = photoFileId;
        
        if (state.isWaitingForStickyLocation) {
          return '✔️ Foto diterima. Bot sedang menunggu Anda mengirimkan lokasi untuk diatur sebagai default AlwaysTag.';
        } else {
          return '✔️ Foto diterima! Sekarang, silakan kirim lokasi Anda.';
        }
      }
    } catch (error) {
      this.logger.error('Error handling photo', { telegramId, photoFileId, error });
      return 'Terjadi kesalahan saat memproses foto.';
    }
  }

  async handleLocation(telegramId: string, chatId: number, latitude: number, longitude: number): Promise<string> {
    try {
      const state = this.getUserState(telegramId);
      const location = { latitude, longitude };

      if (state.isWaitingForStickyLocation) {
        // Set as always tag location
        state.alwaysTagLocation = location;
        delete state.isWaitingForStickyLocation;
        
        let response = `📍 Lokasi telah diatur untuk mode AlwaysTag: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}. Foto berikutnya akan menggunakan lokasi ini.`;
        
        // Process pending photo if exists
        if (state.pendingPhotoFileId) {
          const photoFileId = state.pendingPhotoFileId;
          delete state.pendingPhotoFileId;
          await this.processPhotoWithGeotag(telegramId, photoFileId, location, state.customDateTime);
          response += '\n\n✔️ Foto yang tertunda telah diproses dengan lokasi ini.';
        }
        
        this.logger.log('AlwaysTag location set', { telegramId, location });
        return response;
      } else if (state.alwaysTagLocation) {
        // Update always tag location
        state.alwaysTagLocation = location;
        
        let response = `📍 Lokasi AlwaysTag diperbarui: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}.`;
        
        // Process pending photo if exists
        if (state.pendingPhotoFileId) {
          const photoFileId = state.pendingPhotoFileId;
          delete state.pendingPhotoFileId;
          await this.processPhotoWithGeotag(telegramId, photoFileId, location, state.customDateTime);
          response += '\n\n✔️ Foto yang tertunda telah diproses dengan lokasi yang diperbarui.';
        }
        
        this.logger.log('AlwaysTag location updated', { telegramId, location });
        return response;
      } else {
        // Standard mode - process pending photo
        if (state.pendingPhotoFileId) {
          const photoFileId = state.pendingPhotoFileId;
          delete state.pendingPhotoFileId;
          await this.processPhotoWithGeotag(telegramId, photoFileId, location, state.customDateTime);
          this.logger.log('Photo processed with received location', { telegramId, location });
          return '✔️ Foto telah diproses dengan lokasi yang diterima.';
        } else {
          return '📌 Lokasi diterima. Mohon kirim foto terlebih dahulu untuk mode standar atau aktifkan /alwaystag.';
        }
      }
    } catch (error) {
      this.logger.error('Error handling location', { telegramId, latitude, longitude, error });
      return 'Terjadi kesalahan saat memproses lokasi.';
    }
  }

  private async processPhotoWithGeotag(
    telegramId: string, 
    photoFileId: string, 
    location: { latitude: number; longitude: number }, 
    customDateTime?: Date
  ): Promise<void> {
    try {
      // Simulate geotag processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const timestamp = customDateTime || new Date();
      
      this.logger.log('Photo geotag processing completed', { 
        telegramId, 
        photoFileId, 
        location, 
        timestamp 
      });
      
      // In real implementation, this would:
      // 1. Download the photo
      // 2. Generate geotag overlay with location and timestamp
      // 3. Composite the geotag onto the photo
      // 4. Send the processed photo back to user
      
    } catch (error) {
      this.logger.error('Error processing photo with geotag', { 
        telegramId, 
        photoFileId, 
        location, 
        error 
      });
      throw error;
    }
  }

  private parseCustomDate(dateString: string): Date | null {
    try {
      const parts = dateString.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
      if (!parts) return null;
      
      const year = parseInt(parts[1], 10);
      const month = parseInt(parts[2], 10) - 1; // Month is 0-indexed
      const day = parseInt(parts[3], 10);
      const hours = parseInt(parts[4], 10);
      const minutes = parseInt(parts[5], 10);
      
      const date = new Date(year, month, day, hours, minutes);
      
      // Validate the date
      if (date.getFullYear() === year && 
          date.getMonth() === month && 
          date.getDate() === day &&
          date.getHours() === hours && 
          date.getMinutes() === minutes) {
        return date;
      }
      
      return null;
    } catch (error) {
      this.logger.error('Error parsing custom date', { dateString, error });
      return null;
    }
  }

  private async validateUser(telegramId: string) {
    const user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  private initUserState(telegramId: string): UserGeotagsState {
    const state: UserGeotagsState = {
      timestamp: Date.now(),
    };
    this.userStates.set(telegramId, state);
    return state;
  }

  private getUserState(telegramId: string): UserGeotagsState {
    let state = this.userStates.get(telegramId);
    if (!state) {
      state = this.initUserState(telegramId);
    }
    return state;
  }

  private getGeotagsHelpMessage(): string {
    return `📷 Mode Geotags Diaktifkan

*Mode Standar (1 Foto, 1 Lokasi):*
1. Kirim sebuah foto
2. Segera kirim lokasi Anda menggunakan fitur "Location" Telegram
   Bot akan otomatis menambahkan geotag ke foto tersebut

🔁 */alwaystag* - Mode Lokasi Menempel:
• Ketik /alwaystag untuk mengaktifkan atau menonaktifkan mode ini
• Saat mode ini pertama kali diaktifkan, bot akan meminta Anda mengirimkan satu lokasi
• Lokasi ini akan digunakan untuk semua foto yang Anda kirim selanjutnya

⏱️ */set_time {YYYY-MM-DD HH:MM}* - Atur Waktu Manual:
• Format: YYYY-MM-DD HH:MM
• Contoh: /set_time 2024-12-25 15:30
• Reset: /set_time reset

Ketik /menu untuk kembali ke menu utama.`;
  }

  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [telegramId, state] of this.userStates.entries()) {
      if (now - state.timestamp > this.STATE_TIMEOUT) {
        this.userStates.delete(telegramId);
      }
    }
  }
}
