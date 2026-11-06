/**
 * @file App.tsx
 * @brief FrascoLZ v2.0 Milestone Producer Suite - Root Shell
 * @author Emilio Frascogna (FRS)
 */

import React, { useState } from 'react';
import { Header, ActiveTab } from './components/Header';
import { AdaptiveRamStudio } from './components/AdaptiveRamStudio';
import { CompressorStudio } from './components/CompressorStudio';
import { MediaStudio } from './components/MediaStudio';
import { MilestoneLab } from './components/MilestoneLab';
import { GameStreamingSimulator } from './components/GameStreamingSimulator';
import { BenchmarkSuite } from './components/BenchmarkSuite';
import { FuzzAuditSuite } from './components/FuzzAuditSuite';
import { SourceCodeViewer } from './components/SourceCodeViewer';
import { LegalAndBusinessGuide } from './components/LegalAndBusinessGuide';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('media-studio');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Header with Tab Navigation */}
      <Header activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'studio' && <CompressorStudio onNavigateToMediaStudio={() => setActiveTab('media-studio')} />}
        {activeTab === 'media-studio' && <MediaStudio />}
        {activeTab === 'adaptive-ram' && <AdaptiveRamStudio />}
        {activeTab === 'milestone' && <MilestoneLab />}
        {activeTab === 'streaming-sim' && <GameStreamingSimulator />}
        {activeTab === 'benchmarks' && <BenchmarkSuite />}
        {activeTab === 'fuzz-audit' && <FuzzAuditSuite />}
        {activeTab === 'c-source' && <SourceCodeViewer />}
        {activeTab === 'legal-market' && <LegalAndBusinessGuide />}
      </main>

      {/* Clean Technical Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-6 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-400">FrascoLZ v3.0 Universal Edition</span>
            <span aria-hidden="true">·</span>
            <span>FRS - Frascogna Software (Emilio Frascogna)</span>
            <span aria-hidden="true">·</span>
            <span>DS4 &amp; 16KB-128GB+ RAM Scaler · Redis &amp; MoE Tensors</span>
          </div>

          <div className="flex items-center gap-4 text-2xs font-mono text-zinc-500">
            <span>Standard C99 Pure</span>
            <span>64-bit Unaligned Pipelining</span>
            <span>Dual-License Model B</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
