import React, { useRef, useEffect, useState, useMemo } from 'react';
import { CityGraph, MapNode, MapEdge, AlgorithmId } from '../types';
import { RIVER_GANGES_POINTS, RIVER_YAMUNA_POINTS, HIMALAYAS_POLYGON } from '../utils/indiaMap';
import { Compass, Layers, RotateCw, Sparkles, Sliders } from 'lucide-react';
import L from 'leaflet';

interface MapCanvasProps {
  graph: CityGraph;
  startNodeId: string;
  endNodeId: string;
  onSelectNodes: (startId: string, endId: string) => void;
  // Animation state inputs
  currentStep: number;
  totalSteps: number;
  exploredInOrder: string[];
  exploredEdgesInOrder: string[];
  finalPath: string[];
  algorithmId: AlgorithmId;
  exploredColor: string;
  pathColor: string;
  forwardVisited: string[];
  backwardVisited: string[];
}

interface TrafficParticle {
  edgeId: string;
  progress: number; // 0.0 to 1.0
  speed: number;
  direction: 1 | -1;
  color: string;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  graph,
  startNodeId,
  endNodeId,
  onSelectNodes,
  currentStep,
  totalSteps,
  exploredInOrder,
  exploredEdgesInOrder,
  finalPath,
  algorithmId,
  exploredColor,
  pathColor,
  forwardVisited,
  backwardVisited,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const leafletContainerRef = useRef<HTMLDivElement>(null);

  // --- LEAFLET MAP REAL WORLD PROJECTION & LAYERS ---
  const getLatLng = (x: number, y: number): [number, number] => {
    // Translate 0-100 coordinates to actual India coordinates
    const lng = 68.0 + (x / 100) * 29.0;
    const lat = 36.0 - (y / 100) * 28.0;
    return [lat, lng];
  };

  const getXYFromLatLng = (lat: number, lng: number): { x: number; y: number } => {
    const x = ((lng - 68.0) / 29.0) * 100;
    const y = ((36.0 - lat) / 28.0) * 100;
    return { x, y };
  };

