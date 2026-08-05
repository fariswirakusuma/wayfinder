import * as THREE from 'three';
import { CameraManager } from './manager/CameraManager.js';
import type { Node as GraphNode, Obstacle } from './types';

export class SceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private cameraManager: CameraManager;
  private animFrameId: number | null = null;

  private nodesGroup: THREE.Group;
  private obstaclesGroup: THREE.Group;
  private pathGroup: THREE.Group;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1d); // Darker cyber background

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(20, 40, 20);
    this.scene.add(ambientLight, dirLight);

    this.cameraManager = new CameraManager(this.camera, this.renderer.domElement);

    this.nodesGroup = new THREE.Group();
    this.obstaclesGroup = new THREE.Group();
    this.pathGroup = new THREE.Group();
    this.scene.add(this.nodesGroup, this.obstaclesGroup, this.pathGroup);

    this.cameraManager.setTopView();
    window.addEventListener('resize', this.onResize);
    this.animate();
  }

  // Optimize dengan InstancedMesh untuk performa maksimal
  public renderGraph(nodes: GraphNode[], obstacles: Obstacle[]) {
  this.clearGroup(this.nodesGroup);
  this.clearGroup(this.obstaclesGroup);

  if (obstacles.length > 0) {
    // Gunakan unit box 1x1x1 sebagai dasar geometri
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    
    const obstacleInstanced = new THREE.InstancedMesh(boxGeo, boxMat, obstacles.length);
    const dummy = new THREE.Object3D();

    obstacles.forEach((obs, i) => {
      dummy.position.set(obs.position.x, obs.position.y, obs.position.z);
      // Skala Y menggunakan obs.height (tinggi dinding saja)
      dummy.scale.set(obs.width || 1, obs.height || 1, obs.depth || 1);
      dummy.updateMatrix();
      obstacleInstanced.setMatrixAt(i, dummy.matrix);
    });
    
    obstacleInstanced.instanceMatrix.needsUpdate = true;
    this.obstaclesGroup.add(obstacleInstanced);
  }

  // Render nodes (lorong jalan) hanya di permukaan tanah
  if (nodes.length > 0) {
    const nodeGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const nodeInstanced = new THREE.InstancedMesh(nodeGeo, nodeMat, nodes.length);
    const dummy = new THREE.Object3D();

    nodes.forEach((node, i) => {
      dummy.position.set(node.position.x, node.position.y, node.position.z);
      dummy.updateMatrix();
      nodeInstanced.setMatrixAt(i, dummy.matrix);
    });

    nodeInstanced.instanceMatrix.needsUpdate = true;
    this.nodesGroup.add(nodeInstanced);
  }
}


  public renderPath(path: GraphNode[]) {
    this.clearGroup(this.pathGroup);
    if (path.length < 2) return;

    const points = path.map((node) => new THREE.Vector3(node.position.x, node.position.y, node.position.z));
    
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 4 });
    const line = new THREE.Line(lineGeo, lineMat);
    this.pathGroup.add(line);

    const markerGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const startMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669 });
    const targetMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xd97706 });

    const startMesh = new THREE.Mesh(markerGeo, startMat);
    startMesh.position.copy(points[0]);

    const targetMesh = new THREE.Mesh(markerGeo, targetMat);
    targetMesh.position.copy(points[points.length - 1]);

    this.pathGroup.add(startMesh, targetMesh);
  }

  private clearGroup(group: THREE.Group) {
    while (group.children.length > 0) {
      const obj = group.children[0];
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh || obj instanceof THREE.Line) {
        if (obj.geometry) obj.geometry.dispose();
      }
      group.remove(obj);
    }
  }

  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);
    this.cameraManager.update();
    this.renderer.render(this.scene, this.camera);
  };

  private onResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.cameraManager.resize(width, height);
    this.renderer.setSize(width, height);
  };

  public destroy() {
    window.removeEventListener('resize', this.onResize);
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    this.clearGroup(this.nodesGroup);
    this.clearGroup(this.obstaclesGroup);
    this.clearGroup(this.pathGroup);
    this.cameraManager.destroy();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}