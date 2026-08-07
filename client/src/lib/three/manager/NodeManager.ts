import * as THREE from 'three';
import type { Node } from '../types/index.ts';

export class NodeManager {
  private scene: THREE.Scene;
  private parentGroup: THREE.Object3D;
  private nodeMeshMap: Map<string, THREE.Mesh> = new Map();

  private nodeGeometry = new THREE.SphereGeometry(0.35, 16, 16);
  private defaultMaterial = new THREE.MeshStandardMaterial({ color: 0x6366f1, roughness: 0.3 }); // Indigo
  private startMaterial = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.2 });   // Green
  private targetMaterial = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.2 });  // Red
  private visitedMaterial = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 }); // Yellow/Open
  private currentMaterial = new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.2 }); // Purple/Current

  constructor(scene: THREE.Scene, parentGroup?: THREE.Group) {
    this.scene = scene;
    this.parentGroup = parentGroup || scene;
  }

  public clear() {
    this.nodeMeshMap.forEach((mesh) => {
      this.parentGroup.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => mat.dispose());
      } else {
        mesh.material.dispose();
      }
    });
    this.nodeMeshMap.clear();
  }

  public getMeshById(nodeId: string): THREE.Mesh | undefined {
    return this.nodeMeshMap.get(nodeId);
  }

  public setNodes(nodes: Node[], startNodeId?: string, targetNodeId?: string) {
    this.clear();

    nodes.forEach((node) => {
      let mat = this.defaultMaterial;
      if (node.id === startNodeId) mat = this.startMaterial;
      else if (node.id === targetNodeId) mat = this.targetMaterial;

      const mesh = new THREE.Mesh(this.nodeGeometry, mat);
      mesh.position.set(node.position.x, node.position.y, node.position.z);
      mesh.userData = { id: node.id };

      this.parentGroup.add(mesh);
      this.nodeMeshMap.set(node.id, mesh);
    });
  }

  public highlightNode(
    nodeId: string, 
    type: 'start' | 'target' | 'visited' | 'current' | 'default'
  ) {
    const mesh = this.nodeMeshMap.get(nodeId);
    if (!mesh) return;

    switch (type) {
      case 'start':
        mesh.material = this.startMaterial;
        break;
      case 'target':
        mesh.material = this.targetMaterial;
        break;
      case 'visited':
        mesh.material = this.visitedMaterial;
        break;
      case 'current':
        mesh.material = this.currentMaterial;
        break;
      default:
        mesh.material = this.defaultMaterial;
        break;
    }
  }

  public getAllMeshes(): THREE.Mesh[] {
    return Array.from(this.nodeMeshMap.values());
  }
}