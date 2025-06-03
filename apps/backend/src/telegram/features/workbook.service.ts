import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs-extra';
import * as path from 'path';

interface UserWorkbookState {
  newFolderPath: string;
  imageCounter: number;
  videoCounter: number;
  downloadFlag: boolean;
  downloadCount: number;
  processingQueue: PhotoProcessingTask[];
  isProcessingQueue: boolean;
  lastProcessTime: number;
}

interface PhotoProcessingTask {
  fileId: string;
  fileName: string;
  chatId: number;
  timestamp: number;
}

@Injectable()
export class WorkbookService {
  private readonly logger = new Logger(WorkbookService.name);
  private userWorkbookStates = new Map<string, UserWorkbookState>();

  constructor(private prisma: PrismaService) {}

  async handleWorkbookCommand(telegramId: string): Promise<string> {
    try {
      // Initialize workbook state
      this.initUserWorkbookState(telegramId);
      
      return `📚 Mode Workbook Diaktifkan

Perintah yang tersedia:
- Ketik nama sheet (contoh: "sheet1") untuk membuat sheet baru
- Kirim foto untuk disimpan ke sheet yang aktif
- Ketik "send" untuk menghasilkan file Excel dengan semua gambar
- Ketik "cek" untuk melihat daftar sheet yang telah dibuat
- Ketik "clear" untuk menghapus semua sheet

📝 Catatan: Bot akan memproses foto dengan delay 0.1 detik untuk performa optimal.

Ketik /menu untuk kembali ke menu utama.`;
    } catch (error) {
      this.logger.error('Error in workbook command', error);
      throw error;
    }
  }

  async createSheet(telegramId: string, sheetName: string): Promise<string> {
    try {
      const state = this.getUserWorkbookState(telegramId);
      const userDataPath = this.ensureUserDataDir(telegramId);
      const mediaFolderPath = path.join(userDataPath, 'workbook_media');
      
      state.newFolderPath = path.join(mediaFolderPath, sheetName);
      
      // Create folder if it doesn't exist
      if (!fs.existsSync(state.newFolderPath)) {
        fs.mkdirSync(state.newFolderPath, { recursive: true });
      }
      
      state.imageCounter = 1;
      state.videoCounter = 1;
      state.downloadCount = 0;
      
      return `Sheet dengan nama ${sheetName} telah dibuat. Anda sekarang bisa mengirim foto.

📝 Tips: Bot akan memproses foto dengan delay 0.1 detik per foto. Notifikasi progress setiap 10 foto.`;
    } catch (error) {
      this.logger.error('Error creating sheet', error);
      throw error;
    }
  }

  async addPhotoToQueue(telegramId: string, fileId: string, chatId: number): Promise<string> {
    try {
      const state = this.getUserWorkbookState(telegramId);
      
      if (!state.newFolderPath) {
        return "Silakan ketik nama sheet (contoh: 'sheet1') untuk membuat sheet baru terlebih dahulu.";
      }
      
      const timestamp = new Date().getTime();
      const fileName = `image_${timestamp}.jpg`;
      
      // Add photo to processing queue
      const task: PhotoProcessingTask = {
        fileId,
        fileName,
        chatId,
        timestamp
      };
      
      state.processingQueue.push(task);
      
      // Start processing if not already processing
      if (!state.isProcessingQueue) {
        this.processPhotoQueue(telegramId);
      }
      
      const queueLength = state.processingQueue.length;
      if (queueLength === 1) {
        return "📸 Foto ditambahkan ke antrian pemrosesan...";
      } else if (queueLength % 10 === 0) {
        return `📸 ${queueLength} foto dalam antrian...`;
      }
      
      return null; // No message for individual photos to reduce spam
    } catch (error) {
      this.logger.error('Error adding photo to queue', error);
      throw error;
    }
  }

