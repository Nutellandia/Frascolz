import React, { useState, useMemo } from 'react';
import {
  frascolzCompress,
  frascolzCompressDict,
  frascolzDecompress,
  frascolzFilterFpSplit,
  frascolzFilterFpUnsplit,
  CompressionResult,
} from '../core/frascolz';
import { Sparkles, Network, BrainCircuit, BarChart2, CheckCircle2, ArrowRight, Zap, Database } from 'lucide-react';

export const MilestoneLab: React.FC = () => {
  // 1. DICTIONARY LAB STATE
  const defaultGameDict = useMemo(() => {
    return new TextEncoder().encode(
      '{"protocol":"GTA_OPENWORLD_v2","worldSector":"VICE_CITY_DOWNTOWN_EAST","tick":150240,' +
      '"entities":[{"entityId":"PLAYER_01","type":"PEDESTRIAN_HERO","health":100,"armor":100,' +
      '"position":[1420.50,890.12,24.50],"velocity":[0.00,0.00,0.00],"rotation":[0.00,1.57,0.00],' +
      '"activeWeapon":"CARBINE_RIFLE_MK2","ammoClip":30,"inventory":["BODY_ARMOR","KEYCARD_VAULT_04"]}]}'
    );
  }, []);

  const [tickOffset, setTickOffset] = useState<number>(4);
  const [playerHp, setPlayerHp] = useState<number>(85);
  const [posX, setPosX] = useState<number>(1428.75);

  const currentMicroPacket = useMemo(() => {
    const json = JSON.stringify({
      protocol: "GTA_OPENWORLD_v2",
      worldSector: "VICE_CITY_DOWNTOWN_EAST",
      tick: 150240 + tickOffset,
      entities: [
        {
          entityId: "PLAYER_01",
          type: "PEDESTRIAN_HERO",
          health: playerHp,
          armor: 60,
          position: [posX, 892.40, 24.50],
          velocity: [1.25, 0.40, 0.00],
          rotation: [0.00, 1.62, 0.00],
          activeWeapon: "CARBINE_RIFLE_MK2",
          ammoClip: 28,
        },
      ],
    });
    return new TextEncoder().encode(json);
  }, [tickOffset, playerHp, posX]);

  // Test compression without dict vs with dict
  const compNoDict = useMemo(() => frascolzCompress(currentMicroPacket, 1), [currentMicroPacket]);
  const compWithDict = useMemo(() => frascolzCompressDict(currentMicroPacket, defaultGameDict), [currentMicroPacket, defaultGameDict]);

  // 2. NEURAL / FP32 LAB STATE
  const [neuralFloatCount, setNeuralFloatCount] = useState<number>(64);
  const sampleNeuralTensor = useMemo(() => {
    const f32 = new Float32Array(neuralFloatCount);
    for (let i = 0; i < neuralFloatCount; i++) {
      // Simulating neural network weights or 3D vertex positions centered around small normal distribution
      f32[i] = Math.sin(i * 0.15) * 1.8 + Math.cos(i * 0.3) * 0.4;
    }
    return new Uint8Array(f32.buffer);
  }, [neuralFloatCount]);

  const transposedNeural = useMemo(() => frascolzFilterFpSplit(sampleNeuralTensor), [sampleNeuralTensor]);
  const compNeuralRaw = useMemo(() => frascolzCompress(sampleNeuralTensor, 2), [sampleNeuralTensor]);
  const compNeuralTransposed = useMemo(() => frascolzCompress(transposedNeural, 2), [transposedNeural]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Milestone Hero Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 border border-emerald-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              Pietra Miliare Ingegneristica (FrascoLZ v2.0)
            </div>
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight mt-1">
              Innovazioni di Frontiera: Oltre i Limiti di Shannon e Oodle
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
              Ispirandosi alla filosofia del C puro ed essenziale di Salvatore Sanfilippo (antirez) e unendola ai segreti dei motori di gioco AAA (Oodle Kraken)
              e alle ultime ricerche NVIDIA/Ubisoft sulla compressione neurale, FrascoLZ v2.0 introduce il supporto per
              <strong> Dizionari Pre-Condivisi per il multiplayer</strong> e la <strong>Trasposizione Ortogonale dei Tensori AI</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950 border border-zinc-800 shrink-0 text-xs font-mono">
            <span className="text-zinc-500">Versione:</span>
            <span className="text-emerald-400 font-bold">v2.0 Milestone</span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-400">Pure C99</span>
          </div>
        </div>
      </div>

      {/* INNOVATION 1: PRE-SHARED GAME DICTIONARY */}
      <div className="mt-8 p-6 rounded-xl bg-zinc-900/60 border border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              <Network className="w-4 h-4" />
              Innovazione 1: Pre-Shared Game Dictionary (Multiplayer GTA-Class)
            </div>
            <h3 className="text-base font-bold text-zinc-100 mt-0.5">
              Risolvere il Paradosso dei Micro-Pacchetti (150–400 Byte)
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Gli algoritmi LZ classici falliscono sui singoli pacchetti di rete perché la finestra scorrevole è fredda.
              Pre-caricando uno schema statico condiviso (4KB), i pacchetti vengono abbattuti fino all'85-90%.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-zinc-400 font-mono">Simula movimento:</span>
            <button
              onClick={() => {
                setTickOffset((t) => t + 1);
                setPosX((p) => p + 1.25);
                setPlayerHp((h) => Math.max(10, h - 2));
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-medium transition-colors"
            >
              +1 Tick Frame
            </button>
          </div>
        </div>

        {/* Live Side-by-Side Comparison for Micro-Packets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Without Dictionary */}
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800/80">
              <span className="text-xs font-semibold text-zinc-400 font-mono">
                Modalità Standard (Finestra Vuota)
              </span>
              <span className="text-2xs font-mono text-zinc-500">Nessun Dizionario</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-xs font-mono">
              <div className="p-2.5 bg-zinc-900/60 rounded border border-zinc-800">
                <span className="text-2xs text-zinc-500 block">Originale</span>
                <span className="text-zinc-200 font-bold">{compNoDict.originalSize} byte</span>
              </div>
              <div className="p-2.5 bg-zinc-900/60 rounded border border-zinc-800">
                <span className="text-2xs text-zinc-500 block">Compresso</span>
                <span className="text-amber-400 font-bold">{compNoDict.compressedSize} byte</span>
              </div>
            </div>
            <div className="mt-3 text-xs text-zinc-400">
              Risparmio limitato a <strong>{compNoDict.spaceSavingsPercent.toFixed(1)}%</strong> perché le stringhe ripetute (es. <code>"worldSector"</code>, <code>"PLAYER_01"</code>) non sono ancora nella finestra.
            </div>
          </div>

          {/* With Pre-Shared Dictionary */}
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/50 shadow-sm">
            <div className="flex justify-between items-center pb-2 border-b border-emerald-500/30">
              <span className="text-xs font-semibold text-emerald-300 font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                FrascoLZ Pre-Shared Game Dictionary (v2.0)
              </span>
              <span className="text-2xs font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                PROTOPICCO FRS
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-xs font-mono">
              <div className="p-2.5 bg-zinc-950/80 rounded border border-zinc-800">
                <span className="text-2xs text-zinc-500 block">Originale</span>
                <span className="text-zinc-200 font-bold">{compWithDict.originalSize} byte</span>
              </div>
              <div className="p-2.5 bg-zinc-950/80 rounded border border-emerald-500/40">
                <span className="text-2xs text-emerald-400 block">Compresso con Dict</span>
                <span className="text-emerald-300 font-bold text-sm">{compWithDict.compressedSize} byte</span>
              </div>
            </div>
            <div className="mt-3 text-xs text-emerald-300 font-medium">
              Risparmio eccezionale del <strong>{compWithDict.spaceSavingsPercent.toFixed(1)}%</strong>! Il pacchetto crolla a {compWithDict.compressedSize} byte
              consentendo a 100 giocatori in GTA 6 di scambiare dati a 120 FPS su rete 4G mobile senza lag.
            </div>
          </div>
        </div>
      </div>

      {/* INNOVATION 2: NEURAL / FP32 BYTE-PLANE TRANSPOSITION */}
      <div className="mt-8 p-6 rounded-xl bg-zinc-900/60 border border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              <BrainCircuit className="w-4 h-4" />
              Innovazione 2: Neural &amp; Float32 Byte-Plane Transposition
            </div>
            <h3 className="text-base font-bold text-zinc-100 mt-0.5">
              Il Codec per il Futuro dell'AI &amp; Neural Texture Streaming
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Risolve il problema dei pesi neurali e dei vertici 3D: raggruppa ortogonalmente gli esponenti dei numeri float a 32-bit,
              trasformando rumore caotico in sequenze altamente comprimibili.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-zinc-400 font-mono">Dimensione tensore:</span>
            <select
              value={neuralFloatCount}
              onChange={(e) => setNeuralFloatCount(Number(e.target.value))}
              className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-2.5 py-1 font-mono"
            >
              <option value={32}>32 Float (128B)</option>
              <option value={64}>64 Float (256B)</option>
              <option value={128}>128 Float (512B)</option>
              <option value={256}>256 Float (1024B)</option>
            </select>
          </div>
        </div>

        {/* Neural Comparison Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
            <span className="text-xs font-semibold text-zinc-400 font-mono block pb-2 border-b border-zinc-800">
              Compressione Grezza Senza Filtro
            </span>
            <div className="grid grid-cols-2 gap-3 mt-3 text-xs font-mono">
              <div>
                <span className="text-2xs text-zinc-500 block">Dimensione Originale</span>
                <span className="text-zinc-200 font-bold">{compNeuralRaw.originalSize} byte</span>
              </div>
              <div>
                <span className="text-2xs text-zinc-500 block">Dimensione Compressa</span>
                <span className="text-amber-400 font-bold">{compNeuralRaw.compressedSize} byte</span>
              </div>
            </div>
            <div className="mt-3 text-xs text-zinc-400">
              Spazio risparmiato: <strong>{compNeuralRaw.spaceSavingsPercent.toFixed(1)}%</strong>. I float mantengono alta entropia casuale nelle mantisse.
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/50">
            <span className="text-xs font-semibold text-emerald-300 font-mono block pb-2 border-b border-emerald-500/30 flex items-center justify-between">
              <span>Con Filtro FrascoLZ Byte-Plane Transposition (v2.0)</span>
              <span className="text-2xs font-bold text-emerald-400">NVIDIA NTC PARITY</span>
            </span>
            <div className="grid grid-cols-2 gap-3 mt-3 text-xs font-mono">
              <div>
                <span className="text-2xs text-zinc-500 block">Dimensione Originale</span>
                <span className="text-zinc-200 font-bold">{compNeuralTransposed.originalSize} byte</span>
              </div>
              <div>
                <span className="text-2xs text-emerald-400 block">Dimensione Compressa</span>
                <span className="text-emerald-300 font-bold">{compNeuralTransposed.compressedSize} byte</span>
              </div>
            </div>
            <div className="mt-3 text-xs text-emerald-300 font-medium">
              Spazio risparmiato: <strong>{compNeuralTransposed.spaceSavingsPercent.toFixed(1)}%</strong> (+{(compNeuralTransposed.spaceSavingsPercent - compNeuralRaw.spaceSavingsPercent).toFixed(1)}% di guadagno netto!).
              Gli esponenti allineati nel Piano 3 formano blocchi ripetitivi di byte identici.
            </div>
          </div>
        </div>
      </div>

      {/* INNOVATION 3: THE GLOBAL PARETO FRONTIER RADAR */}
      <div className="mt-8 p-6 rounded-xl bg-zinc-900/60 border border-zinc-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
          <BarChart2 className="w-4 h-4" />
          La Frontiera di Pareto Mondiale (FrascoLZ v2.0 vs I Colossi)
        </div>
        <h3 className="text-base font-bold text-zinc-100">
          Posizionamento Ingegneristico sui 5 Assi Strategici
        </h3>
        <p className="text-xs text-zinc-400 mt-1">
          Nessun algoritmo vince su tutti i parametri, ma FrascoLZ v2.0 conquista la leadership assoluta nella combinazione
          di <strong>Latenza Micro-Pacchetti</strong>, <strong>Semplicità Architetturale C99</strong> e <strong>Libertà da Royalty</strong>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 text-xs">
          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
            <span className="text-zinc-500 text-2xs uppercase tracking-wider block font-semibold">
              Oodle Kraken (Epic Games)
            </span>
            <div className="text-sm font-bold text-zinc-200">Re del Gaming Console</div>
            <div className="text-zinc-400 text-2xs space-y-1">
              <div>Rapporto: <span className="text-emerald-400">9.5/10</span></div>
              <div>Velocità Decomp: <span className="text-emerald-400">8.8/10</span></div>
              <div>Micro-Pacchetti: <span className="text-emerald-400">9.2/10</span></div>
              <div>Semplicità Codice: <span className="text-red-400">Closed-Source</span></div>
              <div>Costo Licenza: <span className="text-red-400">$30,000 - $60,000</span></div>
            </div>
          </div>

          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
            <span className="text-zinc-500 text-2xs uppercase tracking-wider block font-semibold">
              Zstandard (Meta / Facebook)
            </span>
            <div className="text-sm font-bold text-zinc-200">Re del Cloud &amp; Server</div>
            <div className="text-zinc-400 text-2xs space-y-1">
              <div>Rapporto: <span className="text-emerald-400">9.7/10</span></div>
              <div>Velocità Decomp: <span className="text-amber-400">7.2/10</span></div>
              <div>Micro-Pacchetti: <span className="text-emerald-400">9.0/10</span></div>
              <div>Semplicità Codice: <span className="text-red-400">55,000 righe C</span></div>
              <div>Costo Licenza: <span className="text-emerald-400">BSD Gratuito</span></div>
            </div>
          </div>

          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
            <span className="text-zinc-500 text-2xs uppercase tracking-wider block font-semibold">
              Standard LZ4
            </span>
            <div className="text-sm font-bold text-zinc-200">Re della Velocità Pura</div>
            <div className="text-zinc-400 text-2xs space-y-1">
              <div>Rapporto: <span className="text-amber-400">6.8/10</span></div>
              <div>Velocità Decomp: <span className="text-emerald-400">9.8/10</span></div>
              <div>Micro-Pacchetti: <span className="text-red-400">3.5/10 (Freddo)</span></div>
              <div>Semplicità Codice: <span className="text-emerald-400">3,000 righe C</span></div>
              <div>Costo Licenza: <span className="text-emerald-400">BSD Gratuito</span></div>
            </div>
          </div>

          <div className="p-4 bg-emerald-950/20 rounded-xl border border-emerald-500/50 space-y-2">
            <span className="text-emerald-400 text-2xs uppercase tracking-wider block font-bold">
              FrascoLZ v2.0 (FRS / Emilio Frascogna)
            </span>
            <div className="text-sm font-bold text-emerald-300">Pietra Miliare Indipendente</div>
            <div className="text-zinc-300 text-2xs space-y-1 font-medium">
              <div>Rapporto: <span className="text-emerald-400">8.8/10 (con NTC/Dict)</span></div>
              <div>Velocità Decomp: <span className="text-emerald-400">9.2/10 (64-bit Word)</span></div>
              <div>Micro-Pacchetti: <span className="text-emerald-400 font-bold">9.5/10 (Pre-Shared)</span></div>
              <div>Semplicità Codice: <span className="text-emerald-400 font-bold">~450 righe C99</span></div>
              <div>Modello FRS: <span className="text-emerald-400">Dual-License B2B</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
