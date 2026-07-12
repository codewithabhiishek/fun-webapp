import React from 'react';
import { AlgorithmId, SimulationStats } from '../types';
import { ALGORITHMS_META } from '../utils/pathfinders';
import { Timer, Search, RefreshCw, BarChart2, Zap } from 'lucide-react';

interface StatsOverlayProps {
  algorithmId: AlgorithmId;
  nodesExploredCurrent: number;
  executionTimeMs: number;
  pathLength: number;
  pathFound: boolean;
  currentStep: number;
  totalSteps: number;
  history: Record<AlgorithmId, SimulationStats | null>;
}

export const StatsOverlay: React.FC<StatsOverlayProps> = ({
  algorithmId,
  nodesExploredCurrent,
  executionTimeMs,
  pathLength,
  pathFound,
  currentStep,
  totalSteps,
  history,
}) => {
  const meta = ALGORITHMS_META[algorithmId];
  const isComplete = currentStep >= totalSteps && totalSteps > 0;

  // Render a clean complexity label
  const renderComplexity = (text: string) => {
    return (
      <span className="font-mono text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-wide">
        {text}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 1. PRIMARY METRICS PANEL */}
      <div className="bg-[#0B0F19]/90 backdrop-blur-xl border border-white/5 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        {/* Glow accent */}
        <div 
          className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-500" 
          style={{ backgroundColor: meta.exploredColor }}
        />

        {/* Algorithm Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest font-black">CURRENT ANALYSIS</span>
            <h2 className="text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2 mt-0.5">
              {meta.name}
            </h2>
          </div>
          {renderComplexity(meta.timeComplexity)}
        </div>

        {/* Sub-description of how this algorithm explores */}
        <p className="text-slate-400 text-xs font-sans leading-relaxed mb-5 border-b border-white/5 pb-4">
          {meta.description}
        </p>

        {/* Live Counters */}
        <div className="grid grid-cols-2 gap-4">
          {/* Nodes Explored */}
          <div className="bg-[#05070C]/50 p-3.5 rounded-xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all">
            <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase font-mono tracking-wider mb-1.5 font-bold">
              <Search size={12} className="text-sky-400" />
              <span>Nodes Visited</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-white tracking-tight">
                {nodesExploredCurrent}
              </span>
              {totalSteps > 0 && (
                <span className="text-xs font-mono text-slate-500 font-medium">
                  / {totalSteps}
                </span>
              )}
            </div>
            {/* Visual tiny progress bar inside metric card */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
              <div 
                className="h-full transition-all duration-300"
                style={{ 
                  width: `${totalSteps > 0 ? (nodesExploredCurrent / totalSteps) * 100 : 0}%`,
                  backgroundColor: meta.exploredColor
                }}
              />
            </div>
          </div>

          {/* Execution Time */}
          <div className="bg-[#05070C]/50 p-3.5 rounded-xl border border-white/5 relative overflow-hidden hover:border-white/10 transition-all">
            <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase font-mono tracking-wider mb-1.5 font-bold">
              <Timer size={12} className="text-indigo-400" />
              <span>Solve Latency</span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-black font-mono text-white tracking-tight">
                {executionTimeMs.toFixed(2)}
              </span>
              <span className="text-xs font-mono text-indigo-400 ml-1 font-bold">ms</span>
            </div>
            <p className="text-[8px] font-mono text-slate-500 mt-1 uppercase font-bold tracking-wider">Engine Computation</p>
          </div>

          {/* Path Length */}
          <div className="bg-[#05070C]/50 p-3.5 rounded-xl border border-white/5 relative overflow-hidden hover:border-white/10 transition-all">
            <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase font-mono tracking-wider mb-1.5 font-bold">
              <Zap size={12} className="text-emerald-400" />
              <span>Path Distance</span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-black font-mono text-white tracking-tight">
                {pathFound ? pathLength.toFixed(1) : '—'}
              </span>
              {pathFound && <span className="text-xs font-mono text-slate-500 ml-1 font-medium">units</span>}
            </div>
            <p className="text-[8px] font-mono text-slate-500 mt-1 uppercase font-bold tracking-wider">Euclidean Cost</p>
          </div>

          {/* Solver Status */}
          <div className="bg-[#05070C]/50 p-3.5 rounded-xl border border-white/5 relative overflow-hidden hover:border-white/10 transition-all">
            <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase font-mono tracking-wider mb-1.5 font-bold">
              <RefreshCw size={11} className="text-purple-400" />
              <span>Simulation State</span>
            </div>
            <div>
              {currentStep === 0 ? (
                <span className="text-sm font-black font-display text-slate-400 tracking-wide uppercase">READY</span>
              ) : !isComplete ? (
                <span className="text-sm font-black font-display text-amber-400 tracking-wide animate-pulse uppercase">SEARCHING</span>
              ) : pathFound ? (
                <span className="text-sm font-black font-display text-emerald-400 tracking-wide uppercase">SUCCESS</span>
              ) : (
                <span className="text-sm font-black font-display text-red-500 tracking-wide uppercase">NO PATH</span>
              )}
            </div>
            <p className="text-[8px] font-mono text-slate-500 mt-1 uppercase font-bold tracking-wider">Pathfinder Thread</p>
          </div>
        </div>
      </div>

      {/* 2. REAL-TIME EFFICIENCY WORKSTATION (Session diagnostics comparison graph) */}
      <div className="bg-[#0B0F19]/90 backdrop-blur-xl border border-white/5 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart2 size={15} className="text-emerald-400" />
            <h3 className="text-xs font-bold text-white tracking-tight font-display uppercase tracking-wide">
              Search Footprint comparison
            </h3>
          </div>
          <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest font-black">
            DIAGNOSTICS
          </span>
        </div>

        <p className="text-slate-400 text-xs font-sans mb-4 leading-relaxed">
          Graphing the total nodes explored on the active coordinate pins. Fewer explored nodes indicates higher heuristic and searching efficiency.
        </p>

        <div className="flex flex-col gap-2.5">
          {(Object.keys(ALGORITHMS_META) as AlgorithmId[]).map((id) => {
            const algoMeta = ALGORITHMS_META[id];
            const stats = history[id];
            const isActive = algorithmId === id;

            // Find maximum explored count to compute relative percentages
            const maxExplored = Math.max(
              ...(Object.values(history) as (SimulationStats | null)[]).map((h) => h?.nodesExplored || 1),
              1
            );
            const relativePercent = stats ? (stats.nodesExplored / maxExplored) * 100 : 0;

            return (
              <div 
                key={id} 
                className={`p-3 rounded-xl border transition-all ${
                  isActive 
                    ? 'bg-white/5 border-white/10' 
                    : 'bg-[#05070C]/20 border-transparent hover:bg-[#05070C]/35'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className={`font-display font-semibold tracking-tight ${isActive ? 'text-white' : 'text-slate-400'}`}>
                    {algoMeta.name}
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    {stats ? (
                      <>
                        <span className="text-white font-bold">{stats.nodesExplored} visited</span>
                        <span className="text-slate-500 font-medium">({stats.executionTimeMs.toFixed(1)}ms)</span>
                      </>
                    ) : (
                      <span className="text-slate-600 font-medium italic">Pending query...</span>
                    )}
                  </div>
                </div>

                {/* Progress bar container */}
                <div className="w-full h-1.5 bg-[#05070C] rounded-full overflow-hidden">
                  {stats ? (
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${relativePercent}%`,
                        backgroundColor: algoMeta.exploredColor
                      }}
                    />
                  ) : (
                    <div className="w-0 h-full animate-pulse bg-white/5" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
