import * as THREE from 'three';
import { CameraManager } from './manager/CameraManager.js';
import type { Node as GraphNode, Obstacle } from './types';
import type { PathfindingStepState } from './manager/PathfindingController';
import { NodeManager } from './manager/NodeManager.js';
import type { SearchArrow } from '$lib/services/pathfindingApi';

export class SceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  public cameraManager: CameraManager;
  private animFrameId: number | null = null;

  private nodesGroup: THREE.Group;
  private obstaclesGroup: THREE.Group;
  private pathGroup: THREE.Group;
  private arrowsGroup: THREE.Group;
  public nodeManager: NodeManager;

  private startNodeLight: THREE.PointLight;
  private targetNodeLight: THREE.PointLight;
  private startNodeId?: string;
  private targetNodeId?: string;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1d);
    this.nodeManager = new NodeManager(this.scene);


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

    this.startNodeLight = new THREE.PointLight(0x22c55e, 2.0, 10);
    this.targetNodeLight = new THREE.PointLight(0xef4444, 2.0, 10);
    this.scene.add(ambientLight, dirLight, this.startNodeLight, this.targetNodeLight);

    this.cameraManager = new CameraManager(this.camera, this.renderer.domElement);

    this.nodesGroup = new THREE.Group();
    this.obstaclesGroup = new THREE.Group();
    this.pathGroup = new THREE.Group();
    this.arrowsGroup = new THREE.Group();
    this.scene.add(this.nodesGroup, this.obstaclesGroup, this.pathGroup, this.arrowsGroup);

    this.cameraManager.setTopView();
    window.addEventListener('resize', this.onResize);
    this.animate();
  }

  public renderGraph(
    nodes: GraphNode[],
    obstacles: Obstacle[],
    startNodeId?: string,
    targetNodeId?: string
  ) {
    this.startNodeId = startNodeId;
    this.targetNodeId = targetNodeId;
    this.clearGroup(this.nodesGroup);
    this.clearGroup(this.obstaclesGroup);
    this.clearGroup(this.arrowsGroup);
    if (obstacles.length > 0) {
      const boxGeo = new THREE.BoxGeometry(1, 1, 1);
      const boxMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
      
      const obstacleInstanced = new THREE.InstancedMesh(boxGeo, boxMat, obstacles.length);
      const dummy = new THREE.Object3D();

      obstacles.forEach((obs, i) => {
        dummy.position.set(obs.position.x, obs.position.y, obs.position.z);
        dummy.scale.set(obs.width || 1, obs.height || 1, obs.depth || 1);
        dummy.updateMatrix();
        obstacleInstanced.setMatrixAt(i, dummy.matrix);
      });
      
      obstacleInstanced.instanceMatrix.needsUpdate = true;
      this.obstaclesGroup.add(obstacleInstanced);
    }
    if (nodes.length > 0) {
      const nodeGeo = new THREE.SphereGeometry(0.15, 16, 16);
      const nodeMat = new THREE.MeshStandardMaterial({ roughness: 0.2 });
      const nodeInstanced = new THREE.InstancedMesh(nodeGeo, nodeMat, nodes.length);
      const dummy = new THREE.Object3D();

      const defaultColor = new THREE.Color(0x38bdf8);
      const startColor = new THREE.Color(0x22c55e);
      const targetColor = new THREE.Color(0xef4444);

      nodes.forEach((node, i) => {
        dummy.position.set(node.position.x, node.position.y, node.position.z);

        if (node.id === startNodeId) {
          nodeInstanced.setColorAt(i, startColor);
          dummy.scale.set(1.8, 1.8, 1.8);
          this.startNodeLight.position.set(node.position.x, node.position.y + 0.5, node.position.z);
        } else if (node.id === targetNodeId) {
          nodeInstanced.setColorAt(i, targetColor);
          dummy.scale.set(1.8, 1.8, 1.8);
          this.targetNodeLight.position.set(node.position.x, node.position.y + 0.5, node.position.z);
        } else {
          nodeInstanced.setColorAt(i, defaultColor);
          dummy.scale.set(1.0, 1.0, 1.0);
        }

        dummy.updateMatrix();
        nodeInstanced.setMatrixAt(i, dummy.matrix);
      });

      nodeInstanced.instanceMatrix.needsUpdate = true;
      if (nodeInstanced.instanceColor) {
        nodeInstanced.instanceColor.needsUpdate = true;
      }
      this.nodesGroup.add(nodeInstanced);
    }
  }
  public renderStepArrows(
    arrows: SearchArrow[],
    stepState: PathfindingStepState,
    nodesMap: Map<string, GraphNode>
  ) {
    this.clearGroup(this.arrowsGroup);

    const usedEdges = new Set<string>();
    stepState.parentMap.forEach((parentId, childId) => usedEdges.add(`${parentId}:${childId}`));
    const processedNodes = new Set(stepState.closedList ? [...stepState.closedList].map(String) : []);
    if (stepState.currentNode) processedNodes.add(String(stepState.currentNode.id));

    arrows.forEach((arrow) => {
      const edgeId = `${arrow.fromNodeId}:${arrow.toNodeId}`;
      const parentNode = nodesMap.get(arrow.fromNodeId);
      const childNode = nodesMap.get(arrow.toNodeId);

      const fromPos = arrow
        ? new THREE.Vector3(arrow.position.x, arrow.position.y, arrow.position.z)
        : parentNode && new THREE.Vector3(parentNode.position.x, parentNode.position.y, parentNode.position.z);
      const direction = arrow
        ? new THREE.Vector3(arrow.direction.x, arrow.direction.y, arrow.direction.z)
        : parentNode && childNode && new THREE.Vector3().subVectors(childNode.position, parentNode.position);

      if (!fromPos || !direction || direction.lengthSq() === 0) return;

      const length = direction.length();
      direction.normalize();
      fromPos.y += 0.08;
      const color = usedEdges.has(edgeId)
        ? 0xf59e0b
        : processedNodes.has(arrow.fromNodeId)
          ? 0xef4444
          : 0x334155;
      const arrowHelper = new THREE.ArrowHelper(
        direction,
        fromPos,
        length,
        color,
        Math.min(0.3, length * 0.4),
        Math.min(0.2, length * 0.3)
      );
      this.arrowsGroup.add(arrowHelper);
    });
  }

  public renderStepNodes(stepState: PathfindingStepState, nodesMap: Map<string, GraphNode>) {
    if (this.nodesGroup.children.length === 0) return;

    const nodeInstanced = this.nodesGroup.children[0] as THREE.InstancedMesh;
    if (!nodeInstanced || !nodeInstanced.instanceColor) return;

    const defaultColor = new THREE.Color(0x38bdf8);  // Cyan/Sky
    const openColor = new THREE.Color(0xfacc15);     // Yellow
    const closedColor = new THREE.Color(0x64748b);   // Slate Gray
    const currentColor = new THREE.Color(0xa855f7);  // Purple
    const startColor = new THREE.Color(0x22c55e);   // Green
    const targetColor = new THREE.Color(0xef4444);  // Red

    const openListIds = new Set(stepState.openList?.map((n) => String(n.id)) || []);
    const closedListIds = stepState.closedList || new Set<string>();

    let index = 0;
    nodesMap.forEach((node) => {
      let color = defaultColor;

      const nodeId = String(node.id);
      if (nodeId === this.startNodeId) {
        color = startColor;
      } else if (nodeId === this.targetNodeId) {
        color = targetColor;
      } else if (nodeId === String(stepState.currentNode.id)) {
        color = currentColor;
      } else if (closedListIds.has(nodeId)) {
        color = closedColor;
      } else if (openListIds.has(nodeId)) {
        color = openColor;
      }

      nodeInstanced.setColorAt(index, color);
      index++;
    });

    nodeInstanced.instanceColor.needsUpdate = true;
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

  public clearPath() {
    this.clearGroup(this.pathGroup);
  }

  public setCameraMode(mode: 'orbit' | 'first-person', focusNode?: GraphNode) {
    if (mode === 'orbit' || !focusNode) {
      this.cameraManager.setOrbitView();
      return;
    }

    const nodeObject = new THREE.Object3D();
    nodeObject.position.set(focusNode.position.x, focusNode.position.y, focusNode.position.z);
    this.cameraManager.firstPersonView(nodeObject);
  }

  public resetCamera() {
    this.cameraManager.setTopView();
  }

  public async animatePath(path: GraphNode[], delayMs: number) {
    this.clearPath();
    for (let length = 2; length <= path.length; length++) {
      this.renderPath(path.slice(0, length));
      await new Promise((resolve) => setTimeout(resolve, Math.max(50, delayMs)));
    }
  }

  private clearGroup(group: THREE.Group) {
    while (group.children.length > 0) {
      const obj = group.children[0];
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh || obj instanceof THREE.Line || obj instanceof THREE.ArrowHelper) {
        if (obj instanceof THREE.ArrowHelper) {
          if (obj.line.geometry) obj.line.geometry.dispose();
          if (obj.cone.geometry) obj.cone.geometry.dispose();
          if (obj.line.material) (obj.line.material as THREE.Material).dispose();
          if (obj.cone.material) (obj.cone.material as THREE.Material).dispose();
        } else {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((mat) => mat.dispose());
            } else {
              obj.material.dispose();
            }
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
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    this.clearGroup(this.nodesGroup);
    this.clearGroup(this.obstaclesGroup);
    this.clearGroup(this.pathGroup);
    this.clearGroup(this.arrowsGroup);
    this.cameraManager.destroy();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
