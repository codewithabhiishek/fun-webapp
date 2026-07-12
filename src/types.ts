export interface MapNode {
  id: string;
  x: number; // 0 to 100 representing percentage coordinates
  y: number; // 0 to 100 representing percentage coordinates
  name?: string;
  isLandmark?: boolean;
  landmarkType?: 'sight' | 'station' | 'park' | 'water';
  isBridge?: boolean;
}

export interface MapEdge {
  id: string;
  from: string;
  to: string;
  weight: number;
  name?: string;
  type: 'highway' | 'main' | 'secondary' | 'local';
}

export interface CityGraph {
  nodes: MapNode[];
  edges: MapEdge[];
  adjacencyList: Record<string, { to: string; weight: number; edgeId: string }[]>;
}

export type AlgorithmId = 'dijkstra' | 'greedy' | 'astar' | 'bidirectional-dijkstra' | 'bidirectional-astar';

export interface AlgorithmInfo {
  id: AlgorithmId;
  name: string;
  timeComplexity: string;
  spaceComplexity: string;
  exploredColor: string;
  pathColor: string;
  description: string;
}

export interface SimulationStats {
  algorithmId: AlgorithmId;
  nodesExplored: number;
  executionTimeMs: number;
  pathLength: number;
  pathFound: boolean;
}

export interface AnimationFrame {
  type: 'explore' | 'explore-backward' | 'path-segment' | 'success' | 'failure';
  nodeId?: string;
  edgeId?: string;
  path?: string[];
  forwardExplored?: string[];
  backwardExplored?: string[];
}
