import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, Eye, EyeOff, LayoutGrid, Check, Sparkles } from 'lucide-react';
import { CapturedPhoto, WatermarkSettings, WatermarkPosition, WatermarkFontSize } from '../types';
import { renderWatermarkedImage } from '../services/watermark';

interface PhotoEditorModalProps {
  photo: CapturedPhoto;
  isOpen: boolean;
  onClose: () => void;
  onSaveUpdatedPhoto: (updated: CapturedPhoto) => Promise<void>;
}

export const PhotoEditorModal: React.FC<PhotoEditorModalProps> = ({
  photo,
  isOpen,
  onClose,
  onSaveUpdatedPhoto,
}) => {
  const [personName, setPersonName] = useState(photo.personName);
  const [designation, setDesignation] = useState(photo.designation || '');
  const [settings, setSettings] = useState<WatermarkSettings>({ ...photo.watermarkSettings });
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(photo.imageUrl);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load original image into memory
  useEffect(() => {
    if (isOpen) {
      setPersonName(photo.personName);
      setDesignation(photo.designation || '');
      setSettings({ ...photo.watermarkSettings });
      setPreviewUrl(photo.imageUrl);
      setHasChanges(false);

      const img = new Image();
      img.src = photo.imageUrl;
      img.onload = () => {
        setOriginalImage(img);
      };
    }
  }, [isOpen, photo]);

  // Re-render watermark whenever user tweaks values
  const handleReRender = async () => {
    if (!originalImage) return;
    setIsProcessing(true);
    try {
      const result = await renderWatermarkedImage({
        imageSource: originalImage,
        personName,
        designation,
        location: {
          latitude: photo.location.latitude,
          longitude: photo.location.longitude,
          accuracy: photo.location.accuracy,
          altitude: null,
          heading: null,
          speed: null,
          timestamp: photo.createdAt,
          address: photo.location.address,
          isLocating: false,
        },
        settings,
        timestamp: photo.createdAt,
      });

      const newUrl = URL.createObjectURL(result.blob);
      setPreviewUrl(newUrl);
      setHasChanges(true);
    } catch (err) {
      console.error('Error re-rendering photo watermark:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!originalImage) return;
    setIsProcessing(true);
    try {
      const result = await renderWatermarkedImage({
        imageSource: originalImage,
        personName,
        designation,
        location: {
          latitude: photo.location.latitude,
          longitude: photo.location.longitude,
          accuracy: photo.location.accuracy,
          altitude: null,
          heading: null,
          speed: null,
          timestamp: photo.createdAt,
          address: photo.location.address,
          isLocating: false,
        },
        settings,
        timestamp: photo.createdAt,
      });

      const updatedPhoto: CapturedPhoto = {
        ...photo,
        imageBlob: result.blob,
        imageUrl: URL.createObjectURL(result.blob),
        personName,
        designation,
        watermarkSettings: settings,
      };

      await onSaveUpdatedPhoto(updatedPhoto);
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <h3 className="font-semibold text-slate-100 text-sm">Edit Photo & Watermark</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: 2-column on desktop / stacked on mobile */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
          {/* Left: Live Preview */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-950 rounded-xl p-2 min-h-[260px] border border-slate-800/80">
            <div className="relative max-h-[60vh] w-full flex items-center justify-center overflow-hidden rounded-lg">
              <img
                src={previewUrl}
                alt="Watermarked preview"
                className="max-h-[55vh] max-w-full object-contain rounded"
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center gap-2 text-white text-xs font-medium">
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                  <span>Updating Watermark...</span>
                </div>
              )}
            </div>
            <button
              onClick={handleReRender}
              disabled={isProcessing}
              className="mt-3 flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-950/80 border border-sky-800/80 text-sky-300 hover:bg-sky-900 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>Update Preview</span>
            </button>
          </div>

          {/* Right: Controls */}
          <div className="lg:col-span-5 space-y-4 text-xs">
            {/* Person Name */}
            <div>
              <label className="font-semibold text-slate-300 block mb-1">
                Person Name / Photo Kis Ki Hai?
              </label>
              <input
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Enter name..."
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Designation / Note */}
            <div>
              <label className="font-semibold text-slate-300 block mb-1">
                Designation / Note (Optional)
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Field Engineer, Auditor..."
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Position */}
            <div>
              <label className="font-semibold text-slate-300 block mb-1.5">
                Watermark Position
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['bottom-left', 'bottom-right', 'bottom-center', 'bottom-banner'] as WatermarkPosition[]).map(
                  (pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setSettings({ ...settings, position: pos })}
                      className={`px-2.5 py-1.5 rounded-lg border text-left capitalize transition-colors ${
                        settings.position === pos
                          ? 'bg-sky-600/30 border-sky-500 text-sky-200 font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {pos.replace('-', ' ')}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Font Size & Opacity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-300 block mb-1.5">Font Size</label>
                <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  {(['small', 'medium', 'large'] as WatermarkFontSize[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSettings({ ...settings, fontSize: size })}
                      className={`flex-1 py-1 rounded text-center capitalize text-[11px] ${
                        settings.fontSize === size
                          ? 'bg-sky-600 text-white font-medium'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1.5">
                  Opacity: {Math.round(settings.opacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.05"
                  value={settings.opacity}
                  onChange={(e) => setSettings({ ...settings, opacity: parseFloat(e.target.value) })}
                  className="w-full accent-sky-500 mt-2"
                />
              </div>
            </div>

            {/* Visibility Toggles */}
            <div>
              <label className="font-semibold text-slate-300 block mb-1.5">Include Fields</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.showPersonName}
                    onChange={(e) => setSettings({ ...settings, showPersonName: e.target.checked })}
                    className="accent-sky-500"
                  />
                  <span>Person Name</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.showAddress}
                    onChange={(e) => setSettings({ ...settings, showAddress: e.target.checked })}
                    className="accent-sky-500"
                  />
                  <span>Address</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.showCoordinates}
                    onChange={(e) => setSettings({ ...settings, showCoordinates: e.target.checked })}
                    className="accent-sky-500"
                  />
                  <span>Coordinates</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.showTimestamp}
                    onChange={(e) => setSettings({ ...settings, showTimestamp: e.target.checked })}
                    className="accent-sky-500"
                  />
                  <span>Date & Time</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.showQrCode}
                    onChange={(e) => setSettings({ ...settings, showQrCode: e.target.checked })}
                    className="accent-sky-500"
                  />
                  <span>Map QR Code</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.showAccuracy}
                    onChange={(e) => setSettings({ ...settings, showAccuracy: e.target.checked })}
                    className="accent-sky-500"
                  />
                  <span>GPS Accuracy</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>Save & Apply Watermark</span>
          </button>
        </div>
      </div>
    </div>
  );
};
