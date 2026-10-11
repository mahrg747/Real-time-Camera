import QRCode from 'qrcode';
import { WatermarkSettings, GpsLocation } from '../types';

export interface RenderWatermarkOptions {
  imageSource: HTMLImageElement | HTMLVideoElement | ImageBitmap;
  personName: string;
  designation?: string;
  location: GpsLocation;
  settings: WatermarkSettings;
  timestamp?: number;
}

export function formatDateTime(
  timestamp: number,
  timeFormat: '12h' | '24h' = '12h'
): { dateStr: string; timeStr: string; fullStr: string } {
  const d = new Date(timestamp);
  
  // Format Date: e.g. "11-Oct-2026" or "11/10/2026"
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[d.getMonth()];
  const year = d.getFullYear();
  const dateStr = `${day}-${monthName}-${year}`;

  let timeStr = '';
  if (timeFormat === '12h') {
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 is 12
    const hoursStr = String(hours).padStart(2, '0');
    timeStr = `${hoursStr}:${minutes}:${seconds} ${ampm}`;
  } else {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    timeStr = `${hours}:${minutes}:${seconds}`;
  }

  return {
    dateStr,
    timeStr,
    fullStr: `${dateStr} ${timeStr}`,
  };
}

/**
 * Composite photo with accurate GPS, person name, timestamp, and optional QR code onto an offscreen canvas.
 * Returns a high-quality Blob and Object URL.
 */
