import { CityGraph, MapNode, MapEdge } from '../types';

export const RIVER_GANGES_POINTS = [
  { x: 28.0, y: 14.0 },
  { x: 33.0, y: 22.0 },
  { x: 41.2, y: 34.8 },
  { x: 48.0, y: 37.0 },
  { x: 51.7, y: 38.3 },
  { x: 58.9, y: 37.1 },
  { x: 69.0, y: 44.0 },
  { x: 70.2, y: 48.0 },
];

export const RIVER_YAMUNA_POINTS = [
  { x: 30.0, y: 16.0 },
  { x: 31.8, y: 26.4 },
  { x: 34.5, y: 31.4 },
  { x: 48.0, y: 37.0 },
];

export const HIMALAYAS_POLYGON = [
  { x: 20.0, y: 3.0 },
  { x: 35.0, y: 7.0 },
  { x: 48.0, y: 13.0 },
  { x: 52.0, y: 16.0 },
  { x: 50.0, y: 20.0 },
  { x: 35.0, y: 15.0 },
  { x: 22.0, y: 10.0 },
];

export interface Landmark {
  id: string;
  name: string;
  x: number;
  y: number;
  type: 'sight' | 'station' | 'park';
  description: string;
}

export const INDIA_LANDMARKS: Landmark[] = [
  {
    id: 'l_india_gate',
    name: 'India Gate (New Delhi)',
    x: 31.8,
    y: 26.4,
    type: 'sight',
    description: 'Stately triumphal arch war memorial located in the heart of New Delhi.',
  },
  {
    id: 'l_taj_mahal',
    name: 'Taj Mahal (Agra)',
    x: 34.5,
    y: 31.4,
    type: 'sight',
    description: 'Iconic white marble mausoleum built by Emperor Shah Jahan in Agra.',
  },
  {
    id: 'l_gateway',
    name: 'Gateway of India (Mumbai)',
    x: 16.8,
    y: 60.4,
    type: 'sight',
    description: 'Majestic basalt arch monument overlooking the Arabian Sea in Mumbai.',
  },
  {
    id: 'l_howrah_bridge',
    name: 'Howrah Bridge (Kolkata)',
    x: 70.2,
    y: 48.0,
    type: 'sight',
    description: 'Historic cantilever bridge spanning the Hooghly River in Kolkata.',
  },
  {
    id: 'l_charminar',
    name: 'Charminar (Hyderabad)',
    x: 36.2,
    y: 66.2,
    type: 'sight',
    description: '16th-century mosque with four grand minarets, a landmark of Hyderabad.',
  },
  {
    id: 'l_vidhana_soudha',
    name: 'Vidhana Soudha (Bengaluru)',
    x: 33.1,
    y: 82.2,
    type: 'sight',
    description: 'Stately granite legislative chamber displaying neo-Dravidian architecture.',
  },
  {
    id: 'l_golden_temple',
    name: 'Golden Temple (Amritsar)',
    x: 23.7,
    y: 15.6,
    type: 'sight',
    description: 'The preeminent spiritual shrine of Sikhism, plated in pure gold.',
  },
  {
    id: 'l_dal_lake',
    name: 'Dal Lake (Srinagar)',
    x: 23.4,
    y: 6.8,
    type: 'sight',
    description: 'A pristine alpine lake in Kashmir known as the "Jewel in the crown of Kashmir".',
  },
  {
    id: 'l_hawa_mahal',
    name: 'Hawa Mahal (Jaipur)',
    x: 26.9,
    y: 32.4,
    type: 'sight',
    description: 'The famous "Palace of Winds", a five-story red and pink sandstone honeycomb structure.',
  }
];

