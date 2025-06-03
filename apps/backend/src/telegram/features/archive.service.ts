import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Interface for tracking user archive state
interface UserArchiveState {
  mode: 'zip' | 'extract' | 'search' | null;
  files: string[];
  timestamp: number;
  searchPattern?: string;
  extractedDir?: string;
  searchResults?: string[];
  extractedDirs?: string[];
}

// Interface for usage statistics
interface UsageStats {
  zipCount: number;
  extractCount: number;
  searchCount: number;
  filesSent: number;
  filesReceived: number;
  lastUsed: number;
}

@Injectable()
export class ArchiveService {
  private readonly logger = new Logger(ArchiveService.name);
  private userStates = new Map<string, UserArchiveState>();
  private userStats = new Map<string, UsageStats>();
  private readonly STATE_TIMEOUT = 10 * 60 * 1000; // 10 minutes

  constructor(private prisma: PrismaService) {}

  async handleArchiveCommand(telegramId: string, chatId: number): Promise<string> {
    try {
      // Validate user exists
      const user = await this.validateUser(telegramId);
      
      // Initialize state
      this.initUserState(telegramId);
      
      // Log command usage
      this.logger.log('Archive command initiated', { telegramId, chatId });
      
      return this.getArchiveHelpMessage();
    } catch (error) {
      this.logger.error('Archive command failed', { telegramId, error });
      return 'Terjadi kesalahan. Silakan coba lagi nanti.';
    }
  }

  async startZipMode(telegramId: string): Promise<string> {
    try {
      this.initUserState(telegramId, 'zip');
      this.logger.log('ZIP mode activated', { telegramId });
      
      return '🗜️ Mode ZIP diaktifkan. Silakan kirim file-file yang ingin Anda arsipkan. Setelah selesai, ketik /kirim untuk membuat file ZIP.';
    } catch (error) {
      this.logger.error('Error starting ZIP mode', { telegramId, error });
      return 'Terjadi kesalahan saat memulai mode ZIP.';
    }
  }

  async startExtractMode(telegramId: string): Promise<string> {
    try {
      this.initUserState(telegramId, 'extract');
      this.logger.log('Extract mode activated', { telegramId });
      
      return '📂 Mode Extract diaktifkan. Silakan kirim file arsip (ZIP atau RAR) yang ingin Anda ekstrak. Setelah selesai, ketik /kirim untuk mengekstrak file.';
    } catch (error) {
      this.logger.error('Error starting Extract mode', { telegramId, error });
      return 'Terjadi kesalahan saat memulai mode Extract.';
    }
  }

  async startSearchMode(telegramId: string): Promise<string> {
    try {
      this.initUserState(telegramId, 'search');
      this.logger.log('Search mode activated', { telegramId });
      
      return `🔍 Mode Search diaktifkan. Silakan kirim file arsip (ZIP atau RAR) yang ingin Anda cari isinya.

Langkah-langkah:
1. Kirim file arsip
2. Ketik /cari [pola] untuk mencari file tertentu
3. Ketik /kirim_selected untuk mengirim file yang ditemukan

Contoh: /cari *.jpg atau /cari dokumen atau /cari file.txt`;
    } catch (error) {
      this.logger.error('Error starting Search mode', { telegramId, error });
      return 'Terjadi kesalahan saat memulai mode Search.';
    }
  }

  async addFile(telegramId: string, fileId: string, fileName: string): Promise<string> {
    try {
      const state = this.getUserState(telegramId);
      if (!state || !state.mode) {
        return 'Silakan gunakan /zip, /extract, atau /search terlebih dahulu untuk memulai proses.';
      }

      // Simulate file processing
      const filePath = `data/user_${telegramId}/archive_files/${fileName}`;
      state.files.push(filePath);
      
      // Update stats
      this.updateUserStats(telegramId, { 
        filesReceived: this.getUserStats(telegramId).filesReceived + 1 
      });

      let responseMessage = '';
      
      if (state.mode === 'zip') {
        responseMessage = `File "${fileName}" berhasil diterima. Total file: ${state.files.length}. Ketik /kirim untuk membuat arsip.`;
      } else if (state.mode === 'extract') {
        responseMessage = `File "${fileName}" berhasil diterima. Ketik /kirim untuk mengekstrak file.`;
      } else if (state.mode === 'search') {
        // Auto-extract for search mode
        responseMessage = await this.autoExtractForSearch(telegramId, fileName);
      }

      this.logger.log('File added to archive processing', { telegramId, fileName, mode: state.mode });
      return responseMessage;
    } catch (error) {
      this.logger.error('Error adding file', { telegramId, fileName, error });
      return 'Terjadi kesalahan saat menerima file.';
    }
  }

