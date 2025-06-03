import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Interface for geo data
interface GeoPoint {
  latitude: number;
  longitude: number;
}

interface NamedPoint extends GeoPoint {
  name: string;
  timestamp: number;
}

interface LineTrack {
  name: string;
  coordinates: GeoPoint[];
  timestamp: number;
}

// Interface for user KML data
interface UserKmlData {
  placemarks: NamedPoint[];
  lines: LineTrack[];
  activeLine?: {
    name: string;
    points: GeoPoint[];
  } | null;
  persistentPointName?: string | null;
}

@Injectable()
export class KmlService {
  private readonly logger = new Logger(KmlService.name);
  private userKmlData = new Map<string, UserKmlData>();
  private nextPointNames = new Map<string, string>();
  private readonly STATE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor(private prisma: PrismaService) {}

  async handleKmlCommand(telegramId: string, chatId: number): Promise<string> {
    try {
      // Validate user exists
      const user = await this.validateUser(telegramId);
      
      // Initialize KML data
      this.initUserKmlData(telegramId);
      
      // Log command usage
      this.logger.log('KML command initiated', { telegramId, chatId });
      
      return this.getKmlHelpMessage();
    } catch (error) {
      this.logger.error('KML command failed', { telegramId, error });
      return 'Terjadi kesalahan. Silakan coba lagi nanti.';
    }
  }

  async setAlwaysPoint(telegramId: string, pointName?: string): Promise<string> {
    try {
      const userData = this.getUserKmlData(telegramId);
      
      if (pointName && pointName.trim()) {
        userData.persistentPointName = pointName.trim();
        this.logger.log('AlwaysPoint set', { telegramId, pointName });
        return `✅ Nama default tetap untuk titik individual sekarang adalah: "${pointName}".`;
      } else {
        const oldName = userData.persistentPointName;
        userData.persistentPointName = null;
        this.logger.log('AlwaysPoint cleared', { telegramId, oldName });
        
        if (oldName) {
          return `🗑️ Nama default tetap ("${oldName}") telah dihapus.`;
        } else {
          return 'ℹ️ Tidak ada nama default tetap yang aktif untuk dihapus.';
        }
      }
    } catch (error) {
      this.logger.error('Error setting AlwaysPoint', { telegramId, pointName, error });
      return 'Terjadi kesalahan saat mengatur nama default.';
    }
  }

  async setNextPointName(telegramId: string, pointName: string): Promise<string> {
    try {
      this.nextPointNames.set(telegramId, pointName);
      this.logger.log('Next point name set', { telegramId, pointName });
      return `📝 Nama "${pointName}" akan digunakan untuk titik individual berikutnya.`;
    } catch (error) {
      this.logger.error('Error setting next point name', { telegramId, pointName, error });
      return 'Terjadi kesalahan saat mengatur nama titik.';
    }
  }

