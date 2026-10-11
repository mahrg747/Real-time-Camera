import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  Grid,
  Image as ImageIcon,
  Upload,
  AlertCircle,
  Eye,
  EyeOff,
  Settings,
  Sparkles,
  MapPin,
  Clock
} from 'lucide-react';
import { GpsLocation, WatermarkSettings, SavedPerson, CapturedPhoto } from '../types';
import { GpsStatusBadge } from './GpsStatusBadge';
import { PersonNameBar } from './PersonNameBar';
import { renderWatermarkedImage, formatDateTime } from '../services/watermark';
import { getCurrentGpsPosition } from '../services/geolocation';

interface CameraViewProps {
  gpsLocation: GpsLocation;
  onRefreshGps: () => void;
  watermarkSettings: WatermarkSettings;
  savedPersons: SavedPerson[];
  onAddSavedPerson: (p: { name: string; designation?: string }) => void;
  onPhotoCaptured: (photo: CapturedPhoto) => void;
  onOpenGallery: () => void;
  onOpenSettings: () => void;
  recentPhotoThumbnail?: string | null;
  defaultFacingMode?: 'environment' | 'user';
}

export const CameraView: React.FC<CameraViewProps> = ({
  gpsLocation,
  onRefreshGps,
  watermarkSettings,
  savedPersons,
  onAddSavedPerson,
  onPhotoCaptured,
  onOpenGallery,
  onOpenSettings,
  recentPhotoThumbnail,
  defaultFacingMode = 'environment',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(defaultFacingMode);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorchCapability, setHasTorchCapability] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showLiveWatermarkOverlay, setShowLiveWatermarkOverlay] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);

  // Live ticking time for UI
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Person Name input states
  const [personName, setPersonName] = useState('');
  const [designation, setDesignation] = useState('');
  const [isNameVisible, setIsNameVisible] = useState(watermarkSettings.showPersonName);

  // Tick clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync default facing mode if changed from settings
  useEffect(() => {
    setFacingMode(defaultFacingMode);
  }, [defaultFacingMode]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported by your browser environment.');
      }

      // Constraints for high resolution camera
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities?.() || {}) as any;
        setHasTorchCapability(Boolean(capabilities.torch));
      }
    } catch (err: any) {
      console.warn('Camera initialization error:', err);
      let errMsg = 'Could not access device camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Camera permission denied. Please allow camera access in browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'No camera found on this device. You can upload an existing photo below.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errMsg = 'Camera is in use by another application.';
      }
      setCameraError(errMsg);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [startCamera]);

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorchCapability) {
      try {
        const newTorch = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: newTorch }],
        });
        setIsTorchOn(newTorch);
      } catch (e) {
        console.warn('Failed to toggle torch', e);
      }
    }
  };

  // Flip Camera
  const toggleFacingMode = () => {
    setIsTorchOn(false);
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture Photo
  const handleCapture = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    // Haptic feedback if supported
    if (navigator.vibrate) {
      try {
        navigator.vibrate(50);
      } catch {}
    }

    // Trigger visual shutter flash
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 200);

    try {
      let imageSource: HTMLVideoElement | HTMLImageElement | null = null;

      if (videoRef.current && videoRef.current.readyState >= 2) {
        imageSource = videoRef.current;
      }

      if (!imageSource) {
        throw new Error('Video feed is not ready.');
      }

      // Fetch fresh GPS position right at capture timestamp
      const captureTime = Date.now();
      let freshGps = gpsLocation;
      try {
        freshGps = await getCurrentGpsPosition();
      } catch {
        freshGps = gpsLocation;
      }

      const activeSettings: WatermarkSettings = {
        ...watermarkSettings,
        showPersonName: isNameVisible,
      };

      const rendered = await renderWatermarkedImage({
        imageSource,
        personName: isNameVisible ? personName : '',
        designation: isNameVisible ? designation : '',
        location: freshGps,
        settings: activeSettings,
        timestamp: captureTime,
      });

      const photoId = `photo_${captureTime}_${Math.random().toString(36).substring(2, 7)}`;
      const capturedPhoto: CapturedPhoto = {
        id: photoId,
        createdAt: captureTime,
        imageBlob: rendered.blob,
        imageUrl: URL.createObjectURL(rendered.blob),
        originalWidth: rendered.width,
        originalHeight: rendered.height,
        personName: isNameVisible ? personName : '',
        designation: isNameVisible ? designation : '',
        location: {
          latitude: freshGps.latitude,
          longitude: freshGps.longitude,
          accuracy: freshGps.accuracy,
          address: freshGps.address,
        },
        watermarkSettings: activeSettings,
      };

      onPhotoCaptured(capturedPhoto);
    } catch (err: any) {
      console.error('Failed to capture photo:', err);
      alert('Photo capture failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsCapturing(false);
    }
  };

  // Fallback: Pick Photo from Device Gallery & Apply Watermark
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsCapturing(true);
    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const captureTime = Date.now();
      let freshGps = gpsLocation;
      try {
        freshGps = await getCurrentGpsPosition();
      } catch {
        freshGps = gpsLocation;
      }

      const activeSettings: WatermarkSettings = {
        ...watermarkSettings,
        showPersonName: isNameVisible,
      };

      const rendered = await renderWatermarkedImage({
        imageSource: img,
        personName: isNameVisible ? personName : '',
        designation: isNameVisible ? designation : '',
        location: freshGps,
        settings: activeSettings,
        timestamp: captureTime,
      });

      const photoId = `photo_${captureTime}_${Math.random().toString(36).substring(2, 7)}`;
      const capturedPhoto: CapturedPhoto = {
        id: photoId,
        createdAt: captureTime,
        imageBlob: rendered.blob,
        imageUrl: URL.createObjectURL(rendered.blob),
        originalWidth: rendered.width,
        originalHeight: rendered.height,
        personName: isNameVisible ? personName : '',
        designation: isNameVisible ? designation : '',
        location: {
          latitude: freshGps.latitude,
          longitude: freshGps.longitude,
          accuracy: freshGps.accuracy,
          address: freshGps.address,
        },
        watermarkSettings: activeSettings,
      };

      onPhotoCaptured(capturedPhoto);
    } catch (err: any) {
      console.error('Failed to process uploaded photo:', err);
      alert('Failed to watermark photo: ' + (err.message || 'Unknown error'));
    } finally {
      setIsCapturing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const { dateStr, timeStr } = formatDateTime(currentTime, watermarkSettings.timeFormat);

  return (
    <div className="relative flex flex-col h-full w-full bg-black select-none overflow-hidden">
      {/* Visual Shutter Flash Effect */}
      {shutterFlash && (
        <div className="absolute inset-0 z-50 bg-white opacity-85 transition-opacity duration-200 pointer-events-none" />
      )}

      {/* Hidden File Input for Fallback Photo Selection */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* TOP BAR OVERLAY: Brand, Clock, GPS, Controls */}
      <div className="absolute top-0 left-0 right-0 z-30 p-3 sm:p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex flex-col gap-2">
        <div className="flex items-center justify-between">
          {/* Brand Wordmark & Live Clock */}
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span>Real Time Camera Location MG</span>
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-slate-300 font-mono-numbers mt-0.5">
              <span>{dateStr}</span>
              <span>·</span>
              <span className="text-sky-300 font-semibold">{timeStr}</span>
            </div>
          </div>

          {/* Quick Hardware Actions */}
          <div className="flex items-center gap-1.5">
            {/* Live Watermark Overlay Toggle */}
            <button
              onClick={() => setShowLiveWatermarkOverlay(!showLiveWatermarkOverlay)}
              className={`p-2 rounded-xl backdrop-blur-md transition-all ${
                showLiveWatermarkOverlay
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                  : 'bg-black/40 text-slate-400 border border-white/10'
              }`}
              title={showLiveWatermarkOverlay ? 'Hide live watermark preview' : 'Show live watermark preview'}
            >
              <Eye className="w-4 h-4" />
            </button>

            {/* Grid Toggle */}
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-xl backdrop-blur-md transition-all ${
                showGrid
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                  : 'bg-black/40 text-slate-400 border border-white/10'
              }`}
              title="Toggle rule-of-thirds framing grid"
            >
              <Grid className="w-4 h-4" />
            </button>

            {/* Torch Toggle if supported */}
            {hasTorchCapability && (
              <button
                onClick={toggleTorch}
                className={`p-2 rounded-xl backdrop-blur-md transition-all ${
                  isTorchOn
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-400/40'
                    : 'bg-black/40 text-slate-400 border border-white/10'
                }`}
                title="Toggle flashlight / torch"
              >
                {isTorchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}

            {/* Flip Camera */}
            <button
              onClick={toggleFacingMode}
              className="p-2 rounded-xl bg-black/40 text-slate-300 border border-white/10 hover:text-white backdrop-blur-md active:scale-90 transition-transform"
              title="Flip between front and back camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-xl bg-black/40 text-slate-300 border border-white/10 hover:text-white backdrop-blur-md active:scale-90 transition-transform"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* GPS Live Status Strip */}
        <div className="flex items-center justify-between gap-2">
          <GpsStatusBadge location={gpsLocation} onRefresh={onRefreshGps} />
        </div>
      </div>

      {/* CAMERA VIEWFINDER (CENTER) */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center bg-slate-950 overflow-hidden">
        {cameraError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto z-10 text-slate-300">
            <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-center text-rose-400 mb-3 shadow-lg">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Camera Notice</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">{cameraError}</p>
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={startCamera}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md active:scale-95 transition-all"
              >
                Retry Camera Access
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                <span>Upload Photo to Tag with GPS</span>
              </button>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />
        )}

        {/* Framing Grid Overlay */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none z-10 grid grid-cols-3 grid-rows-3 border border-white/15">
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-white/20" />
            <div className="border-r border-white/20" />
            <div />
          </div>
        )}

        {/* LIVE WATERMARK PREVIEW OVERLAY (Shows user exact placement on live viewfinder) */}
        {showLiveWatermarkOverlay && (
          <div
            className={`absolute z-20 pointer-events-none p-2 sm:p-3 transition-all ${
              watermarkSettings.position === 'bottom-banner'
                ? 'bottom-28 left-0 right-0'
                : watermarkSettings.position === 'bottom-right'
                ? 'bottom-28 right-3 max-w-xs'
                : watermarkSettings.position === 'bottom-center'
                ? 'bottom-28 left-1/2 -translate-x-1/2 max-w-xs'
                : 'bottom-28 left-3 max-w-xs'
            }`}
          >
            <div
              style={{
                backgroundColor: `rgba(10, 15, 29, ${watermarkSettings.opacity})`,
              }}
              className={`border border-white/20 p-2.5 text-[11px] shadow-2xl backdrop-blur-sm ${
                watermarkSettings.position === 'bottom-banner' ? 'rounded-none' : 'rounded-xl'
              }`}
            >
              {watermarkSettings.showAppTitle && (
                <div className="font-bold text-sky-400 text-xs mb-1">
                  {watermarkSettings.customWatermarkTitle}
                </div>
              )}

              {isNameVisible && personName.trim() && (
                <div className="font-bold text-white text-[11px] truncate">
                  Person Name: {personName.trim()}
                  {designation.trim() && ` (${designation.trim()})`}
                </div>
              )}

              {watermarkSettings.showAddress && (
                <div className="text-slate-200 truncate">
                  <span className="text-slate-400 font-medium">Location: </span>
                  {gpsLocation.address || (gpsLocation.isLocating ? 'Locating...' : 'Address unavailable')}
                </div>
              )}

              {watermarkSettings.showCoordinates && (
                <div className="text-sky-300 font-mono-numbers">
                  <span className="text-slate-400">Lat: </span>
                  {gpsLocation.latitude !== null ? gpsLocation.latitude.toFixed(6) : 'N/A'},{' '}
                  <span className="text-slate-400">Lng: </span>
                  {gpsLocation.longitude !== null ? gpsLocation.longitude.toFixed(6) : 'N/A'}
                </div>
              )}

              {watermarkSettings.showTimestamp && (
                <div className="text-slate-300 font-mono-numbers text-[10px]">
                  <span>Date: {dateStr}</span> · <span>Time: {timeStr}</span>
                </div>
              )}

              {watermarkSettings.showAccuracy && gpsLocation.accuracy !== null && (
                <div className="text-sky-300 font-mono-numbers text-[10px]">
                  GPS Accuracy: ±{gpsLocation.accuracy}m
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS SECTION (Thumb zone) */}
      <div className="relative z-30 bg-gradient-to-t from-black via-slate-950/95 to-transparent pt-2 pb-6 px-4 flex flex-col gap-3">
        {/* Person Name Input Bar */}
        <div className="w-full max-w-md mx-auto">
          <PersonNameBar
            personName={personName}
            onPersonNameChange={setPersonName}
            designation={designation}
            onDesignationChange={setDesignation}
            isNameVisible={isNameVisible}
            onToggleNameVisibility={setIsNameVisible}
            savedPersons={savedPersons}
            onAddSavedPerson={onAddSavedPerson}
          />
        </div>

        {/* Shutter Bar with Gallery & Upload Buttons */}
        <div className="flex items-center justify-between max-w-md mx-auto w-full px-2 pt-1">
          {/* Gallery Thumbnail Button */}
          <button
            onClick={onOpenGallery}
            className="w-13 h-13 rounded-2xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-center overflow-hidden hover:border-sky-500 transition-all active:scale-95 shadow-md group relative"
            title="Open photo gallery"
          >
            {recentPhotoThumbnail ? (
              <img
                src={recentPhotoThumbnail}
                alt="Recent"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
              />
            ) : (
              <ImageIcon className="w-6 h-6 text-slate-400 group-hover:text-sky-400" />
            )}
          </button>

          {/* LARGE CAMERA SHUTTER BUTTON */}
          <div className="relative flex items-center justify-center">
            <button
              onClick={handleCapture}
              disabled={isCapturing}
              className={`w-20 h-20 rounded-full border-4 border-white/90 flex items-center justify-center p-1.5 transition-transform active:scale-90 shadow-2xl ${
                isCapturing ? 'opacity-70 scale-95' : 'hover:scale-105'
              }`}
              title="Take Photo with GPS Watermark"
            >
              <div
                className={`w-full h-full rounded-full bg-gradient-to-tr from-sky-500 to-sky-300 shadow-inner flex items-center justify-center transition-all ${
                  isCapturing ? 'scale-75 bg-sky-600' : ''
                }`}
              >
                {isCapturing ? (
                  <RefreshCw className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-7 h-7 text-white drop-shadow" />
                )}
              </div>
            </button>
          </div>

          {/* Upload Button (Alternative Input) */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-13 h-13 rounded-2xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-center text-slate-400 hover:text-sky-400 hover:border-sky-500 transition-all active:scale-95 shadow-md"
            title="Upload photo from device gallery"
          >
            <Upload className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
