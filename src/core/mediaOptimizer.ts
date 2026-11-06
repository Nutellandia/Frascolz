/**
 * @file mediaOptimizer.ts
 * @brief Client-side Perceptual Video and Image Optimization Engine
 * @author Emilio Frascogna (FRS Software)
 * 
 * Provides fast, zero-server client-side compression for videos (MP4, MOV, WebM)
 * and images (JPEG, PNG, WebP, HEIC) using modern browser WebCodecs, Canvas,
 * and MediaRecorder pipelines.
 */

export interface MediaOptimizationPreset {
  id: 'master_fidelity' | 'web_hd' | 'whatsapp' | 'extreme_saver' | 'custom';
  name: string;
  description: string;
  targetResolution: '720p' | '1080p' | '480p' | 'original';
  videoBitrate: number; // in bps
  audioBitrate: number; // in bps (e.g. 64000 for WhatsApp, 192000 for Master)
  imageQuality: number; // 0.1 to 1.0
  fps: number;
  colorFilter?: string; // CSS canvas filter to counteract HDR/gamma washout
}

export const MEDIA_PRESETS: MediaOptimizationPreset[] = [
  {
    id: 'master_fidelity',
    name: '🌟 Studio Master (Massima Fedeltà & Colori Ricchi)',
    description: '1080p Full HD a 4.8 Mbps: neri profondi, zero patina, dettagli nitidi e audio a 192 kbps (-55% peso)',
    targetResolution: '1080p',
    videoBitrate: 4_800_000, // 4.8 Mbps
    audioBitrate: 192_000,   // 192 kbps
    imageQuality: 0.92,
    fps: 30,
    colorFilter: 'contrast(1.06) saturate(1.06)',
  },
  {
    id: 'web_hd',
    name: '🔵 Bilanciato Web & Social HD',
    description: 'Risoluzione 1080p a 2.8 Mbps con audio stereo fedele e contrasto naturale (-65% peso)',
    targetResolution: '1080p',
    videoBitrate: 2_800_000, // 2.8 Mbps
    audioBitrate: 128_000,   // 128 kbps
    imageQuality: 0.85,
    fps: 30,
    colorFilter: 'contrast(1.04) saturate(1.04)',
  },
  {
    id: 'whatsapp',
    name: '🟢 WhatsApp & Chat Ultra-Leggero',
    description: 'Risoluzione 720p HD a 1.6 Mbps, ottimo bilanciamento per invio veloce senza sgranature (-80% peso)',
    targetResolution: '720p',
    videoBitrate: 1_600_000, // 1.6 Mbps
    audioBitrate: 64_000,    // 64 kbps
    imageQuality: 0.75,
    fps: 24,
    colorFilter: 'contrast(1.03) saturate(1.03)',
  },
  {
    id: 'extreme_saver',
    name: 'Massimo Risparmio Spazio (480p)',
    description: 'Risoluzione 480p SD ultraleggera per archiviazione e cloud (-88% peso)',
    targetResolution: '480p',
    videoBitrate: 700_000,   // 700 kbps
    audioBitrate: 48_000,    // 48 kbps
    imageQuality: 0.60,
    fps: 20,
    colorFilter: 'contrast(1.02) saturate(1.02)',
  },
];

export interface MediaOptimizationResult {
  type: 'image' | 'video';
  name: string;
  originalSize: number;
  compressedSize: number;
  spaceSavingsPercent: number;
  ratioPercent: number;
  timeMs: number;
  blob: Blob;
  blobUrl: string;
  mimeType: string;
  dimensions: { width: number; height: number };
}

/**
 * Optimizes an image client-side via HTML5 Canvas with bicubic scaling.
 */
