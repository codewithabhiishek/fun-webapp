import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AlgorithmId, CityGraph, MapNode } from '../types';
import { ALGORITHMS_META } from '../utils/pathfinders';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Film, 
  Search, 
  X, 
  ChevronDown, 
  Check, 
  MapPin, 
  Compass, 
  Train, 
  Trees, 
  Building2, 
  Sparkles,
  Sliders,
  Target
} from 'lucide-react';

interface ControlPanelProps {
  graph: CityGraph;
  startNodeId: string;
  endNodeId: string;
  onSelectNodes: (startId: string, endId: string) => void;
  algorithmId: AlgorithmId;
  onChangeAlgorithm: (id: AlgorithmId) => void;
  // Simulation Controls
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  animationSpeed: number; // Ms delay per step
  onChangeSpeed: (ms: number) => void;
  // Showreel (auto-run of all algorithms)
  isShowreelActive: boolean;
  onToggleShowreel: () => void;
}

// Map Node Icon helper based on landmark categories or names
const getNodeIcon = (node: MapNode) => {
  if (node.id === 'n_hauptbahnhof' || node.name?.toLowerCase().includes('station') || node.name?.toLowerCase().includes('allee')) {
    return <Train size={14} className="text-sky-400 shrink-0" />;
  }
  if (node.id.includes('park') || node.name?.toLowerCase().includes('park') || node.name?.toLowerCase().includes('tiergarten')) {
    return <Trees size={14} className="text-emerald-400 shrink-0" />;
  }
  if (node.id.includes('bridge') || node.id.includes('spree') || node.name?.toLowerCase().includes('bridge')) {
    return <Compass size={14} className="text-amber-400 shrink-0" />;
  }
  if (node.isLandmark) {
    return <Building2 size={14} className="text-indigo-400 shrink-0" />;
  }
  return <MapPin size={14} className="text-slate-400 shrink-0" />;
};

// Beautiful Searchable Combobox Component
interface SearchableNodeSelectProps {
  label: string;
  nodes: MapNode[];
  selectedId: string;
  onChange: (id: string) => void;
  disabledId: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  icon: React.ReactNode;
}

