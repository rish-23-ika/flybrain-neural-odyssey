export type GameMode = 'menu' | 'flight' | 'brain' | 'flylab' | 'neural-dodge' | 'victory' | 'gameover';

export interface LevelDefinition {
  id: string;
  number: number;
  name: string;
  subtitle: string;
  description: string;
  environment: 'garden' | 'pollen' | 'neural';
  targetNectar: number;
  targetRings: number;
  timeLimitSeconds: number;
  themeColor: string;
  ambientColor: string;
  fogColor: string;
  bronzeScore: number;
  silverScore: number;
  goldScore: number;
  unlocked: boolean;
}

export interface PlayerFlightState {
  speed: number;
  maxSpeed: number;
  boostSpeed: number;
  isBoosting: boolean;
  boostEnergy: number; // 0 - 100
  altitude: number;
  nectarCollected: number;
  ringsCompleted: number;
  score: number;
  timeElapsed: number;
  nearMisses: number;
  collisionWarning: boolean;
  boundaryWarning?: boolean;
}

export interface NeuropilRegion {
  id: string;
  name: string;
  acronym: string;
  category: 'Navigation' | 'Olfaction' | 'Vision' | 'Memory' | 'Motor';
  color: string;
  neuronCountEstimate: number;
  function: string;
  flightRole: string;
  description: string;
  center: [number, number, number];
  size: [number, number, number];
}

export interface ConnectomeNeuron {
  id: string;
  name: string;
  regionId: string;
  position: [number, number, number];
  targetPosition?: [number, number, number];
  neurotransmitter: 'Acetylcholine' | 'GABA' | 'Glutamate' | 'Dopamine' | 'Octopamine';
  activity: number; // 0 to 1
  type: 'sensory' | 'interneuron' | 'motor' | 'modulatory';
  connections: string[];
}

export interface LevelResult {
  levelId: string;
  score: number;
  nectar: number;
  rings: number;
  time: number;
  medal: 'gold' | 'silver' | 'bronze' | 'none';
  newRecord: boolean;
}