  async addPoint(telegramId: string, latitude: number, longitude: number, pointName?: string): Promise<string> {
    try {
      const userData = this.getUserKmlData(telegramId);
      
      // Validate coordinates
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return 'Koordinat tidak valid atau di luar jangkauan.';
      }

      if (userData.activeLine) {
        // Add to active line
        userData.activeLine.points.push({ latitude, longitude });
        this.logger.log('Point added to active line', { telegramId, latitude, longitude, lineName: userData.activeLine.name });
        
        let message = `↪️ Titik (Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)}) ditambahkan ke garis "${userData.activeLine.name}". Total ${userData.activeLine.points.length} titik.`;
        
        if (pointName) {
          message += ` (Nama "${pointName}" diabaikan karena sedang membuat garis).`;
        }
        
        return message;
      } else {
        // Add as individual point
        let finalPointName: string;
        
        if (pointName) {
          finalPointName = pointName;
        } else {
          const nextName = this.nextPointNames.get(telegramId);
          if (nextName) {
            finalPointName = nextName;
            this.nextPointNames.delete(telegramId);
          } else if (userData.persistentPointName) {
            finalPointName = userData.persistentPointName;
          } else {
            finalPointName = `Titik ${userData.placemarks.length + 1}`;
          }
        }
        
        userData.placemarks.push({
          latitude,
          longitude,
          name: finalPointName,
          timestamp: Date.now()
        });
        
        this.logger.log('Individual point added', { telegramId, latitude, longitude, pointName: finalPointName });
        return `📍 Titik individual "${finalPointName}" (Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)}) telah disimpan!`;
      }
    } catch (error) {
      this.logger.error('Error adding point', { telegramId, latitude, longitude, pointName, error });
      return 'Terjadi kesalahan saat menambahkan titik.';
    }
  }

  async handleLocation(telegramId: string, latitude: number, longitude: number): Promise<string> {
    try {
      const userData = this.getUserKmlData(telegramId);
      
      if (userData.activeLine) {
        // Add to active line
        userData.activeLine.points.push({ latitude, longitude });
        this.logger.log('Location added to active line', { telegramId, latitude, longitude, lineName: userData.activeLine.name });
        return `↪️ Titik (Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)}) ditambahkan ke garis "${userData.activeLine.name}". Total ${userData.activeLine.points.length} titik.`;
      } else {
        // Add as individual point
        let pointName: string;
        const nextName = this.nextPointNames.get(telegramId);
        
        if (nextName) {
          pointName = nextName;
          this.nextPointNames.delete(telegramId);
        } else if (userData.persistentPointName) {
          pointName = userData.persistentPointName;
        } else {
          pointName = `Titik Terlampir ${userData.placemarks.length + 1}`;
        }
        
        userData.placemarks.push({
          latitude,
          longitude,
          name: pointName,
          timestamp: Date.now()
        });
        
        this.logger.log('Location added as individual point', { telegramId, latitude, longitude, pointName });
        return `📍 Lokasi individual "${pointName}" (Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)}) telah disimpan!`;
      }
    } catch (error) {
      this.logger.error('Error handling location', { telegramId, latitude, longitude, error });
      return 'Terjadi kesalahan saat memproses lokasi.';
    }
  }

  async startLine(telegramId: string, lineName?: string): Promise<string> {
    try {
      const userData = this.getUserKmlData(telegramId);
      
      if (userData.activeLine) {
        return `⚠️ Anda sudah sedang membuat garis "${userData.activeLine.name}". Selesaikan atau batalkan dulu dengan /endline atau /cancelline.`;
      }
      
      const finalLineName = lineName || `Garis ${userData.lines.length + 1}`;
      userData.activeLine = { name: finalLineName, points: [] };
      
      this.logger.log('Line started', { telegramId, lineName: finalLineName });
      return `🏁 Memulai garis baru: "${finalLineName}". Kirimkan lokasi untuk menambahkan titik. Gunakan /endline untuk menyimpan atau /cancelline untuk batal.`;
    } catch (error) {
      this.logger.error('Error starting line', { telegramId, lineName, error });
      return 'Terjadi kesalahan saat memulai garis.';
    }
  }

  async endLine(telegramId: string): Promise<string> {
    try {
      const userData = this.getUserKmlData(telegramId);
      
      if (!userData.activeLine) {
        return 'Tidak ada garis yang sedang aktif dibuat. Mulai dengan /startline.';
      }
      
      if (userData.activeLine.points.length < 2) {
        return `⚠️ Garis "${userData.activeLine.name}" memiliki ${userData.activeLine.points.length} titik. Minimal 2 titik diperlukan. Tambahkan titik lagi atau gunakan /cancelline.`;
      }
      
      const finishedLine: LineTrack = {
        name: userData.activeLine.name,
        coordinates: userData.activeLine.points,
        timestamp: Date.now()
      };
      
      userData.lines.push(finishedLine);
      const savedLineName = userData.activeLine.name;
      userData.activeLine = null;
      
      this.logger.log('Line ended and saved', { telegramId, lineName: savedLineName, pointCount: finishedLine.coordinates.length });
      return `✅ Garis "${savedLineName}" dengan ${finishedLine.coordinates.length} titik berhasil disimpan!`;
    } catch (error) {
      this.logger.error('Error ending line', { telegramId, error });
      return 'Terjadi kesalahan saat menyimpan garis.';
    }
  }

  async cancelLine(telegramId: string): Promise<string> {
    try {
      const userData = this.getUserKmlData(telegramId);
      
      if (!userData.activeLine) {
        return 'Tidak ada garis yang sedang aktif untuk dibatalkan.';
      }
      
      const cancelledLineName = userData.activeLine.name;
      userData.activeLine = null;
      
      this.logger.log('Line cancelled', { telegramId, lineName: cancelledLineName });
      return `❌ Pembuatan garis "${cancelledLineName}" telah dibatalkan.`;
    } catch (error) {
      this.logger.error('Error cancelling line', { telegramId, error });
      return 'Terjadi kesalahan saat membatalkan garis.';
    }
  }

  async getMyData(telegramId: string): Promise<string> {
    try {
      const userData = this.getUserKmlData(telegramId);
      let response = '📜 *Data KML Tersimpan Anda:*\n\n';
      let hasData = false;

      if (userData.persistentPointName) {
        response += `📌 Nama default tetap aktif: "*${userData.persistentPointName}*"\n   (Gunakan /alwayspoint tanpa nama untuk menghapus)\n\n`;
        hasData = true;
      }

      if (userData.placemarks && userData.placemarks.length > 0) {
        hasData = true;
        response += '📍 *Titik Individual:*\n';
        userData.placemarks.forEach((point, index) => {
          response += `${index + 1}. ${point.name} (Lat: ${point.latitude.toFixed(4)}, Lon: ${point.longitude.toFixed(4)})\n`;
        });
        response += '\n';
      }

      if (userData.lines && userData.lines.length > 0) {
        hasData = true;
        response += '〰️ *Garis/Jalur Tersimpan:*\n';
        userData.lines.forEach((line, index) => {
          response += `${index + 1}. ${line.name} (${line.coordinates.length} titik)\n`;
        });
        response += '\n';
      }

      if (userData.activeLine) {
        hasData = true;
        response += '🚧 *Garis Sedang Dibuat:*\n';
        response += `• ${userData.activeLine.name} (${userData.activeLine.points.length} titik ditambahkan)\n\n`;
      }

      if (!hasData) {
        response += 'Anda belum menyimpan data apapun atau mengatur nama default tetap.';
      }

      return response;
    } catch (error) {
      this.logger.error('Error getting user data', { telegramId, error });
      return 'Terjadi kesalahan saat mengambil data.';
    }
  }

  async createKml(telegramId: string, docName?: string): Promise<{ success: boolean; message: string; kmlContent?: string }> {
    try {
      const userData = this.getUserKmlData(telegramId);
      
      const hasPlacemarks = userData.placemarks && userData.placemarks.length > 0;
      const hasLines = userData.lines && userData.lines.length > 0;
      const hasActiveValidLine = userData.activeLine && userData.activeLine.points.length >= 2;

      if (!hasPlacemarks && !hasLines && !hasActiveValidLine) {
        return {
          success: false,
          message: 'Anda belum menyimpan data (titik atau garis yang valid) untuk dibuat KML.'
        };
      }

      const finalDocName = docName || `KML Data - User ${telegramId}`;
      const kmlContent = this.createKmlContent(userData, finalDocName);
      
      this.logger.log('KML created', { telegramId, docName: finalDocName, hasPlacemarks, hasLines, hasActiveValidLine });
      
      return {
        success: true,
        message: `File KML berhasil dibuat dengan nama dokumen "${finalDocName}".`,
        kmlContent
      };
    } catch (error) {
      this.logger.error('Error creating KML', { telegramId, docName, error });
      return {
        success: false,
        message: 'Terjadi kesalahan saat membuat file KML.'
      };
    }
  }

  async clearData(telegramId: string): Promise<string> {
    try {
      this.initUserKmlData(telegramId);
      this.nextPointNames.delete(telegramId);
      
      this.logger.log('KML data cleared', { telegramId });
      return '🗑️ Semua data KML Anda (titik, garis, sesi garis aktif, dan nama default tetap) telah dihapus.';
    } catch (error) {
      this.logger.error('Error clearing data', { telegramId, error });
      return 'Terjadi kesalahan saat menghapus data.';
    }
  }

  private createKmlContent(userData: UserKmlData, docName: string): string {
    let kmlPlacemarks = '';
    
    // Add individual points
    userData.placemarks.forEach((point) => {
      kmlPlacemarks += `
    <Placemark>
      <name>${this.escapeXml(point.name)}</name>
      <Point>
        <coordinates>${point.longitude},${point.latitude},0</coordinates>
      </Point>
    </Placemark>`;
    });
    
    // Add saved lines
    userData.lines.forEach((line) => {
      if (line.coordinates.length < 2) return;
      let coordsString = '';
      line.coordinates.forEach(coord => {
        coordsString += `${coord.longitude},${coord.latitude},0\n`;
      });
      
      kmlPlacemarks += `
    <Placemark>
      <name>${this.escapeXml(line.name)}</name>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>${coordsString.trim()}</coordinates>
      </LineString>
    </Placemark>`;
    });
    
    // Add active line if valid
    if (userData.activeLine && userData.activeLine.points.length >= 2) {
      let activeCoordsString = '';
      userData.activeLine.points.forEach(coord => {
        activeCoordsString += `${coord.longitude},${coord.latitude},0\n`;
      });
      
      kmlPlacemarks += `
    <Placemark>
      <name>${this.escapeXml(userData.activeLine.name)} (Sedang dibuat)</name>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>${activeCoordsString.trim()}</coordinates>
      </LineString>
    </Placemark>`;
    }
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${this.escapeXml(docName)}</name>${kmlPlacemarks}
  </Document>
</kml>`;
  }

  private escapeXml(unsafe: string | undefined | null): string {
    if (typeof unsafe !== 'string') {
      return '';
    }
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
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

  private initUserKmlData(telegramId: string): UserKmlData {
    const defaultData: UserKmlData = {
      placemarks: [],
      lines: [],
      activeLine: null,
      persistentPointName: null,
    };
    this.userKmlData.set(telegramId, defaultData);
    return defaultData;
  }

  private getUserKmlData(telegramId: string): UserKmlData {
    let data = this.userKmlData.get(telegramId);
    if (!data) {
      data = this.initUserKmlData(telegramId);
    }
    return data;
  }

  private getKmlHelpMessage(): string {
    return `📍 Mode KML Diaktifkan

Perintah yang tersedia:

*Titik Individual:*
• Kirim Lokasi (via attachment) - Menambahkan titik
• /add <lat> <lon> [nama_titik] - Menambahkan titik via teks
• /addpoint <nama_titik> - Menetapkan nama untuk satu titik berikutnya
• /alwayspoint [nama_titik] - Menetapkan nama default tetap untuk titik individual

*Garis/Jalur:*
• /startline [nama_garis_opsional] - Memulai pembuatan garis
• /endline - Menyimpan garis aktif
• /cancelline - Membatalkan garis aktif

*Data & KML:*
• /mydata - Menampilkan semua data tersimpan
• /createkml - Membuat file KML
• /cleardata - Menghapus SEMUA data Anda

Ketik /menu untuk kembali ke menu utama.`;
  }

  private cleanupExpiredData(): void {
    // Cleanup logic could be implemented here if needed
    // For now, data persists in memory until service restart
  }
}