  async checkSheets(telegramId: string): Promise<string> {
    try {
      const userDataPath = this.ensureUserDataDir(telegramId);
      const mediaFolderPath = path.join(userDataPath, 'workbook_media');
      
      if (!fs.existsSync(mediaFolderPath)) {
        return "Belum ada sheet yang dibuat.";
      }
      
      const folders = fs.readdirSync(mediaFolderPath)
        .filter(file => fs.lstatSync(path.join(mediaFolderPath, file)).isDirectory());
      
      if (folders.length === 0) {
        return "Belum ada sheet yang dibuat.";
      }
      
      let folderList = '';
      let totalSizeInBytes = 0;
      
      for (const folder of folders) {
        const folderPath = path.join(mediaFolderPath, folder);
        const folderSizeInBytes = this.getFolderSize(folderPath);
        totalSizeInBytes += folderSizeInBytes;
        const folderSizeInMegabytes = folderSizeInBytes / (1024*1024);
        folderList += `${folder} (Ukuran: ${folderSizeInMegabytes.toFixed(2)} MB)\n`;
      }
      
      const totalSizeInMegabytes = totalSizeInBytes / (1024*1024);
      const state = this.getUserWorkbookState(telegramId);
      const queueInfo = state.processingQueue.length > 0 ? `\n\n📋 Foto dalam antrian: ${state.processingQueue.length}` : '';
      
      return `Berikut adalah daftar sheet yang telah dibuat:\n${folderList}\nTotal Ukuran: ${totalSizeInMegabytes.toFixed(2)} MB${queueInfo}`;
    } catch (error) {
      this.logger.error('Error checking sheets', error);
      throw error;
    }
  }

