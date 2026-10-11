import { CapturedPhoto, WatermarkSettings, SavedPerson } from '../types';

const DB_NAME = 'realtime_camera_location_mg_db';
const DB_VERSION = 1;
const PHOTO_STORE = 'photos';
const SETTINGS_STORE = 'settings';
const SAVED_PERSONS_STORE = 'saved_persons';

export const DEFAULT_SETTINGS: WatermarkSettings = {
  position: 'bottom-left',
  fontSize: 'medium',
  opacity: 0.85,
  timeFormat: '12h',
  quality: 'high',
  showAppTitle: true,
  showPersonName: true,
  showDesignation: true,
  showAddress: true,
  showCoordinates: true,
  showAccuracy: true,
  showTimestamp: true,
  showQrCode: true,
  customWatermarkTitle: 'REAL TIME CAMERA LOCATION MG',
};

export const INITIAL_SAVED_PERSONS: SavedPerson[] = [
  { id: '1', name: 'Self / Field Officer', designation: 'Inspection Lead', isFavorite: true },
  { id: '2', name: 'Site Supervisor', designation: 'Civil Works', isFavorite: false },
  { id: '3', name: 'Quality Auditor', designation: 'MG Verification Team', isFavorite: false },
];

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        const store = db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains(SAVED_PERSONS_STORE)) {
        db.createObjectStore(SAVED_PERSONS_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePhoto(photo: CapturedPhoto): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, 'readwrite');
    const store = tx.objectStore(PHOTO_STORE);
    
    // Store imageBlob directly in IndexedDB for efficiency
    const record = {
      id: photo.id,
      createdAt: photo.createdAt,
      imageBlob: photo.imageBlob,
      originalWidth: photo.originalWidth,
      originalHeight: photo.originalHeight,
      personName: photo.personName,
      designation: photo.designation,
      location: photo.location,
      watermarkSettings: photo.watermarkSettings,
    };

    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllPhotos(): Promise<CapturedPhoto[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, 'readonly');
    const store = tx.objectStore(PHOTO_STORE);
    const index = store.index('createdAt');
    const request = index.openCursor(null, 'prev'); // Most recent first
    const photos: CapturedPhoto[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
      if (cursor) {
        const value = cursor.value;
        const imageUrl = URL.createObjectURL(value.imageBlob);
        photos.push({
          ...value,
          imageUrl,
        });
        cursor.continue();
      } else {
        resolve(photos);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, 'readwrite');
    const store = tx.objectStore(PHOTO_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadSettings(): Promise<WatermarkSettings> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(SETTINGS_STORE, 'readonly');
      const store = tx.objectStore(SETTINGS_STORE);
      const request = store.get('app_settings');
      request.onsuccess = () => {
        if (request.result && request.result.value) {
          resolve({ ...DEFAULT_SETTINGS, ...request.result.value });
        } else {
          resolve(DEFAULT_SETTINGS);
        }
      };
      request.onerror = () => resolve(DEFAULT_SETTINGS);
    });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: WatermarkSettings): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SETTINGS_STORE, 'readwrite');
    const store = tx.objectStore(SETTINGS_STORE);
    const request = store.put({ key: 'app_settings', value: settings });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadSavedPersons(): Promise<SavedPerson[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(SAVED_PERSONS_STORE, 'readonly');
      const store = tx.objectStore(SAVED_PERSONS_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        if (request.result && request.result.length > 0) {
          resolve(request.result);
        } else {
          // Initialize defaults
          saveSavedPersons(INITIAL_SAVED_PERSONS).then(() => resolve(INITIAL_SAVED_PERSONS));
        }
      };
      request.onerror = () => resolve(INITIAL_SAVED_PERSONS);
    });
  } catch {
    return INITIAL_SAVED_PERSONS;
  }
}

export async function saveSavedPersons(persons: SavedPerson[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SAVED_PERSONS_STORE, 'readwrite');
    const store = tx.objectStore(SAVED_PERSONS_STORE);
    store.clear();
    for (const p of persons) {
      store.put(p);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
