import React, { useState } from 'react';
import { runComparisonBenchmark, AlgorithmBenchmark } from '../core/benchmarks';
import { getSampleAssets } from '../core/sampleData';
import { BarChart3, Zap, Shield, Layers, HelpCircle } from 'lucide-react';

export const BenchmarkSuite: React.FC = () => {
  const sampleAssets = getSampleAssets();
  const [selectedAssetId, setSelectedAssetId] = useState<string>(sampleAssets[0].id);

  const activeAsset = sampleAssets.find((a) => a.id === selectedAssetId) || sampleAssets[0];
  const benchmarks = runComparisonBenchmark(activeAsset.data);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            <BarChart3 className="w-4 h-4" />
            Matrice Comparativa delle Prestazioni Industriali
          </div>
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight mt-1">
            FrascoLZ vs Standard LZ4, Google Snappy, Zstd & Deflate
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
            Test condotti sul dataset selezionato con misurazione reale del bitstream FrascoLZ, calcolo del tempo di decompressione (μs per pacchetto di rete)
            e valutazione dell'idoneità per frame pipeline a 60/120 FPS.
          </p>
        </div>

        {/* Dataset selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Dataset di Test:</span>
          <select
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500 font-medium"
          >
            {sampleAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name} ({asset.category})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Benchmark Table */}
      <div className="mt-6 bg-zinc-900/60 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 text-zinc-400 font-mono border-b border-zinc-800 uppercase text-2xs tracking-wider">
              <tr>
                <th className="py-3 px-4">Algoritmo & Configurazione</th>
                <th className="py-3 px-3">Compresso</th>
                <th className="py-3 px-3">Spazio Risparmiato</th>
                <th className="py-3 px-3">Velocità Compressione</th>
                <th className="py-3 px-3">Velocità Decompressione</th>
                <th className="py-3 px-3">Latenza Pacchetto (16KB)</th>
                <th className="py-3 px-4">Tier Streaming</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {benchmarks.map((bench) => {
                const isFrasco = bench.category === 'FrascoLZ (FRS)';
                return (
                  <tr
                    key={bench.id}
                    className={`transition-colors ${
                      isFrasco
                        ? 'bg-emerald-950/15 hover:bg-emerald-950/25'
                        : 'hover:bg-zinc-850/50'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-sans font-medium">
                      <div className="flex items-center gap-2">
                        {isFrasco && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        )}
                        <span className={isFrasco ? 'text-emerald-300 font-semibold' : 'text-zinc-200'}>
                          {bench.name}
                        </span>
                      </div>
                      <div className="text-2xs text-zinc-500 font-sans mt-0.5">
                        {bench.description}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-zinc-300">
                      <div>{bench.compressedSize.toLocaleString()} B</div>
                      <div className="text-2xs text-zinc-500">Ratio: {bench.ratioPercent}%</div>
                    </td>

                    <td className="py-3.5 px-3 font-semibold text-emerald-400">
                      +{bench.spaceSavingsPercent}%
                    </td>

                    <td className="py-3.5 px-3 text-zinc-300">
                      {bench.compressSpeedMBs > 1000
                        ? `${(bench.compressSpeedMBs / 1024).toFixed(1)} GB/s`
                        : `${bench.compressSpeedMBs} MB/s`}
                    </td>

                    <td className="py-3.5 px-3 text-zinc-100 font-semibold">
                      {bench.decompressSpeedMBs > 1000
                        ? `${(bench.decompressSpeedMBs / 1024).toFixed(1)} GB/s`
                        : `${bench.decompressSpeedMBs} MB/s`}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={bench.packetLatencyMicroseconds < 5 ? 'text-emerald-400' : 'text-zinc-300'}>
                        {bench.packetLatencyMicroseconds} μs
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-sans">
                      <span
                        className={`text-2xs font-semibold px-2 py-0.5 rounded ${
                          bench.streamingSuitability.startsWith('S-Tier')
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : bench.streamingSuitability.startsWith('A-Tier')
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {bench.streamingSuitability}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Bars Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Velocità di Decompressione */}
        <div className="p-5 bg-zinc-900/60 rounded-xl border border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            Velocità di Decompressione (Più alto è meglio)
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Nel gaming real-time, la decompressione avviene ad ogni frame prima del rendering. Più è veloce, minore è l'input lag.
          </p>

          <div className="space-y-3 mt-5">
            {benchmarks.map((bench) => {
              const maxSpeed = Math.max(...benchmarks.map((b) => b.decompressSpeedMBs));
              const pct = (bench.decompressSpeedMBs / maxSpeed) * 100;
              const isFrasco = bench.category === 'FrascoLZ (FRS)';

              return (
                <div key={bench.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className={isFrasco ? 'text-emerald-300 font-semibold' : 'text-zinc-300'}>
                      {bench.name}
                    </span>
                    <span className="text-zinc-400 font-bold">
                      {bench.decompressSpeedMBs > 1000
                        ? `${(bench.decompressSpeedMBs / 1024).toFixed(1)} GB/s`
                        : `${bench.decompressSpeedMBs} MB/s`}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full transition-all duration-300 ${
                        isFrasco ? 'bg-emerald-500' : 'bg-zinc-600'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Latenza per Pacchetto Frame */}
        <div className="p-5 bg-zinc-900/60 rounded-xl border border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            Latenza Pacchetto Rete (16KB Chunk - Minore è meglio)
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Tempo in microsecondi speso dalla CPU del client per estrarre il payload.
          </p>

          <div className="space-y-3 mt-5">
            {benchmarks.map((bench) => {
              const maxLatency = Math.max(...benchmarks.map((b) => b.packetLatencyMicroseconds));
              const pct = (bench.packetLatencyMicroseconds / maxLatency) * 100;
              const isFrasco = bench.category === 'FrascoLZ (FRS)';

              return (
                <div key={bench.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className={isFrasco ? 'text-emerald-300 font-semibold' : 'text-zinc-300'}>
                      {bench.name}
                    </span>
                    <span className="text-zinc-400 font-bold">
                      {bench.packetLatencyMicroseconds} μs
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full transition-all duration-300 ${
                        isFrasco ? 'bg-emerald-500' : 'bg-amber-600'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
