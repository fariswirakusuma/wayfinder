import * as THREE from 'three';
import type { Node, Edge, Obstacle } from '$lib/three/types';

export interface SearchArrow {
  fromNodeId: string;
  toNodeId: string;
  position: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  floor: number;
  status?: string;
}

export interface PathfindingRequestPayload {
  startNodeId: string;
  targetNodeId: string;
  nodes: Node[];
  edges?: Edge[];
  obstacles: Obstacle[];
  stepByStep?: boolean;
}

export interface PathfindingStepState {
  step: number;
  currentNodeId: string;
  openSet: string[];
  closedSet: string[];
  parentMap: Record<string, string>;
  gScore?: Record<string, number>;
  fScore?: Record<string, number>;
  distances?: Record<string, number>;
  pathFound?: Node[];
}

export interface PathfindingResponsePayload {
  found: boolean;
  path: Node[];
  graph?: Record<string, string[]>;
  arrows?: SearchArrow[];
  steps?: PathfindingStepState[];
  executionTime?: number;
  visitedNodes?: number;
}

const API_BASE_URL = '/api/pathfinding';

function normalizeGraph(rawGraph: any): Record<string, string[]> | undefined {
  if (!rawGraph || typeof rawGraph !== 'object') return undefined;

  const normalized: Record<string, string[]> = {};

  for (const [key, value] of Object.entries(rawGraph)) {
    if (Array.isArray(value)) {
      normalized[key] = value.map((neighbor: any) => {
        if (typeof neighbor === 'string') return neighbor;
        if (typeof neighbor === 'number') return String(neighbor);
        return String(neighbor.id || neighbor.Id || '');
      }).filter((id) => id !== '');
    }
  }

  return normalized;
}

function normalizeArrows(rawArrows: any): SearchArrow[] | undefined {
  if (!Array.isArray(rawArrows)) return undefined;

  return rawArrows
    .map((arrow: any): SearchArrow | null => {
      const fromNodeId = arrow.fromNodeId ?? arrow.FromNodeId;
      const toNodeId = arrow.toNodeId ?? arrow.ToNodeId;
      const position = arrow.position ?? arrow.Position;
      const direction = arrow.direction ?? arrow.Direction;

      if (!fromNodeId || !toNodeId || !position || !direction) return null;

      return {
        fromNodeId: String(fromNodeId),
        toNodeId: String(toNodeId),
        position: {
          x: position.x ?? position.X ?? 0,
          y: position.y ?? position.Y ?? 0,
          z: position.z ?? position.Z ?? 0
        },
        direction: {
          x: direction.x ?? direction.X ?? 0,
          y: direction.y ?? direction.Y ?? 0,
          z: direction.z ?? direction.Z ?? 0
        },
        floor: arrow.floor ?? arrow.Floor ?? 1,
        status: arrow.status ?? arrow.Status
      };
    })
    .filter((arrow): arrow is SearchArrow => arrow !== null);
}
function parseVisitedNodes(data: any): number {
  const rawVisited = data.visitedNodes ?? data.VisitedNodes ?? data.visitedNodeIds ?? data.VisitedNodeIds;
  
  if (typeof rawVisited === 'number') {
    return rawVisited;
  }
  if (Array.isArray(rawVisited)) {
    return rawVisited.length;
  }
  if (data.closedSet && Array.isArray(data.closedSet)) {
    return data.closedSet.length;
  }
  return 0;
}

export async function solvePath(
  algorithm: 'a-star' | 'dijkstra' | 'bellman-ford',
  payload: PathfindingRequestPayload
): Promise<PathfindingResponsePayload> {
  const startTime = performance.now();

  try {
    const response = await fetch(`${API_BASE_URL}/${algorithm}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startNodeId: payload.startNodeId,
        targetNodeId: payload.targetNodeId,
        nodes: payload.nodes,
        obstacles: payload.obstacles,
        stepByStep: payload.stepByStep ?? false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Server error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const endTime = performance.now();

    const rawPath = data.path || data.Path || [];
    const parsedPath: Node[] = rawPath.map((node: any) => ({
      ...node,
      position: new THREE.Vector3(
        node.position?.x ?? node.Position?.X ?? 0,
        node.position?.y ?? node.Position?.Y ?? 0,
        node.position?.z ?? node.Position?.Z ?? 0
      )
    }));

    const rawGraph = data.graph || data.Graph;
    const rawArrows = data.arrows || data.Arrows;

    return {
      found: data.found ?? data.Found ?? false,
      path: parsedPath,
      graph: normalizeGraph(rawGraph),
      arrows: normalizeArrows(rawArrows),
      executionTime: endTime - startTime,
      visitedNodes: parseVisitedNodes(data)
    };
  } catch (error) {
    console.error(`Error executing ${algorithm} pathfinding:`, error);
    throw error;
  }
}

export async function solvePathStepByStep(
  algorithm: 'a-star' | 'dijkstra' | 'bellman-ford',
  payload: PathfindingRequestPayload
): Promise<PathfindingResponsePayload> {
  const startTime = performance.now();

  try {
    const response = await fetch(`${API_BASE_URL}/${algorithm}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startNodeId: payload.startNodeId,
        targetNodeId: payload.targetNodeId,
        nodes: payload.nodes,
        obstacles: payload.obstacles,
        stepByStep: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Server error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const endTime = performance.now();

    const rawPath = data.path || data.Path || [];
    const parsedPath: Node[] = rawPath.map((node: any) => ({
      ...node,
      position: new THREE.Vector3(
        node.position?.x ?? node.Position?.X ?? 0,
        node.position?.y ?? node.Position?.Y ?? 0,
        node.position?.z ?? node.Position?.Z ?? 0
      )
    }));

    const rawSteps = data.steps || data.Steps || data.searchSteps || [];
    const parsedSteps: PathfindingStepState[] = rawSteps.map((stepState: any) => {
      const pathFound = stepState.pathFound || stepState.PathFound;
      if (pathFound) {
        stepState.pathFound = pathFound.map((node: any) => ({
          ...node,
          position: new THREE.Vector3(
            node.position?.x ?? node.Position?.X ?? 0,
            node.position?.y ?? node.Position?.Y ?? 0,
            node.position?.z ?? node.Position?.Z ?? 0
          )
        }));
      }
      return stepState;
    });

    const rawGraph = data.graph || data.Graph;
    const rawArrows = data.arrows || data.Arrows;

    return {
      found: data.found ?? data.Found ?? false,
      path: parsedPath,
      graph: normalizeGraph(rawGraph),
      arrows: normalizeArrows(rawArrows),
      steps: parsedSteps,
      executionTime: endTime - startTime,
      visitedNodes: parseVisitedNodes(data)
    };
  } catch (error) {
    console.error(`Error executing ${algorithm} step-by-step pathfinding:`, error);
    throw error;
  }
}