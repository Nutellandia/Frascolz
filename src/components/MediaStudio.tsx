/**
 * @file MediaStudio.tsx
 * @brief Frasco Media Studio - Client-Side Video & Photo Optimizer (Route C)
 * @author Emilio Frascogna (FRS Software)
 */

import React, { useState, useRef } from 'react';
import {
  Film,
  Image as ImageIcon,
  Upload,
  Download,
  CheckCircle2,
  Zap,
  Gauge,
  RefreshCw,
  Sliders,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Play,
  FileCheck,
  Shield,
  Layers,
} from 'lucide-react';
import {
  MEDIA_PRESETS,
  MediaOptimizationPreset,
  MediaOptimizationResult,
  optimizeImage,
  optimizeVideo,
} from '../core/mediaOptimizer';

export const MediaStudio: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<MediaOptimizationPreset>(MEDIA_PRESETS[0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'video' | 'image' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [result, setResult] = useState<MediaOptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const genericInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const handleSelectFile = (file: File) => {
    setError(null);
    setResult(null);
    setProgress(0);

    if (!file || file.size === 0) {
      setError('Il file selezionato è vuoto o non è ancora stato scaricato completamente dal cloud.');
      return;
    }

    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/i.test(file.name);
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|heic)$/i.test(file.name);

    if (!isVideo && !isImage) {
      setError('Formato non supportato dal Media Studio. Seleziona un video (MP4, MOV, WebM) o un\'immagine (JPEG, PNG, WebP).');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setFileType(isVideo ? 'video' : 'image');
    setPreviewUrl(URL.createObjectURL(file));
  };

  const startOptimization = async () => {
    if (!selectedFile || !fileType) return;
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    cancelRef.current = { cancelled: false };

    try {
      if (fileType === 'image') {
        setStatusMessage('Elaborazione e ricampionamento bicubico in corso...');
        const res = await optimizeImage(selectedFile, selectedPreset, (p) => {
          setProgress(p);
        });
        setResult(res);
      } else {
        setStatusMessage('Transcodifica fotogrammi e compressione video in streaming...');
        const res = await optimizeVideo(
          selectedFile,
          selectedPreset,
          (p, curr, total) => {
            setProgress(p);
            if (curr && total) {
              setStatusMessage(`Transcodifica: ${curr.toFixed(1)}s / ${total.toFixed(1)}s (${p}%)`);
            }
          },
          cancelRef.current
        );
        setResult(res);
      }
    } catch (err: any) {
      console.error(err);
      setError(`Errore durante l'ottimizzazione: ${err?.message || 'Operazione fallita'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelOptimization = () => {
    cancelRef.current.cancelled = true;
    setIsProcessing(false);
    setStatusMessage('Operazione annullata.');
  };

  const downloadResult = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.blobUrl;
    a.download = result.name;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-gradient-to-r from-sky-950/40 via-zinc-900 to-zinc-950 border border-sky-500/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              Frasco Media Studio <span className="text-xs px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">Strada C: Media Optimizer</span>
            </h2>
          </div>
          <p className="text-xs text-zinc-300 mt-1.5 max-w-3xl leading-relaxed">
            Sviluppato da <strong>Emilio Frascogna (FRS Software)</strong> per consentire la riduzione visiva e il ricampionamento di video reali da smartphone (MP4, MOV di iPhone) e foto (JPEG, HEIC), riducendo il peso fino al <strong>50% - 85%</strong> direttamente sul tuo dispositivo a costo zero e con privacy totale.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-400 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Zero Upload Server · 100% Locale</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input and Preset Configuration */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-900/60 rounded-xl border border-zinc-800 p-5 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <span>1. Carica il File da Rimpicciolire</span>
            </h3>

            {/* Direct selector buttons */}
            <div className="grid grid-cols-2 gap-3">
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*,video/mp4,video/quicktime,video/webm,.mov,.mp4"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) handleSelectFile(f);
                }}
              />
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*,.heic,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) handleSelectFile(f);
                }}
              />

              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all shadow-sm ${
                  fileType === 'video'
                    ? 'bg-sky-950/60 border-sky-400 text-sky-200 shadow-sky-500/10'
                    : 'bg-zinc-900 border-zinc-800 hover:border-sky-500/40 text-zinc-300'
                }`}
              >
                <Film className="w-6 h-6 text-sky-400" />
                <span className="text-xs font-medium">Carica Video (MP4/MOV)</span>
                <span className="text-2xs text-zinc-500">Da iPhone, Mac o PC</span>
              </button>

              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all shadow-sm ${
                  fileType === 'image'
                    ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200 shadow-emerald-500/10'
                    : 'bg-zinc-900 border-zinc-800 hover:border-emerald-500/40 text-zinc-300'
                }`}
              >
                <ImageIcon className="w-6 h-6 text-emerald-400" />
                <span className="text-xs font-medium">Carica Foto (JPEG/HEIC)</span>
                <span className="text-2xs text-zinc-500">Riduci peso dell'80%</span>
              </button>
            </div>

            {/* Loaded file indicator */}
            {selectedFile && (
              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between">
                <div className="min-w-0 flex-1 pr-3">
                  <div className="text-xs font-medium text-zinc-200 truncate">{selectedFile.name}</div>
                  <div className="text-2xs text-zinc-400 font-mono mt-0.5">
                    Dimensione attuale: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB ({selectedFile.size.toLocaleString()} byte)
                  </div>
                </div>
                <span className="text-2xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase font-mono">
                  {fileType}
                </span>
              </div>
            )}
          </div>

          {/* Preset Selector */}
          <div className="bg-zinc-900/60 rounded-xl border border-zinc-800 p-5 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>2. Scegli il Profilo di Ottimizzazione</span>
            </h3>

            <div className="space-y-2.5">
              {MEDIA_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset)}
                  className={`w-full p-3.5 rounded-lg border text-left transition-all ${
                    selectedPreset.id === preset.id
                      ? 'bg-sky-950/50 border-sky-500 text-zinc-100 shadow-sm'
                      : 'bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200">{preset.name}</span>
                    <span className="text-2xs font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-sky-300">
                      {preset.targetResolution}
                    </span>
                  </div>
                  <p className="text-2xs text-zinc-400 mt-1">{preset.description}</p>
                </button>
              ))}
            </div>

            {/* HDR / Color Gamut Note */}
            <div className="p-2.5 bg-zinc-950/80 rounded-lg border border-zinc-800 text-2xs text-zinc-400 flex items-center gap-2 mt-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                <strong>Calibrazione Colore Display P3:</strong> Neutralizza la patina chiara tipica dei video iPhone HDR, ripristinando neri intensi e contrasto naturale.
              </span>
            </div>

            {/* Execute Button */}
            <button
              onClick={startOptimization}
              disabled={!selectedFile || isProcessing}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-zinc-950 font-semibold text-xs transition-all shadow-md shadow-sky-500/20 active:scale-98"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Ottimizzazione in corso...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Avvia Compressione Visiva (-50% / -85%)</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-lg flex items-center gap-2 text-xs text-red-300">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Column: Processing, Preview and Results */}
        <div className="lg:col-span-7 bg-zinc-900/60 rounded-xl border border-zinc-800 p-5 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                  Risultato e Confronto Dimensioni
                </h3>
              </div>
              {result && (
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Risparmiato: -{result.spaceSavingsPercent.toFixed(1)}%
                </span>
              )}
            </div>

            {/* Live Progress Bar during execution */}
            {isProcessing && (
              <div className="p-4 bg-zinc-950 rounded-xl border border-sky-500/40 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-sky-300 font-medium">{statusMessage}</span>
                  <span className="text-zinc-400 font-mono">{progress}%</span>
                </div>
                <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    style={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-200"
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    onClick={cancelOptimization}
                    className="text-2xs text-red-400 hover:text-red-300 underline"
                  >
                    Annulla operazione
                  </button>
                </div>
              </div>
            )}

            {/* Before / After Metrics Dashboard */}
            {result ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                    <div className="text-2xs text-zinc-500">Dimensione Originale</div>
                    <div className="text-sm font-semibold font-mono text-zinc-300 mt-0.5">
                      {(result.originalSize / (1024 * 1024)).toFixed(2)} MB
                    </div>
                    <div className="text-2xs text-zinc-500 mt-0.5">{result.originalSize.toLocaleString()} byte</div>
                  </div>

                  <div className="p-3 bg-zinc-950 rounded-lg border border-emerald-500/50 shadow-sm shadow-emerald-500/5">
                    <div className="text-2xs text-emerald-400 font-medium">Ottimizzato &amp; Ridotto</div>
                    <div className="text-sm font-semibold font-mono text-emerald-300 mt-0.5">
                      {(result.compressedSize / (1024 * 1024)).toFixed(2)} MB
                    </div>
                    <div className="text-2xs text-zinc-500 mt-0.5">{result.compressedSize.toLocaleString()} byte</div>
                  </div>

                  <div className="p-3 bg-zinc-950 rounded-lg border border-sky-500/40">
                    <div className="text-2xs text-sky-400 font-medium">Spazio Risparmiato</div>
                    <div className="text-sm font-semibold font-mono text-sky-300 mt-0.5">
                      -{result.spaceSavingsPercent.toFixed(1)}%
                    </div>
                    <div className="text-2xs text-zinc-500 mt-0.5">Tempo: {(result.timeMs / 1000).toFixed(2)} s</div>
                  </div>
                </div>

                {/* Visual Ratio Bar */}
                <div className="space-y-1.5 p-3.5 bg-zinc-950 rounded-lg border border-zinc-800/80">
                  <div className="flex justify-between text-2xs text-zinc-400 font-mono">
                    <span>Peso Nuovo File: {result.ratioPercent.toFixed(1)}%</span>
                    <span className="text-emerald-400 font-semibold">
                      Spazio Guadagnato per WhatsApp/Cloud: -{result.spaceSavingsPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden flex border border-zinc-800">
                    <div
                      style={{ width: `${result.ratioPercent}%` }}
                      className="bg-sky-500 h-full transition-all"
                      title="Dimensione finale"
                    />
                    <div
                      style={{ width: `${result.spaceSavingsPercent}%` }}
                      className="bg-emerald-500/30 h-full transition-all"
                      title="Spazio risparmiato"
                    />
                  </div>
                </div>

                {/* Preview Player / Viewer */}
                <div className="rounded-xl overflow-hidden border border-zinc-800 bg-black aspect-video max-h-64 flex items-center justify-center relative">
                  {result.type === 'video' ? (
                    <video
                      key={result.blobUrl}
                      src={result.blobUrl}
                      controls
                      playsInline
                      preload="auto"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={result.blobUrl}
                      alt="Anteprima ottimizzata"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              </div>
            ) : previewUrl ? (
              <div className="space-y-2">
                <div className="text-2xs text-zinc-400 font-medium">Anteprima File Selezionato:</div>
                <div className="rounded-xl overflow-hidden border border-zinc-800 bg-black aspect-video max-h-64 flex items-center justify-center">
                  {fileType === 'video' ? (
                    <video
                      key={previewUrl}
                      src={previewUrl}
                      controls
                      playsInline
                      preload="auto"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Anteprima originale"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                <p className="text-2xs text-zinc-500 text-center">
                  Premi il pulsante blu a sinistra per avviare la compressione con il profilo selezionato.
                </p>
              </div>
            ) : (
              <div className="py-16 text-center border-2 border-dashed border-zinc-800/80 rounded-xl space-y-2 text-zinc-500">
                <Film className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
                <div className="text-xs font-medium text-zinc-300">Nessun file multimediale caricato</div>
                <p className="text-2xs max-w-sm mx-auto">
                  Carica un video MP4/MOV dal tuo iPhone o una foto da ridurre per vedere il confronto immediato delle dimensioni.
                </p>
              </div>
            )}
          </div>

          {/* Action Download Button */}
          {result && (
            <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6">
              <div className="text-2xs text-zinc-400 truncate">
                File pronto: <strong className="text-zinc-200">{result.name}</strong>
                <span className="ml-2 px-1.5 py-0.5 rounded bg-zinc-800 text-sky-300 font-mono">
                  {result.name.endsWith('.mp4') ? 'MP4 Universale (QuickTime / iPhone / WhatsApp)' : 'WebM (Web Standard)'}
                </span>
              </div>
              <button
                onClick={downloadResult}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Scarica File Ridotto ({((result.compressedSize) / (1024 * 1024)).toFixed(2)} MB)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Technical Clarification Callout (Route C Architecture) */}
      <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl flex items-start gap-3 text-xs text-zinc-400">
        <Layers className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-zinc-200">
            Architettura Doppio Motore (Strada C - Emilio Frascogna):
          </div>
          <p className="text-2xs leading-relaxed">
            • <strong>Frasco Media Studio (Questa sezione):</strong> Esegue compressione visiva percettiva e transcodifica fotogrammi su video e foto da smartphone, riducendo il bitrate e le dimensioni in MB per social e chat.
          </p>
          <p className="text-2xs leading-relaxed">
            • <strong>FrascoLZ C99 Studio (Tab Studio):</strong> Motore simmetrico ultra-veloce in C puro a zero allocazioni dinamiche per programmatori e gaming, progettato per comprimere texture grezze di gioco, geometrie 3D, tensori AI e pacchetti di rete con integrità lossless bit-a-bit al 100%.
          </p>
        </div>
      </div>
    </div>
  );
};