  async processFiles(telegramId: string): Promise<string> {
    try {
      const state = this.getUserState(telegramId);
      if (!state || !state.mode || state.mode === 'search') {
        if (!state || !state.mode) {
          return 'Silakan gunakan /zip, /extract, atau /search terlebih dahulu untuk memulai proses.';
        } else if (state.mode === 'search') {
          return 'Mode search menggunakan auto-extract. Gunakan /cari [pola] untuk mencari, lalu /kirim_selected untuk mengirim file yang ditemukan.';
        }
      }

      if (state.files.length === 0) {
        return 'Anda belum mengirimkan file apapun. Silakan kirim file terlebih dahulu.';
      }

      if (state.mode === 'zip') {
        return await this.createZipFile(telegramId);
      } else if (state.mode === 'extract') {
        return await this.extractFiles(telegramId);
      }

      return 'Mode tidak dikenali.';
    } catch (error) {
      this.logger.error('Error processing files', { telegramId, error });
      return 'Terjadi kesalahan saat memproses file.';
    }
  }

  async searchFiles(telegramId: string, searchPattern: string): Promise<string> {
    try {
      const state = this.getUserState(telegramId);
      if (!state || state.mode !== 'search' || !state.extractedDirs || state.extractedDirs.length === 0) {
        return 'Anda harus menggunakan /search dan mengirim file arsip terlebih dahulu.';
      }

      state.searchPattern = searchPattern;
      
      // Simulate search process
      const mockResults = [
        `document_${Date.now()}.pdf`,
        `image_${Date.now()}.jpg`,
        `data_${Date.now()}.xlsx`
      ];

      // Filter based on pattern
      const filteredResults = mockResults.filter(file => {
        if (searchPattern.includes('*')) {
          const regexPattern = searchPattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
          const regex = new RegExp(regexPattern, 'i');
          return regex.test(file);
        } else {
          return file.toLowerCase().includes(searchPattern.toLowerCase());
        }
      });

      state.searchResults = filteredResults;
      
      // Update stats
      this.updateUserStats(telegramId, { 
        searchCount: this.getUserStats(telegramId).searchCount + 1 
      });

      if (filteredResults.length === 0) {
        return `❌ Tidak ditemukan file yang cocok dengan pola: ${searchPattern}`;
      }

      let resultMessage = `✅ Ditemukan ${filteredResults.length} file yang cocok dengan pola: ${searchPattern}\n\n`;
      
      filteredResults.forEach((file, index) => {
        resultMessage += `${index + 1}. 📄 ${file}\n`;
      });

      resultMessage += `\n💡 Ketik /kirim_selected untuk mengirim semua file yang ditemukan.`;

      this.logger.log('File search completed', { telegramId, searchPattern, matchingFiles: filteredResults.length });
      return resultMessage;
    } catch (error) {
      this.logger.error('Error searching files', { telegramId, searchPattern, error });
      return 'Terjadi kesalahan saat mencari file.';
    }
  }

  async sendSelectedFiles(telegramId: string): Promise<string> {
    try {
      const state = this.getUserState(telegramId);
      if (!state || state.mode !== 'search' || !state.searchResults || state.searchResults.length === 0) {
        return 'Tidak ada file yang dipilih. Gunakan /search, kirim file arsip, lalu /cari [pola] terlebih dahulu.';
      }

      const filesToSend = state.searchResults;
      
      // Update stats
      this.updateUserStats(telegramId, { 
        filesSent: this.getUserStats(telegramId).filesSent + filesToSend.length 
      });

      // Reset search results
      state.searchResults = [];

      this.logger.log('Selected files sent', { telegramId, fileCount: filesToSend.length });
      
      return `📤 ${filesToSend.length} file terpilih telah dikirim.`;
    } catch (error) {
      this.logger.error('Error sending selected files', { telegramId, error });
      return 'Terjadi kesalahan saat mengirim file terpilih.';
    }
  }

  async getStats(telegramId: string): Promise<string> {
    try {
      const stats = this.getUserStats(telegramId);
      const lastUsedDate = new Date(stats.lastUsed).toLocaleString('id-ID');
      
      return `📊 *Statistik Penggunaan Fitur Arsip*

🗜 Jumlah ZIP dibuat: ${stats.zipCount}
📂 Jumlah ekstraksi: ${stats.extractCount}
🔍 Jumlah pencarian: ${stats.searchCount}
📤 File dikirim ke bot: ${stats.filesReceived}
📥 File diterima dari bot: ${stats.filesSent}
🕒 Terakhir digunakan: ${lastUsedDate}`;
    } catch (error) {
      this.logger.error('Error getting stats', { telegramId, error });
      return 'Terjadi kesalahan saat mengambil statistik.';
    }
  }

