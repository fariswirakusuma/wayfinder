import type { Edge } from './Edge.ts';
import type { Obstacle } from './Obstacle.ts';
import type { Node } from './Node.ts';

// Reexport your entry components here
export * from './Node';
export * from './Edge';
export * from './Obstacle'; 

export type PathfindingAlgorithm = 'a-star' | 'dijkstra' | 'bellman-ford';

export interface PathfindingRequest {
  startNodeId: string;
  targetNodeId: string;
  nodes: Node[];
  edges: Edge[];
  obstacles: Obstacle[];
}

export interface PathfindingResponse {
  found: boolean;
  path: Node[];
  executionTimeMs?: number;
  visitedNodesCount?: number;
}