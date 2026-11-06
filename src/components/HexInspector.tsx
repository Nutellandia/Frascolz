import React, { useState } from 'react';
import { inspectFrascolzStream, TokenInspection } from '../core/frascolz';
import { Search, Info, Binary } from 'lucide-react';

interface HexInspectorProps {
  compressedData: Uint8Array;
  originalSize: number;
}

export const HexInspector: React.FC<HexInspectorProps> = ({ compressedData, originalSize }) => {
  const inspection = inspectFrascolzStream(compressedData);
  const [selectedToken, setSelectedToken] = useState<TokenInspection | null>(
    inspection.tokens.length > 0 ? inspection.tokens[0] : null
  );

  // Take first 128 bytes for the hex grid
  const previewSlice = compressedData.subarray(0, Math.min(128, compressedData.length));
  const hexRows: { offset: number; bytes: number[]; ascii: string }[] = [];

  for (let i = 0; i < previewSlice.length; i += 16) {
    const chunk = Array.from(previewSlice.subarray(i, i + 16));
    const ascii = chunk
      .map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
      .join('');
    hexRows.push({ offset: i, bytes: chunk, ascii });
  }

  return (
    <div className="bg-zinc-900/60 rounded-xl border border-zinc-800 p-5 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/80">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Binary className="w-4 h-4 text-emerald-400" />
            Ispettore Bitstream & Token Map (Formato FrascoLZ)
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Decodifica visiva del flusso binario: Magic header (13B), sequenze di letterali e riferimenti a finestra scorrevole.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
          <div>
            <span className="text-zinc-500">Token Totali:</span>{' '}
            <span className="text-zinc-200 font-semibold">{inspection.totalTokens}</span>
          </div>
          <span className="text-zinc-700">·</span>
          <div>
            <span className="text-zinc-500">Match Trovati:</span>{' '}
            <span className="text-emerald-400 font-semibold">{inspection.matchCount}</span>
          </div>
          <span className="text-zinc-700">·</span>
          <div>
            <span className="text-zinc-500">Match Più Lungo:</span>{' '}
            <span className="text-emerald-400 font-semibold">{inspection.longestMatch} byte</span>
          </div>
        </div>
      </div>

      {/* Header Breakdown banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4 p-3 bg-zinc-950/70 rounded-lg border border-zinc-800/60 text-xs">
        <div>
          <span className="text-zinc-500 block">Magic Bytes (4B):</span>
          <span className="font-mono text-emerald-400 font-semibold">0x5A535246 ("FRSZ")</span>
        </div>
        <div>
          <span className="text-zinc-500 block">Livello Compressione:</span>
          <span className="font-mono text-zinc-200 font-semibold">
            {inspection.header.level === 1 ? 'Livello 1 (Fast Streaming)' : 'Livello 2 (High Ratio)'}
          </span>
        </div>
        <div>
          <span className="text-zinc-500 block">Dimensione Originale:</span>
          <span className="font-mono text-zinc-200 font-semibold">{inspection.header.originalSize.toLocaleString()} byte</span>
        </div>
        <div>
          <span className="text-zinc-500 block">Checksum Adler32:</span>
          <span className="font-mono text-emerald-400 font-semibold">
            0x{inspection.header.checksum.toString(16).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
        {/* Hex Grid Preview */}
        <div className="lg:col-span-7 bg-zinc-950/90 rounded-lg border border-zinc-800/80 p-3.5 overflow-x-auto">
          <div className="flex items-center justify-between text-xs text-zinc-500 pb-2 mb-2 border-b border-zinc-800">
            <span>Offset (Hex)</span>
            <span className="font-mono tracking-widest">00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F</span>
            <span>ASCII</span>
          </div>
          <div className="font-mono text-xs space-y-1">
            {hexRows.map((row) => (
              <div key={row.offset} className="flex items-center justify-between hover:bg-zinc-900/60 px-1 py-0.5 rounded">
                <span className="text-zinc-600 select-none">
                  {row.offset.toString(16).padStart(4, '0').toUpperCase()}
                </span>
                <div className="flex gap-1.5 text-zinc-300">
                  {row.bytes.map((b, idx) => {
                    const absPos = row.offset + idx;
                    const isHeader = absPos < 13;
                    return (
                      <span
                        key={idx}
                        className={`w-5 text-center ${
                          isHeader
                            ? 'text-amber-400 font-semibold'
                            : b === 0
                            ? 'text-zinc-600'
                            : 'text-zinc-300'
                        }`}
                        title={`Byte @${absPos}: 0x${b.toString(16).toUpperCase()} (${b})`}
                      >
                        {b.toString(16).padStart(2, '0').toUpperCase()}
                      </span>
                    );
                  })}
                  {/* Padding if row has fewer than 16 bytes */}
                  {Array.from({ length: 16 - row.bytes.length }).map((_, padIdx) => (
                    <span key={padIdx} className="w-5 text-center text-zinc-800">
                      ..
                    </span>
                  ))}
                </div>
                <span className="text-zinc-500 font-mono tracking-wider">{row.ascii}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Token List & Details */}
        <div className="lg:col-span-5 flex flex-col h-80 bg-zinc-950/90 rounded-lg border border-zinc-800/80 p-3.5">
          <div className="text-xs font-semibold text-zinc-300 mb-2 flex items-center justify-between">
            <span>Sequenza Token Riconosciuti</span>
            <span className="text-zinc-500 font-mono text-xs">{inspection.tokens.length} analizzati</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {inspection.tokens.length === 0 ? (
              <div className="text-xs text-zinc-500 py-8 text-center">Nessun token decompilabile</div>
            ) : (
              inspection.tokens.map((tok, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedToken(tok)}
                  className={`w-full text-left p-2 rounded border text-xs font-mono transition-colors flex items-center justify-between ${
                    selectedToken === tok
                      ? 'bg-zinc-800/90 border-emerald-500/50 text-zinc-100'
                      : 'bg-zinc-900/40 border-zinc-800/50 text-zinc-400 hover:bg-zinc-850'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        tok.type === 'match' ? 'bg-emerald-400' : 'bg-blue-400'
                      }`}
                    />
                    <span className="font-semibold text-zinc-200">
                      {tok.type === 'match' ? 'MATCH' : 'LITERAL'}
                    </span>
                    <span className="text-zinc-500 text-2xs">@{tok.streamPosition}B</span>
                  </div>
                  <div className="text-right text-zinc-400">
                    {tok.type === 'match' ? (
                      <span>
                        -{tok.offset}B (<span className="text-emerald-400">{tok.length}B</span>)
                      </span>
                    ) : (
                      <span>{tok.length} byte raw</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {selectedToken && (
            <div className="mt-3 p-2.5 bg-zinc-900 rounded border border-zinc-800 text-xs">
              <div className="text-zinc-400 font-medium mb-1">Dettaglio Token Selezionato:</div>
              <div className="grid grid-cols-2 gap-2 text-zinc-300 font-mono text-2xs">
                <div>Tipo: <span className="text-emerald-400">{selectedToken.type.toUpperCase()}</span></div>
                <div>Lunghezza: <span className="text-zinc-100">{selectedToken.length} byte</span></div>
                {selectedToken.type === 'match' && (
                  <>
                    <div>Offset Scorrimento: <span className="text-amber-400">-{selectedToken.offset} byte</span></div>
                    <div>Riuso Cache: <span className="text-emerald-400">100% (Zero I/O)</span></div>
                  </>
                )}
                <div className="col-span-2 text-zinc-500 truncate">
                  Anteprima: {selectedToken.rawBytesPreview}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
