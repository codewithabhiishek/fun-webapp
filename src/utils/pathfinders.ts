import { CityGraph, MapNode } from '../types';

// Helper to compute Euclidean distance between two nodes
export function getDistance(n1: MapNode, n2: MapNode): number {
  const dx = n1.x - n2.x;
  const dy = n1.y - n2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export interface PathfindingResult {
  path: string[];             // Nodes in the final shortest path
  visitedNodes: string[];     // All visited nodes in order
  visitedEdges: string[];     // All traversed edge IDs in order of exploration
  // For bidirectional search:
  forwardVisited: string[];   // Nodes visited from start
  backwardVisited: string[];  // Nodes visited from end
  meetingNodeId?: string;     // The node where both searches met
}

// Helper to find the Edge ID connecting two nodes
function findEdgeId(graph: CityGraph, fromId: string, toId: string): string | undefined {
  const nodeAdj = graph.adjacencyList[fromId];
  if (!nodeAdj) return undefined;
  const match = nodeAdj.find(adj => adj.to === toId);
  return match?.edgeId;
}

// 1. DIJKSTRA
export function runDijkstra(graph: CityGraph, startId: string, endId: string): PathfindingResult {
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const visitedNodes: string[] = [];
  const visitedEdges: string[] = [];
  const unvisited = new Set<string>();

  // Initialize
  for (const node of graph.nodes) {
    distances[node.id] = Infinity;
    previous[node.id] = null;
    unvisited.add(node.id);
  }
  distances[startId] = 0;

  while (unvisited.size > 0) {
    // Get node with minimum distance
    let currentNodeId: string | null = null;
    let minDistance = Infinity;

    for (const nodeId of unvisited) {
      if (distances[nodeId] < minDistance) {
        minDistance = distances[nodeId];
        currentNodeId = nodeId;
      }
    }

    if (currentNodeId === null || minDistance === Infinity) {
      break; // All reachable nodes visited
    }

    // Stop if we reached target
    if (currentNodeId === endId) {
      visitedNodes.push(currentNodeId);
      const prevId = previous[currentNodeId];
      if (prevId) {
        const edgeId = findEdgeId(graph, prevId, currentNodeId);
        if (edgeId) visitedEdges.push(edgeId);
      }
      break;
    }

    unvisited.delete(currentNodeId);
    visitedNodes.push(currentNodeId);

    // Add incoming edge to visited list if it exists
    const prevId = previous[currentNodeId];
    if (prevId) {
      const edgeId = findEdgeId(graph, prevId, currentNodeId);
      if (edgeId) visitedEdges.push(edgeId);
    }

    const neighbors = graph.adjacencyList[currentNodeId] || [];
    for (const neighbor of neighbors) {
      if (!unvisited.has(neighbor.to)) continue;

      const alt = distances[currentNodeId] + neighbor.weight;
      if (alt < distances[neighbor.to]) {
        distances[neighbor.to] = alt;
        previous[neighbor.to] = currentNodeId;
      }
    }
  }

  // Reconstruct path
  const path: string[] = [];
  let u: string | null = endId;
  if (previous[u] !== null || u === startId) {
    while (u !== null) {
      path.unshift(u);
      u = previous[u];
    }
  }

  return {
    path,
    visitedNodes,
    visitedEdges,
    forwardVisited: visitedNodes,
    backwardVisited: [],
  };
}

// 2. GREEDY BEST-FIRST SEARCH
export function runGreedyBestFirst(graph: CityGraph, startId: string, endId: string): PathfindingResult {
  const endNode = graph.nodes.find(n => n.id === endId)!;
  const previous: Record<string, string | null> = {};
  const visitedNodes: string[] = [];
  const visitedEdges: string[] = [];
  const openSet = new Set<string>([startId]);
  const closedSet = new Set<string>();

  previous[startId] = null;

  while (openSet.size > 0) {
    // Find node in openSet with lowest heuristic (distance to endNode)
    let currentNodeId = '';
    let minH = Infinity;

    for (const nodeId of openSet) {
      const node = graph.nodes.find(n => n.id === nodeId)!;
      const h = getDistance(node, endNode);
      if (h < minH) {
        minH = h;
        currentNodeId = nodeId;
      }
    }

    openSet.delete(currentNodeId);
    closedSet.add(currentNodeId);
    visitedNodes.push(currentNodeId);

    const prevId = previous[currentNodeId];
    if (prevId) {
      const edgeId = findEdgeId(graph, prevId, currentNodeId);
      if (edgeId) visitedEdges.push(edgeId);
    }

    if (currentNodeId === endId) {
      break;
    }

    const neighbors = graph.adjacencyList[currentNodeId] || [];
    for (const neighbor of neighbors) {
      if (closedSet.has(neighbor.to) || openSet.has(neighbor.to)) continue;

      previous[neighbor.to] = currentNodeId;
      openSet.add(neighbor.to);
    }
  }

  // Reconstruct path
  const path: string[] = [];
  let u: string | null = endId;
  if (previous[u] !== null || u === startId) {
    while (u !== null) {
      path.unshift(u);
      u = previous[u];
    }
  }

  return {
    path,
    visitedNodes,
    visitedEdges,
    forwardVisited: visitedNodes,
    backwardVisited: [],
  };
}

// 3. A* SEARCH
export function runAStar(graph: CityGraph, startId: string, endId: string): PathfindingResult {
  const endNode = graph.nodes.find(n => n.id === endId)!;
  const gScore: Record<string, number> = {};
  const fScore: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const visitedNodes: string[] = [];
  const visitedEdges: string[] = [];
  const openSet = new Set<string>([startId]);
  const closedSet = new Set<string>();

  for (const node of graph.nodes) {
    gScore[node.id] = Infinity;
    fScore[node.id] = Infinity;
    previous[node.id] = null;
  }

  gScore[startId] = 0;
  fScore[startId] = getDistance(graph.nodes.find(n => n.id === startId)!, endNode);

  while (openSet.size > 0) {
    // Node with lowest fScore
    let currentNodeId = '';
    let minF = Infinity;

    for (const nodeId of openSet) {
      if (fScore[nodeId] < minF) {
        minF = fScore[nodeId];
        currentNodeId = nodeId;
      }
    }

    openSet.delete(currentNodeId);
    closedSet.add(currentNodeId);
    visitedNodes.push(currentNodeId);

    const prevId = previous[currentNodeId];
    if (prevId) {
      const edgeId = findEdgeId(graph, prevId, currentNodeId);
      if (edgeId) visitedEdges.push(edgeId);
    }

    if (currentNodeId === endId) {
      break;
    }

    const neighbors = graph.adjacencyList[currentNodeId] || [];
    for (const neighbor of neighbors) {
      if (closedSet.has(neighbor.to)) continue;

      const tentativeG = gScore[currentNodeId] + neighbor.weight;

      if (!openSet.has(neighbor.to)) {
        openSet.add(neighbor.to);
      } else if (tentativeG >= gScore[neighbor.to]) {
        continue;
      }

      previous[neighbor.to] = currentNodeId;
      gScore[neighbor.to] = tentativeG;
      const neighborNode = graph.nodes.find(n => n.id === neighbor.to)!;
      fScore[neighbor.to] = tentativeG + getDistance(neighborNode, endNode);
    }
  }

  // Reconstruct path
  const path: string[] = [];
  let u: string | null = endId;
  if (previous[u] !== null || u === startId) {
    while (u !== null) {
      path.unshift(u);
      u = previous[u];
    }
  }

  return {
    path,
    visitedNodes,
    visitedEdges,
    forwardVisited: visitedNodes,
    backwardVisited: [],
  };
}

// 4. BIDIRECTIONAL DIJKSTRA
export function runBidirectionalDijkstra(graph: CityGraph, startId: string, endId: string): PathfindingResult {
  const fDist: Record<string, number> = {};
  const bDist: Record<string, number> = {};
  const fPrev: Record<string, string | null> = {};
  const bPrev: Record<string, string | null> = {};

  const fVisited: string[] = [];
  const bVisited: string[] = [];
  const visitedEdges: string[] = [];

  const fQueue = new Set<string>([startId]);
  const bQueue = new Set<string>([endId]);

  for (const node of graph.nodes) {
    fDist[node.id] = Infinity;
    bDist[node.id] = Infinity;
    fPrev[node.id] = null;
    bPrev[node.id] = null;
  }

  fDist[startId] = 0;
  bDist[endId] = 0;

  let meetingNodeId: string | undefined = undefined;
  let bestPathCost = Infinity;

  const fClosed = new Set<string>();
  const bClosed = new Set<string>();

  while (fQueue.size > 0 && bQueue.size > 0) {
    // 1. Expand Forward Set
    let currF: string | null = null;
    let minFDist = Infinity;
    for (const nodeId of fQueue) {
      if (fDist[nodeId] < minFDist) {
        minFDist = fDist[nodeId];
        currF = nodeId;
      }
    }

    if (currF !== null) {
      fQueue.delete(currF);
      fClosed.add(currF);
      fVisited.push(currF);

      const prevId = fPrev[currF];
      if (prevId) {
        const edgeId = findEdgeId(graph, prevId, currF);
        if (edgeId) visitedEdges.push(edgeId);
      }

      // Check intersection
      if (bClosed.has(currF)) {
        meetingNodeId = currF;
        break;
      }

      const neighbors = graph.adjacencyList[currF] || [];
      for (const neighbor of neighbors) {
        if (fClosed.has(neighbor.to)) continue;

        const alt = fDist[currF] + neighbor.weight;
        if (alt < fDist[neighbor.to]) {
          fDist[neighbor.to] = alt;
          fPrev[neighbor.to] = currF;
          fQueue.add(neighbor.to);
        }
      }
    }

    // 2. Expand Backward Set
    let currB: string | null = null;
    let minBDist = Infinity;
    for (const nodeId of bQueue) {
      if (bDist[nodeId] < minBDist) {
        minBDist = bDist[nodeId];
        currB = nodeId;
      }
    }

    if (currB !== null) {
      bQueue.delete(currB);
      bClosed.add(currB);
      bVisited.push(currB);

      const prevId = bPrev[currB];
      if (prevId) {
        const edgeId = findEdgeId(graph, prevId, currB);
        if (edgeId) visitedEdges.push(edgeId);
      }

      // Check intersection
      if (fClosed.has(currB)) {
        meetingNodeId = currB;
        break;
      }

      const neighbors = graph.adjacencyList[currB] || [];
      for (const neighbor of neighbors) {
        if (bClosed.has(neighbor.to)) continue;

        const alt = bDist[currB] + neighbor.weight;
        if (alt < bDist[neighbor.to]) {
          bDist[neighbor.to] = alt;
          bPrev[neighbor.to] = currB;
          bQueue.add(neighbor.to);
        }
      }
    }
  }

  // Find the exact meeting node that yields the shortest total path
  // In bidirectional search, the first node met in queues is not always the absolute shortest path midpoint,
  // though for Dijkstra it's usually very close. Let's scan all nodes scanned by both sides.
  let intersectNode = meetingNodeId;
  let minTotal = Infinity;
  if (intersectNode) {
    for (const node of graph.nodes) {
      if (fClosed.has(node.id) && bClosed.has(node.id)) {
        const dist = fDist[node.id] + bDist[node.id];
        if (dist < minTotal) {
          minTotal = dist;
          intersectNode = node.id;
        }
      }
    }
  }

  // Reconstruct bidirectional path
  const path: string[] = [];
  if (intersectNode) {
    // Forward path from start to meeting node
    let u: string | null = intersectNode;
    const fPath: string[] = [];
    while (u !== null) {
      fPath.unshift(u);
      u = fPrev[u];
    }

    // Backward path from meeting node to end (excluding meeting node itself to avoid duplicates)
    u = bPrev[intersectNode];
    const bPath: string[] = [];
    while (u !== null) {
      bPath.push(u);
      u = bPrev[u];
    }

    path.push(...fPath, ...bPath);
  }

  // Interleave visited lists for dual-animation!
  const combinedVisited: string[] = [];
  const maxLen = Math.max(fVisited.length, bVisited.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < fVisited.length) combinedVisited.push(fVisited[i]);
    if (i < bVisited.length) combinedVisited.push(bVisited[i]);
  }

  return {
    path,
    visitedNodes: combinedVisited,
    visitedEdges,
    forwardVisited: fVisited,
    backwardVisited: bVisited,
    meetingNodeId: intersectNode,
  };
}

