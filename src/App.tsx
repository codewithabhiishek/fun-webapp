import { useState, useMemo, useEffect, useRef } from 'react';
import { generateIndiaGraph } from './utils/indiaMap';
import { 
  runDijkstra, 
  runGreedyBestFirst, 
  runAStar, 
  runBidirectionalDijkstra, 
  runBidirectionalAStar,
  ALGORITHMS_META 
} from './utils/pathfinders';
import { AlgorithmId, SimulationStats } from './types';
import { MapCanvas } from './components/MapCanvas';
import { ControlPanel } from './components/ControlPanel';
import { StatsOverlay } from './components/StatsOverlay';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, HelpCircle, AlertCircle, Info, Trophy, Map, Sliders, ChevronRight } from 'lucide-react';

export default function App() {
  // 1. INITIALIZE INDIA NETWORK
  const graph = useMemo(() => generateIndiaGraph(), []);

  // 2. STATES
  const [startNodeId, setStartNodeId] = useState<string>('n_india_gate'); // India Gate (Delhi)
  const [endNodeId, setEndNodeId] = useState<string>('n_gateway'); // Gateway of India (Mumbai)
  const [algorithmId, setAlgorithmId] = useState<AlgorithmId>('dijkstra');
  const [animationSpeed, setAnimationSpeed] = useState<number>(30); // ms per step

  // Playback Control States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);

  // Showreel (Auto Loop) States
  const [isShowreelActive, setIsShowreelActive] = useState<boolean>(false);
  const showreelDelayTimeout = useRef<NodeJS.Timeout | null>(null);

  // Analytical execution history
  const [history, setHistory] = useState<Record<AlgorithmId, SimulationStats | null>>({
    dijkstra: null,
    greedy: null,
    astar: null,
    'bidirectional-dijkstra': null,
    'bidirectional-astar': null,
  });

  // Help info modal/drawer state
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // 3. SOLVE PATHFINDING (On node or algorithm changes)
  const solverResults = useMemo(() => {
    const t0 = performance.now();
    let res;

    switch (algorithmId) {
      case 'dijkstra':
        res = runDijkstra(graph, startNodeId, endNodeId);
        break;
      case 'greedy':
        res = runGreedyBestFirst(graph, startNodeId, endNodeId);
        break;
      case 'astar':
        res = runAStar(graph, startNodeId, endNodeId);
        break;
      case 'bidirectional-dijkstra':
        res = runBidirectionalDijkstra(graph, startNodeId, endNodeId);
        break;
      case 'bidirectional-astar':
        res = runBidirectionalAStar(graph, startNodeId, endNodeId);
        break;
      default:
        res = runDijkstra(graph, startNodeId, endNodeId);
    }

    const t1 = performance.now();
    const executionTimeMs = t1 - t0;

    // Calculate actual cumulative Euclidean distance of final path
    let totalPathCost = 0;
    if (res.path.length > 1) {
      for (let i = 0; i < res.path.length - 1; i++) {
        const n1 = graph.nodes.find(n => n.id === res.path[i])!;
        const n2 = graph.nodes.find(n => n.id === res.path[i + 1])!;
        const dx = n1.x - n2.x;
        const dy = n1.y - n2.y;
        totalPathCost += Math.sqrt(dx * dx + dy * dy);
      }
    }

    const resultStats: SimulationStats = {
      algorithmId,
      nodesExplored: res.visitedNodes.length,
      executionTimeMs,
      pathLength: totalPathCost,
      pathFound: res.path.length > 0,
    };

    return {
      path: res.path,
      visitedNodes: res.visitedNodes,
      visitedEdges: res.visitedEdges,
      forwardVisited: res.forwardVisited,
      backwardVisited: res.backwardVisited,
      stats: resultStats,
    };
  }, [graph, startNodeId, endNodeId, algorithmId]);

  // Extract variables for easy reading
  const { path, visitedNodes, visitedEdges, forwardVisited, backwardVisited, stats } = solverResults;
  const totalSteps = visitedNodes.length;

  // 4. ANIMATION TICKER
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= totalSteps) {
          setIsPlaying(false);
          clearInterval(interval);
          
          // Complete session log in diagnostics history
          setHistory((prevHistory) => ({
            ...prevHistory,
            [algorithmId]: stats,
          }));

          return prev;
        }
        return prev + 1;
      });
    }, animationSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, totalSteps, animationSpeed, algorithmId, stats]);

  // 5. RESET SIMULATION WHEN GRAPH PATH PARAMETERS ALTER
  useEffect(() => {
    setIsPlaying(false);
    setCurrentStep(0);
    if (showreelDelayTimeout.current) {
      clearTimeout(showreelDelayTimeout.current);
    }
  }, [startNodeId, endNodeId, algorithmId]);

  // 6. CLEAR HISTORICAL DIAGNOSTICS WHEN COORDINATES CHANGE
  useEffect(() => {
    setHistory({
      dijkstra: null,
      greedy: null,
      astar: null,
      'bidirectional-dijkstra': null,
      'bidirectional-astar': null,
    });
  }, [startNodeId, endNodeId]);

  // 7. SHOWREEL AUTO-CYCLE FLOW
  useEffect(() => {
    if (!isShowreelActive) return;

    const isComplete = currentStep >= totalSteps;

    if (isComplete && !isPlaying) {
      // Set history for this algorithm in the showreel
      setHistory((prevHistory) => ({
        ...prevHistory,
        [algorithmId]: stats,
      }));

      // Schedule transition to the next algorithm in showreel
      const algos: AlgorithmId[] = ['dijkstra', 'greedy', 'astar', 'bidirectional-dijkstra', 'bidirectional-astar'];
      const currentIndex = algos.indexOf(algorithmId);
      const nextIndex = (currentIndex + 1) % algos.length;
      const nextAlgo = algos[nextIndex];

      showreelDelayTimeout.current = setTimeout(() => {
        setAlgorithmId(nextAlgo);
        setCurrentStep(0);
        setIsPlaying(true);
      }, 3500); // 3.5s pause to let user admire the final glowing path
    } else if (currentStep === 0 && !isPlaying) {
      // Just loaded, start playing instantly
      setIsPlaying(true);
    }

    return () => {
      if (showreelDelayTimeout.current) {
        clearTimeout(showreelDelayTimeout.current);
      }
    };
  }, [isShowreelActive, currentStep, totalSteps, isPlaying, algorithmId, stats]);

  // Handlers
  const handlePlay = () => {
    if (currentStep >= totalSteps) {
      setCurrentStep(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setIsShowreelActive(false);
    setCurrentStep(0);
  };

  const handleToggleShowreel = () => {
    if (isShowreelActive) {
      setIsShowreelActive(false);
      setIsPlaying(false);
    } else {
      setIsShowreelActive(true);
      setCurrentStep(0);
      setIsPlaying(true);
    }
  };

  const handleSelectNodes = (startId: string, endId: string) => {
    setStartNodeId(startId);
    setEndNodeId(endId);
  };

  // Get active subsets for Map Canvas draw calculations
  const animatedVisitedNodes = visitedNodes.slice(0, currentStep);
  
  // To identify forward/backward sub-visits during partial steps of bidirectional algorithm
  const animatedForwardVisited = useMemo(() => {
    const exploredSet = new Set(animatedVisitedNodes);
    return forwardVisited.filter(nId => exploredSet.has(nId));
  }, [animatedVisitedNodes, forwardVisited]);

  const animatedBackwardVisited = useMemo(() => {
    const exploredSet = new Set(animatedVisitedNodes);
    return backwardVisited.filter(nId => exploredSet.has(nId));
  }, [animatedVisitedNodes, backwardVisited]);

  const meta = ALGORITHMS_META[algorithmId];

  return (
    <div className="min-h-screen bg-[#070A13] text-slate-100 flex flex-col font-sans antialiased relative">
      
      {/* GLOWING HEADER BACKGROUND */}
      <div className="absolute top-0 left-0 right-0 h-[280px] bg-gradient-to-b from-indigo-500/10 via-sky-500/0 to-transparent pointer-events-none z-0" />

      {/* HEADER SECTION */}
      <header className="border-b border-white/5 bg-[#070A13]/80 backdrop-blur-md sticky top-0 z-40 w-full font-sans">
        <div className="max-w-full mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-indigo-500 to-sky-400 p-2.5 rounded-xl shadow-lg shadow-indigo-500/10">
              <Compass size={20} className="text-white animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-display text-white tracking-tight leading-none bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  India National Highway & Pathfinder Workstation
                </h1>
                <span className="text-[9px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-full border border-sky-500/20 font-black uppercase tracking-wider font-mono">
                  Engine V2.5
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-1 font-sans">
                Simulating route optimization across the Golden Quadrilateral & national transit networks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 transition-all flex items-center gap-1.5 text-xs font-semibold font-display tracking-tight cursor-pointer"
            >
              <Info size={15} className="text-indigo-400" />
              <span>How it Works</span>
            </button>
          </div>
        </div>
      </header>

      {/* CORE WORKSPACE */}
      <main className="flex-1 max-w-full px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-6 z-10 w-full lg:h-[calc(100vh-73px)] lg:overflow-hidden">
        
        {/* LEFT COLUMN: INTERACTIVE MAP CANVAS */}
        <section className="lg:col-span-7 xl:col-span-8 flex flex-col h-[500px] lg:h-full gap-4">
          <div className="flex-1 h-full min-h-0">
            <MapCanvas
              graph={graph}
              startNodeId={startNodeId}
              endNodeId={endNodeId}
              onSelectNodes={handleSelectNodes}
              currentStep={currentStep}
              totalSteps={totalSteps}
              exploredInOrder={visitedNodes}
              exploredEdgesInOrder={visitedEdges}
              finalPath={path}
              algorithmId={algorithmId}
              exploredColor={meta.exploredColor}
              pathColor={meta.pathColor}
              forwardVisited={animatedForwardVisited}
              backwardVisited={animatedBackwardVisited}
            />
          </div>
        </section>

        {/* RIGHT COLUMN: SOLVER HUB & ANALYTICS WORKSTATION */}
        <section className="lg:col-span-5 xl:col-span-4 flex flex-col gap-5 overflow-y-auto lg:h-full pb-6 lg:pb-0 pr-1 custom-scrollbar min-h-0">
          
          {/* SIMULATION STATE OVERVIEW / METRICS CARD */}
          <StatsOverlay
              algorithmId={algorithmId}
              nodesExploredCurrent={currentStep}
              executionTimeMs={stats.executionTimeMs}
              pathLength={stats.pathLength}
              pathFound={stats.pathFound}
              currentStep={currentStep}
              totalSteps={totalSteps}
              history={history}
            />

            {/* SIMULATION CONTROL DASHBOARD */}
            <ControlPanel
              graph={graph}
              startNodeId={startNodeId}
              endNodeId={endNodeId}
              onSelectNodes={handleSelectNodes}
              algorithmId={algorithmId}
              onChangeAlgorithm={setAlgorithmId}
              isPlaying={isPlaying}
              onPlay={handlePlay}
              onPause={handlePause}
              onReset={handleReset}
              animationSpeed={animationSpeed}
              onChangeSpeed={setAnimationSpeed}
              isShowreelActive={isShowreelActive}
              onToggleShowreel={handleToggleShowreel}
            />
          </section>
        </main>

      {/* HOW IT WORKS MODAL OVERLAY */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHelp(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0B0F19] border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              {/* Gold light leak effect */}
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              <h3 className="text-xl font-bold font-display text-white mb-3.5 flex items-center gap-2">
                <Info className="text-amber-400" />
                <span>India Map & Solver Workspace Guide</span>
              </h3>

              <div className="space-y-4 text-xs text-slate-300 leading-relaxed font-sans">
                <div>
                  <h4 className="font-bold font-display text-white mb-1 text-sm tracking-tight">1. Set Coordinates</h4>
                  <p>
                    Select pre-mapped legendary landmarks (like <span className="text-amber-400 font-semibold">India Gate</span> or the <span className="text-amber-400 font-semibold">Taj Mahal</span>) using our custom search navigator, or directly click any intersection on the map canvas to place start (A) and target (B) beacons.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold font-display text-white mb-1 text-sm tracking-tight">2. Run Pathfinder Solvers</h4>
                  <p>
                    Pick any of the five highly specialized pathfinding algorithms. Hit <span className="text-sky-400 font-bold uppercase font-display text-[11px] tracking-wide bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/10">START SOLVER</span> to watch nodes flood out in gorgeous responsive patterns, or click <span className="text-red-400 font-bold uppercase font-display text-[11px] tracking-wide bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/10">SHOWREEL</span> for an automatic loops showcase presentation.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold font-display text-white mb-1 text-sm tracking-tight">3. Understand the Mechanics</h4>
                  <ul className="list-inside space-y-2 mt-1.5 text-slate-400 pl-1 font-sans">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00F2FE] mt-1.5 shrink-0" />
                      <p>
                        <span className="text-[#00F2FE] font-bold font-display mr-1">Dijkstra:</span> Explores evenly in all directions, guaranteeing the absolute shortest route.
                      </p>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] mt-1.5 shrink-0" />
                      <p>
                        <span className="text-[#3B82F6] font-bold font-display mr-1">A* Search:</span> Pairs current cost with remaining distance heuristic to focus the path directly toward Target B.
                      </p>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E] mt-1.5 shrink-0" />
                      <p>
                        <span className="text-[#F43F5E] font-bold font-display mr-1">Greedy Best-First:</span> Acts purely on estimated remaining distance, hyper-fast but often sub-optimal.
                      </p>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#EC4899] mt-1.5 shrink-0" />
                      <p>
                        <span className="text-[#EC4899] font-bold font-display mr-1">Bidirectional Search:</span> Spreads two frontiers (from A and B) simultaneously to meet in the middle, dramatically shrinking searched nodes.
                      </p>
                    </li>
                  </ul>
                </div>

                <div className="bg-white/2 p-3.5 rounded-xl border border-white/5 flex items-start gap-2.5 text-slate-400 mt-2">
                  <Trophy size={14} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] leading-normal font-sans">
                    <span className="font-bold font-display text-white mr-1">Diagnostics Comparison:</span> The system tracks your session history and plots live bar graphs of efficiency, so you can evaluate pathfinder speed and footprint at a glance.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowHelp(false)}
                className="mt-6 w-full bg-white hover:bg-slate-200 text-slate-950 font-bold py-3 rounded-xl transition-all text-xs font-display tracking-tight cursor-pointer shadow-lg"
              >
                GOT IT, LET'S EXPLORE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
