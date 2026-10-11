import React, { useState } from 'react';
import {
  Download,
  Share2,
  Trash2,
  Edit3,
  ExternalLink,
  MapPin,
  Calendar,
  Clock,
  User,
  X,
  CheckCircle,
  AlertCircle,
  ZoomIn,
  Search,
  Image as ImageIcon
} from 'lucide-react';
import { CapturedPhoto } from '../types';
import { formatCoordinates, getGoogleMapsUrl } from '../services/geolocation';
import { formatDateTime } from '../services/watermark';
import { PhotoEditorModal } from './PhotoEditorModal';

interface GalleryViewProps {
  photos: CapturedPhoto[];
  onDeletePhoto: (id: string) => Promise<void>;
  onUpdatePhoto: (updated: CapturedPhoto) => Promise<void>;
  onBackToCamera: () => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({
  photos,
  onDeletePhoto,
  onUpdatePhoto,
  onBackToCamera,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<CapturedPhoto | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredPhotos = photos.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesName = p.personName.toLowerCase().includes(q);
    const matchesAddress = p.location.address?.toLowerCase().includes(q);
    const matchesDesignation = p.designation?.toLowerCase().includes(q);
    return matchesName || matchesAddress || matchesDesignation;
  });

  const handleDownload = (photo: CapturedPhoto) => {
    try {
      const link = document.createElement('a');
      link.href = photo.imageUrl;
      const datePart = new Date(photo.createdAt).toISOString().replace(/[:.]/g, '-');
      link.download = `MG_CAM_${photo.personName ? photo.personName.replace(/\s+/g, '_') + '_' : ''}${datePart}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Photo saved to device downloads!', 'success');
    } catch (err) {
      console.error('Download error:', err);
      showToast('Failed to save image', 'error');
    }
  };

  const handleShare = async (photo: CapturedPhoto) => {
    try {
      const { fullStr } = formatDateTime(photo.createdAt, photo.watermarkSettings.timeFormat);
      const coordsText =
        photo.location.latitude && photo.location.longitude
          ? `\nGPS: ${photo.location.latitude.toFixed(6)}, ${photo.location.longitude.toFixed(6)}\nMap: ${getGoogleMapsUrl(
              photo.location.latitude,
              photo.location.longitude
            )}`
          : '';

      const shareText = `Real Time Camera Location MG\nCaptured: ${fullStr}\nPerson: ${
        photo.personName || 'Unspecified'
      }${photo.location.address ? `\nLocation: ${photo.location.address}` : ''}${coordsText}`;

      // Convert blob to File if possible for rich sharing in WhatsApp / Telegram / etc.
      if (navigator.canShare && photo.imageBlob) {
        const file = new File([photo.imageBlob], `MG_Camera_Capture_${photo.createdAt}.jpg`, {
          type: 'image/jpeg',
        });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Real Time Camera Location MG',
            text: shareText,
            files: [file],
          });
          showToast('Shared successfully!', 'success');
          return;
        }
      }

      // Fallback share text
      if (navigator.share) {
        await navigator.share({
          title: 'Real Time Camera Location MG',
          text: shareText,
          url: photo.imageUrl,
        });
        showToast('Shared successfully!', 'success');
      } else {
        // Fallback: Copy info & download
        handleDownload(photo);
        await navigator.clipboard.writeText(shareText);
        showToast('Saved photo & copied details to clipboard!', 'success');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Share error:', err);
        showToast('Sharing failed or was cancelled', 'error');
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeletePhoto(id);
      if (selectedPhoto?.id === id) {
        setSelectedPhoto(null);
      }
      setDeleteConfirmId(null);
      showToast('Photo deleted', 'success');
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Could not delete photo', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold shadow-2xl backdrop-blur-md border animate-in fade-in duration-200 transition-all ${
          toastMessage.type === 'success'
            ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700/60'
            : 'bg-rose-950/90 text-rose-200 border-rose-700/60'
        }">
          {toastMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Saved Photos</h2>
          <p className="text-[11px] text-slate-400 font-mono-numbers">
            {photos.length} captured photo{photos.length === 1 ? '' : 's'} in device storage
          </p>
        </div>

        <button
          onClick={onBackToCamera}
          className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20 active:scale-95 transition-all"
        >
          Open Camera
        </button>
      </div>

      {/* Search / Filter Bar */}
      {photos.length > 0 && (
        <div className="px-4 py-2.5 border-b border-slate-800/60 bg-slate-950">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by person name or location..."
              className="w-full bg-slate-900/90 border border-slate-800 text-slate-200 placeholder:text-slate-500 pl-9 pr-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-sky-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Gallery Grid or Empty State */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {photos.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400 mb-4 shadow-inner">
              <ImageIcon className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-200 mb-1">No Photos Yet</h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Capture your first photo with real-time GPS coordinates, address watermark, and person name.
            </p>
            <button
              onClick={onBackToCamera}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 active:scale-95 transition-all"
            >
              Take First Photo
            </button>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No photos matching "{searchQuery}"
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredPhotos.map((photo) => {
              const { dateStr, timeStr } = formatDateTime(
                photo.createdAt,
                photo.watermarkSettings.timeFormat
              );
              return (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="group relative bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-md cursor-pointer hover:border-sky-500/50 transition-all flex flex-col"
                >
                  {/* Thumbnail */}
                  <div className="aspect-square bg-slate-950 overflow-hidden relative">
                    <img
                      src={photo.imageUrl}
                      alt={photo.personName || 'Captured photo'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />

                    {/* Quick overlay tag */}
                    {photo.personName && (
                      <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-md truncate max-w-[85%] border border-white/10">
                        {photo.personName}
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <span className="text-[11px] text-sky-300 font-medium flex items-center gap-1">
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </span>
                    </div>
                  </div>

                  {/* Metadata Card Footer */}
                  <div className="p-2.5 text-[11px] flex flex-col gap-1">
                    <div className="font-semibold text-slate-200 truncate">
                      {photo.personName ? photo.personName : 'Untitled Photo'}
                    </div>

                    <div className="text-slate-400 truncate flex items-center gap-1 text-[10px]">
                      <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                      <span className="truncate">
                        {photo.location.address ||
                          (photo.location.latitude
                            ? `${photo.location.latitude.toFixed(4)}, ${photo.location.longitude?.toFixed(4)}`
                            : 'Location unknown')}
                      </span>
                    </div>

                    <div className="text-slate-500 text-[10px] font-mono-numbers flex items-center justify-between pt-1 border-t border-slate-800/60">
                      <span>{dateStr}</span>
                      <span>{timeStr}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full-Screen Photo Details Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-4">
          <div className="w-full max-w-4xl max-h-[96vh] bg-slate-900 border border-slate-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/70">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-100 truncate">
                  {selectedPhoto.personName || 'Photo Preview'}
                </span>
                {selectedPhoto.designation && (
                  <span className="text-xs text-sky-400 truncate">
                    ({selectedPhoto.designation})
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo Viewport */}
            <div className="flex-1 bg-black flex items-center justify-center overflow-hidden p-2 min-h-[300px] relative">
              <img
                src={selectedPhoto.imageUrl}
                alt={selectedPhoto.personName || 'Photo'}
                className="max-h-[58vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>

            {/* Photo Metadata Card */}
            <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800/80 text-xs space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div className="truncate">
                    <span className="text-slate-400 text-[11px] block">Address</span>
                    <span className="font-medium text-slate-200">
                      {selectedPhoto.location.address || 'Address not available'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 text-[11px] block">Captured Date & Time</span>
                    <span className="font-mono-numbers text-slate-200">
                      {formatDateTime(selectedPhoto.createdAt, selectedPhoto.watermarkSettings.timeFormat).fullStr}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 text-[11px] block">GPS Coordinates & Accuracy</span>
                    <span className="font-mono-numbers text-sky-300">
                      {selectedPhoto.location.latitude !== null
                        ? `${selectedPhoto.location.latitude.toFixed(6)}, ${selectedPhoto.location.longitude?.toFixed(6)}`
                        : 'GPS Unavailable'}
                      {selectedPhoto.location.accuracy !== null && ` (±${selectedPhoto.location.accuracy}m)`}
                    </span>
                  </div>
                </div>

                {selectedPhoto.location.latitude && selectedPhoto.location.longitude && (
                  <div className="flex items-center gap-2">
                    <a
                      href={getGoogleMapsUrl(selectedPhoto.location.latitude, selectedPhoto.location.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-medium underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in Google Maps</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-900 border-t border-slate-800">
              {/* Delete trigger with confirmation */}
              {deleteConfirmId === selectedPhoto.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-400 font-medium">Delete this photo?</span>
                  <button
                    onClick={() => handleDelete(selectedPhoto.id)}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                  >
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="px-2 py-1 text-slate-400 hover:text-slate-200 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirmId(selectedPhoto.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-950/40 border border-rose-900/40 text-xs font-semibold transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                {/* Edit watermark & name */}
                <button
                  onClick={() => {
                    setEditingPhoto(selectedPhoto);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <Edit3 className="w-4 h-4 text-sky-400" />
                  <span>Edit Watermark</span>
                </button>

                {/* Share */}
                <button
                  onClick={() => handleShare(selectedPhoto)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <Share2 className="w-4 h-4 text-sky-400" />
                  <span>Share</span>
                </button>

                {/* Save / Download */}
                <button
                  onClick={() => handleDownload(selectedPhoto)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 active:scale-95 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Save to Phone</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Watermark Modal */}
      {editingPhoto && (
        <PhotoEditorModal
          photo={editingPhoto}
          isOpen={true}
          onClose={() => setEditingPhoto(null)}
          onSaveUpdatedPhoto={async (updated) => {
            await onUpdatePhoto(updated);
            setSelectedPhoto(updated);
            showToast('Watermark updated and saved!', 'success');
          }}
        />
      )}
    </div>
  );
};
