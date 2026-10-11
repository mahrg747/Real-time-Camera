import React, { useState } from 'react';
import {
  Save,
  Check,
  Settings as SettingsIcon,
  ShieldCheck,
  Sliders,
  Type,
  MapPin,
  Clock,
  Camera,
  UserCheck,
  Plus,
  Trash2,
  Bookmark
} from 'lucide-react';
import {
  WatermarkSettings,
  WatermarkPosition,
  WatermarkFontSize,
  TimeFormat,
  PhotoQuality,
  SavedPerson,
} from '../types';

interface SettingsViewProps {
  settings: WatermarkSettings;
  onSaveSettings: (settings: WatermarkSettings) => Promise<void>;
  savedPersons: SavedPerson[];
  onSaveSavedPersons: (persons: SavedPerson[]) => Promise<void>;
  defaultCamera: 'environment' | 'user';
  onSetDefaultCamera: (facing: 'environment' | 'user') => void;
  onOpenAndroidGuide: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings: initialSettings,
  onSaveSettings,
  savedPersons,
  onSaveSavedPersons,
  defaultCamera,
  onSetDefaultCamera,
  onOpenAndroidGuide,
}) => {
  const [settings, setSettings] = useState<WatermarkSettings>({ ...initialSettings });
  const [persons, setPersons] = useState<SavedPerson[]>([...savedPersons]);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonDesignation, setNewPersonDesignation] = useState('');
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  const handleSave = async () => {
    await onSaveSettings(settings);
    await onSaveSavedPersons(persons);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2500);
  };

  const handleAddPerson = () => {
    if (!newPersonName.trim()) return;
    const newEntry: SavedPerson = {
      id: Date.now().toString(),
      name: newPersonName.trim(),
      designation: newPersonDesignation.trim() || undefined,
      isFavorite: false,
    };
    setPersons([...persons, newEntry]);
    setNewPersonName('');
    setNewPersonDesignation('');
  };

  const handleRemovePerson = (id: string) => {
    setPersons(persons.filter((p) => p.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Top Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-sky-400" />
          <h2 className="text-base font-bold text-white tracking-tight">Camera & Watermark Settings</h2>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 active:scale-95 transition-all"
        >
          {isSavedNotice ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          <span>{isSavedNotice ? 'Saved!' : 'Save Settings'}</span>
        </button>
      </div>

      <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto w-full pb-16">
        {/* Section 1: Watermark Appearance */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-sky-300">
            <Sliders className="w-4 h-4" />
            <span>Watermark Layout & Style</span>
          </div>

          {/* Watermark Title Branding */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Watermark Brand Title
            </label>
            <input
              type="text"
              value={settings.customWatermarkTitle}
              onChange={(e) => setSettings({ ...settings, customWatermarkTitle: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Position */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Default Watermark Position
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'bottom-left', label: 'Bottom Left' },
                  { id: 'bottom-right', label: 'Bottom Right' },
                  { id: 'bottom-center', label: 'Bottom Center' },
                  { id: 'bottom-banner', label: 'Full Bottom Banner' },
                ] as { id: WatermarkPosition; label: string }[]
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSettings({ ...settings, position: item.id })}
                  className={`px-3 py-2 rounded-xl border text-left text-xs font-medium transition-colors ${
                    settings.position === item.id
                      ? 'bg-sky-600/30 border-sky-500 text-sky-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size & Opacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Watermark Font Size
              </label>
              <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['small', 'medium', 'large'] as WatermarkFontSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSettings({ ...settings, fontSize: size })}
                    className={`flex-1 py-1.5 rounded-lg text-center capitalize text-xs ${
                      settings.fontSize === size
                        ? 'bg-sky-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1.5">
                <span>Panel Opacity</span>
                <span className="font-mono-numbers text-sky-400">{Math.round(settings.opacity * 100)}%</span>
              </div>
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
        </div>

        {/* Section 2: Watermark Fields Visibility */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-sky-300">
            <Type className="w-4 h-4" />
            <span>Information Overlay Toggles</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer">
              <span className="text-slate-200">App Branding Title</span>
              <input
                type="checkbox"
                checked={settings.showAppTitle}
                onChange={(e) => setSettings({ ...settings, showAppTitle: e.target.checked })}
                className="w-4 h-4 accent-sky-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer">
              <span className="text-slate-200">Person Name</span>
              <input
                type="checkbox"
                checked={settings.showPersonName}
                onChange={(e) => setSettings({ ...settings, showPersonName: e.target.checked })}
                className="w-4 h-4 accent-sky-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer">
              <span className="text-slate-200">Designation / Note</span>
              <input
                type="checkbox"
                checked={settings.showDesignation}
                onChange={(e) => setSettings({ ...settings, showDesignation: e.target.checked })}
                className="w-4 h-4 accent-sky-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer">
              <span className="text-slate-200">Readable Address</span>
              <input
                type="checkbox"
                checked={settings.showAddress}
                onChange={(e) => setSettings({ ...settings, showAddress: e.target.checked })}
                className="w-4 h-4 accent-sky-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer">
              <span className="text-slate-200">Latitude & Longitude</span>
              <input
                type="checkbox"
                checked={settings.showCoordinates}
                onChange={(e) => setSettings({ ...settings, showCoordinates: e.target.checked })}
                className="w-4 h-4 accent-sky-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer">
              <span className="text-slate-200">GPS Accuracy (±m)</span>
              <input
                type="checkbox"
                checked={settings.showAccuracy}
                onChange={(e) => setSettings({ ...settings, showAccuracy: e.target.checked })}
                className="w-4 h-4 accent-sky-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer">
              <span className="text-slate-200">Date & Time of Capture</span>
              <input
                type="checkbox"
                checked={settings.showTimestamp}
                onChange={(e) => setSettings({ ...settings, showTimestamp: e.target.checked })}
                className="w-4 h-4 accent-sky-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer">
              <span className="text-slate-200">Google Maps QR Code</span>
              <input
                type="checkbox"
                checked={settings.showQrCode}
                onChange={(e) => setSettings({ ...settings, showQrCode: e.target.checked })}
                className="w-4 h-4 accent-sky-500 rounded"
              />
            </label>
          </div>
        </div>

        {/* Section 3: Time Format & Photo Quality & Camera Defaults */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-sky-300">
            <Camera className="w-4 h-4" />
            <span>Camera & System Preferences</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Time Format */}
            <div>
              <label className="font-medium text-slate-300 block mb-1.5">Time Format</label>
              <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['12h', '24h'] as TimeFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setSettings({ ...settings, timeFormat: fmt })}
                    className={`flex-1 py-1.5 rounded-lg text-center font-medium ${
                      settings.timeFormat === fmt
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {fmt === '12h' ? '12-Hour (AM/PM)' : '24-Hour'}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Quality */}
            <div>
              <label className="font-medium text-slate-300 block mb-1.5">Photo Quality</label>
              <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['high', 'medium', 'standard'] as PhotoQuality[]).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setSettings({ ...settings, quality: q })}
                    className={`flex-1 py-1.5 rounded-lg text-center capitalize font-medium ${
                      settings.quality === q
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Camera */}
            <div>
              <label className="font-medium text-slate-300 block mb-1.5">Default Camera</label>
              <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => onSetDefaultCamera('environment')}
                  className={`flex-1 py-1.5 rounded-lg text-center font-medium ${
                    defaultCamera === 'environment'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Back (Main)
                </button>
                <button
                  type="button"
                  onClick={() => onSetDefaultCamera('user')}
                  className={`flex-1 py-1.5 rounded-lg text-center font-medium ${
                    defaultCamera === 'user'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Front (Selfie)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Frequently Used Names Manager */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-sky-300">
              <UserCheck className="w-4 h-4" />
              <span>Frequently Used Names (“Photo Kis Ki Hai”)</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono-numbers">
              {persons.length} saved
            </span>
          </div>

          {/* Add Name Form */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
            <input
              type="text"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              placeholder="Name (e.g. John Doe, Inspector Ali)"
              className="sm:col-span-6 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-sky-500"
            />
            <input
              type="text"
              value={newPersonDesignation}
              onChange={(e) => setNewPersonDesignation(e.target.value)}
              placeholder="Designation / Role"
              className="sm:col-span-4 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-sky-500"
            />
            <button
              type="button"
              onClick={handleAddPerson}
              disabled={!newPersonName.trim()}
              className="sm:col-span-2 flex items-center justify-center gap-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-semibold py-2 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>

          {/* List of Persons */}
          <div className="space-y-1.5 pt-2">
            {persons.map((person) => (
              <div
                key={person.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-200">{person.name}</span>
                  {person.designation && (
                    <span className="ml-2 text-[11px] text-slate-400">({person.designation})</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePerson(person.id)}
                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  title="Remove saved name"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Android Build Guide & Privacy Notice */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>100% Local Privacy Guarantee</span>
            </div>
            <button
              onClick={onOpenAndroidGuide}
              className="text-xs text-sky-400 hover:underline font-semibold"
            >
              Android APK Guide
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            All captured photos and GPS coordinates are processed exclusively on your local device hardware using HTML5 Canvas & IndexedDB. No external servers or face recognition APIs are involved.
          </p>
        </div>
      </div>
    </div>
  );
};
