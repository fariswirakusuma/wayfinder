import * as THREE from 'three';
import type { Node, Edge, Obstacle } from '$lib/three/types';

export interface PathfindingRequestPayload {
  startNodeId: string;
  targetNodeId: string;
  nodes: Node[];
  edges: Edge[];
  obstacles: Obstacle[];
}

export interface PathfindingResponsePayload {
  found: boolean;
  path: Node[];
  executionTime?: number; 
  visitedNodes?: number; 
}

const API_BASE_URL = '/api/pathfinding';

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
        edges: payload.edges,
        obstacles: payload.obstacles
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Server error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const parsedPath: Node[] = (data.path || []).map((node: any) => ({
      ...node,
      position: new THREE.Vector3(node.position.x, node.position.y, node.position.z)
    }));

    return {
      found: data.found ?? false,
      path: parsedPath
    };
  } catch (error) {
    console.error(`Error executing ${algorithm} pathfinding:`, error);
    throw error;
  }
}
