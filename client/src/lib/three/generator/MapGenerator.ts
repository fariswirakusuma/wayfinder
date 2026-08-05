import * as THREE from 'three';
import type { Node, Obstacle } from '../types';

export type MapType = 'maze' | 'random';

export interface GenerateMapParams {
  width: number;
  height: number; 
  depth: number;
  mapType: MapType;
  obstacleDensity?: number;
  spacing?: number;
}

export interface MapDataResponse {
  nodes: Node[];
  obstacles: Obstacle[];
}

const API_BASE_URL = '/api/map';

export async function fetchGeneratedMap(params: GenerateMapParams): Promise<MapDataResponse> {
  const wallHeight = params.height;

  const response = await fetch(`${API_BASE_URL}/generate_map`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      width: params.width,
      height: 1,
      depth: params.depth,
      mapType: params.mapType,
      obstacleDensity: params.obstacleDensity ?? 0.3,
      spacing: params.spacing ?? 2.0
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to generate map from backend: ${response.statusText}`);
  }

  const data = await response.json();

  const nodes: Node[] = data.nodes.map((n: any) => ({
    ...n,
    position: new THREE.Vector3(n.position.x, 0, n.position.z)
  }));

  const obstacles: Obstacle[] = data.obstacles.map((o: any) => ({
    ...o,
    position: new THREE.Vector3(o.position.x, wallHeight / 2, o.position.z),
    height: wallHeight,
    width: o.width ?? 1,
    depth: o.depth ?? 1
  }));

  return { nodes, obstacles };
}