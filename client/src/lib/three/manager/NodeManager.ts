import * as THREE from 'three';
import type { Node } from '../types/Node';


export class NodeManager {
  private scene: THREE.Scene;
  private nodeMeshMap: Map<string, THREE.Mesh> = new Map();

  private nodeGeometry = new THREE.SphereGeometry(0.4, 16, 16);
  private defaultMaterial = new THREE.MeshStandardMaterial({ color: 0x6366f1 }); // Indigo
  private startMaterial = new THREE.MeshStandardMaterial({ color: 0x10b981 });   // Emerald Green
  private targetMaterial = new THREE.MeshStandardMaterial({ color: 0xef4444 });  // Red

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public clear() {
    this.nodeMeshMap.forEach((mesh) => {
      this.scene.remove(mesh);
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
  public setNodes(nodes: Node[]) {
    this.clear(); 

    nodes.forEach((node) => {
      const mesh = new THREE.Mesh(this.nodeGeometry, this.defaultMaterial);
      mesh.position.set(node.position.x, node.position.y, node.position.z);
      mesh.userData = { id: node.id };

      this.scene.add(mesh);
      this.nodeMeshMap.set(node.id, mesh);
    });
  }

  public highlightNode(nodeId: string, type: 'start' | 'target' | 'default') {
    const mesh = this.nodeMeshMap.get(nodeId);
    if (!mesh) return;

    if (type === 'start') mesh.material = this.startMaterial;
    else if (type === 'target') mesh.material = this.targetMaterial;
    else mesh.material = this.defaultMaterial;
  }
  

}