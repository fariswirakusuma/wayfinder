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
    this.scene.background = new THREE.Color(0x0f172a);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
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
  public renderGraph(nodes: GraphNode[], obstacles: Obstacle[]) {
    this.clearGroup(this.nodesGroup);
    this.clearGroup(this.obstaclesGroup);

    const nodeGeo = new THREE.SphereGeometry(0.2, 12, 12);
    const nodeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });

    nodes.forEach((node) => {
      const mesh = new THREE.Mesh(nodeGeo, nodeMat);
      const pos = node.position;
      mesh.position.set(pos.x, pos.y, pos.z);
      this.nodesGroup.add(mesh);
    });

    const obstacleMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.6
    });

    obstacles.forEach((obs) => {
      const geo = new THREE.BoxGeometry(obs.width, obs.height, obs.depth);
      const mesh = new THREE.Mesh(geo, obstacleMat);
      const pos = obs.position;
      mesh.position.set(pos.x, pos.y, pos.z);
      this.obstaclesGroup.add(mesh);
    });
  }

  public renderPath(path: GraphNode[]) {
    this.clearGroup(this.pathGroup);

    if (path.length < 2) return;

    const points = path.map((node) => new THREE.Vector3(node.position.x, node.position.y, node.position.z));
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 3 });

    const line = new THREE.Line(lineGeo, lineMat);
    this.pathGroup.add(line);

    const startGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const startMat = new THREE.MeshStandardMaterial({ color: 0x10b981 });
    const startMesh = new THREE.Mesh(startGeo, startMat);
    startMesh.position.copy(points[0]);

    const targetGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const targetMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
    const targetMesh = new THREE.Mesh(targetGeo, targetMat);
    targetMesh.position.copy(points[points.length - 1]);

    this.pathGroup.add(startMesh, targetMesh);
    this.cameraManager.followNode(startMesh);
  }

  private clearGroup(group: THREE.Group) {
    while (group.children.length > 0) {
      const obj = group.children[0];
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
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

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }

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