const SearchableNodeSelect: React.FC<SearchableNodeSelectProps> = ({
  label,
  nodes,
  selectedId,
  onChange,
  disabledId,
  accentColor,
  badgeBg,
  badgeText,
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedId);
  }, [nodes, selectedId]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredNodes = useMemo(() => {
    if (!search.trim()) return nodes;
    const query = search.toLowerCase();
    return nodes.filter(
      (n) =>
        (n.name && n.name.toLowerCase().includes(query)) ||
        n.id.toLowerCase().includes(query)
    );
  }, [nodes, search]);

  return (
    <div className="relative flex-1" ref={dropdownRef}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-1">
          {icon}
          {label}
        </span>
        <span className={`font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded font-black ${badgeBg} ${badgeText}`}>
          Point {badgeText.includes('A') ? 'A' : 'B'}
        </span>
      </div>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-[#05070C]/90 border ${
          isOpen ? 'border-indigo-500 shadow-lg shadow-indigo-500/10' : 'border-white/5'
        } hover:border-white/10 text-left rounded-xl p-3 transition-all flex items-center justify-between group cursor-pointer`}
      >
        <div className="flex flex-col gap-1 overflow-hidden">
          <div className="flex items-center gap-2 overflow-hidden">
            {selectedNode && getNodeIcon(selectedNode)}
            <span className="text-xs font-semibold text-white truncate font-display tracking-tight">
              {selectedNode?.name || 'Select Location'}
            </span>
          </div>
          <span className="font-mono text-[9px] text-slate-500 leading-none">
            {selectedNode ? `X: ${selectedNode.x.toFixed(1)}% / Y: ${selectedNode.y.toFixed(1)}%` : 'Select custom coordinate'}
          </span>
        </div>
        <ChevronDown 
          size={14} 
          className={`text-slate-400 group-hover:text-slate-200 transition-transform duration-200 shrink-0 ml-2 ${isOpen ? 'rotate-180 text-indigo-400' : ''}`} 
        />
      </button>

      {/* Floating Popover List */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-[#0D1220] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[290px] animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Real-time search filter */}
          <div className="p-2 border-b border-white/5 flex items-center gap-2 bg-[#080B15]">
            <Search size={13} className="text-slate-400 shrink-0 ml-1" />
            <input
              type="text"
              placeholder="Search India cities/landmarks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none text-xs text-white placeholder-slate-500 outline-none p-1 font-sans"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="p-1 rounded-full text-slate-400 hover:text-white shrink-0"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Scrollable nodes list */}
          <div className="overflow-y-auto max-h-[230px] custom-scrollbar divide-y divide-white/2 py-1">
            {filteredNodes.length > 0 ? (
              filteredNodes.map((node) => {
                const isSelected = node.id === selectedId;
                const isDisabled = node.id === disabledId;

                return (
                  <button
                    key={node.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      onChange(node.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full text-left px-3 py-2.5 flex items-center justify-between text-xs transition-all ${
                      isSelected
                        ? 'bg-indigo-500/10 text-white font-semibold'
                        : isDisabled
                        ? 'opacity-30 cursor-not-allowed bg-transparent'
                        : 'text-slate-300 hover:bg-white/3'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden mr-2">
                      <div className="shrink-0">{getNodeIcon(node)}</div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-semibold truncate font-display tracking-tight text-slate-100 group-hover:text-white">
                          {node.name}
                        </span>
                        <span className="font-mono text-[8px] text-slate-500 leading-none mt-0.5">
                          COORD: {node.x.toFixed(1)} / {node.y.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check size={13} className="text-indigo-400 shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center text-xs text-slate-500 font-sans italic">
                No matching locations found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ControlPanel: React.FC<ControlPanelProps> = ({
  graph,
  startNodeId,
  endNodeId,
  onSelectNodes,
  algorithmId,
  onChangeAlgorithm,
  isPlaying,
  onPlay,
  onPause,
  onReset,
  animationSpeed,
  onChangeSpeed,
  isShowreelActive,
  onToggleShowreel,
}) => {
  // Extract all named nodes to search from
  const namedNodes = useMemo(() => {
    return graph.nodes
      .filter((n) => n.name)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [graph]);

  // Speed latency presets
  const speeds = [
    { label: 'Hyper', value: 12 },
    { label: 'Fast', value: 30 },
    { label: 'Medium', value: 70 },
    { label: 'Slow', value: 180 },
  ];

  return (
    <div className="bg-[#0B0F19]/90 backdrop-blur-xl border border-white/5 rounded-2xl p-5 shadow-xl flex flex-col gap-5 w-full">
      {/* 1. SOLVER SELECTOR TABS (Sleek sci-fi visual style) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest font-bold">SOLVER SELECTOR</span>
          {isShowreelActive && (
            <span className="font-mono text-[9px] text-[#EF4444] font-bold tracking-wider flex items-center gap-1 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 animate-pulse">
              <Film size={10} />
              SHOWREEL ACTIVE
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {(Object.keys(ALGORITHMS_META) as AlgorithmId[]).map((id) => {
            const meta = ALGORITHMS_META[id];
            const isActive = algorithmId === id;

            return (
              <button
                key={id}
                onClick={() => {
                  if (isShowreelActive) onToggleShowreel(); // disable showreel if manual click
                  onChangeAlgorithm(id);
                }}
                className={`w-full text-left p-3 rounded-xl border text-xs transition-all relative overflow-hidden flex items-center justify-between group cursor-pointer ${
                  isActive
                    ? 'bg-white/5 border-white/10 text-white font-semibold'
                    : 'bg-white/1 border-transparent text-slate-400 hover:bg-white/3 hover:text-slate-300'
                }`}
              >
                {/* Visual marker inside button */}
                <div className="flex items-center gap-3">
                  <span
                    className="w-2 h-2 rounded-full shadow-lg transition-all duration-300 group-hover:scale-125"
                    style={{ 
                      backgroundColor: meta.exploredColor, 
                      boxShadow: `0 0 8px ${meta.exploredColor}` 
                    }}
                  />
                  <span className="font-display font-medium tracking-tight text-xs text-slate-200 group-hover:text-white">
                    {meta.name}
                  </span>
                </div>
                <span className="font-mono text-[8px] opacity-40 uppercase tracking-wider">
                  {id.split('-').slice(0, 2).join(' ')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CUSTOM LANDMARK & PLACE NAVIGATOR (Searchable Comboboxes) */}
      <div className="border-t border-white/5 pt-4">
        <div className="flex flex-col gap-3.5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3.5">
            {/* Start node searchable select */}
            <SearchableNodeSelect
              label="Start Coordinates"
              nodes={namedNodes}
              selectedId={startNodeId}
              onChange={(id) => onSelectNodes(id, endNodeId)}
              disabledId={endNodeId}
              accentColor="#10B981"
              badgeBg="bg-emerald-500/10"
              badgeText="text-emerald-400"
              icon={<Compass size={11} className="text-emerald-400" />}
            />

            {/* End node searchable select */}
            <SearchableNodeSelect
              label="Target Coordinates"
              nodes={namedNodes}
              selectedId={endNodeId}
              onChange={(id) => onSelectNodes(startNodeId, id)}
              disabledId={startNodeId}
              accentColor="#EF4444"
              badgeBg="bg-rose-500/10"
              badgeText="text-rose-400"
              icon={<Target size={11} className="text-rose-400" />}
            />
          </div>

          {/* Quick Hotspot Preset Buttons (Very crafted and useful) */}
          <div className="mt-1">
            <span className="font-mono text-[8px] text-slate-500 uppercase tracking-widest font-bold block mb-2">
              RECOMMENDED PRESET JOURNEYS
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  name: 'National Spine (NH-44)',
                  desc: 'Srinagar ➔ Kanyakumari',
                  start: 'n_dal_lake',
                  end: 'n_kanyakumari',
                },
                {
                  name: 'Golden Quad (West)',
                  desc: 'New Delhi ➔ Mumbai',
                  start: 'n_india_gate',
                  end: 'n_gateway',
                },
                {
                  name: 'Silicon Highway',
                  desc: 'Mumbai ➔ Bengaluru',
                  start: 'n_gateway',
                  end: 'n_vidhana_soudha',
                },
                {
                  name: 'Eastern Corridor',
                  desc: 'Kolkata ➔ Chennai',
                  start: 'n_howrah_bridge',
                  end: 'n_chennai',
                },
              ].map((preset) => {
                const isCurrent = startNodeId === preset.start && endNodeId === preset.end;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => onSelectNodes(preset.start, preset.end)}
                    className={`p-2.5 rounded-xl text-left border text-[10px] transition-all cursor-pointer group ${
                      isCurrent
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                        : 'bg-white/1 border-white/3 text-slate-400 hover:bg-white/3 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-semibold text-white truncate font-display tracking-tight flex items-center gap-1">
                      <Sparkles size={10} className="text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                      {preset.name}
                    </div>
                    <div className="text-[9px] text-slate-500 truncate mt-0.5 font-sans">
                      {preset.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. SIMULATION FLOW CONTROLS */}
      <div className="border-t border-white/5 pt-4">
        <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-3">
          SIMULATION FLOW ENGINE
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {isPlaying ? (
            <button
              onClick={onPause}
              className="flex-1 bg-white hover:bg-slate-200 text-slate-950 font-bold px-4 py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-xs cursor-pointer font-display tracking-tight"
            >
              <Pause size={14} className="fill-current" />
              <span>PAUSE</span>
            </button>
          ) : (
            <button
              onClick={onPlay}
              className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-bold px-4 py-3 rounded-xl transition-all shadow-lg shadow-sky-500/10 flex items-center justify-center gap-2 text-xs cursor-pointer font-display tracking-tight"
            >
              <Play size={14} className="fill-current" />
              <span>START SOLVER</span>
            </button>
          )}

          <button
            onClick={onReset}
            className="bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 font-bold p-3 rounded-xl transition-all flex items-center justify-center cursor-pointer"
            title="Reset simulation"
          >
            <RotateCcw size={15} />
          </button>

          {/* Showreel Auto showcase button */}
          <button
            onClick={onToggleShowreel}
            className={`px-3 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 text-xs border cursor-pointer font-display tracking-tight ${
              isShowreelActive
                ? 'bg-red-500 hover:bg-red-400 text-white border-red-500 shadow-lg shadow-red-500/10'
                : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-300'
            }`}
            title="Auto-play algorithm showreel presentation"
          >
            <Film size={15} />
            <span>SHOWREEL</span>
          </button>
        </div>
      </div>

      {/* 4. SPEED CONTROLLER */}
      <div className="border-t border-white/5 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-1">
            <Sliders size={11} className="text-slate-500" />
            PROPAGATION SPEED
          </span>
          <span className="font-mono text-[10px] text-indigo-400 font-bold">{animationSpeed} ms / step</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {speeds.map((s) => {
            const isSelected = animationSpeed === s.value;
            return (
              <button
                key={`speed-${s.value}`}
                onClick={() => onChangeSpeed(s.value)}
                className={`py-2 rounded-lg font-bold text-[10px] transition-all border cursor-pointer font-display tracking-tight ${
                  isSelected
                    ? 'bg-indigo-500/15 border-indigo-500 text-indigo-400 shadow-sm font-semibold'
                    : 'bg-white/1 border-transparent text-slate-400 hover:bg-white/3 hover:text-slate-300'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
