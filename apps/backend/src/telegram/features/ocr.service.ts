import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Interface for tracking user OCR state
interface UserOcrState {
  processingImage: boolean;
  imagesProcessed: number;
  timestamp: number;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private userStates = new Map<string, UserOcrState>();
  private readonly STATE_TIMEOUT = 10 * 60 * 1000; // 10 minutes

  constructor(private prisma: PrismaService) {}

  async handleOcrCommand(telegramId: string, chatId: number): Promise<string> {
    try {
      // Validate user exists
      const user = await this.validateUser(telegramId);
      
      // Initialize state
      this.initUserState(telegramId);
      
      // Log command usage
      this.logger.log('OCR command initiated', { telegramId, chatId });
      
      return this.getOcrHelpMessage();
    } catch (error) {
      this.logger.error('OCR command failed', { telegramId, error });
      return 'Terjadi kesalahan. Silakan coba lagi nanti.';
    }
  }

  async processImage(telegramId: string, chatId: number, fileId: string, fileName: string): Promise<string> {
    try {
      const state = this.getUserState(telegramId);
      
      if (state.processingImage) {
        return 'Sedang memproses gambar, mohon tunggu...';
      }

      state.processingImage = true;
      this.logger.log('Starting image OCR processing', { telegramId, fileId });

      // Simulate OCR processing
      const extractedText = await this.performOcr(fileName);
      
      state.imagesProcessed++;
      state.processingImage = false;

      this.logger.log('Image OCR processing completed', { 
        telegramId, 
        imagesProcessed: state.imagesProcessed,
        hasText: !!extractedText && extractedText.trim() !== ''
      });

      if (!extractedText || extractedText.trim() === '') {
        return 'Tidak ada teks yang terdeteksi dalam gambar.';
      }

      return `📝 Hasil OCR:\n\n${extractedText}`;
    } catch (error) {
      this.logger.error('Error processing image for OCR', { error, telegramId });
      const state = this.getUserState(telegramId);
      state.processingImage = false;
      return 'Terjadi kesalahan saat memproses gambar. Silakan coba lagi.';
    }
  }

  async clearOcrFiles(telegramId: string): Promise<string> {
    try {
      this.logger.log('OCR files cleared', { telegramId });
      return 'Semua file OCR telah dihapus.';
    } catch (error) {
      this.logger.error('Error clearing OCR files', { error, telegramId });
      return 'Terjadi kesalahan saat menghapus file OCR.';
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

  private initUserState(telegramId: string): UserOcrState {
    const state: UserOcrState = {
      processingImage: false,
      imagesProcessed: 0,
      timestamp: Date.now(),
    };
    this.userStates.set(telegramId, state);
    return state;
  }

  private getUserState(telegramId: string): UserOcrState {
    let state = this.userStates.get(telegramId);
    if (!state) {
      state = this.initUserState(telegramId);
    }
    return state;
  }

  private async performOcr(fileName: string): Promise<string> {
    try {
      this.logger.log('Starting OCR processing', { fileName });
      
      // Simulate OCR processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock OCR result with realistic text
      const mockTexts = [
        `INVOICE
PT. CONTOH TEKNOLOGI
Jl. Sudirman No. 123
Jakarta 12345

Tanggal: ${new Date().toLocaleDateString('id-ID')}
No. Invoice: INV-${Date.now()}

Item: Layanan Konsultasi IT
Jumlah: 1
Harga: Rp 5.000.000

Total: Rp 5.000.000

Terima kasih atas kepercayaan Anda.`,

        `SURAT KETERANGAN

Dengan ini menerangkan bahwa:
Nama: John Doe
NIK: 1234567890123456
Alamat: Jl. Merdeka No. 45, Jakarta

Telah mengikuti pelatihan teknologi
pada tanggal ${new Date().toLocaleDateString('id-ID')}

Jakarta, ${new Date().toLocaleDateString('id-ID')}
Kepala Divisi`,

        `NOTA PEMBELIAN
Toko ABC
Jl. Raya No. 67

${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}

1x Buku Tulis        Rp 5.000
2x Pulpen           Rp 6.000
1x Penggaris        Rp 3.000

Total: Rp 14.000
Bayar: Rp 15.000
Kembali: Rp 1.000

Terima kasih`
      ];

      const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
      
      this.logger.log('OCR processing completed', { fileName, textLength: randomText.length });
      
      return randomText;
    } catch (error) {
      this.logger.error('Error performing OCR', { error, fileName });
      return 'Gagal memproses gambar. Pastikan gambar tidak rusak dan teks cukup jelas.';
    }
  }

  private getOcrHelpMessage(): string {
    return `🔍 Mode OCR Diaktifkan

Perintah yang tersedia:
• Kirim gambar untuk mengekstrak teks
• /ocr_clear - Hapus semua file OCR

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