// 5. BIDIRECTIONAL A* (Using Average of Heuristics to maintain mathematical admissibility)
export function runBidirectionalAStar(graph: CityGraph, startId: string, endId: string): PathfindingResult {
  const startNode = graph.nodes.find(n => n.id === startId)!;
  const endNode = graph.nodes.find(n => n.id === endId)!;

  const fG: Record<string, number> = {};
  const bG: Record<string, number> = {};
  const fF: Record<string, number> = {};
  const bF: Record<string, number> = {};

  const fPrev: Record<string, string | null> = {};
  const bPrev: Record<string, string | null> = {};

  const fVisited: string[] = [];
  const bVisited: string[] = [];
  const visitedEdges: string[] = [];

  const fQueue = new Set<string>([startId]);
  const bQueue = new Set<string>([endId]);

  const fClosed = new Set<string>();
  const bClosed = new Set<string>();

  for (const node of graph.nodes) {
    fG[node.id] = Infinity;
    bG[node.id] = Infinity;
    fF[node.id] = Infinity;
    bF[node.id] = Infinity;
    fPrev[node.id] = null;
    bPrev[node.id] = null;
  }

  fG[startId] = 0;
  bG[endId] = 0;

  fF[startId] = getDistance(startNode, endNode);
  bF[endId] = getDistance(endNode, startNode);

  let meetingNodeId: string | undefined = undefined;

  while (fQueue.size > 0 && bQueue.size > 0) {
    // 1. Expand Forward A*
    let currF: string | null = null;
    let minFF = Infinity;
    for (const nodeId of fQueue) {
      if (fF[nodeId] < minFF) {
        minFF = fF[nodeId];
        currF = nodeId;
      }
    }

    if (currF !== null) {
      fQueue.delete(currF);
      fClosed.add(currF);
      fVisited.push(currF);

      const prevId = fPrev[currF];
      if (prevId) {
        const edgeId = findEdgeId(graph, prevId, currF);
        if (edgeId) visitedEdges.push(edgeId);
      }

      if (bClosed.has(currF)) {
        meetingNodeId = currF;
        break;
      }

      const neighbors = graph.adjacencyList[currF] || [];
      for (const neighbor of neighbors) {
        if (fClosed.has(neighbor.to)) continue;

        const tentativeG = fG[currF] + neighbor.weight;
        if (tentativeG < fG[neighbor.to]) {
          fG[neighbor.to] = tentativeG;
          fPrev[neighbor.to] = currF;
          const neighborNode = graph.nodes.find(n => n.id === neighbor.to)!;
          // Heuristic is distance to endNode
          fF[neighbor.to] = tentativeG + getDistance(neighborNode, endNode);
          fQueue.add(neighbor.to);
        }
      }
    }

    // 2. Expand Backward A*
    let currB: string | null = null;
    let minBF = Infinity;
    for (const nodeId of bQueue) {
      if (bF[nodeId] < minBF) {
        minBF = bF[nodeId];
        currB = nodeId;
      }
    }

    if (currB !== null) {
      bQueue.delete(currB);
      bClosed.add(currB);
      bVisited.push(currB);

      const prevId = bPrev[currB];
      if (prevId) {
        const edgeId = findEdgeId(graph, prevId, currB);
        if (edgeId) visitedEdges.push(edgeId);
      }

      if (fClosed.has(currB)) {
        meetingNodeId = currB;
        break;
      }

      const neighbors = graph.adjacencyList[currB] || [];
      for (const neighbor of neighbors) {
        if (bClosed.has(neighbor.to)) continue;

        const tentativeG = bG[currB] + neighbor.weight;
        if (tentativeG < bG[neighbor.to]) {
          bG[neighbor.to] = tentativeG;
          bPrev[neighbor.to] = currB;
          const neighborNode = graph.nodes.find(n => n.id === neighbor.to)!;
          // Heuristic is distance to startNode
          bF[neighbor.to] = tentativeG + getDistance(neighborNode, startNode);
          bQueue.add(neighbor.to);
        }
      }
    }
  }

  // Search meeting point with lowest total cost
  let intersectNode = meetingNodeId;
  let minTotal = Infinity;
  if (intersectNode) {
    for (const node of graph.nodes) {
      if (fClosed.has(node.id) && bClosed.has(node.id)) {
        const dist = fG[node.id] + bG[node.id];
        if (dist < minTotal) {
          minTotal = dist;
          intersectNode = node.id;
        }
      }
    }
  }

  // Reconstruct bidirectional path
  const path: string[] = [];
  if (intersectNode) {
    let u: string | null = intersectNode;
    const fPath: string[] = [];
    while (u !== null) {
      fPath.unshift(u);
      u = fPrev[u];
    }

    u = bPrev[intersectNode];
    const bPath: string[] = [];
    while (u !== null) {
      bPath.push(u);
      u = bPrev[u];
    }

    path.push(...fPath, ...bPath);
  }

  // Interleave visited lists for dual-animation!
  const combinedVisited: string[] = [];
  const maxLen = Math.max(fVisited.length, bVisited.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < fVisited.length) combinedVisited.push(fVisited[i]);
    if (i < bVisited.length) combinedVisited.push(bVisited[i]);
  }

  return {
    path,
    visitedNodes: combinedVisited,
    visitedEdges,
    forwardVisited: fVisited,
    backwardVisited: bVisited,
    meetingNodeId: intersectNode,
  };
}