export function generateIndiaGraph(): CityGraph {
  const nodes: MapNode[] = [];
  const edges: MapEdge[] = [];

  const addNode = (id: string, x: number, y: number, name?: string, isLandmark = false, landmarkType?: 'sight' | 'station' | 'park') => {
    nodes.push({ id, x, y, name, isLandmark, landmarkType });
  };

  // Add primary landmarks matching landmarks list
  addNode('n_india_gate', 31.8, 26.4, 'India Gate (Delhi)', true, 'sight');
  addNode('n_taj_mahal', 34.5, 31.4, 'Taj Mahal (Agra)', true, 'sight');
  addNode('n_gateway', 16.8, 60.4, 'Gateway of India', true, 'sight');
  addNode('n_howrah_bridge', 70.2, 48.0, 'Howrah Bridge', true, 'sight');
  addNode('n_charminar', 36.2, 66.2, 'Charminar (Hyd)', true, 'sight');
  addNode('n_vidhana_soudha', 33.1, 82.2, 'Vidhana Soudha (Blr)', true, 'sight');
  addNode('n_golden_temple', 23.7, 15.6, 'Golden Temple', true, 'sight');
  addNode('n_dal_lake', 23.4, 6.8, 'Dal Lake (Srinagar)', true, 'sight');
  addNode('n_hawa_mahal', 26.9, 32.4, 'Hawa Mahal (Jaipur)', true, 'sight');

  // Add primary support cities (regional hubs)
  addNode('n_amritsar', 23.7, 15.6, 'Amritsar');
  addNode('n_srinagar', 23.4, 6.8, 'Srinagar');
  addNode('n_new_delhi', 31.8, 26.4, 'New Delhi');
  addNode('n_jaipur', 26.9, 32.4, 'Jaipur');
  addNode('n_agra', 34.5, 31.4, 'Agra');
  addNode('n_mumbai', 16.8, 60.4, 'Mumbai');
  addNode('n_kolkata', 70.2, 48.0, 'Kolkata');
  addNode('n_hyderabad', 36.2, 66.2, 'Hyderabad');
  addNode('n_bengaluru', 33.1, 82.2, 'Bengaluru');

  addNode('n_ahmedabad', 15.9, 49.9, 'Ahmedabad');
  addNode('n_pune', 18.2, 63.8, 'Pune');
  addNode('n_bhopal', 32.4, 49.0, 'Bhopal');
  addNode('n_nagpur', 38.2, 53.2, 'Nagpur');
  addNode('n_chennai', 42.2, 81.8, 'Chennai');
  addNode('n_kochi', 30.5, 91.5, 'Kochi');
  addNode('n_kanyakumari', 32.9, 99.7, 'Kanyakumari');
  addNode('n_varanasi', 51.7, 38.3, 'Varanasi');
  addNode('n_patna', 58.9, 37.1, 'Patna');
  addNode('n_guwahati', 81.9, 35.2, 'Guwahati');
  addNode('n_bhubaneswar', 61.5, 56.4, 'Bhubaneswar');
  addNode('n_visakhapatnam', 52.8, 69.1, 'Visakhapatnam');
  addNode('n_vijayawada', 43.1, 71.9, 'Vijayawada');
  addNode('n_surat', 15.5, 56.5, 'Surat');
  addNode('n_udaipur', 21.3, 39.2, 'Udaipur');
  addNode('n_raipur', 48.5, 53.6, 'Raipur');
  addNode('n_jabalpur', 39.1, 47.9, 'Jabalpur');
  addNode('n_madurai', 35.2, 90.5, 'Madurai');

  // Add intermediate transit nodes/junctions to enrich search paths
  addNode('n_jammu', 23.5, 11.0, 'Jammu Transit');
  addNode('n_ludhiana', 25.1, 19.5, 'Ludhiana Hub');
  addNode('n_panipat', 31.0, 23.5, 'Panipat Gateway');
  addNode('n_ajmer', 24.2, 35.8, 'Ajmer Sharif');
  addNode('n_vadodara', 16.2, 53.5, 'Vadodara Junction');
  addNode('n_vapi', 16.0, 58.5, 'Vapi Corridor');
  addNode('n_kolhapur', 23.5, 73.0, 'Kolhapur Transit');
  addNode('n_mysuru', 31.0, 85.5, 'Mysuru Palace');
  addNode('n_coimbatore', 32.5, 88.0, 'Coimbatore Junction');
  addNode('n_trichy', 36.8, 87.5, 'Trichy Corridor');
  addNode('n_gwalior', 34.0, 35.5, 'Gwalior Fort');
  addNode('n_sagar', 35.2, 44.5, 'Sagar Central');
  addNode('n_adilabad', 37.5, 60.5, 'Adilabad Gateway');
  addNode('n_kurnool', 34.8, 73.5, 'Kurnool Junction');
  addNode('n_anantapur', 34.0, 77.5, 'Anantapur Transit');
  addNode('n_nellore', 42.8, 77.0, 'Nellore Gateway');
  addNode('n_ongole', 43.0, 74.5, 'Ongole Transit');
  addNode('n_puri', 64.5, 58.0, 'Puri (Jagannath Temple)', true, 'sight');
  addNode('n_rourkela', 54.5, 50.5, 'Rourkela Steel City');
  addNode('n_kharagpur', 67.5, 50.0, 'Kharagpur Junction');
  addNode('n_dhanbad', 65.5, 42.5, 'Dhanbad Coalfield');
  addNode('n_gaya', 56.5, 40.0, 'Gaya (Bodh Gaya)', true, 'sight');
  addNode('n_prayagraj', 46.5, 36.8, 'Prayagraj (Sangam)');
  addNode('n_siliguri', 69.5, 34.0, 'Siliguri Corridors');
  addNode('n_shillong', 83.5, 37.5, 'Shillong (Meghalaya)', true, 'sight');

  let edgeCounter = 1;
  const addEdge = (fromId: string, toId: string, name: string, type: 'highway' | 'main' | 'secondary' | 'local') => {
    const fromNode = nodes.find(n => n.id === fromId);
    const toNode = nodes.find(n => n.id === toId);
    if (!fromNode || !toNode) return;

    const dx = fromNode.x - toNode.x;
    const dy = fromNode.y - toNode.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    edges.push({
      id: `e_${edgeCounter++}`,
      from: fromId,
      to: toId,
      weight: distance,
      name,
      type
    });
  };

  // NH-44: North-South Spine
  addEdge('n_dal_lake', 'n_jammu', 'NH-44 (Kashmir Valley Highway)', 'highway');
  addEdge('n_jammu', 'n_golden_temple', 'NH-44 (Jammu-Amritsar Corridor)', 'highway');
  addEdge('n_golden_temple', 'n_ludhiana', 'NH-44 (Punjab Highways)', 'highway');
  addEdge('n_ludhiana', 'n_panipat', 'NH-44 (Grand Trunk Road)', 'highway');
  addEdge('n_panipat', 'n_india_gate', 'NH-44 (Haryana-Delhi Expressway)', 'highway');
  addEdge('n_india_gate', 'n_taj_mahal', 'Yamuna Expressway', 'highway');
  addEdge('n_taj_mahal', 'n_gwalior', 'NH-44 (Agra-Gwalior Corridor)', 'highway');
  addEdge('n_gwalior', 'n_sagar', 'NH-44 (Madhya Pradesh Expressway)', 'highway');
  addEdge('n_sagar', 'n_nagpur', 'NH-44 (Central Transit Route)', 'highway');
  addEdge('n_nagpur', 'n_adilabad', 'NH-44 (Deccan Express Route)', 'highway');
  addEdge('n_adilabad', 'n_charminar', 'NH-44 (Telangana Expressway)', 'highway');
  addEdge('n_charminar', 'n_kurnool', 'NH-44 (Rayalaseema Highway)', 'highway');
  addEdge('n_kurnool', 'n_anantapur', 'NH-44 (Anantapur Corridor)', 'highway');
  addEdge('n_anantapur', 'n_vidhana_soudha', 'NH-44 (Karnataka Gateway)', 'highway');
  addEdge('n_vidhana_soudha', 'n_coimbatore', 'NH-44 (Blr-Coimbatore Highway)', 'highway');
  addEdge('n_coimbatore', 'n_madurai', 'NH-44 (Tamil Nadu Express)', 'highway');
  addEdge('n_madurai', 'n_kanyakumari', 'NH-44 (Kanyakumari Corridor)', 'highway');

  // Golden Quadrilateral: West Section (Delhi -> Mumbai)
  addEdge('n_india_gate', 'n_hawa_mahal', 'NE-4 (Delhi-Jaipur Expressway)', 'highway');
  addEdge('n_hawa_mahal', 'n_ajmer', 'NH-48 (Ajmer Highway)', 'highway');
  addEdge('n_ajmer', 'n_udaipur', 'NH-48 (Mewar Corridor)', 'highway');
  addEdge('n_ajmer', 'n_hawa_mahal', 'Ajmer Jaiphur Link', 'main');
  addEdge('n_udaipur', 'n_ahmedabad', 'NH-48 (Udaipur-Sabarmati Expressway)', 'highway');
  addEdge('n_ahmedabad', 'n_vadodara', 'NE-1 (Ahmedabad-Vadodara Expressway)', 'highway');
  addEdge('n_vadodara', 'n_surat', 'NH-48 (Gujarat Industrial corridor)', 'highway');
  addEdge('n_surat', 'n_vapi', 'NH-48 (Vapi Industrial highway)', 'highway');
  addEdge('n_vapi', 'n_gateway', 'NH-48 (Mumbai Western Expressway)', 'highway');

  // Golden Quadrilateral: South Section (Mumbai -> Chennai)
  addEdge('n_gateway', 'n_pune', 'Mumbai-Pune Expressway', 'highway');
  addEdge('n_pune', 'n_kolhapur', 'NH-48 (Pune-Kolhapur Expressway)', 'highway');
  addEdge('n_kolhapur', 'n_vidhana_soudha', 'NH-48 (Belagavi-Bengaluru Highway)', 'highway');
  addEdge('n_vidhana_soudha', 'n_chennai', 'NH-48 (Bengaluru-Chennai Expressway)', 'highway');

  // Golden Quadrilateral: East Section (Delhi -> Kolkata)
  addEdge('n_taj_mahal', 'n_prayagraj', 'Grand Trunk Link', 'highway');
  addEdge('n_prayagraj', 'n_varanasi', 'NH-19 (Agra-Varanasi Highway)', 'highway');
  addEdge('n_varanasi', 'n_gaya', 'NH-19 (Ghats-Gaya Highway)', 'highway');
  addEdge('n_gaya', 'n_patna', 'Patna Road Link', 'secondary');
  addEdge('n_gaya', 'n_dhanbad', 'NH-19 (Jharkhand Coalfield highway)', 'highway');
  addEdge('n_dhanbad', 'n_kolkata', 'NH-19 (Durgapur Expressway)', 'highway');

  // Golden Quadrilateral: South-East Section (Kolkata -> Chennai)
  addEdge('n_kolkata', 'n_kharagpur', 'NH-16 (Kolkata-Kharagpur Link)', 'highway');
  addEdge('n_kharagpur', 'n_bhubaneswar', 'NH-16 (Odisha Coastal Route)', 'highway');
  addEdge('n_bhubaneswar', 'n_puri', 'Puri Marine Drive', 'secondary');
  addEdge('n_bhubaneswar', 'n_visakhapatnam', 'NH-16 (Andhra Eastern Ghats Corridor)', 'highway');
  addEdge('n_visakhapatnam', 'n_vijayawada', 'NH-16 (Andhra Coastal Expressway)', 'highway');
  addEdge('n_vijayawada', 'n_ongole', 'NH-16 (Ongole Highway)', 'highway');
  addEdge('n_ongole', 'n_nellore', 'NH-16 (Nellore Link)', 'highway');
  addEdge('n_nellore', 'n_chennai', 'NH-16 (Chennai Northern Expressway)', 'highway');

  // Central Interconnects (East-West & diagonals)
  addEdge('n_ahmedabad', 'n_bhopal', 'NH-47 (Gujarat-MP Link)', 'main');
  addEdge('n_bhopal', 'n_jabalpur', 'Bhopal-Jabalpur Highway', 'main');
  addEdge('n_jabalpur', 'n_sagar', 'Jabalpur Link', 'secondary');
  addEdge('n_jabalpur', 'n_raipur', 'NH-30 (MP-Chhattisgarh Corridor)', 'main');
  addEdge('n_raipur', 'n_nagpur', 'NH-53 (Nagpur-Raipur Express)', 'main');
  addEdge('n_raipur', 'n_rourkela', 'NH-49 (Raipur-Rourkela Highway)', 'main');
  addEdge('n_rourkela', 'n_kharagpur', 'NH-49 (Jharkhand-Bengal Highway)', 'main');
  addEdge('n_bhopal', 'n_gwalior', 'NH-46 (Central Link)', 'main');
  addEdge('n_charminar', 'n_nagpur', 'Deccan-Nagpur Corridor', 'main');
  addEdge('n_charminar', 'n_vijayawada', 'NH-65 (Hyd-Vijayawada Expressway)', 'main');

  // North-East Connections
  addEdge('n_patna', 'n_siliguri', 'NH-27 (Bihar-Bengal corridor)', 'main');
  addEdge('n_siliguri', 'n_guwahati', 'NH-27 (Siliguri-Assam Corridor)', 'highway');
  addEdge('n_guwahati', 'n_shillong', 'NH-6 (Meghalaya Scenic Highway)', 'main');

  // Southern Interconnects
  addEdge('n_vidhana_soudha', 'n_kochi', 'NH-544 (Mysuru-Kerala Corridor)', 'main');
  addEdge('n_kochi', 'n_kanyakumari', 'NH-66 (West Coast Scenic Highway)', 'highway');

  // Create adjacency list
  const adjacencyList: Record<string, { to: string; weight: number; edgeId: string }[]> = {};
  for (const node of nodes) {
    adjacencyList[node.id] = [];
  }

  for (const edge of edges) {
    adjacencyList[edge.from].push({
      to: edge.to,
      weight: edge.weight,
      edgeId: edge.id,
    });
    adjacencyList[edge.to].push({
      to: edge.from,
      weight: edge.weight,
      edgeId: edge.id,
    });
  }

  return {
    nodes,
    edges,
    adjacencyList
  };
}
