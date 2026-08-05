import * as THREE from 'three';
import type { Node, Edge, Obstacle } from '../types';

export type MapType = 'maze' | 'random';

export interface MapData {
  nodes: Node[];
  edges: Edge[];
  obstacles: Obstacle[];
}

export class MapGenerator3D {
  private width: number;
  private height: number;
  private depth: number;
  private spacing: number;

  constructor(width: number, height: number, depth: number, spacing: number = 2) {
    this.width = width % 2 === 0 ? width + 1 : width;
    this.height = height % 2 === 0 ? height + 1 : height;
    this.depth = depth % 2 === 0 ? depth + 1 : depth;
    this.spacing = spacing;
  }

  public generate(type: MapType = 'maze', obstacleDensity: number = 0.3): MapData {
    const grid: number[][][] = Array.from({ length: this.height }, () =>
      Array.from({ length: this.depth }, () => Array(this.width).fill(1))
    );

    if (type === 'maze') {
      this.carve(1, 1, 1, grid);
    } else {
      for (let y = 0; y < this.height; y++) {
        for (let z = 0; z < this.depth; z++) {
          for (let x = 0; x < this.width; x++) {
            if (x === 1 && y === 1 && z === 1) {
              grid[y][z][x] = 0;
            } else {
              grid[y][z][x] = Math.random() < obstacleDensity ? 1 : 0;
            }
          }
        }
      }
    }

    const nodeMap = new Map<string, Node>();
    const allEdges: Edge[] = [];
    const obstacles: Obstacle[] = [];

    for (let y = 0; y < this.height; y++) {
      for (let z = 0; z < this.depth; z++) {
        for (let x = 0; x < this.width; x++) {
          const id = `node_${x}_${y}_${z}`;

          const posX = (x - Math.floor(this.width / 2)) * this.spacing;
          const posY = (y - Math.floor(this.height / 2)) * this.spacing;
          const posZ = (z - Math.floor(this.depth / 2)) * this.spacing;
          const position = new THREE.Vector3(posX, posY, posZ);

          if (grid[y][z][x] === 0) {
            nodeMap.set(id, {
              id,
              position,
              floor: y + 1,
              neighbors: []
            });
          } else {
            obstacles.push({
              id: `obstacle_${x}_${y}_${z}`,
              nodeId: id,
              position,
              width: this.spacing,
              height: this.spacing,
              depth: this.spacing
            });
          }
        }
      }
    }

    const dirs = [
      { x: 1, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: -1, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: -1 }
    ];

    for (const [id, node] of nodeMap.entries()) {
      const [, xStr, yStr, zStr] = id.split('_');
      const x = parseInt(xStr, 10);
      const y = parseInt(yStr, 10);
      const z = parseInt(zStr, 10);

      node.neighbors = node.neighbors || [];

      for (const d of dirs) {
        const nx = x + d.x;
        const ny = y + d.y;
        const nz = z + d.z;
        const neighborId = `node_${nx}_${ny}_${nz}`;

        if (nodeMap.has(neighborId)) {
          const neighborNode = nodeMap.get(neighborId)!;
          
          const posA = node.position as THREE.Vector3;
          const posB = neighborNode.position as THREE.Vector3;
          const weight = posA.distanceTo(posB);

          const edge: Edge = {
            targetNode: neighborNode,
            weight: weight,
            isBlocked: false
          };

          node.neighbors.push(edge);
          allEdges.push(edge);
        }
      }
    }

    return {
      nodes: Array.from(nodeMap.values()),
      edges: allEdges,
      obstacles
    };
  }

  private carve(cx: number, cy: number, cz: number, grid: number[][][]): void {
    grid[cy][cz][cx] = 0;

    const dirs = [
      { x: 2, y: 0, z: 0 },
      { x: -2, y: 0, z: 0 },
      { x: 0, y: 2, z: 0 },
      { x: 0, y: -2, z: 0 },
      { x: 0, y: 0, z: 2 },
      { x: 0, y: 0, z: -2 }
    ].sort(() => Math.random() - 0.5);

    for (const d of dirs) {
      const nx = cx + d.x;
      const ny = cy + d.y;
      const nz = cz + d.z;

      if (this.isValid(nx, ny, nz) && grid[ny][nz][nx] === 1) {
        grid[cy + d.y / 2][cz + d.z / 2][cx + d.x / 2] = 0;
        this.carve(nx, ny, nz, grid);
      }
    }
  }

  private isValid(x: number, y: number, z: number): boolean {
    return (
      x > 0 &&
      x < this.width - 1 &&
      y > 0 &&
      y < this.height - 1 &&
      z > 0 &&
      z < this.depth - 1
    );
  }
}