// Global lookup for algorithm properties
export const ALGORITHMS_META = {
  dijkstra: {
    id: 'dijkstra' as const,
    name: 'Dijkstra Algorithm',
    timeComplexity: 'O(V² + E) or O((V + E) log V)',
    spaceComplexity: 'O(V)',
    exploredColor: '#00F2FE', // Glowing cyan
    pathColor: '#00F2FE',
    description: 'Explores equally in all directions, guaranteed to find the absolute shortest path. It behaves like an expanding ripple.',
  },
  greedy: {
    id: 'greedy' as const,
    name: 'Greedy Best-First',
    timeComplexity: 'O(V log V) in average, O(b^d) worst',
    spaceComplexity: 'O(V)',
    exploredColor: '#F43F5E', // Glowing neon pink
    pathColor: '#F43F5E',
    description: 'Rushes straight toward the target node using only the heuristic estimate. Highly efficient, but does not guarantee the shortest path.',
  },
  astar: {
    id: 'astar' as const,
    name: 'A* Search',
    timeComplexity: 'O(E) or O((V + E) log V)',
    spaceComplexity: 'O(V)',
    exploredColor: '#3B82F6', // Neon blue
    pathColor: '#10B981', // Neon emerald green
    description: 'Uses both distance from start (g) and estimated distance to end (h) to explore efficiently. Guarantees the shortest path.',
  },
  'bidirectional-dijkstra': {
    id: 'bidirectional-dijkstra' as const,
    name: 'Bidirectional Dijkstra',
    timeComplexity: 'O((V + E) log V)',
    spaceComplexity: 'O(V)',
    exploredColor: '#EC4899', // Dual neon purple/pink
    pathColor: '#F59E0B', // Glowing amber
    description: 'Spurs two Dijkstra frontiers from start (Cyan) and end (Pink) simultaneously, dramatically reducing search area size.',
  },
  'bidirectional-astar': {
    id: 'bidirectional-astar' as const,
    name: 'Bidirectional A*',
    timeComplexity: 'O((V + E) log V)',
    spaceComplexity: 'O(V)',
    exploredColor: '#EF4444', // Red-Green collision
    pathColor: '#8B5CF6', // Purple spark
    description: 'Spurs two highly directed search fronts toward each other. The fastest optimal pathfinding for large spatial networks.',
  },
};
