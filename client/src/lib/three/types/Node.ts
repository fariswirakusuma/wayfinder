
import * as THREE from 'three';
import * as Edge from './Edge';
import type { Point3D } from './Point3D';

export interface Node {
  id: string;
  position: THREE.Vector3|Point3D;
  neighbors?: Edge.Edge[];
  parent?: Node;
  floor?: number;
  name?: string;
  
}