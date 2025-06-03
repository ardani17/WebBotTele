import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';

interface LocationPoint {
  latitude: number;
  longitude: number;
  address?: string;
}

interface UserMeasurementState {
  isActive: boolean;
  firstPoint?: LocationPoint;
  secondPoint?: LocationPoint;
  timestamp: number;
  transportMode?: 'car' | 'motorcycle' | 'foot';
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private userMeasurementStates = new Map<string, UserMeasurementState>();
  private lastMeasurements = new Map<string, any>();

  constructor(private prisma: PrismaService) {}

  async handleLocationCommand(telegramId: string, chatId: number): Promise<string> {
    try {
      // Initialize measurement state
      this.initUserMeasurementState(telegramId);
      
      return `🗺️ Mode Lokasi Diaktifkan

Perintah yang tersedia:
• /alamat [alamat] - Mendapatkan koordinat dari alamat
• /koordinat [lat] [long] - Mendapatkan alamat dari koordinat
• /show_map [lokasi] - Menampilkan peta lokasi
• /ukur - Mengukur jarak dan rute antara dua titik (pejalan kaki)
• /ukur_motor - Mengukur jarak dan rute untuk sepeda motor
• /ukur_mobil - Mengukur jarak dan rute untuk mobil
• /batal - Membatalkan pengukuran aktif

Anda juga dapat:
• Mengirim lokasi Telegram untuk mendapatkan koordinat dan alamat lengkap
• Mengirim koordinat (contoh: -7.6382862, 112.7372882) untuk mendapatkan lokasi dan alamat

Ketik /menu untuk kembali ke menu utama.`;
    } catch (error) {
      this.logger.error('Error in location command', error);
      throw error;
    }
  }

  async getCoordinatesFromAddress(address: string): Promise<any> {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: address,
          format: 'json',
          limit: 1
        },
        headers: {
          'User-Agent': 'TelegramBot/1.0'
        }
      });

      if (response.data && response.data.length > 0) {
        const location = response.data[0];
        return {
          latitude: location.lat,
          longitude: location.lon,
          address: location.display_name
        };
      }
      return null;
    } catch (error) {
      this.logger.error('Error fetching coordinates', error);
      throw error;
    }
  }

  async getAddressFromCoordinates(lat: number, lon: number): Promise<any> {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          lat,
          lon,
          format: 'json'
        },
        headers: {
          'User-Agent': 'TelegramBot/1.0'
        }
      });

      if (response.data && response.data.display_name) {
        return {
          latitude: lat,
          longitude: lon,
          address: response.data.display_name
        };
      }
      return null;
    } catch (error) {
      this.logger.error('Error fetching address', error);
      throw error;
    }
  }

  async saveLocation(telegramId: string, latitude: number, longitude: number, address?: string): Promise<void> {
    try {
      // Find user by telegramId
      const user = await this.prisma.user.findUnique({
        where: { telegramId }
      });

      if (user) {
        await this.prisma.location.create({
          data: {
            userId: user.id,
            latitude,
            longitude,
            address
          }
        });
      }
    } catch (error) {
      this.logger.error('Error saving location', error);
      throw error;
    }
  }

  async startMeasurement(telegramId: string, transportMode: 'car' | 'motorcycle' | 'foot' = 'foot'): Promise<string> {
    this.initUserMeasurementState(telegramId);
    const state = this.userMeasurementStates.get(telegramId);
    
    if (state) {
      state.isActive = true;
      state.transportMode = transportMode;
    }

    const transportText = transportMode === 'car' ? 'mobil' : 
                        transportMode === 'motorcycle' ? 'sepeda motor' : 'pejalan kaki';

    return `📏 Pengukuran Jarak dan Rute (Mode: ${transportText})

Silakan kirim titik pertama dengan salah satu cara berikut:
1. Kirim lokasi Telegram
2. Kirim koordinat (contoh: -7.257056, 112.648000)

Sesi pengukuran akan otomatis berakhir setelah 10 menit jika tidak diselesaikan.
Ketik /batal untuk membatalkan pengukuran.`;
  }

  async processLocationForMeasurement(telegramId: string, latitude: number, longitude: number): Promise<any> {
    const state = this.userMeasurementStates.get(telegramId);
    
    if (!state || !state.isActive) {
      return null;
    }

    try {
      // Get address for the location
      const addressData = await this.getAddressFromCoordinates(latitude, longitude);
      const address = addressData?.address || 'Lokasi tidak diketahui';

      if (!state.firstPoint) {
        state.firstPoint = { latitude, longitude, address };
        state.timestamp = Date.now();
        
        return {
          type: 'first_point',
          message: `📍 Titik pertama diterima:\n${address}\n(${latitude}, ${longitude})\n\nSilakan kirim titik kedua.`
        };
      } else if (!state.secondPoint) {
        state.secondPoint = { latitude, longitude, address };
        
        // Calculate route
        const result = await this.calculateRoute(
          state.firstPoint,
          state.secondPoint,
          state.transportMode || 'foot'
        );
        
        // Reset state
        this.initUserMeasurementState(telegramId);
        
        return {
          type: 'measurement_result',
          ...result
        };
      }
    } catch (error) {
      this.logger.error('Error processing location for measurement', error);
      throw error;
    }
  }

  private async calculateRoute(firstPoint: LocationPoint, secondPoint: LocationPoint, transportMode: string): Promise<any> {
    try {
      // Calculate direct distance using Haversine formula
      const distance = this.calculateDistance(
        firstPoint.latitude,
        firstPoint.longitude,
        secondPoint.latitude,
        secondPoint.longitude
      );

      // Rough time estimation based on transport mode
      let estimatedTime = 0;
      switch (transportMode) {
        case 'car':
          estimatedTime = distance / 50 * 3.6; // ~50 km/h average
          break;
        case 'motorcycle':
          estimatedTime = distance / 40 * 3.6; // ~40 km/h average
          break;
        case 'foot':
          estimatedTime = distance / 5 * 3.6; // ~5 km/h walking
          break;
      }

      const formattedDistance = distance < 1000 
        ? `${Math.round(distance)} meter`
        : `${(distance / 1000).toFixed(2)} kilometer`;

      const formattedDuration = this.formatDuration(estimatedTime);
      const transportText = transportMode === 'car' ? 'Mobil' : 
                           transportMode === 'motorcycle' ? 'Sepeda Motor' : 
                           'Pejalan Kaki';

      return {
        firstPoint,
        secondPoint,
        distance: formattedDistance,
        duration: formattedDuration,
        transportMode: transportText,
        message: `📏 Hasil Pengukuran (Mode: ${transportText})

Titik Awal:
${firstPoint.address}
(${firstPoint.latitude}, ${firstPoint.longitude})

Titik Akhir:
${secondPoint.address}
(${secondPoint.latitude}, ${secondPoint.longitude})

Jarak Tempuh: ${formattedDistance}
Waktu Perkiraan: ${formattedDuration}`
      };
    } catch (error) {
      this.logger.error('Error calculating route', error);
      throw error;
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)} detik`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)} menit`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} jam ${minutes} menit`;
    }
  }

  private initUserMeasurementState(telegramId: string): void {
    this.userMeasurementStates.set(telegramId, {
      isActive: false,
      timestamp: Date.now()
    });
  }

  cancelMeasurement(telegramId: string): string {
    const state = this.userMeasurementStates.get(telegramId);
    if (state && state.isActive) {
      this.initUserMeasurementState(telegramId);
      return 'Pengukuran jarak dan rute dibatalkan.';
    }
    return 'Tidak ada pengukuran aktif untuk dibatalkan.';
  }
}
