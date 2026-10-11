export type WatermarkPosition = 'bottom-left' | 'bottom-right' | 'bottom-center' | 'bottom-banner';
export type WatermarkFontSize = 'small' | 'medium' | 'large';
export type TimeFormat = '12h' | '24h';
export type PhotoQuality = 'high' | 'medium' | 'standard';

export interface GpsLocation {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null; // meters
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  address: string | null;
  city?: string;
  country?: string;
  isLocating: boolean;
  error?: string | null;
}

export interface WatermarkSettings {
  position: WatermarkPosition;
  fontSize: WatermarkFontSize;
  opacity: number; // 0.5 to 1.0
  timeFormat: TimeFormat;
  quality: PhotoQuality;
  showAppTitle: boolean;
  showPersonName: boolean;
  showDesignation: boolean;
  showAddress: boolean;
  showCoordinates: boolean;
  showAccuracy: boolean;
  showTimestamp: boolean;
  showQrCode: boolean;
  customWatermarkTitle: string;
}

export interface CapturedPhoto {
  id: string;
  createdAt: number;
  imageBlob: Blob;
  imageUrl: string; // Object URL or Base64 for display
  originalWidth: number;
  originalHeight: number;
  personName: string;
  designation?: string;
  location: {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    address: string | null;
  };
  watermarkSettings: WatermarkSettings;
}

export interface SavedPerson {
  id: string;
  name: string;
  designation?: string;
  isFavorite?: boolean;
}
