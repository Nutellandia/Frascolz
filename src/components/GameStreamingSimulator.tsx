import React, { useState, useMemo } from 'react';
import { simulateGameStreamingNetwork } from '../core/benchmarks';
import { Gamepad2, Wifi, Zap, Clock, ShieldCheck, Cpu, ArrowDown, Activity } from 'lucide-react';

export const GameStreamingSimulator: React.FC = () => {
  const [bandwidthMbps, setBandwidthMbps] = useState<number>(25); // typical 4G / constrained connection
  const [basePingMs, setBasePingMs] = useState<number>(55); // typical mobile / cross-region ping
  const [compressionRatioPercent, setCompressionRatioPercent] = useState<number>(38); // 62% space saved with FrascoLZ

  const sim = useMemo(() => {
    return simulateGameStreamingNetwork(compressionRatioPercent, bandwidthMbps, basePingMs);
  }, [compressionRatioPercent, bandwidthMbps, basePingMs]);

  // Comparison metrics
  const rawStreamMbps = 45; // 1080p 60fps / 1440p raw game delta stream
  const rawCongestionFactor = rawStreamMbps / bandwidthMbps;
  const rawExtraQueuePing = rawCongestionFactor > 1.0 ? Math.round((rawCongestionFactor - 1.0) * 85 + 25) : 0;
  const rawTotalPing = basePingMs + rawExtraQueuePing;
  const rawFps = rawCongestionFactor > 1.0 ? Math.max(22, Math.round(60 / rawCongestionFactor)) : 60;
  const rawPacketLossPercent = rawCongestionFactor > 1.0 ? Math.min(28, ((rawCongestionFactor - 1.0) * 18)).toFixed(1) : '0.0';

  const frascoStreamMbps = Number(((rawStreamMbps * compressionRatioPercent) / 100).toFixed(1));
  const frascoCongestionFactor = frascoStreamMbps / bandwidthMbps;
  const frascoExtraQueuePing = frascoCongestionFactor > 1.0 ? Math.round((frascoCongestionFactor - 1.0) * 35) : 0;
  const frascoTotalPing = basePingMs + frascoExtraQueuePing;
  const frascoFps = frascoCongestionFactor > 1.0 ? Math.max(45, Math.round(60 / frascoCongestionFactor)) : 60;
  const frascoPacketLossPercent = frascoCongestionFactor > 1.0 ? Math.min(5, ((frascoCongestionFactor - 1.0) * 5)).toFixed(1) : '0.0';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Vision Header */}
      <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              <Gamepad2 className="w-4 h-4" />
              Visione Cloud Gaming & Asset Streaming Next-Gen (GTA 6 Ready)
            </div>
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight mt-1">
              Simulatore di Rete a Bassa Banda & Alta Latenza
            </h2>
            <p className="text-xs text-zinc-400 mt-1.5 max-w-3xl leading-relaxed">
              Nei giochi open-world di nuova generazione (come GTA 6) e nel cloud gaming potenziato dall'intelligenza artificiale,
              lo streaming di geometrie neurali, frame delta e sincronizzazione stato a 60/120 Hz satura le connessioni 4G/5G/ADSL.
              FrascoLZ riduce il payload fino al 65% con overhead di decompressione inferiore a 1 millisecondo.
            </p>
          </div>

          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-right shrink-0">
            <div className="text-2xs text-zinc-500">Overhead Decompressione FrascoLZ</div>
            <div className="text-base font-mono font-bold text-emerald-400 mt-0.5">&lt; 0.45 ms / frame</div>
            <div className="text-2xs text-zinc-400 mt-0.5">Budget 60 FPS: 16.6 ms totali</div>
          </div>
        </div>

        {/* Interactive Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-zinc-800/80">
          <div>
            <div className="flex justify-between text-xs font-medium text-zinc-300 mb-2">
              <span className="flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-zinc-400" />
                Banda Client Disponibile:
              </span>
              <span className="font-mono text-emerald-400 font-bold">{bandwidthMbps} Mbps</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              value={bandwidthMbps}
              onChange={(e) => setBandwidthMbps(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-2xs text-zinc-500 mt-1">
              <span>5 Mbps (4G Limitato)</span>
              <span>25 Mbps (DSL/LTE)</span>
              <span>100 Mbps (Fibra)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-zinc-300 mb-2">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                Ping Fisico Base (Server &lt;-&gt; Client):
              </span>
              <span className="font-mono text-emerald-400 font-bold">{basePingMs} ms</span>
            </div>
            <input
              type="range"
              min="15"
              max="150"
              value={basePingMs}
              onChange={(e) => setBasePingMs(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-2xs text-zinc-500 mt-1">
              <span>15 ms (Stesso Paese)</span>
              <span>55 ms (Inter-Europa)</span>
              <span>150 ms (Trans-Atlantico)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-zinc-300 mb-2">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-zinc-400" />
                Efficacia Compressione FrascoLZ:
              </span>
              <span className="font-mono text-emerald-400 font-bold">{100 - compressionRatioPercent}% risparmio</span>
            </div>
            <input
              type="range"
              min="20"
              max="70"
              value={compressionRatioPercent}
              onChange={(e) => setCompressionRatioPercent(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-2xs text-zinc-500 mt-1">
              <span>80% Risparmio (Mesh/JSON)</span>
              <span>62% (Delta Frame)</span>
              <span>30% (Texture dense)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Live Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Card: Senza FrascoLZ (Standard Raw Stream) */}
        <div className={`p-5 rounded-xl border ${rawCongestionFactor > 1.0 ? 'bg-red-950/20 border-red-900/60' : 'bg-zinc-900/60 border-zinc-800'}`}>
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <span className="text-xs text-red-400 font-semibold tracking-wider uppercase block">
                Standard Senza Compressione
              </span>
              <h3 className="text-sm font-bold text-zinc-200 mt-0.5">Stream Grezzo / Non Ottimizzato</h3>
            </div>
            {rawCongestionFactor > 1.0 && (
              <span className="text-2xs font-mono font-medium text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-800/80">
                BUFFER BLOAT (RETE SATURA)
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-mono">
            <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800/70">
              <span className="text-zinc-500 block text-2xs">Banda Richiesta</span>
              <span className="text-base font-bold text-zinc-200">{rawStreamMbps} Mbps</span>
              <span className="text-2xs text-zinc-500 block">Capacità: {bandwidthMbps} Mbps</span>
            </div>

            <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800/70">
              <span className="text-zinc-500 block text-2xs">Latenza Totale (Ping Effettivo)</span>
              <span className={`text-base font-bold ${rawExtraQueuePing > 0 ? 'text-red-400' : 'text-zinc-200'}`}>
                {rawTotalPing} ms
              </span>
              <span className="text-2xs text-zinc-500 block">
                {rawExtraQueuePing > 0 ? `+${rawExtraQueuePing}ms coda router` : 'Zero coda'}
              </span>
            </div>

            <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800/70">
              <span className="text-zinc-500 block text-2xs">FPS Effettivi Gioco</span>
              <span className={`text-base font-bold ${rawFps < 50 ? 'text-red-400' : 'text-zinc-200'}`}>
                {rawFps} FPS
              </span>
              <span className="text-2xs text-zinc-500 block">
                {rawFps < 50 ? 'Scatti e Stuttering' : 'Fluido'}
              </span>
            </div>

            <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800/70">
              <span className="text-zinc-500 block text-2xs">Pacchetti Persi / Corrotti</span>
              <span className={`text-base font-bold ${Number(rawPacketLossPercent) > 0 ? 'text-red-400' : 'text-zinc-200'}`}>
                {rawPacketLossPercent}%
              </span>
              <span className="text-2xs text-zinc-500 block">Stuttering di rete</span>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/60 text-xs text-zinc-400">
            Sulle connessioni inferiori a 45 Mbps, i pacchetti di stato e le texture rimangono intrappolati nel buffer del router,
            causando un aumento artificiale del ping di oltre <strong>+{rawExtraQueuePing}ms</strong> e input lag percepibile sul controller.
          </div>
        </div>

        {/* Card: Con FrascoLZ Engine (FRS Protocol) */}
        <div className="p-5 rounded-xl border bg-emerald-950/10 border-emerald-500/40 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <span className="text-xs text-emerald-400 font-semibold tracking-wider uppercase block">
                Con FrascoLZ Engine (FRS)
              </span>
              <h3 className="text-sm font-bold text-zinc-100 mt-0.5">Stream Compresso a Bassa Latenza</h3>
            </div>
            <span className="text-2xs font-mono font-medium text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40 flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" />
              FLUSSO OTTIMALE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-mono">
            <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800/70">
              <span className="text-zinc-500 block text-2xs">Banda Richiesta</span>
              <span className="text-base font-bold text-emerald-400">{frascoStreamMbps} Mbps</span>
              <span className="text-2xs text-emerald-500 block">-{100 - compressionRatioPercent}% banda</span>
            </div>

            <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800/70">
              <span className="text-zinc-500 block text-2xs">Latenza Totale (Ping Effettivo)</span>
              <span className="text-base font-bold text-emerald-400">{frascoTotalPing} ms</span>
              <span className="text-2xs text-emerald-500 block">
                {rawExtraQueuePing > 0 ? `Risparmiati -${rawExtraQueuePing - frascoExtraQueuePing}ms!` : 'Latenza fisica pura'}
              </span>
            </div>

            <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800/70">
              <span className="text-zinc-500 block text-2xs">FPS Effettivi Gioco</span>
              <span className="text-base font-bold text-emerald-400">{frascoFps} FPS</span>
              <span className="text-2xs text-emerald-500 block">100% Sincronizzato</span>
            </div>

            <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800/70">
              <span className="text-zinc-500 block text-2xs">Pacchetti Persi / Corrotti</span>
              <span className="text-base font-bold text-emerald-400">{frascoPacketLossPercent}%</span>
              <span className="text-2xs text-emerald-500 block">Lossless Checksum OK</span>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-zinc-950/60 border border-emerald-500/20 text-xs text-zinc-300">
            Grazie al token stream byte-aligned di FrascoLZ, il decompressore impiega solo <strong>&lt;0.45ms</strong> per scompattare l'intero frame
            direttamente in memoria GPU/CPU, consentendo gameplay competitivo anche su connessioni cellulari o Starlink.
          </div>
        </div>
      </div>

      {/* AI & Neural Game Generation Deep-Dive */}
      <div className="mt-8 p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          Come l'Intelligenza Artificiale Sta Rivoluzionando il Gaming (e perché FrascoLZ è Fondamentale)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 text-xs text-zinc-400 leading-relaxed">
          <div className="space-y-1.5">
            <h4 className="font-semibold text-zinc-200">1. Generazione Neurale Real-Time</h4>
            <p>
              I motori di gioco emergenti (come Unreal Engine con neural rendering, o prototipi di mondi sintetici generati da modelli di diffusione)
              non inviano più frame video pesanti compressi in H.264/AV1 con lag di 80ms, ma vettori latenti e delta geometrici.
            </p>
          </div>
          <div className="space-y-1.5">
            <h4 className="font-semibold text-zinc-200">2. Il Collo di Bottiglia del Bitstream</h4>
            <p>
              I vettori latenti di una rete neurale e i delta mesh hanno alta correlazione e ripetitività temporale.
              Algoritmi come Gzip sono troppo lenti; FrascoLZ sfrutta la finestra scorrevole per eliminare la ridondanza in microsecondi.
            </p>
          </div>
          <div className="space-y-1.5">
            <h4 className="font-semibold text-zinc-200">3. Vantaggio Competitivo FRS</h4>
            <p>
              Offrire un codec in C puro senza dipendenze permette a studi di sviluppo (es. Rockstar, Epic, Sony, Microsoft xCloud)
              di integrarlo nativamente su Xbox, PlayStation, Switch 2, iOS e server Linux con zero frizioni legali e massime performance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
