import * as THREE from 'three';

export type PathfindingAlgorithm = 'a-star' | 'dijkstra' | 'bellman-ford' | 'q-learning' | 'simulated-annealing';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Obstacle {
  id: string;
  nodeId: string;
  position: Point3D | THREE.Vector3;
  width: number;
  height: number;
  depth: number;
}

export interface Edge {
  targetNode: Node;
  weight: number;
  isBlocked?: boolean;
}

export interface Node {
  id: string;
  position: THREE.Vector3 | Point3D;
  neighbors?: Edge[];
  parent?: Node;
  floor?: number;
  name?: string;
}

export interface ArrowNode {
  FromNodeId: string;
  ToNodeId: string;
  Floor: number;
  Status: string;
  Position: Point3D;
  Direction: Point3D;
}

export interface QLearningOptions {
  episodes?: number;
  maxStepsPerEpisode?: number;
  learningRate?: number;
  discountFactor?: number;
  epsilon?: number;
}

export interface SimulatedAnnealingOptions {
  numWaypoints?: number;
  initialTemperature?: number;
  coolingRate?: number;
  minTemperature?: number;
}

export interface PathfindingRequest {
  startNodeId: string;
  targetNodeId: string;
  nodes: Node[];
  edges: Edge[];
  obstacles: Obstacle[];
  qLearningOptions?: QLearningOptions;
  simulatedAnnealingOptions?: SimulatedAnnealingOptions;
}

export interface PathfindingResponse {
  found: boolean;
  path: Node[];
  executionTimeMs?: number;
  visitedNodesCount?: number;
}