  const findNearestNode = (x: number, y: number): MapNode => {
    let nearest = graph.nodes[0];
    let minDist = Infinity;
    for (const node of graph.nodes) {
      const dist = Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2);
      if (dist < minDist) {
        minDist = dist;
        nearest = node;
      }
    }
    return nearest;
  };

  const leafletMapRef = useRef<L.Map | null>(null);
  const baseEdgesGroupRef = useRef<L.FeatureGroup | null>(null);
  const exploredEdgesGroupRef = useRef<L.FeatureGroup | null>(null);
  const nodesGroupRef = useRef<L.FeatureGroup | null>(null);
  const markersMapRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const edgeLinesMapRef = useRef<Map<string, L.Polyline>>(new Map());
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const isDraggingStartRef = useRef<boolean>(false);
  const isDraggingEndRef = useRef<boolean>(false);
  const draggingPointRef = useRef<'start' | 'end' | null>(null);
  const lastFitPathIdRef = useRef<string | null>(null);

  const [hoveredNode, setHoveredNode] = useState<MapNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [settingStart, setSettingStart] = useState<boolean>(true);

  // --- 3D VIEWPORT PERSPECTIVE STATES ---
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
  const [pitch, setPitch] = useState<number>(42); // tilt angle in degrees
  const [yaw, setYaw] = useState<number>(-25);   // rotation angle in degrees
  const [zoom, setZoom] = useState<number>(7.8);
  const [isOrbiting, setIsOrbiting] = useState<boolean>(false);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(10);

  // Drag state for interactive camera rotation/tilt
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, startYaw: 0, startPitch: 0 });
  const [dragDelta, setDragDelta] = useState(0);

  // Flow & Animation timing references
  const [particleOffset, setParticleOffset] = useState(0);

  // --- TRAFFIC SIMULATION (Pre-generate random active vehicles) ---
  const trafficParticles = useMemo<TrafficParticle[]>(() => {
    if (graph.edges.length === 0) return [];
    const particles: TrafficParticle[] = [];
    const colors = ['#38BDF8', '#F1F5F9', '#FCD34D', '#A5B4FC', '#F472B6'];
    
    // Distribute 70 vehicles randomly across the street edges
    for (let i = 0; i < 70; i++) {
      const randomEdgeIndex = Math.floor(Math.random() * graph.edges.length);
      const edge = graph.edges[randomEdgeIndex];
      particles.push({
        edgeId: edge.id,
        progress: Math.random(),
        speed: 0.003 + Math.random() * 0.005,
        direction: Math.random() > 0.5 ? 1 : -1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    return particles;
  }, [graph.edges]);

  // Update loop for animations (Traffic, Orbits, path flowing particles)
  useEffect(() => {
    let animId: number;

    const updateLoop = () => {
      // 1. Path particle flow
      setParticleOffset((prev) => (prev + 0.9) % 40);

      // 2. Slow passive 3D camera rotation (if Orbit mode enabled)
      if (isOrbiting && viewMode === '3d') {
        setYaw((prev) => (prev + 0.06) % 360);
      }

      // 3. Drive traffic particles
      trafficParticles.forEach((p) => {
        p.progress = (p.progress + p.speed) % 1.0;
      });

      animId = requestAnimationFrame(updateLoop);
    };

    animId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animId);
  }, [isOrbiting, viewMode, trafficParticles]);

  // Track container dimension with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.max(width, 400),
          height: Math.max(height, 500),
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // --- INITIALIZE LEAFLET MAP ---
  useEffect(() => {
    if (!leafletContainerRef.current) return;
    if (leafletMapRef.current) return;

    // Center on India
    const map = L.map(leafletContainerRef.current, {
      center: [21.5, 78.9],
      zoom: 5,
      minZoom: 4,
      maxZoom: 14,
      zoomControl: false,
    });

    // Add zoom controls
    L.control.zoom({ position: 'topleft' }).addTo(map);

    // Gorgeous custom dark style basemap
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    leafletMapRef.current = map;

    // Feature Groups
    baseEdgesGroupRef.current = L.featureGroup().addTo(map);
    exploredEdgesGroupRef.current = L.featureGroup().addTo(map);
    nodesGroupRef.current = L.featureGroup().addTo(map);

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      leafletMapRef.current = null;
      startMarkerRef.current = null;
      endMarkerRef.current = null;
      isDraggingStartRef.current = false;
      isDraggingEndRef.current = false;
    };
  }, []);

  // Invalidate map size on view mode or container dimension adjustments
  useEffect(() => {
    if (viewMode === '2d' && leafletMapRef.current) {
      setTimeout(() => {
        leafletMapRef.current?.invalidateSize();
      }, 150);
    }
  }, [viewMode, dimensions]);

  // --- DRAW STATIC ROAD NETWORK LAYERS IN LEAFLET ---
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    // Clean up
    baseEdgesGroupRef.current?.clearLayers();
    nodesGroupRef.current?.clearLayers();
    markersMapRef.current.clear();
    edgeLinesMapRef.current.clear();

    // Render edges
    graph.edges.forEach((edge) => {
      const fromNode = graph.nodes.find((n) => n.id === edge.from);
      const toNode = graph.nodes.find((n) => n.id === edge.to);
      if (!fromNode || !toNode) return;

      const p1 = getLatLng(fromNode.x, fromNode.y);
      const p2 = getLatLng(toNode.x, toNode.y);

      let color = 'rgba(255, 255, 255, 0.08)';
      let weight = 1.5;

      if (edge.type === 'highway') {
        color = 'rgba(255, 255, 255, 0.22)';
        weight = 2.5;
      } else if (edge.type === 'main') {
        color = 'rgba(255, 255, 255, 0.15)';
        weight = 2.0;
      }

      const polyline = L.polyline([p1, p2], {
        color,
        weight,
        interactive: false,
      });

      polyline.addTo(baseEdgesGroupRef.current!);
      edgeLinesMapRef.current.set(edge.id, polyline);
    });

    // Render junctions/nodes
    graph.nodes.forEach((node) => {
      const coords = getLatLng(node.x, node.y);

      const marker = L.circleMarker(coords, {
        radius: node.isLandmark ? 5.5 : 3.5,
        fillColor: node.isLandmark ? '#F59E0B' : '#475569',
        fillOpacity: 0.85,
        color: node.isLandmark ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.1)',
        weight: 1,
      });

      marker.on('mouseover', () => {
        setHoveredNode(node);
      });
      marker.on('mouseout', () => {
        setHoveredNode(null);
      });
      marker.on('click', () => {
        if (settingStart) {
          if (node.id === endNodeId) {
            onSelectNodes(node.id, startNodeId);
          } else {
            onSelectNodes(node.id, endNodeId);
          }
          setSettingStart(false);
        } else {
          if (node.id === startNodeId) {
            onSelectNodes(endNodeId, node.id);
          } else {
            onSelectNodes(startNodeId, node.id);
          }
          setSettingStart(true);
        }
      });

      marker.addTo(nodesGroupRef.current!);
      markersMapRef.current.set(node.id, marker);
    });
  }, [graph]);

  // --- UPDATE BEACONS & ROUTING FRONTIERS IN LEAFLET ---
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    // 1. UPDATE START (A) & TARGET (B) PIN MARKS
    const startNode = graph.nodes.find((n) => n.id === startNodeId);
    if (startNode) {
      const startCoords = getLatLng(startNode.x, startNode.y);
      if (startMarkerRef.current) {
        if (!isDraggingStartRef.current) {
          startMarkerRef.current.setLatLng(startCoords);
        }
      } else {
        const customStartIcon = L.divIcon({
          className: 'custom-beacon-marker',
          html: `
            <div class="relative flex items-center justify-center cursor-grab active:cursor-grabbing">
              <div class="absolute w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 animate-ping" style="animation-duration: 2s;"></div>
              <div class="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-white shadow-lg text-[10px] font-black text-black">A</div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        const marker = L.marker(startCoords, { 
          icon: customStartIcon,
          draggable: true
        }).addTo(map);

        marker.on('dragstart', () => {
          isDraggingStartRef.current = true;
        });

        marker.on('drag', (e: any) => {
          const pos = e.target.getLatLng();
          const xy = getXYFromLatLng(pos.lat, pos.lng);
          const nearest = findNearestNode(xy.x, xy.y);
          if (nearest && nearest.id !== endNodeId) {
            onSelectNodes(nearest.id, endNodeId);
          }
        });

        marker.on('dragend', (e: any) => {
          isDraggingStartRef.current = false;
          const pos = e.target.getLatLng();
          const xy = getXYFromLatLng(pos.lat, pos.lng);
          const nearest = findNearestNode(xy.x, xy.y);
          if (nearest && nearest.id !== endNodeId) {
            onSelectNodes(nearest.id, endNodeId);
          }
          const snappedCoords = getLatLng(nearest.x, nearest.y);
          e.target.setLatLng(snappedCoords);
        });

        startMarkerRef.current = marker;
      }
    }

    const endNode = graph.nodes.find((n) => n.id === endNodeId);
    if (endNode) {
      const endCoords = getLatLng(endNode.x, endNode.y);
      if (endMarkerRef.current) {
        if (!isDraggingEndRef.current) {
          endMarkerRef.current.setLatLng(endCoords);
        }
      } else {
        const customEndIcon = L.divIcon({
          className: 'custom-beacon-marker',
          html: `
            <div class="relative flex items-center justify-center cursor-grab active:cursor-grabbing">
              <div class="absolute w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/40 animate-ping" style="animation-duration: 2s; animation-delay: 0.3s;"></div>
              <div class="w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center border-2 border-white shadow-lg text-[10px] font-black text-white">B</div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        const marker = L.marker(endCoords, { 
          icon: customEndIcon,
          draggable: true
        }).addTo(map);

        marker.on('dragstart', () => {
          isDraggingEndRef.current = true;
        });

        marker.on('drag', (e: any) => {
          const pos = e.target.getLatLng();
          const xy = getXYFromLatLng(pos.lat, pos.lng);
          const nearest = findNearestNode(xy.x, xy.y);
          if (nearest && nearest.id !== startNodeId) {
            onSelectNodes(startNodeId, nearest.id);
          }
        });

        marker.on('dragend', (e: any) => {
          isDraggingEndRef.current = false;
          const pos = e.target.getLatLng();
          const xy = getXYFromLatLng(pos.lat, pos.lng);
          const nearest = findNearestNode(xy.x, xy.y);
          if (nearest && nearest.id !== startNodeId) {
            onSelectNodes(startNodeId, nearest.id);
          }
          const snappedCoords = getLatLng(nearest.x, nearest.y);
          e.target.setLatLng(snappedCoords);
        });

        endMarkerRef.current = marker;
      }
    }

    // 2. ANIMATE EXPLORATION STEPS & PATH ON LEAFLET
    exploredEdgesGroupRef.current?.clearLayers();

    // Reset default markers styling
    markersMapRef.current.forEach((marker, nodeId) => {
      const node = graph.nodes.find((n) => n.id === nodeId);
      if (node) {
        marker.setStyle({
          radius: node.isLandmark ? 5.5 : 3.5,
          fillColor: node.isLandmark ? '#F59E0B' : '#475569',
          fillOpacity: 0.85,
          color: node.isLandmark ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.1)',
          weight: 1,
        });
      }
    });

    const isBidirectional = algorithmId.includes('bidirectional');
    const activeExploredEdgesCount = Math.min(currentStep, exploredEdgesInOrder.length);

    for (let i = 0; i < activeExploredEdgesCount; i++) {
      const edgeId = exploredEdgesInOrder[i];
      const edge = graph.edges.find((e) => e.id === edgeId);
      if (!edge) continue;

      const fromNode = graph.nodes.find((n) => n.id === edge.from);
      const toNode = graph.nodes.find((n) => n.id === edge.to);
      if (!fromNode || !toNode) continue;

      const p1 = getLatLng(fromNode.x, fromNode.y);
      const p2 = getLatLng(toNode.x, toNode.y);

      let strokeColor = exploredColor;
      if (isBidirectional) {
        const isFromStart = forwardVisited.includes(edge.from) || forwardVisited.includes(edge.to);
        const isFromEnd = backwardVisited.includes(edge.from) || backwardVisited.includes(edge.to);
        if (isFromStart && isFromEnd) strokeColor = '#EF4444'; // Meet
        else if (isFromEnd) strokeColor = '#EC4899'; // Backward (Pink)
        else strokeColor = '#00F2FE'; // Forward (Cyan)
      }

      // Outer glow line
      L.polyline([p1, p2], {
        color: strokeColor,
        weight: 4.5,
        opacity: 0.3,
        interactive: false,
      }).addTo(exploredEdgesGroupRef.current!);

      // Inner sharp core wire
      L.polyline([p1, p2], {
        color: strokeColor,
        weight: 1.5,
        opacity: 0.95,
        interactive: false,
      }).addTo(exploredEdgesGroupRef.current!);
    }

    // Explored Nodes style update
    const activeExploredNodesCount = Math.min(currentStep, exploredInOrder.length);
    for (let i = 0; i < activeExploredNodesCount; i++) {
      const nodeId = exploredInOrder[i];
      const marker = markersMapRef.current.get(nodeId);
      if (!marker) continue;

      let nodeColor = exploredColor;
      if (isBidirectional) {
        if (forwardVisited.includes(nodeId) && backwardVisited.includes(nodeId)) nodeColor = '#EF4444';
        else if (backwardVisited.includes(nodeId)) nodeColor = '#EC4899';
        else nodeColor = '#00F2FE';
      }

      const isLatest = i === activeExploredNodesCount - 1;
      marker.setStyle({
        fillColor: isLatest ? '#FFFFFF' : nodeColor,
        fillOpacity: 1.0,
        color: nodeColor,
        weight: isLatest ? 3 : 1,
        radius: isLatest ? 7.5 : 4,
      });
    }

    // Render Completed Glowing Final Route on Leaflet
    const isExplorationDone = currentStep >= totalSteps;
    if (isExplorationDone && finalPath.length > 1) {
      const pathCoords = finalPath.map((nodeId) => {
        const node = graph.nodes.find((n) => n.id === nodeId)!;
        return getLatLng(node.x, node.y);
      });

      // Neon outer glow
      L.polyline(pathCoords, {
        color: pathColor,
        weight: 7,
        opacity: 0.45,
        interactive: false,
      }).addTo(exploredEdgesGroupRef.current!);

      // Sharp white core wire
      L.polyline(pathCoords, {
        color: '#FFFFFF',
        weight: 2.5,
        opacity: 0.95,
        interactive: false,
      }).addTo(exploredEdgesGroupRef.current!);

      // Auto-fit bounds of the final path (only do it once per unique path)
      const currentPathId = `${startNodeId}_${endNodeId}_${algorithmId}`;
      if (lastFitPathIdRef.current !== currentPathId) {
        const bounds = L.latLngBounds(pathCoords);
        map.fitBounds(bounds, { padding: [40, 40] });
        lastFitPathIdRef.current = currentPathId;
      }
    } else if (!isExplorationDone) {
      // Clear the ref while exploration is in progress
      lastFitPathIdRef.current = null;
    }
  }, [
    startNodeId,
    endNodeId,
    currentStep,
    totalSteps,
    exploredInOrder,
    exploredEdgesInOrder,
    finalPath,
    algorithmId,
    exploredColor,
    pathColor,
    forwardVisited,
    backwardVisited,
    graph,
    settingStart
  ]);

  // --- 3D COORDINATE PROJECTION ENGINE ---
  const getProjectedCoords = (xPercent: number, yPercent: number, zHeight: number = 0) => {
    if (viewMode === '2d') {
      const marginX = dimensions.width * 0.06;
      const marginY = dimensions.height * 0.08;
      const drawWidth = dimensions.width - 2 * marginX;
      const drawHeight = dimensions.height - 2 * marginY;
      return {
        x: marginX + (xPercent / 100) * drawWidth,
        y: marginY + (yPercent / 100) * drawHeight,
        depthScale: 1.0,
      };
    }

    // Centered system (-50 to 50 relative coordinate offsets)
    const cx = xPercent - 50;
    const cy = yPercent - 50;

    // 1. Z-axis Rotation (Yaw)
    const radYaw = (yaw * Math.PI) / 180;
    const rx = cx * Math.cos(radYaw) - cy * Math.sin(radYaw);
    const ry = cx * Math.sin(radYaw) + cy * Math.cos(radYaw);

    // 2. X-axis Rotation (Pitch) + Z-height vertical extrusion
    const radPitch = (pitch * Math.PI) / 180;
    // Tilted Y compression & negative Z elevation (upward on screen is lower Y)
    const py = ry * Math.cos(radPitch) - zHeight * Math.sin(radPitch);
    const px = rx;

    // 3. Perspective Division (further items converge slightly to center)
    const viewDist = 110;
    const perspective = viewDist / (viewDist + ry * Math.sin(radPitch));

    // 4. Transform to scaled Canvas coordinates
    const scale = zoom * perspective;
    const outX = dimensions.width / 2 + px * scale + panX;
    const outY = dimensions.height / 2 + py * scale + panY;

    return {
      x: outX,
      y: outY,
      depthScale: perspective,
    };
  };

  // --- DRAG ROTATE & MOUSE INTERACTION HANDLERS ---
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if clicked near start or end node beacons
    const startNode = graph.nodes.find((n) => n.id === startNodeId);
    const endNode = graph.nodes.find((n) => n.id === endNodeId);
    
    let clickedStart = false;
    let clickedEnd = false;

    if (startNode) {
      const p = getProjectedCoords(startNode.x, startNode.y, 0.5);
      const dist = Math.sqrt(Math.pow(p.x - clickX, 2) + Math.pow(p.y - clickY, 2));
      if (dist < 28) {
        clickedStart = true;
      }
    }

    if (endNode && !clickedStart) {
      const p = getProjectedCoords(endNode.x, endNode.y, 0.5);
      const dist = Math.sqrt(Math.pow(p.x - clickX, 2) + Math.pow(p.y - clickY, 2));
      if (dist < 28) {
        clickedEnd = true;
      }
    }

    if (clickedStart) {
      draggingPointRef.current = 'start';
      setIsOrbiting(false);
    } else if (clickedEnd) {
      draggingPointRef.current = 'end';
      setIsOrbiting(false);
    } else {
      dragRef.current = {
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        startYaw: yaw,
        startPitch: pitch,
      };
      setIsOrbiting(false); // Stop auto-orbit during user interaction
    }
    setDragDelta(0);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (draggingPointRef.current) {
      // Snapping to nearest node during carry
      let nearestNode: MapNode | null = null;
      let minDist = Infinity;

      for (const node of graph.nodes) {
        const p = getProjectedCoords(node.x, node.y);
        const dist = Math.sqrt(Math.pow(p.x - mouseX, 2) + Math.pow(p.y - mouseY, 2));
        if (dist < minDist) {
          minDist = dist;
          nearestNode = node;
        }
      }

      if (nearestNode) {
        if (draggingPointRef.current === 'start') {
          if (nearestNode.id !== endNodeId) {
            onSelectNodes(nearestNode.id, endNodeId);
          }
        } else {
          if (nearestNode.id !== startNodeId) {
            onSelectNodes(startNodeId, nearestNode.id);
          }
        }
      }
    } else if (dragRef.current.isDragging) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const delta = Math.sqrt(dx * dx + dy * dy);
      setDragDelta(delta);

      if (viewMode === '3d' && delta > 4) {
        const sensitivity = 0.45;
        // Drag left/right rotates around yaw. Drag up/down tilts pitch.
        setYaw((dragRef.current.startYaw - dx * sensitivity) % 360);
        setPitch(Math.max(12, Math.min(82, dragRef.current.startPitch + dy * sensitivity)));
      }
    } else {
      // Hover detection - finds closest projected node within pixel threshold
      let hovered: MapNode | null = null;
      let minDist = 22;

      for (const node of graph.nodes) {
        const p = getProjectedCoords(node.x, node.y);
        const dist = Math.sqrt(Math.pow(p.x - mouseX, 2) + Math.pow(p.y - mouseY, 2));
        if (dist < minDist) {
          minDist = dist;
          hovered = node;
        }
      }

      if (hovered !== hoveredNode) {
        setHoveredNode(hovered);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingPointRef.current) {
      draggingPointRef.current = null;
      return;
    }
    dragRef.current.isDragging = false;
    
    // If the mouse barely moved, register it as a normal click!
    if (dragDelta < 6) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      let nearestNode: MapNode | null = null;
      let minDist = 24;

      for (const node of graph.nodes) {
        const p = getProjectedCoords(node.x, node.y);
        const dist = Math.sqrt(Math.pow(p.x - clickX, 2) + Math.pow(p.y - clickY, 2));
        if (dist < minDist) {
          minDist = dist;
          nearestNode = node;
        }
      }

      if (nearestNode) {
        if (settingStart) {
          if (nearestNode.id === endNodeId) {
            onSelectNodes(nearestNode.id, startNodeId);
          } else {
            onSelectNodes(nearestNode.id, endNodeId);
          }
          setSettingStart(false);
        } else {
          if (nearestNode.id === startNodeId) {
            onSelectNodes(endNodeId, nearestNode.id);
          } else {
            onSelectNodes(startNodeId, nearestNode.id);
          }
          setSettingStart(true);
        }
      }
    }
  };

  // --- DRAW PRIMITIVES FOR 3D WIREFRAME OBJECTS ---
  const drawProjectedCircle = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number, zHeight: number, strokeColor: string, fillStyle?: string) => {
    ctx.beginPath();
    const segments = 16;
    for (let i = 0; i <= segments; i++) {
      const angle = (i * 2 * Math.PI) / segments;
      // Shift original flat center coordinates out by radius, then project to 3D
      const px = centerX + radius * Math.cos(angle);
      const py = centerY + radius * Math.sin(angle);
      const proj = getProjectedCoords(px, py, zHeight);
      if (i === 0) ctx.moveTo(proj.x, proj.y);
      else ctx.lineTo(proj.x, proj.y);
    }
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    ctx.strokeStyle = strokeColor;
    ctx.stroke();
  };

  const drawProjectedBox = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, hBottom: number, hTop: number, strokeColor: string, fillStyle?: string) => {
    // 4 bottom coordinates
    const b1 = getProjectedCoords(x1, y1, hBottom);
    const b2 = getProjectedCoords(x2, y1, hBottom);
    const b3 = getProjectedCoords(x2, y2, hBottom);
    const b4 = getProjectedCoords(x1, y2, hBottom);

    // 4 top coordinates
    const t1 = getProjectedCoords(x1, y1, hTop);
    const t2 = getProjectedCoords(x2, y1, hTop);
    const t3 = getProjectedCoords(x2, y2, hTop);
    const t4 = getProjectedCoords(x1, y2, hTop);

    // Fill top face
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.beginPath();
      ctx.moveTo(t1.x, t1.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.lineTo(t3.x, t3.y);
      ctx.lineTo(t4.x, t4.y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;

    // Draw bottom rectangle
    ctx.beginPath();
    ctx.moveTo(b1.x, b1.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.lineTo(b3.x, b3.y);
    ctx.lineTo(b4.x, b4.y);
    ctx.closePath();
    ctx.stroke();

    // Draw top rectangle
    ctx.beginPath();
    ctx.moveTo(t1.x, t1.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.lineTo(t3.x, t3.y);
    ctx.lineTo(t4.x, t4.y);
    ctx.closePath();
    ctx.stroke();

    // Vertical struts
    const segments = [[b1, t1], [b2, t2], [b3, t3], [b4, t4]];
    segments.forEach(([b, t]) => {
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
    });
  };

  const drawProjectedCylinder = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number, hStart: number, hEnd: number, strokeColor: string) => {
    drawProjectedCircle(ctx, centerX, centerY, radius, hStart, strokeColor);
    drawProjectedCircle(ctx, centerX, centerY, radius, hEnd, strokeColor);
    
    // Connect with 4 vertical struts
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const px = centerX + radius * Math.cos(angle);
      const py = centerY + radius * Math.sin(angle);
      const p1 = getProjectedCoords(px, py, hStart);
      const p2 = getProjectedCoords(px, py, hEnd);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
    }
  };

  // --- RENDERING HANDLER ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    // 1. RADIAL FUTURISTIC SLATE BACKGROUND
    const gradient = ctx.createRadialGradient(
      dimensions.width / 2, dimensions.height / 2, 50,
      dimensions.width / 2, dimensions.height / 2, dimensions.width
    );
    gradient.addColorStop(0, '#0F1524'); // Center dark blue-slate
    gradient.addColorStop(1, '#05070D'); // Outer pure black
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // 2. GEOMETRIC BACKGROUND grid with perspective fade
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
    ctx.lineWidth = 1;
    const gridSpacing = 45;
    for (let x = -dimensions.width; x < dimensions.width * 2; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, -dimensions.height);
      ctx.lineTo(x, dimensions.height * 2);
      ctx.stroke();
    }
    for (let y = -dimensions.height; y < dimensions.height * 2; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(-dimensions.width, y);
      ctx.lineTo(dimensions.width * 2, y);
      ctx.stroke();
    }

    // 3. DRAW HIMALAYAS MOUNTAIN RANGE (Tilted green/snow polygon)
    if (graph.nodes.length > 0) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.04)';
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.12)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      HIMALAYAS_POLYGON.forEach((p, index) => {
        const proj = getProjectedCoords(p.x, p.y, 0);
        if (index === 0) ctx.moveTo(proj.x, proj.y);
        else ctx.lineTo(proj.x, proj.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Write soft tag floating in 3D
      const labelProj = getProjectedCoords(35.0, 10.0, 1.0);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.38)';
      ctx.font = '700 8.5px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HIMALAYAN REGION', labelProj.x, labelProj.y);
    }

    // 4. DRAW WINDING RIVERS (Sleek, glowing neon-blue corridors)
    // 4a. River Ganges
    if (RIVER_GANGES_POINTS.length > 0) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      RIVER_GANGES_POINTS.forEach((p, index) => {
        const proj = getProjectedCoords(p.x, p.y, -0.3);
        if (index === 0) ctx.moveTo(proj.x, proj.y);
        else {
          const prev = RIVER_GANGES_POINTS[index - 1];
          const prevProj = getProjectedCoords(prev.x, prev.y, -0.3);
          const xc = (proj.x + prevProj.x) / 2;
          const yc = (proj.y + prevProj.y) / 2;
          ctx.quadraticCurveTo(prevProj.x, prevProj.y, xc, yc);
        }
      });
      ctx.strokeStyle = 'rgba(14, 116, 144, 0.14)';
      ctx.lineWidth = viewMode === '3d' ? 10 * (zoom / 8) : 11;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
      ctx.lineWidth = viewMode === '3d' ? 1.8 * (zoom / 8) : 2.0;
      ctx.stroke();

      const nameProj = getProjectedCoords(51.7, 38.3, 1.5);
      ctx.fillStyle = 'rgba(6, 182, 212, 0.45)';
      ctx.font = '700 8px "Space Grotesk", sans-serif';
      ctx.fillText('RIVER GANGES', nameProj.x, nameProj.y);
    }

    // 4b. River Yamuna
    if (RIVER_YAMUNA_POINTS.length > 0) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      RIVER_YAMUNA_POINTS.forEach((p, index) => {
        const proj = getProjectedCoords(p.x, p.y, -0.3);
        if (index === 0) ctx.moveTo(proj.x, proj.y);
        else {
          const prev = RIVER_YAMUNA_POINTS[index - 1];
          const prevProj = getProjectedCoords(prev.x, prev.y, -0.3);
          const xc = (proj.x + prevProj.x) / 2;
          const yc = (proj.y + prevProj.y) / 2;
          ctx.quadraticCurveTo(prevProj.x, prevProj.y, xc, yc);
        }
      });
      ctx.strokeStyle = 'rgba(14, 116, 144, 0.10)';
      ctx.lineWidth = viewMode === '3d' ? 6 * (zoom / 8) : 7;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.lineWidth = viewMode === '3d' ? 1.2 * (zoom / 8) : 1.5;
      ctx.stroke();

      const nameProj = getProjectedCoords(31.8, 26.4, 1.5);
      ctx.fillStyle = 'rgba(6, 182, 212, 0.35)';
      ctx.font = '700 8px "Space Grotesk", sans-serif';
      ctx.fillText('RIVER YAMUNA', nameProj.x, nameProj.y);
    }

    // 5. DRAW BASE ROAD NETWORK (Elegant thin grey wires)
    ctx.shadowBlur = 0;
    graph.edges.forEach((edge) => {
      const fromNode = graph.nodes.find((n) => n.id === edge.from);
      const toNode = graph.nodes.find((n) => n.id === edge.to);
      if (!fromNode || !toNode) return;

      const p1 = getProjectedCoords(fromNode.x, fromNode.y, 0);
      const p2 = getProjectedCoords(toNode.x, toNode.y, 0);

      if (edge.type === 'highway') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.8;
      } else if (edge.type === 'main') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.lineWidth = 1.3;
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
        ctx.lineWidth = 0.8;
      }

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    // 6. DRAW REAL-TIME AMBIENT VEHICULAR TRAFFIC FLOWS (Moving Spark Particles)
    ctx.lineWidth = 1;
    trafficParticles.forEach((p) => {
      const edge = graph.edges.find((e) => e.id === p.edgeId);
      if (!edge) return;

      const fromNode = graph.nodes.find((n) => n.id === edge.from);
      const toNode = graph.nodes.find((n) => n.id === edge.to);
      if (!fromNode || !toNode) return;

      // Linear interpolation based on progress
      const t = p.progress;
      const x = fromNode.x + (toNode.x - fromNode.x) * t;
      const y = fromNode.y + (toNode.y - fromNode.y) * t;

      const proj = getProjectedCoords(x, y, 0.2);

      // Render glowing spark dot
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 1.2 * proj.depthScale, 0, 2 * Math.PI);
      ctx.fill();
    });

    // 7. DRAW EXPLORED REGIONS (Neon Glow Wave Frontiers)
    const isBidirectional = algorithmId.includes('bidirectional');
    const activeExploredEdgesCount = Math.min(currentStep, exploredEdgesInOrder.length);

    for (let i = 0; i < activeExploredEdgesCount; i++) {
      const edgeId = exploredEdgesInOrder[i];
      const edge = graph.edges.find((e) => e.id === edgeId);
      if (!edge) continue;

      const fromNode = graph.nodes.find((n) => n.id === edge.from);
      const toNode = graph.nodes.find((n) => n.id === edge.to);
      if (!fromNode || !toNode) continue;

      const p1 = getProjectedCoords(fromNode.x, fromNode.y, 0.4);
      const p2 = getProjectedCoords(toNode.x, toNode.y, 0.4);

      let strokeColor = exploredColor;
      if (isBidirectional) {
        const isFromStart = forwardVisited.includes(edge.from) || forwardVisited.includes(edge.to);
        const isFromEnd = backwardVisited.includes(edge.from) || backwardVisited.includes(edge.to);
        if (isFromStart && isFromEnd) strokeColor = '#EF4444'; // Meet
        else if (isFromEnd) strokeColor = '#EC4899'; // Backward (Pink)
        else strokeColor = '#00F2FE'; // Forward (Cyan)
      }

      // Glowing outer envelope
      ctx.strokeStyle = strokeColor + '20';
      ctx.lineWidth = 4 * p1.depthScale;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Sharp core wire
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.0 * p1.depthScale;
      ctx.stroke();
    }

    // Draw Explored nodes with breathing halos
    const activeExploredNodesCount = Math.min(currentStep, exploredInOrder.length);
    for (let i = 0; i < activeExploredNodesCount; i++) {
      const nodeId = exploredInOrder[i];
      const node = graph.nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      const p = getProjectedCoords(node.x, node.y, 0.4);

      let nodeColor = exploredColor;
      if (isBidirectional) {
        if (forwardVisited.includes(nodeId) && backwardVisited.includes(nodeId)) nodeColor = '#EF4444';
        else if (backwardVisited.includes(nodeId)) nodeColor = '#EC4899';
        else nodeColor = '#00F2FE';
      }

      // Pulse the absolute latest wave frontier node
      const isLatest = i === activeExploredNodesCount - 1;
      const sizeFactor = isLatest ? 8 + Math.sin(Date.now() / 80) * 3.5 : 4.0;

      ctx.fillStyle = nodeColor + (isLatest ? '60' : '25');
      ctx.beginPath();
      ctx.arc(p.x, p.y, sizeFactor * p.depthScale, 0, 2 * Math.PI);
      ctx.fill();

      // Core anchor dot
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5 * p.depthScale, 0, 2 * Math.PI);
      ctx.fill();
    }

    // 8. DRAW FINAL HIGH-GLOW COMPLETED PATH (Pulsing neon line + flow sparks)
    const isExplorationDone = currentStep >= totalSteps;
    if (isExplorationDone && finalPath.length > 1) {
      // Setup intense drop shadow glow
      ctx.shadowColor = pathColor;
      ctx.shadowBlur = 15;

      ctx.beginPath();
      finalPath.forEach((nodeId, idx) => {
        const node = graph.nodes.find((n) => n.id === nodeId);
        if (!node) return;
        const p = getProjectedCoords(node.x, node.y, 0.6);
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });

      // Neon outer core line
      ctx.strokeStyle = pathColor + '30';
      ctx.lineWidth = 5.0;
      ctx.stroke();

      // Sharp inner white/colored core wire
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.shadowBlur = 0; // Turn off global shadow immediately

      // FLOWING SUPER-CHARGED CORONA PARTICLES
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = pathColor;
      ctx.shadowBlur = 8;

      let currentSegmentOffset = particleOffset;
      for (let idx = 0; idx < finalPath.length - 1; idx++) {
        const n1 = graph.nodes.find((n) => n.id === finalPath[idx]);
        const n2 = graph.nodes.find((n) => n.id === finalPath[idx + 1]);
        if (!n1 || !n2) continue;

        const p1 = getProjectedCoords(n1.x, n1.y, 0.7);
        const p2 = getProjectedCoords(n2.x, n2.y, 0.7);

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const segLen = Math.sqrt(dx * dx + dy * dy);

        let ratio = currentSegmentOffset / segLen;
        while (ratio <= 1.0) {
          if (ratio >= 0) {
            const px = p1.x + dx * ratio;
            const py = p1.y + dy * ratio;

            ctx.beginPath();
            ctx.arc(px, py, 2.2 * p1.depthScale, 0, 2 * Math.PI);
            ctx.fill();
          }
          ratio += 30 / segLen; // Particle gap spacing
        }
        currentSegmentOffset -= segLen;
      }
      ctx.shadowBlur = 0; // clean up
    }

    // 9. DRAW PREMIUM 3D WIREFRAME LANDMARK ARCHITECTURE (Only in 3D Mode!)
    if (viewMode === '3d') {
      graph.nodes.forEach((node) => {
        if (!node.isLandmark) return;

        // Draw custom architectural models
        if (node.id === 'n_tv_tower') {
          // --- BERLIN TELEVISION TOWER (Fernsehturm) ---
          const color = '#38BDF8'; // cyan wireframe
          // Base support pillars
          drawProjectedCylinder(ctx, node.x, node.y, 1.2, 0, 4, 'rgba(56, 189, 248, 0.3)');
          // Center shaft
          drawProjectedCylinder(ctx, node.x, node.y, 0.45, 0, 25, color);
          // Sphere (Concentric circles with ribs at height 25)
          drawProjectedCircle(ctx, node.x, node.y, 2.0, 22.5, color, 'rgba(56, 189, 248, 0.1)');
          drawProjectedCircle(ctx, node.x, node.y, 2.4, 25, color);
          drawProjectedCircle(ctx, node.x, node.y, 2.0, 27.5, color);
          // Antenna Needle
          const topSpire = getProjectedCoords(node.x, node.y, 38);
          const baseSpire = getProjectedCoords(node.x, node.y, 27.5);
          ctx.beginPath();
          ctx.moveTo(baseSpire.x, baseSpire.y);
          ctx.lineTo(topSpire.x, topSpire.y);
          ctx.strokeStyle = '#EF4444'; // Red alarm tip!
          ctx.lineWidth = 1.5;
          ctx.stroke();

        } else if (node.id === 'n_brandenburg') {
          // --- BRANDENBURG GATE (Tor) ---
          const color = '#FBBF24'; // Gold
          // 6 Columns (simple vertical lines of column structure)
          const colsX = [35.6, 36.1, 36.6, 37.4, 37.9, 38.4];
          colsX.forEach((cx) => {
            const b = getProjectedCoords(cx, node.y, 0);
            const t = getProjectedCoords(cx, node.y, 6.0);
            ctx.beginPath();
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(t.x, t.y);
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          });
          // Top architrave entablature
          drawProjectedBox(ctx, 35.4, node.y - 0.5, 38.6, node.y + 0.5, 6.0, 8.0, color, 'rgba(251, 191, 36, 0.1)');
          // Quadriga statue box representation on top
          drawProjectedBox(ctx, 36.7, node.y - 0.2, 37.3, node.y + 0.2, 8.0, 10.5, '#FFFFFF');

        } else if (node.id === 'n_siegessaeule') {
          // --- VICTORY COLUMN (Siegessäule) ---
          const color = '#A78BFA'; // Violet
          // Rotunda base stairs
          drawProjectedCylinder(ctx, node.x, node.y, 1.8, 0, 3.5, 'rgba(167, 139, 250, 0.4)');
          // Pillar shaft
          drawProjectedCylinder(ctx, node.x, node.y, 0.6, 3.5, 17, color);
          // Golden Victoria figure
          const angel = getProjectedCoords(node.x, node.y, 19);
          ctx.fillStyle = '#FBBF24'; // Gold star!
          ctx.beginPath();
          ctx.arc(angel.x, angel.y, 3, 0, 2 * Math.PI);
          ctx.fill();

        } else if (node.id === 'n_reichstag') {
          // --- REICHSTAG PARLIAMENT BUILDING ---
          const color = '#34D399'; // Emerald
          // Rectangular solid base blocks
          drawProjectedBox(ctx, 34.6, node.y - 1.2, 38.4, node.y + 1.2, 0, 4.5, 'rgba(52, 211, 153, 0.2)');
          // Dome
          drawProjectedCircle(ctx, node.x, node.y, 1.4, 4.5, color);
          drawProjectedCircle(ctx, node.x, node.y, 0.9, 7.5, color, 'rgba(52, 211, 153, 0.2)');

        } else if (node.id === 'n_potsdamer_platz') {
          // --- POTSDAMER PLATZ GLASS SKYSCRAPERS ---
          const color = '#38BDF8';
          drawProjectedBox(ctx, 35.5, node.y + 0.8, 36.5, node.y + 1.8, 0, 18, color, 'rgba(56, 189, 248, 0.05)');
          drawProjectedBox(ctx, 36.6, node.y - 0.5, 37.8, node.y + 0.7, 0, 27, color, 'rgba(56, 189, 248, 0.05)');
          drawProjectedBox(ctx, 37.9, node.y - 1.8, 38.9, node.y - 0.8, 0, 14, color, 'rgba(56, 189, 248, 0.05)');

        } else if (node.id === 'n_berliner_dom') {
          // --- BERLIN CATHEDRAL (Dom) ---
          const color = '#06B6D4';
          drawProjectedBox(ctx, node.x - 1.5, node.y - 1.5, node.x + 1.5, node.y + 1.5, 0, 5.5, 'rgba(6, 182, 212, 0.2)');
          // Center Dome
          drawProjectedCircle(ctx, node.x, node.y, 1.2, 5.5, color);
          drawProjectedCircle(ctx, node.x, node.y, 0.7, 9.5, color, 'rgba(6, 182, 212, 0.1)');
        }
      });
    }

    // 10. DRAW METRIC COORDINATE TARGET BEACONS (Start A & End B)
    const startNode = graph.nodes.find((n) => n.id === startNodeId);
    const endNode = graph.nodes.find((n) => n.id === endNodeId);

    if (startNode) {
      const p = getProjectedCoords(startNode.x, startNode.y, 0.5);
      const pulseSize = 10 + Math.sin(Date.now() / 140) * 3.5;

      // Outer rings
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, pulseSize * p.depthScale, 0, 2 * Math.PI);
      ctx.stroke();

      // Beacon center
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5 * p.depthScale, 0, 2 * Math.PI);
      ctx.fill();

      // Sharp white dot
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.8 * p.depthScale, 0, 2 * Math.PI);
      ctx.fill();

      // Vertical marker pin line to map ground (only in 3D Mode)
      if (viewMode === '3d') {
        const pGround = getProjectedCoords(startNode.x, startNode.y, 0);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(pGround.x, pGround.y);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 9.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('A', p.x, p.y - 12);
    }

    if (endNode) {
      const p = getProjectedCoords(endNode.x, endNode.y, 0.5);
      const pulseSize = 10 + Math.sin((Date.now() + 400) / 140) * 3.5;

      // Outer ring
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, pulseSize * p.depthScale, 0, 2 * Math.PI);
      ctx.stroke();

      // Center
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5 * p.depthScale, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.8 * p.depthScale, 0, 2 * Math.PI);
      ctx.fill();

      // Ground pin line
      if (viewMode === '3d') {
        const pGround = getProjectedCoords(endNode.x, endNode.y, 0);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(pGround.x, pGround.y);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 9.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('B', p.x, p.y - 12);
    }

    // 11. DRAW STANDARD LANDMARKS (Gold pins representing famous places)
    graph.nodes.forEach((node) => {
      if (!node.isLandmark) return;
      if (node.id === startNodeId || node.id === endNodeId) return;

      const p = getProjectedCoords(node.x, node.y, 0.2);

      // Gold pulsing halo
      ctx.fillStyle = 'rgba(245, 158, 11, 0.1)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8 * p.depthScale, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 * p.depthScale, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.fillStyle = '#F59E0B'; // inner gold dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.2 * p.depthScale, 0, 2 * Math.PI);
      ctx.fill();

      // Draw horizontal line connector to label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
      ctx.font = '600 8.5px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      // Put label slightly lower or shifted in depth
      ctx.fillText(node.name || '', p.x, p.y + 11);
    });

    // 12. DRAW CORNER COMPASS HUD ROTATION DIAL (In bottom-right of viewport)
    if (viewMode === '3d') {
      const dialX = dimensions.width - 50;
      const dialY = dimensions.height - 50;
      const dialRad = 25;

      // Draw circle base
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(dialX, dialY, dialRad, 0, 2 * Math.PI);
      ctx.stroke();

      // Cardinal N marker pointing toward Yaw direction
      const radRot = (yaw * Math.PI) / 180;
      const nx = dialX - dialRad * 0.7 * Math.sin(radRot);
      const ny = dialY - dialRad * 0.7 * Math.cos(radRot);

      ctx.beginPath();
      ctx.moveTo(dialX, dialY);
      ctx.lineTo(nx, ny);
      ctx.strokeStyle = '#EF4444'; // Red pointer to North
      ctx.stroke();

      ctx.fillStyle = '#EF4444';
      ctx.font = '700 8px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('N', nx, ny - 3);
    }

    // 13. DRAW SELECTED INTERACTIVE NODE HOVER GLASS CARD
    if (hoveredNode) {
      const p = getProjectedCoords(hoveredNode.x, hoveredNode.y, 0.5);

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10 * p.depthScale, 0, 2 * Math.PI);
      ctx.stroke();

      const popupW = 145;
      const popupH = 44;
      const popupX = p.x + 12 + popupW > dimensions.width ? p.x - 12 - popupW : p.x + 12;
      const popupY = p.y - popupH / 2;

      ctx.fillStyle = 'rgba(7, 10, 19, 0.96)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(popupX, popupY, popupW, popupH, 8);
      ctx.fill();
      ctx.stroke();

      // Node Name / Street ID
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 9.5px "Space Grotesk", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(hoveredNode.name || 'Network Junction', popupX + 8, popupY + 16);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = '500 8px "JetBrains Mono", monospace';
      ctx.fillText(`COORD: ${hoveredNode.x.toFixed(1)}% / ${hoveredNode.y.toFixed(1)}%`, popupX + 8, popupY + 28);
      ctx.fillText('Click to assign', popupX + 8, popupY + 36);
    }
  }, [
    dimensions,
    graph,
    startNodeId,
    endNodeId,
    currentStep,
    totalSteps,
    exploredInOrder,
    exploredEdgesInOrder,
    finalPath,
    algorithmId,
    exploredColor,
    pathColor,
    forwardVisited,
    backwardVisited,
    hoveredNode,
    particleOffset,
    viewMode,
    pitch,
    yaw,
    zoom,
    isOrbiting,
    panX,
    panY,
    trafficParticles
  ]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[480px] bg-[#05070C] overflow-hidden rounded-2xl border border-white/5 shadow-2xl group flex flex-col justify-end">
      
      {/* 1. MAP VIEW MODE HEAD-UP DISPLAY (HUD) SELECTOR */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
        <div className="bg-[#0B0F19]/90 backdrop-blur-md px-1.5 py-1 rounded-xl border border-white/5 flex items-center gap-1 shadow-lg shadow-black/35">
          <button
            onClick={() => setViewMode('2d')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === '2d'
                ? 'bg-sky-500 text-white shadow shadow-sky-500/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers size={12} />
            <span>2D TOP-DOWN</span>
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === '3d'
                ? 'bg-indigo-500 text-white shadow shadow-indigo-500/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass size={12} />
            <span>3D HOLOGRAM</span>
          </button>
        </div>

        {/* Orbit Trigger */}
        {viewMode === '3d' && (
          <button
            onClick={() => setIsOrbiting(!isOrbiting)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all backdrop-blur-md shadow-lg ${
              isOrbiting
                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                : 'bg-[#0B0F19]/90 border-white/5 text-slate-400 hover:text-slate-200'
            }`}
          >
            <RotateCw size={12} className={isOrbiting ? 'animate-spin-slow' : ''} />
            <span>AUTO-ORBIT</span>
          </button>
        )}
      </div>

      {/* 2. LIVE ROTATION SLIDERS HUB (Appears overlaying the right column) */}
      {viewMode === '3d' && (
        <div className="absolute top-4 right-4 z-10 hidden sm:flex flex-col gap-2 bg-[#0B0F19]/80 backdrop-blur-md p-3 rounded-xl border border-white/5 shadow-xl select-none w-44">
          <div className="flex items-center gap-1.5 text-slate-300 text-[10px] font-bold tracking-wider mb-1.5">
            <Sliders size={11} className="text-indigo-400" />
            <span>CAMERA CONTROLS</span>
          </div>

          {/* Yaw slider */}
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between font-mono text-[8px] text-slate-500">
              <span>YAW (Rotation)</span>
              <span>{Math.round(yaw)}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={yaw}
              onChange={(e) => {
                setIsOrbiting(false);
                setYaw(parseFloat(e.target.value));
              }}
              className="w-full accent-indigo-500 h-1 bg-white/5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Pitch slider */}
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between font-mono text-[8px] text-slate-500">
              <span>PITCH (Tilt)</span>
              <span>{Math.round(pitch)}°</span>
            </div>
            <input
              type="range"
              min="15"
              max="80"
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-white/5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Zoom slider */}
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between font-mono text-[8px] text-slate-500">
              <span>ZOOM</span>
              <span>{(zoom / 7.5).toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="4"
              max="15"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-white/5 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* 3. CLICK PREFERENCE TOGGLER Overlay (Set Start or Target) */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2 bg-[#0B0F19]/95 backdrop-blur-md p-3 rounded-2xl border border-white/5 shadow-2xl">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">
          <Sparkles size={11} className="text-indigo-400" />
          <span>Interactive Map Placement</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-white/5 text-xs">
          <span className="text-slate-400 font-medium px-1.5 font-sans">Assign Point:</span>
          <button
            onClick={() => setSettingStart(true)}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all font-display tracking-tight text-xs cursor-pointer ${
              settingStart
                ? 'bg-emerald-500 text-black shadow shadow-emerald-500/20'
                : 'text-emerald-400 hover:bg-white/5'
            }`}
          >
            START (A)
          </button>
          <button
            onClick={() => setSettingStart(false)}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all font-display tracking-tight text-xs cursor-pointer ${
              !settingStart
                ? 'bg-rose-500 text-white shadow shadow-rose-500/20'
                : 'text-rose-400 hover:bg-white/5'
            }`}
          >
            TARGET (B)
          </button>
        </div>
        <p className="text-[10px] text-slate-500 font-sans italic text-left pl-1">
          {settingStart ? '💡 Click on any map node or landmark to set Point A' : '💡 Click on any map node or landmark to set Point B'}
        </p>
      </div>

      {/* 4. DRAG ROTATE INTERACTIVE TIPS */}
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none text-right select-none font-sans">
        <p className="font-mono text-[9px] text-slate-500 uppercase tracking-widest font-bold">
          {viewMode === '3d' ? 'Left-click & drag canvas to rotate 3D camera' : 'Top-down Map Mode'}
        </p>
        <p className="font-display font-bold text-xs text-slate-300 tracking-tight">
          India Geographic Vector Space
        </p>
      </div>

      {/* 2D Interactive Real-World Map (Leaflet) */}
      <div
        ref={leafletContainerRef}
        className="absolute inset-0 w-full h-full transition-opacity duration-300"
        style={{
          opacity: viewMode === '2d' ? 1 : 0,
          pointerEvents: viewMode === '2d' ? 'auto' : 'none',
          zIndex: viewMode === '2d' ? 1 : 0,
        }}
      />

      {/* HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          dragRef.current.isDragging = false;
          setHoveredNode(null);
        }}
        className="block cursor-grab active:cursor-grabbing w-full h-full"
        style={{
          opacity: viewMode === '3d' ? 1 : 0,
          pointerEvents: viewMode === '3d' ? 'auto' : 'none',
        }}
      />

    </div>
  );
};