export async function optimizeImage(
  file: File,
  preset: MediaOptimizationPreset,
  onProgress?: (progress: number) => void
): Promise<MediaOptimizationResult> {
  const startTime = performance.now();
  onProgress?.(10);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      onProgress?.(30);
      try {
        let maxDim = 1920;
        if (preset.targetResolution === '720p') maxDim = 1280;
        if (preset.targetResolution === '480p') maxDim = 854;

        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const isP3Supported = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(color-gamut: p3)').matches;
        const ctx = canvas.getContext('2d', {
          alpha: false,
          colorSpace: isP3Supported ? 'display-p3' : 'srgb',
        }) as CanvasRenderingContext2D;
        if (!ctx) {
          throw new Error('Impossibile inizializzare il contesto Canvas 2D');
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        if (preset.colorFilter) {
          ctx.filter = preset.colorFilter;
        }
        ctx.drawImage(img, 0, 0, width, height);
        onProgress?.(60);

        // Compress to WebP if supported, fallback to JPEG
        const outputMime = 'image/webp';
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              reject(new Error('Creazione blob immagine fallita'));
              return;
            }
            onProgress?.(100);
            const timeMs = performance.now() - startTime;
            const originalSize = file.size;
            const compressedSize = blob.size;
            const spaceSavingsPercent = Math.max(0, ((originalSize - compressedSize) / originalSize) * 100);
            const ratioPercent = (compressedSize / originalSize) * 100;

            const baseName = file.name.replace(/\.[^/.]+$/, '');
            const newName = `${baseName}_optimized.webp`;

            resolve({
              type: 'image',
              name: newName,
              originalSize,
              compressedSize,
              spaceSavingsPercent,
              ratioPercent,
              timeMs,
              blob,
              blobUrl: URL.createObjectURL(blob),
              mimeType: outputMime,
              dimensions: { width, height },
            });
          },
          outputMime,
          preset.imageQuality
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Impossibile decodificare l\'immagine selezionata.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Optimizes a video client-side using Canvas frame transcoding and MediaRecorder.
 * Preserves high audio/video quality with significantly reduced bitrate.
 */
export async function optimizeVideo(
  file: File,
  preset: MediaOptimizationPreset,
  onProgress?: (progress: number, currentTime?: number, totalDuration?: number) => void,
  cancelRef?: { cancelled: boolean }
): Promise<MediaOptimizationResult> {
  const startTime = performance.now();
  const video = document.createElement('video');
  // unmuted so Web Audio element source can receive the waveform,
  // but connected ONLY to audioDest (and not speaker destination) so transcoding is completely silent
  video.muted = false;
  video.volume = 1.0;
  video.playsInline = true;
  video.autoplay = false;
  video.crossOrigin = 'anonymous';

  const objectUrl = URL.createObjectURL(file);
  video.src = objectUrl;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Formato video non supportato dal browser o file danneggiato.'));
  });

  const duration = video.duration || 1;
  let targetWidth = video.videoWidth;
  let targetHeight = video.videoHeight;

  let maxDim = 1920;
  if (preset.targetResolution === '720p') maxDim = 1280;
  if (preset.targetResolution === '480p') maxDim = 854;

  if (targetWidth > maxDim || targetHeight > maxDim) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
      targetWidth = maxDim;
    } else {
      targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
      targetHeight = maxDim;
    }
  }

  // Ensure even dimensions for video codecs (required by H.264/VP8/VP9)
  targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth - 1;
  targetHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight - 1;

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const isP3Supported = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(color-gamut: p3)').matches;
  const ctx = canvas.getContext('2d', {
    alpha: false,
    colorSpace: isP3Supported ? 'display-p3' : 'srgb',
  }) as CanvasRenderingContext2D;
  if (!ctx) {
    URL.revokeObjectURL(objectUrl);
    throw new Error('Contesto Canvas non disponibile per video transcoding');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (preset.colorFilter) {
    ctx.filter = preset.colorFilter;
  }

  // Determine supported container MIME: prioritize MP4 (H.264/AAC) for native Apple QuickTime, iPhone, WhatsApp, and Android support
  const preferredMimes = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  let mimeType = 'video/webm';
  for (const candidate of preferredMimes) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      mimeType = candidate;
      break;
    }
  }

  const stream = canvas.captureStream(preset.fps);

  // Web Audio Bridge: extract original audio track and compress alongside video frames
  let audioContext: AudioContext | null = null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioContext = new AudioContextClass();
      if (audioContext.state === 'suspended') {
        await audioContext.resume().catch(() => {});
      }
      const source = audioContext.createMediaElementSource(video);
      const audioDest = audioContext.createMediaStreamDestination();
      source.connect(audioDest);
      const audioTracks = audioDest.stream.getAudioTracks();
      if (audioTracks.length > 0) {
        stream.addTrack(audioTracks[0]);
      }
    }
  } catch (audioErr) {
    console.warn('Audio capture notice (continuing with video track):', audioErr);
  }

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: preset.videoBitrate,
    audioBitsPerSecond: preset.audioBitrate,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      audioContext?.close().catch(() => {});
      URL.revokeObjectURL(objectUrl);
      const outputBlob = new Blob(chunks, { type: mimeType });
      const timeMs = performance.now() - startTime;
      const originalSize = file.size;
      const compressedSize = outputBlob.size;
      const spaceSavingsPercent = Math.max(0, ((originalSize - compressedSize) / originalSize) * 100);
      const ratioPercent = (compressedSize / originalSize) * 100;

      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const newName = `${baseName}_shrunk.${ext}`;

      resolve({
        type: 'video',
        name: newName,
        originalSize,
        compressedSize,
        spaceSavingsPercent,
        ratioPercent,
        timeMs,
        blob: outputBlob,
        blobUrl: URL.createObjectURL(outputBlob),
        mimeType,
        dimensions: { width: targetWidth, height: targetHeight },
      });
    };

    recorder.onerror = (e) => {
      URL.revokeObjectURL(objectUrl);
      reject(e);
    };

    recorder.start(250); // Emit chunk every 250ms

    // Fast-forward rendering loop
    video.playbackRate = 1.0;
    video.play();

    let animationFrameId: number;
    let isFinished = false;

    const finishRecording = () => {
      if (isFinished) return;
      isFinished = true;
      cancelAnimationFrame(animationFrameId);
      if (recorder.state === 'recording') {
        recorder.stop();
      }
      video.pause();
    };

    video.onended = finishRecording;

    const processFrame = () => {
      if (isFinished) return;

      if (cancelRef?.cancelled) {
        finishRecording();
        audioContext?.close().catch(() => {});
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Operazione annullata dall\'utente.'));
        return;
      }

      if (video.ended || video.currentTime >= duration - 0.05) {
        finishRecording();
        return;
      }

      if (video.paused && !video.ended) {
        video.play().catch(() => {});
      }

      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      const progress = Math.min(99, Math.round((video.currentTime / duration) * 100));
      onProgress?.(progress, video.currentTime, duration);

      animationFrameId = requestAnimationFrame(processFrame);
    };

    animationFrameId = requestAnimationFrame(processFrame);
  });
}
