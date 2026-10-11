import React, { useState } from 'react';
import { X, Smartphone, Copy, Check, Terminal, ExternalLink, Shield } from 'lucide-react';

interface AndroidExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidExportModal: React.FC<AndroidExportModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const capacitorCommands = `npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/camera @capacitor/geolocation
npx cap init "Real Time Camera Location MG" "com.mg.realtimelocationcamera" --web-dir dist
npm run build
npx cap add android
npx cap open android`;

  const androidManifestPermissions = `<!-- Add to android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-feature android:name="android.hardware.camera" android:required="true" />
<uses-feature android:name="android.hardware.location.gps" android:required="true" />`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-sky-400" />
            <h3 className="font-semibold text-slate-100 text-sm">Native Android APK Build Guide</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-300">
          <div className="bg-sky-950/40 border border-sky-800/50 p-3 rounded-xl flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This web app runs directly in any Android Chrome/Firefox browser with full camera & GPS hardware support. To package it into a standalone <strong>.apk</strong> installable file, use Capacitor CLI with the commands below:
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 font-semibold text-slate-200">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-sky-400" />
                <span>1. Capacitor Android CLI Commands</span>
              </span>
              <button
                onClick={() => copyToClipboard(capacitorCommands, 'cap')}
                className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300"
              >
                {copiedKey === 'cap' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'cap' ? 'Copied' : 'Copy Commands'}</span>
              </button>
            </div>
            <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono-numbers text-[11px] text-slate-200 overflow-x-auto leading-relaxed">
              {capacitorCommands}
            </pre>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 font-semibold text-slate-200">
              <span>2. AndroidManifest.xml Camera & GPS Permissions</span>
              <button
                onClick={() => copyToClipboard(androidManifestPermissions, 'manifest')}
                className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300"
              >
                {copiedKey === 'manifest' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'manifest' ? 'Copied' : 'Copy XML'}</span>
              </button>
            </div>
            <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono-numbers text-[11px] text-slate-200 overflow-x-auto leading-relaxed">
              {androidManifestPermissions}
            </pre>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1 text-slate-400">
            <p className="font-semibold text-slate-200">3. Generate Signed APK in Android Studio:</p>
            <p>1. In Android Studio, click <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong>.</p>
            <p>2. The ready-to-install APK will be in <code>android/app/build/outputs/apk/debug/app-debug.apk</code>.</p>
          </div>
        </div>

        <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
