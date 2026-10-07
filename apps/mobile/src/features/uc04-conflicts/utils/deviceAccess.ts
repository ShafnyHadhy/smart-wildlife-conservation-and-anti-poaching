/**
 * Thin wrappers around the device camera/gallery and GPS.
 * Provides seamless cross-platform support for native mobile (Expo)
 * and Web/Browser environments.
 */

export interface LiveLocation {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
}

export class DeviceAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeviceAccessError';
  }
}

export async function getLiveLocation(): Promise<LiveLocation> {
  // First attempt native Expo Location if available
  try {
    const Location = await import('expo-location');
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status === 'granted') {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracyMeters: pos.coords.accuracy ?? undefined,
      };
    }
  } catch (_err) {
    // Native module unavailable or errored in web bundle, proceed to browser fallback
  }

  // Fall back to the browser Geolocation API
  const geo = typeof navigator !== 'undefined' ? navigator.geolocation : undefined;
  if (!geo) {
    throw new DeviceAccessError('GPS location is not supported on this device.');
  }

  return new Promise<LiveLocation>((resolve, reject) => {
    geo.getCurrentPosition(
      (p) =>
        resolve({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracyMeters: p.coords.accuracy,
        }),
      (e) => reject(new DeviceAccessError(e.message || 'Could not read GPS position.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  });
}

export type PhotoSource = 'camera' | 'library';

/** Resizes a data URL on web via canvas to avoid giant payload overhead. */
function resizeImageWeb(dataUrl: string, maxDimension = 1024, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined' || typeof document === 'undefined') {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** Robust browser file picker for web environments. */
function pickPhotoWeb(source: PhotoSource): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (source === 'camera') {
      input.capture = 'environment';
    }

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === 'string') {
          const compressed = await resizeImageWeb(reader.result);
          resolve(compressed);
        } else {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };

    input.oncancel = () => resolve(null);
    input.click();
  });
}

/** Opens a real-time camera viewfinder modal on Web via getUserMedia. */
function openWebcamCaptureWeb(): Promise<string | null> {
  return new Promise((resolve) => {
    if (
      typeof document === 'undefined' ||
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      // Fall back to standard file picker with capture
      return pickPhotoWeb('camera').then(resolve);
    }

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.92)';
    overlay.style.backdropFilter = 'blur(6px)';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding = '16px';
    overlay.style.boxSizing = 'border-box';

    const modal = document.createElement('div');
    modal.style.backgroundColor = '#1E293B';
    modal.style.borderRadius = '16px';
    modal.style.border = '1px solid #334155';
    modal.style.overflow = 'hidden';
    modal.style.maxWidth = '520px';
    modal.style.width = '100%';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.6)';

    // Header
    const header = document.createElement('div');
    header.style.padding = '14px 18px';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.borderBottom = '1px solid #334155';

    const title = document.createElement('span');
    title.innerText = '📷 Live Camera Viewfinder';
    title.style.color = '#F8FAFC';
    title.style.fontWeight = '700';
    title.style.fontSize = '16px';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✕';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#94A3B8';
    closeBtn.style.fontSize = '20px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.padding = '4px 8px';
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // Viewfinder
    const videoContainer = document.createElement('div');
    videoContainer.style.width = '100%';
    videoContainer.style.height = '340px';
    videoContainer.style.backgroundColor = '#000000';
    videoContainer.style.position = 'relative';
    videoContainer.style.display = 'flex';
    videoContainer.style.alignItems = 'center';
    videoContainer.style.justifyContent = 'center';

    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    videoContainer.appendChild(video);

    // Crosshair grid overlay
    const crosshair = document.createElement('div');
    crosshair.style.position = 'absolute';
    crosshair.style.width = '160px';
    crosshair.style.height = '160px';
    crosshair.style.border = '2px dashed rgba(255, 255, 255, 0.4)';
    crosshair.style.borderRadius = '12px';
    crosshair.style.pointerEvents = 'none';
    videoContainer.appendChild(crosshair);

    modal.appendChild(videoContainer);

    // Controls
    const controls = document.createElement('div');
    controls.style.padding = '18px';
    controls.style.display = 'flex';
    controls.style.justifyContent = 'space-between';
    controls.style.alignItems = 'center';
    controls.style.backgroundColor = '#0F172A';

    const cancelBtn = document.createElement('button');
    cancelBtn.innerText = 'Cancel';
    cancelBtn.style.padding = '10px 18px';
    cancelBtn.style.borderRadius = '8px';
    cancelBtn.style.border = '1px solid #475569';
    cancelBtn.style.backgroundColor = '#1E293B';
    cancelBtn.style.color = '#E2E8F0';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.fontWeight = '600';
    cancelBtn.style.fontSize = '14px';

    const snapBtn = document.createElement('button');
    snapBtn.innerText = '📸 Capture Photo';
    snapBtn.style.padding = '12px 24px';
    snapBtn.style.borderRadius = '9999px';
    snapBtn.style.border = 'none';
    snapBtn.style.backgroundColor = '#16A34A';
    snapBtn.style.color = '#FFFFFF';
    snapBtn.style.cursor = 'pointer';
    snapBtn.style.fontWeight = '700';
    snapBtn.style.fontSize = '15px';
    snapBtn.style.boxShadow = '0 4px 12px rgba(22, 163, 74, 0.4)';

    controls.appendChild(cancelBtn);
    controls.appendChild(snapBtn);
    modal.appendChild(controls);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    let stream: MediaStream | null = null;

    const cleanup = () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    };

    closeBtn.onclick = () => {
      cleanup();
      resolve(null);
    };

    cancelBtn.onclick = () => {
      cleanup();
      resolve(null);
    };

    snapBtn.onclick = async () => {
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, w, h);
        const rawData = canvas.toDataURL('image/jpeg', 0.85);
        cleanup();
        const compressed = await resizeImageWeb(rawData);
        resolve(compressed);
      } else {
        cleanup();
        resolve(null);
      }
    };

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      .then((mediaStream) => {
        stream = mediaStream;
        video.srcObject = mediaStream;
      })
      .catch((err) => {
        console.warn('Live getUserMedia failed, falling back to file picker:', err);
        cleanup();
        pickPhotoWeb('camera').then(resolve);
      });
  });
}

/** Returns a compressed JPEG as a data URI, or null if the user cancelled. */
export async function pickPhoto(source: PhotoSource): Promise<string | null> {
  // If running in a web browser context
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    if (source === 'camera') {
      return openWebcamCaptureWeb();
    }
    return pickPhotoWeb('library');
  }

  // If in native mobile environment (iOS/Android), use Expo ImagePicker
  try {
    const ImagePicker = await import('expo-image-picker');
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      throw new DeviceAccessError(
        source === 'camera'
          ? 'Camera permission was denied.'
          : 'Photo library permission was denied.'
      );
    }

    const options = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.35,
      base64: true,
      allowsEditing: false,
    };

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    if (asset.base64) {
      const mime = asset.mimeType || 'image/jpeg';
      return `data:${mime};base64,${asset.base64}`;
    }

    return asset.uri && asset.uri.startsWith('data:') ? asset.uri : asset.uri || null;
  } catch (err: any) {
    if (err instanceof DeviceAccessError) throw err;
    if (typeof document !== 'undefined') {
      if (source === 'camera') return openWebcamCaptureWeb();
      return pickPhotoWeb('library');
    }
    throw new DeviceAccessError('Could not access camera or photos on this device.');
  }
}