export async function renderWatermarkedImage(options: RenderWatermarkOptions): Promise<{
  blob: Blob;
  width: number;
  height: number;
}> {
  const { imageSource, personName, designation, location, settings, timestamp = Date.now() } = options;

  let width = 0;
  let height = 0;

  if (imageSource instanceof HTMLVideoElement) {
    width = imageSource.videoWidth || 1280;
    height = imageSource.videoHeight || 720;
  } else if (imageSource instanceof HTMLImageElement) {
    width = imageSource.naturalWidth || imageSource.width;
    height = imageSource.naturalHeight || imageSource.height;
  } else if (imageSource instanceof ImageBitmap) {
    width = imageSource.width;
    height = imageSource.height;
  }

  if (width === 0 || height === 0) {
    width = 1280;
    height = 720;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  // Draw source photograph in full fidelity
  ctx.drawImage(imageSource, 0, 0, width, height);

  // Calculate scale factors based on image dimensions so watermark looks sharp at 4K, 1080p, or 720p
  const scale = Math.max(width, height) / 1000;
  
  // Font sizes scaled
  let sizeMultiplier = 1.0;
  if (settings.fontSize === 'small') sizeMultiplier = 0.85;
  if (settings.fontSize === 'large') sizeMultiplier = 1.25;

  const headerFontSize = Math.round(18 * scale * sizeMultiplier);
  const bodyFontSize = Math.round(13.5 * scale * sizeMultiplier);
  const metaFontSize = Math.round(11 * scale * sizeMultiplier);
  const lineHeight = Math.round(bodyFontSize * 1.35);

  const { dateStr, timeStr } = formatDateTime(timestamp, settings.timeFormat);

  // Prepare line items to draw
  const items: { label: string; value: string; isBold?: boolean }[] = [];

  if (settings.showPersonName && personName.trim()) {
    let nameVal = personName.trim();
    if (settings.showDesignation && designation && designation.trim()) {
      nameVal += ` (${designation.trim()})`;
    }
    items.push({ label: 'Person Name', value: nameVal, isBold: true });
  }

  if (settings.showAddress) {
    const addr = location.address || (location.isLocating ? 'Locating address...' : 'Address unavailable');
    items.push({ label: 'Location', value: addr });
  }

  if (settings.showCoordinates) {
    const latStr = location.latitude !== null ? location.latitude.toFixed(6) : 'N/A';
    const lngStr = location.longitude !== null ? location.longitude.toFixed(6) : 'N/A';
    items.push({ label: 'Latitude', value: latStr });
    items.push({ label: 'Longitude', value: lngStr });
  }

  if (settings.showTimestamp) {
    items.push({ label: 'Date', value: dateStr });
    items.push({ label: 'Time', value: timeStr });
  }

  if (settings.showAccuracy && location.accuracy !== null) {
    items.push({ label: 'GPS Accuracy', value: `± ${location.accuracy}m` });
  }

  // Generate QR Code if enabled and coordinates exist
  let qrImageBitmap: ImageBitmap | null = null;
  const showQr = settings.showQrCode && location.latitude !== null && location.longitude !== null;
  if (showQr) {
    try {
      const mapsUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
      const qrDataUrl = await QRCode.toDataURL(mapsUrl, {
        margin: 1,
        width: Math.round(100 * scale * sizeMultiplier),
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      const img = new Image();
      img.src = qrDataUrl;
      await new Promise((res) => {
        img.onload = res;
      });
      qrImageBitmap = await createImageBitmap(img);
    } catch {
      // QR code generation failure fallback gracefully
    }
  }

  // Calculate Watermark Box Dimensions
  const paddingX = Math.round(18 * scale);
  const paddingY = Math.round(16 * scale);
  const margin = Math.round(16 * scale);

  // Measure content widths
  ctx.font = `600 ${headerFontSize}px "Plus Jakarta Sans", sans-serif`;
  let maxContentWidth = ctx.measureText(settings.customWatermarkTitle || 'REAL TIME CAMERA LOCATION MG').width;

  ctx.font = `400 ${bodyFontSize}px "Plus Jakarta Sans", sans-serif`;
  for (const item of items) {
    const textW = ctx.measureText(`${item.label}: ${item.value}`).width;
    if (textW > maxContentWidth) maxContentWidth = textW;
  }

  const qrBoxSize = qrImageBitmap ? Math.round(80 * scale * sizeMultiplier) : 0;
  const qrGap = qrImageBitmap ? Math.round(14 * scale) : 0;

  const totalInnerWidth = maxContentWidth + (qrImageBitmap ? qrBoxSize + qrGap : 0);
  const bannerWidth = width;
  const cardWidth = Math.min(width - margin * 2, totalInnerWidth + paddingX * 2);

  // Calculate box height
  let contentHeight = 0;
  if (settings.showAppTitle) {
    contentHeight += headerFontSize + Math.round(8 * scale);
  }
  contentHeight += items.length * lineHeight;
  
  const totalBoxHeight = Math.max(contentHeight + paddingY * 2, qrBoxSize + paddingY * 2);

  // Position coordinates
  let boxX = margin;
  let boxY = height - totalBoxHeight - margin;
  let boxW = cardWidth;
  let boxH = totalBoxHeight;
  let borderRadius = Math.round(12 * scale);

  if (settings.position === 'bottom-banner') {
    boxX = 0;
    boxY = height - totalBoxHeight;
    boxW = bannerWidth;
    boxH = totalBoxHeight;
    borderRadius = 0;
  } else if (settings.position === 'bottom-right') {
    boxX = width - cardWidth - margin;
    boxY = height - totalBoxHeight - margin;
  } else if (settings.position === 'bottom-center') {
    boxX = (width - cardWidth) / 2;
    boxY = height - totalBoxHeight - margin;
  }

  // Draw semi-transparent background panel with subtle backdrop border
  ctx.save();
  ctx.fillStyle = `rgba(10, 15, 29, ${settings.opacity})`;
  
  if (borderRadius > 0) {
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, borderRadius);
    ctx.fill();

    // Subtle outline border
    ctx.strokeStyle = `rgba(255, 255, 255, 0.18)`;
    ctx.lineWidth = Math.max(1, Math.round(1 * scale));
    ctx.stroke();
  } else {
    ctx.fillRect(boxX, boxY, boxW, boxH);
    // Subtle top border for banner
    ctx.strokeStyle = `rgba(255, 255, 255, 0.2)`;
    ctx.lineWidth = Math.max(1, Math.round(1 * scale));
    ctx.beginPath();
    ctx.moveTo(boxX, boxY);
    ctx.lineTo(boxX + boxW, boxY);
    ctx.stroke();
  }
  ctx.restore();

  // Draw QR Code on the right side of the panel if available
  let textStartX = boxX + paddingX;
  if (settings.position === 'bottom-banner') {
    textStartX = Math.max(paddingX, (width - (cardWidth - paddingX * 2)) / 2);
  }

  if (qrImageBitmap) {
    const qrX = boxX + boxW - paddingX - qrBoxSize;
    const qrY = boxY + paddingY;
    
    // White background card for QR Code
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(qrX - 4, qrY - 4, qrBoxSize + 8, qrBoxSize + 8, Math.round(6 * scale));
    ctx.fill();
    ctx.drawImage(qrImageBitmap, qrX, qrY, qrBoxSize, qrBoxSize);
    
    // Mini label below QR
    ctx.fillStyle = '#0f172a';
    ctx.font = `600 ${metaFontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('MAP QR', qrX + qrBoxSize / 2, qrY + qrBoxSize + Math.round(11 * scale));
    ctx.restore();
  }

  // Draw Watermark Text
  let currentY = boxY + paddingY;

  // Title / Brand
  if (settings.showAppTitle) {
    ctx.save();
    ctx.fillStyle = '#38bdf8'; // Blue accent
    ctx.font = `700 ${headerFontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(settings.customWatermarkTitle || 'REAL TIME CAMERA LOCATION MG', textStartX, currentY);
    currentY += headerFontSize + Math.round(8 * scale);
    ctx.restore();
  }

  // Render Line Items
  for (const item of items) {
    ctx.save();
    ctx.textBaseline = 'top';
    
    // Label (White/Ice-blue tinted for crisp readability)
    ctx.font = `600 ${bodyFontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = '#94a3b8'; // Slate 400
    const labelText = `${item.label}: `;
    ctx.fillText(labelText, textStartX, currentY);
    const labelWidth = ctx.measureText(labelText).width;

    // Value
    if (item.label === 'Latitude' || item.label === 'Longitude' || item.label === 'GPS Accuracy') {
      ctx.font = `600 ${bodyFontSize}px "JetBrains Mono", monospace`;
      ctx.fillStyle = '#38bdf8'; // Accent blue for coordinates & accuracy
    } else if (item.isBold) {
      ctx.font = `700 ${bodyFontSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.font = `500 ${bodyFontSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#f8fafc'; // Crisp white
    }

    // Truncate if too long (especially long addresses)
    const availTextWidth = boxW - (textStartX - boxX) - paddingX - (qrImageBitmap ? qrBoxSize + qrGap + 8 : 0) - labelWidth;
    let displayValue = item.value;
    if (ctx.measureText(displayValue).width > availTextWidth && availTextWidth > 50) {
      while (displayValue.length > 4 && ctx.measureText(displayValue + '...').width > availTextWidth) {
        displayValue = displayValue.slice(0, -1);
      }
      displayValue += '...';
    }

    ctx.fillText(displayValue, textStartX + labelWidth, currentY);
    ctx.restore();

    currentY += lineHeight;
  }

  // Quality settings conversion
  let mimeQuality = 0.95;
  if (settings.quality === 'high') mimeQuality = 0.98;
  if (settings.quality === 'medium') mimeQuality = 0.85;
  if (settings.quality === 'standard') mimeQuality = 0.75;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to generate image blob'));
      },
      'image/jpeg',
      mimeQuality
    );
  });

  return {
    blob,
    width,
    height,
  };
}