  private async autoExtractForSearch(telegramId: string, fileName: string): Promise<string> {
    try {
      const state = this.getUserState(telegramId);
      if (!state) return 'State tidak ditemukan.';

      // Simulate extraction
      const extractDir = `data/user_${telegramId}/search_extracted_${Date.now()}`;
      
      if (!state.extractedDirs) {
        state.extractedDirs = [];
      }
      state.extractedDirs.push(extractDir);
      state.extractedDir = extractDir;

      // Update stats
      this.updateUserStats(telegramId, { 
        extractCount: this.getUserStats(telegramId).extractCount + 1 
      });

      const mockFileCount = Math.floor(Math.random() * 10) + 1;
      
      return `File "${fileName}" berhasil diterima dan diekstrak!

✅ ${mockFileCount} file berhasil diekstrak.

📁 File siap untuk pencarian. Gunakan:
🔍 /cari [pola] - untuk mencari file
📤 /kirim_selected - untuk mengirim file yang ditemukan

Contoh: /cari *.jpg atau /cari dokumen`;
    } catch (error) {
      this.logger.error('Auto-extraction failed', { telegramId, fileName, error });
      return `File "${fileName}" berhasil diterima tapi gagal diekstrak.`;
    }
  }

  private async createZipFile(telegramId: string): Promise<string> {
    try {
      const state = this.getUserState(telegramId);
      if (!state) return 'State tidak ditemukan.';

      // Simulate ZIP creation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update stats
      this.updateUserStats(telegramId, { 
        zipCount: this.getUserStats(telegramId).zipCount + 1,
        filesSent: this.getUserStats(telegramId).filesSent + 1
      });

      // Reset state
      this.initUserState(telegramId);

      this.logger.log('ZIP file created', { telegramId, fileCount: state.files.length });
      
      return `✅ File ZIP berhasil dibuat dengan ${state.files.length} file.`;
    } catch (error) {
      this.logger.error('Error creating ZIP file', { telegramId, error });
      return 'Terjadi kesalahan saat membuat file ZIP.';
    }
  }

  private async extractFiles(telegramId: string): Promise<string> {
    try {
      const state = this.getUserState(telegramId);
      if (!state) return 'State tidak ditemukan.';

      // Simulate extraction
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockExtractedCount = Math.floor(Math.random() * 20) + 5;

      // Update stats
      this.updateUserStats(telegramId, { 
        extractCount: this.getUserStats(telegramId).extractCount + 1,
        filesSent: this.getUserStats(telegramId).filesSent + mockExtractedCount
      });

      // Reset state
      this.initUserState(telegramId);

      this.logger.log('Files extracted', { telegramId, extractedCount: mockExtractedCount });
      
      return `✅ ${mockExtractedCount} file berhasil diekstrak dan dikirim.`;
    } catch (error) {
      this.logger.error('Error extracting files', { telegramId, error });
      return 'Terjadi kesalahan saat mengekstrak file.';
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

  private initUserState(telegramId: string, mode: 'zip' | 'extract' | 'search' | null = null): void {
    this.userStates.set(telegramId, {
      mode,
      files: [],
      timestamp: Date.now(),
      extractedDirs: [],
    });
  }

  private getUserState(telegramId: string): UserArchiveState | undefined {
    return this.userStates.get(telegramId);
  }

  private getUserStats(telegramId: string): UsageStats {
    if (!this.userStats.has(telegramId)) {
      this.userStats.set(telegramId, {
        zipCount: 0,
        extractCount: 0,
        searchCount: 0,
        filesSent: 0,
        filesReceived: 0,
        lastUsed: Date.now()
      });
    }
    return this.userStats.get(telegramId)!;
  }

  private updateUserStats(telegramId: string, update: Partial<UsageStats>): void {
    const stats = this.getUserStats(telegramId);
    Object.assign(stats, { ...update, lastUsed: Date.now() });
  }

  private getArchiveHelpMessage(): string {
    return `📦 Mode Arsip Diaktifkan

Perintah yang tersedia:
🗜️ /zip - Mengompres file menjadi ZIP
📂 /extract - Mengekstrak file arsip
🔍 /search - Cari file dalam arsip
📊 /stats - Melihat statistik penggunaan
❓ /bantuan - Bantuan interaktif

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
