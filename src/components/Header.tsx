import React from 'react';
import { Cpu, ShieldCheck, Gamepad2, FileCode2, BarChart3, Scale, Layers, Sparkles, Film } from 'lucide-react';

export type ActiveTab = 'studio' | 'media-studio' | 'milestone' | 'adaptive-ram' | 'streaming-sim' | 'benchmarks' | 'fuzz-audit' | 'c-source' | 'legal-market';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onSelectTab }) => {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-emerald-400 font-mono font-bold text-base shadow-sm">
            F<span className="text-zinc-400">R</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-zinc-100 tracking-tight">
                FrascoLZ <span className="text-xs font-mono font-normal text-emerald-400">v3.0 Universal</span>
              </h1>
              <span className="text-zinc-600 font-mono text-xs">/</span>
              <span className="text-xs text-zinc-400 font-medium">FRS Software</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
              <span>By Emilio Frascogna</span>
              <span aria-hidden="true">·</span>
              <span>Pure C99 Engine</span>
              <span aria-hidden="true">·</span>
              <span>DS4 &amp; 16KB-128GB+ RAM Scaler</span>
            </div>
          </div>
        </div>

        {/* Tab Controls (Functional Segmented Navigation) */}
        <nav className="flex items-center gap-1 p-1 bg-zinc-900/90 rounded-lg border border-zinc-800/90 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => onSelectTab('studio')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'studio'
                ? 'bg-zinc-800 text-emerald-400 shadow-sm border border-zinc-700/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Studio C99</span>
          </button>

          <button
            onClick={() => onSelectTab('media-studio')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'media-studio'
                ? 'bg-sky-950/80 text-sky-300 shadow-sm border border-sky-500/50'
                : 'text-sky-400/90 hover:text-sky-200 hover:bg-zinc-850'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold">Media Shrinker (Video/Foto)</span>
          </button>

          <button
            onClick={() => onSelectTab('adaptive-ram')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'adaptive-ram'
                ? 'bg-emerald-950/80 text-emerald-300 shadow-sm border border-emerald-500/50'
                : 'text-emerald-400/80 hover:text-emerald-300 hover:bg-zinc-850'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold">Adaptive RAM &amp; DS4</span>
          </button>

          <button
            onClick={() => onSelectTab('milestone')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'milestone'
                ? 'bg-zinc-800 text-emerald-400 shadow-sm border border-zinc-700/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            <span>Pietra Miliare</span>
          </button>

          <button
            onClick={() => onSelectTab('streaming-sim')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'streaming-sim'
                ? 'bg-zinc-800 text-emerald-400 shadow-sm border border-zinc-700/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Gaming &amp; Cloud Sim</span>
          </button>

          <button
            onClick={() => onSelectTab('benchmarks')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'benchmarks'
                ? 'bg-zinc-800 text-emerald-400 shadow-sm border border-zinc-700/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Benchmark</span>
          </button>

          <button
            onClick={() => onSelectTab('fuzz-audit')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'fuzz-audit'
                ? 'bg-zinc-800 text-emerald-400 shadow-sm border border-zinc-700/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Fuzzing Audit</span>
          </button>

          <button
            onClick={() => onSelectTab('c-source')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'c-source'
                ? 'bg-zinc-800 text-emerald-400 shadow-sm border border-zinc-700/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>C Source &amp; SDK</span>
          </button>

          <button
            onClick={() => onSelectTab('legal-market')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'legal-market'
                ? 'bg-zinc-800 text-emerald-400 shadow-sm border border-zinc-700/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Legale &amp; Business</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
