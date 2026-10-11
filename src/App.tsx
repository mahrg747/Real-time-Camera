/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, Image as ImageIcon, Settings as SettingsIcon, Smartphone } from 'lucide-react';
import {
  CapturedPhoto,
  WatermarkSettings,
  GpsLocation,
  SavedPerson,
} from './types';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  getAllPhotos,
  savePhoto,
  deletePhoto,
  loadSavedPersons,
  saveSavedPersons,
} from './services/db';
import { getCurrentGpsPosition, reverseGeocode } from './services/geolocation';
import { CameraView } from './components/CameraView';
import { GalleryView } from './components/GalleryView';
import { SettingsView } from './components/SettingsView';
import { AndroidExportModal } from './components/AndroidExportModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'camera' | 'gallery' | 'settings'>('camera');
  const [watermarkSettings, setWatermarkSettings] = useState<WatermarkSettings>(DEFAULT_SETTINGS);
  const [savedPersons, setSavedPersons] = useState<SavedPerson[]>([]);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [defaultCamera, setDefaultCamera] = useState<'environment' | 'user'>('environment');
  const [isAndroidGuideOpen, setIsAndroidGuideOpen] = useState(false);

  // GPS Location State
  const [gpsLocation, setGpsLocation] = useState<GpsLocation>({
    latitude: null,
    longitude: null,
    accuracy: null,
    altitude: null,
    heading: null,
    speed: null,
    timestamp: Date.now(),
    address: null,
    isLocating: true,
    error: null,
  });

  const watchIdRef = useRef<number | null>(null);

  // Initialize DB data (photos, settings, saved names)
  useEffect(() => {
    async function initData() {
      try {
        const [loadedSettings, loadedPersons, loadedPhotos] = await Promise.all([
          loadSettings(),
          loadSavedPersons(),
          getAllPhotos(),
        ]);
        setWatermarkSettings(loadedSettings);
        setSavedPersons(loadedPersons);
        setPhotos(loadedPhotos);
      } catch (err) {
        console.error('Error initializing app database:', err);
      }
    }
    initData();
  }, []);

  // Continuous GPS Tracking with High Accuracy
  const startGpsWatcher = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsLocation((prev) => ({
        ...prev,
        isLocating: false,
        error: 'Geolocation is not supported on this device',
      }));
      return;
    }

    setGpsLocation((prev) => ({ ...prev, isLocating: true }));

    // Snapshot first
    getCurrentGpsPosition().then((pos) => {
      setGpsLocation(pos);
    });

    // Continuous watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, accuracy, altitude, heading, speed } = pos.coords;
        let address: string | null = null;
        try {
          address = await reverseGeocode(latitude, longitude);
        } catch {
          address = null;
        }

        setGpsLocation({
          latitude,
          longitude,
          accuracy: Math.round(accuracy * 10) / 10,
          altitude: altitude ? Math.round(altitude * 10) / 10 : null,
          heading: heading ?? null,
          speed: speed ?? null,
          timestamp: pos.timestamp || Date.now(),
          address,
          isLocating: false,
          error: null,
        });
      },
      (err) => {
        let msg = 'Failed to obtain GPS location';
        if (err.code === 1) msg = 'Location access permission was denied';
        else if (err.code === 2) msg = 'GPS signal unavailable';
        else if (err.code === 3) msg = 'GPS request timed out';

        setGpsLocation((prev) => ({
          ...prev,
          isLocating: false,
          error: msg,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  useEffect(() => {
    startGpsWatcher();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [startGpsWatcher]);

  // Refresh GPS handler
  const handleRefreshGps = () => {
    startGpsWatcher();
  };

  // Photo Capture Callback
  const handlePhotoCaptured = async (newPhoto: CapturedPhoto) => {
    try {
      await savePhoto(newPhoto);
      setPhotos((prev) => [newPhoto, ...prev]);
    } catch (err) {
      console.error('Failed to save captured photo to DB:', err);
    }
  };

  // Photo Update Callback (after re-watermarking)
  const handlePhotoUpdated = async (updatedPhoto: CapturedPhoto) => {
    try {
      await savePhoto(updatedPhoto);
      setPhotos((prev) => prev.map((p) => (p.id === updatedPhoto.id ? updatedPhoto : p)));
    } catch (err) {
      console.error('Failed to update photo in DB:', err);
    }
  };

  // Photo Delete Callback
  const handleDeletePhoto = async (id: string) => {
    try {
      await deletePhoto(id);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Failed to delete photo from DB:', err);
    }
  };

  // Settings Save Callback
  const handleSaveSettings = async (newSettings: WatermarkSettings) => {
    setWatermarkSettings(newSettings);
    await saveSettings(newSettings);
  };

  // Saved Persons Callback
  const handleSaveSavedPersons = async (newPersons: SavedPerson[]) => {
    setSavedPersons(newPersons);
    await saveSavedPersons(newPersons);
  };

  const handleAddSavedPerson = async (newPerson: { name: string; designation?: string }) => {
    const updated = [
      ...savedPersons,
      {
        id: Date.now().toString(),
        name: newPerson.name,
        designation: newPerson.designation,
        isFavorite: false,
      },
    ];
    setSavedPersons(updated);
    await saveSavedPersons(updated);
  };

  const recentThumbnail = photos.length > 0 ? photos[0].imageUrl : null;

  return (
    <div className="flex flex-col h-screen w-screen max-w-full overflow-hidden bg-slate-950 text-slate-100">
      {/* Main View Area */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'camera' && (
          <CameraView
            gpsLocation={gpsLocation}
            onRefreshGps={handleRefreshGps}
            watermarkSettings={watermarkSettings}
            savedPersons={savedPersons}
            onAddSavedPerson={handleAddSavedPerson}
            onPhotoCaptured={handlePhotoCaptured}
            onOpenGallery={() => setActiveTab('gallery')}
            onOpenSettings={() => setActiveTab('settings')}
            recentPhotoThumbnail={recentThumbnail}
            defaultFacingMode={defaultCamera}
          />
        )}

        {activeTab === 'gallery' && (
          <GalleryView
            photos={photos}
            onDeletePhoto={handleDeletePhoto}
            onUpdatePhoto={handlePhotoUpdated}
            onBackToCamera={() => setActiveTab('camera')}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={watermarkSettings}
            onSaveSettings={handleSaveSettings}
            savedPersons={savedPersons}
            onSaveSavedPersons={handleSaveSavedPersons}
            defaultCamera={defaultCamera}
            onSetDefaultCamera={setDefaultCamera}
            onOpenAndroidGuide={() => setIsAndroidGuideOpen(true)}
          />
        )}
      </main>

      {/* FIXED BOTTOM NAVIGATION BAR (Thumb Zone Navigation) */}
      <nav className="shrink-0 h-16 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 grid grid-cols-3 items-center z-40 max-w-md mx-auto w-full px-2">
        {/* Camera Tab */}
        <button
          onClick={() => setActiveTab('camera')}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition-all active:scale-95 ${
            activeTab === 'camera' ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Camera className={`w-5 h-5 ${activeTab === 'camera' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[11px] mt-1 tracking-tight">Camera</span>
        </button>

        {/* Gallery Tab */}
        <button
          onClick={() => setActiveTab('gallery')}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition-all active:scale-95 relative ${
            activeTab === 'gallery' ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ImageIcon className={`w-5 h-5 ${activeTab === 'gallery' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[11px] mt-1 tracking-tight">Gallery</span>
          {photos.length > 0 && (
            <span className="absolute top-1 right-[28%] font-mono-numbers text-[9px] bg-sky-600 text-white rounded-full px-1.5 py-0.2">
              {photos.length}
            </span>
          )}
        </button>

        {/* Settings Tab */}
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition-all active:scale-95 ${
            activeTab === 'settings' ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <SettingsIcon className={`w-5 h-5 ${activeTab === 'settings' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[11px] mt-1 tracking-tight">Settings</span>
        </button>
      </nav>

      {/* Android Build Guide Modal */}
      <AndroidExportModal
        isOpen={isAndroidGuideOpen}
        onClose={() => setIsAndroidGuideOpen(false)}
      />
    </div>
  );
}
