
import type { Node } from '../types/Node';
import type { Point3D } from './Point3D';
import * as THREE from 'three';

export interface Obstacle {
  id: string;
  nodeId: string;
  position: Point3D | THREE.Vector3;
  width: number;
  height: number;
  depth: number;
}