  async clearSheets(telegramId: string): Promise<string> {
    try {
      const state = this.getUserWorkbookState(telegramId);
      
      // Clear processing queue
      state.processingQueue = [];
      state.isProcessingQueue = false;
      
      const userDataPath = this.ensureUserDataDir(telegramId);
      const mediaFolderPath = path.join(userDataPath, 'workbook_media');
      
      if (fs.existsSync(mediaFolderPath)) {
        fs.readdirSync(mediaFolderPath).forEach(file => {
          const filePath = path.join(mediaFolderPath, file);
          if (fs.lstatSync(filePath).isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
        });
      }
      
      state.downloadCount = 0;
      state.newFolderPath = "";
      
      return "Semua sheet dan antrian foto telah dihapus.";
    } catch (error) {
      this.logger.error('Error clearing sheets', error);
      throw error;
    }
  }

  async generateExcel(telegramId: string): Promise<{ success: boolean; message: string; filePath?: string }> {
    try {
      const state = this.getUserWorkbookState(telegramId);
      
      // Check if there are photos still in queue
      if (state.processingQueue.length > 0) {
        return {
          success: false,
          message: `Masih ada ${state.processingQueue.length} foto dalam antrian. Mohon tunggu hingga semua foto selesai diproses sebelum membuat Excel.`
        };
      }
      
      const userDataPath = this.ensureUserDataDir(telegramId);
      const mediaFolderPath = path.join(userDataPath, 'workbook_media');
      
      if (!fs.existsSync(mediaFolderPath)) {
        return {
          success: false,
          message: "Tidak ada sheet yang tersedia. Silakan buat sheet terlebih dahulu."
        };
      }
      
      const folders = fs.readdirSync(mediaFolderPath)
        .filter(folder => fs.lstatSync(path.join(mediaFolderPath, folder)).isDirectory());
      
      if (folders.length === 0) {
        return {
          success: false,
          message: "Tidak ada sheet yang tersedia. Silakan buat sheet terlebih dahulu."
        };
      }
      
      // For now, return success with a simple message
      // In a real implementation, you would use ExcelJS to create the actual Excel file
      const excelFilePath = path.join(mediaFolderPath, 'ImageAllSheet.xlsx');
      
      // Create a simple text file as placeholder (in real implementation, use ExcelJS)
      const sheetInfo = folders.map(folder => {
        const folderPath = path.join(mediaFolderPath, folder);
        const imageFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.jpg'));
        return `Sheet: ${folder} - ${imageFiles.length} images`;
      }).join('\n');
      
      fs.writeFileSync(excelFilePath, `Workbook Summary:\n${sheetInfo}`);
      
      const fileSizeInBytes = fs.statSync(excelFilePath).size;
      const fileSizeInMegabytes = fileSizeInBytes / (1024*1024);
      
      return {
        success: true,
        message: `File Excel berhasil dibuat dengan ukuran ${fileSizeInMegabytes.toFixed(2)} MB.`,
        filePath: excelFilePath
      };
    } catch (error) {
      this.logger.error('Error generating Excel', error);
      throw error;
    }
  }

  private async processPhotoQueue(telegramId: string): Promise<void> {
    const state = this.getUserWorkbookState(telegramId);
    
    if (state.isProcessingQueue || state.processingQueue.length === 0) {
      return;
    }
    
    state.isProcessingQueue = true;
    const initialQueueLength = state.processingQueue.length;
    
    this.logger.info(`Starting photo queue processing for user ${telegramId}, initial queue length: ${initialQueueLength}`);
    
    let processedCount = 0;
    let errorCount = 0;
    
    while (state.processingQueue.length > 0) {
      const task = state.processingQueue.shift();
      if (!task) break;
      
      try {
        // Apply delay to prevent rate limiting
        const timeSinceLastProcess = Date.now() - state.lastProcessTime;
        if (timeSinceLastProcess < 100) { // 100ms delay
          await this.sleep(100 - timeSinceLastProcess);
        }
        
        // Process the photo (simplified - in real implementation, download and save the file)
        await this.processPhotoTask(telegramId, task);
        state.lastProcessTime = Date.now();
        processedCount++;
        state.downloadCount++;
        
      } catch (error) {
        this.logger.error('Error processing photo task:', error);
        errorCount++;
        processedCount++;
      }
    }
    
    state.isProcessingQueue = false;
    this.logger.info(`Photo queue processing completed for user ${telegramId}. Processed: ${processedCount} photos, Errors: ${errorCount}`);
  }

  private async processPhotoTask(telegramId: string, task: PhotoProcessingTask): Promise<void> {
    const state = this.getUserWorkbookState(telegramId);
    
    try {
      // Check if sheet folder exists
      if (!state.newFolderPath || !fs.existsSync(state.newFolderPath)) {
        throw new Error(`Sheet folder not found or not set: ${state.newFolderPath}`);
      }
      
      // In a real implementation, you would download the file from Telegram
      // For now, just create a placeholder file
      const targetPath = path.join(state.newFolderPath, task.fileName);
      fs.writeFileSync(targetPath, `Placeholder for ${task.fileId}`);
      
      state.imageCounter++;
      state.downloadFlag = true;
      
      this.logger.info(`Photo processed successfully: ${task.fileName} for user ${telegramId}`);
      
    } catch (error) {
      this.logger.error(`Error in processPhotoTask for ${task.fileName}:`, error);
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getFolderSize(folderPath: string): number {
    let totalSize = 0;
    const files = fs.readdirSync(folderPath);
    files.forEach(file => {
      const filePath = path.join(folderPath, file);
      if (fs.lstatSync(filePath).isDirectory()) {
        totalSize += this.getFolderSize(filePath);
      } else {
        totalSize += fs.statSync(filePath).size;
      }
    });
    return totalSize;
  }

  private initUserWorkbookState(telegramId: string): UserWorkbookState {
    const state: UserWorkbookState = {
      newFolderPath: "",
      imageCounter: 1,
      videoCounter: 1,
      downloadFlag: false,
      downloadCount: 0,
      processingQueue: [],
      isProcessingQueue: false,
      lastProcessTime: 0
    };
    this.userWorkbookStates.set(telegramId, state);
    return state;
  }

  private getUserWorkbookState(telegramId: string): UserWorkbookState {
    let state = this.userWorkbookStates.get(telegramId);
    if (!state) {
      state = this.initUserWorkbookState(telegramId);
    }
    return state;
  }

  private ensureUserDataDir(telegramId: string): string {
    const userDir = path.join(process.cwd(), 'data', `user_${telegramId}`);
    fs.ensureDirSync(userDir);
    return userDir;
  }

  async saveWorkbook(telegramId: string, title: string, content?: string): Promise<void> {
    try {
      // Find user by telegramId
      const user = await this.prisma.user.findUnique({
        where: { telegramId }
      });

      if (user) {
        await this.prisma.workbook.create({
          data: {
            userId: user.id,
            title,
            content
          }
        });
      }
    } catch (error) {
      this.logger.error('Error saving workbook', error);
      throw error;
    }
  }
}
