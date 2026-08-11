import * as THREE from 'three';
import { CameraManager } from './manager/CameraManager.js';
import { animateObstaclesSpawn } from './generator/MapDataResponse.js';
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
  private nodePlatformGroup: THREE.Group;
  private baseplateGroup: THREE.Group;
  private obstaclesGroup: THREE.Group;
  private colliderGroup: THREE.Group;
  private pathGroup: THREE.Group;
  private arrowsGroup: THREE.Group;
  public nodeManager: NodeManager;

  private startNodeLight: THREE.PointLight;
  private targetNodeLight: THREE.PointLight;
  private startNodeId?: string;
  private targetNodeId?: string;
  private visitedNodeIds: Set<string> = new Set();
  private nodeIndexMap: Map<string, number> = new Map();
  private nodeIdsOrdered: string[] = [];
  private lastNodeIds: string[] = [];
  private lastObstacleIds: string[] = [];

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
    this.nodePlatformGroup = new THREE.Group();
    this.baseplateGroup = new THREE.Group();
    this.colliderGroup = new THREE.Group();
    this.scene.add(this.nodesGroup, this.baseplateGroup, this.nodePlatformGroup, this.obstaclesGroup, this.colliderGroup, this.pathGroup, this.arrowsGroup);

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

    const currentNodeIds = nodes.map((node) => String(node.id));
    const currentObstacleIds = obstacles.map((obs) => String(obs.id ?? `${obs.position.x}-${obs.position.z}-${obs.position.y}`));
    const mapChanged =
      currentNodeIds.length !== this.lastNodeIds.length ||
      currentObstacleIds.length !== this.lastObstacleIds.length ||
      currentNodeIds.some((id, index) => id !== this.lastNodeIds[index]) ||
      currentObstacleIds.some((id, index) => id !== this.lastObstacleIds[index]);

    this.lastNodeIds = currentNodeIds;
    this.lastObstacleIds = currentObstacleIds;

    if (!mapChanged) {
      this.startNodeId = startNodeId;
      this.targetNodeId = targetNodeId;
      this.updateStartTargetHighlights();
      return;
    }

    this.visitedNodeIds.clear();
    this.nodeIndexMap.clear();
    this.nodeIdsOrdered = [];
    this.clearGroup(this.nodesGroup);
    this.clearGroup(this.baseplateGroup);
    this.clearGroup(this.nodePlatformGroup);
    this.clearGroup(this.obstaclesGroup);
    this.clearGroup(this.colliderGroup);
    this.clearGroup(this.arrowsGroup);
    const colliderMat = new THREE.MeshBasicMaterial({ visible: false });
    const nodeTileSize = 1.8;
    if (nodes.length > 0) {
      const positions = nodes.map((node) => node.position);
      const minX = Math.min(...positions.map((pos) => pos.x));
      const maxX = Math.max(...positions.map((pos) => pos.x));
      const minZ = Math.min(...positions.map((pos) => pos.z));
      const maxZ = Math.max(...positions.map((pos) => pos.z));
      const plateWidth = Math.max(2, maxX - minX + 2.0);
      const plateDepth = Math.max(2, maxZ - minZ + 2.0);
      const baseplateGeo = new THREE.BoxGeometry(plateWidth, 0.12, plateDepth);
      const baseplateMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.95, metalness: 0.05 });
      const baseplateMesh = new THREE.Mesh(baseplateGeo, baseplateMat);
      baseplateMesh.position.set((minX + maxX) / 2, -0.06, (minZ + maxZ) / 2);
      baseplateMesh.receiveShadow = true;
      this.baseplateGroup.add(baseplateMesh);

      const baseplateCollider = new THREE.Mesh(baseplateGeo, colliderMat);
      baseplateCollider.position.copy(baseplateMesh.position);
      baseplateCollider.updateMatrix();
      baseplateCollider.matrixAutoUpdate = false;
      this.colliderGroup.add(baseplateCollider);
    }

    if (obstacles.length > 0) {
      const boxGeo = new THREE.BoxGeometry(1, 1, 1);
      animateObstaclesSpawn(obstacles, this.obstaclesGroup);

      obstacles.forEach((obs) => {
        const obstacleCollider = new THREE.Mesh(boxGeo, colliderMat);
        obstacleCollider.position.set(obs.position.x, obs.position.y, obs.position.z);
        obstacleCollider.scale.set(obs.width || 1, obs.height || 1, obs.depth || 1);
        obstacleCollider.updateMatrix();
        obstacleCollider.matrixAutoUpdate = false;
        this.colliderGroup.add(obstacleCollider);
      });
    }

    if (nodes.length > 0) {
      const nodeGeo = new THREE.BoxGeometry(nodeTileSize, 0.12, nodeTileSize);
      const nodeMat = new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.1, vertexColors: true });
      const nodeInstanced = new THREE.InstancedMesh(nodeGeo, nodeMat, nodes.length);
      const dummy = new THREE.Object3D();
      this.nodeIndexMap.clear();

      const defaultColor = new THREE.Color(0x60a5fa);
      const startColor = new THREE.Color(0x22c55e);
      const targetColor = new THREE.Color(0xef4444);
      const openColor = new THREE.Color(0xfacc15);
      const closedColor = new THREE.Color(0x64748b);

      this.nodeIdsOrdered = nodes.map((node) => String(node.id));
      nodes.forEach((node, i) => {
        this.nodeIndexMap.set(String(node.id), i);
        dummy.position.set(node.position.x, node.position.y + 0.06, node.position.z);
        dummy.scale.set(1.0, 1.0, 1.0);

        if (node.id === startNodeId) {
          nodeInstanced.setColorAt(i, startColor);
          dummy.scale.set(1.1, 1.0, 1.1);
          this.startNodeLight.position.set(node.position.x, node.position.y + 0.5, node.position.z);
        } else if (node.id === targetNodeId) {
          nodeInstanced.setColorAt(i, targetColor);
          dummy.scale.set(1.1, 1.0, 1.1);
          this.targetNodeLight.position.set(node.position.x, node.position.y + 0.5, node.position.z);
        } else {
          nodeInstanced.setColorAt(i, defaultColor);
        }

        dummy.updateMatrix();
        nodeInstanced.setMatrixAt(i, dummy.matrix);

        const nodeCollider = new THREE.Mesh(nodeGeo, colliderMat);
        nodeCollider.position.copy(dummy.position);
        nodeCollider.scale.copy(dummy.scale);
        nodeCollider.updateMatrix();
        nodeCollider.matrixAutoUpdate = false;
        this.colliderGroup.add(nodeCollider);
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
      fromPos.y += 0.22;
      const color = usedEdges.has(edgeId)
        ? 0xfbbf24
        : processedNodes.has(arrow.fromNodeId)
          ? 0xf97316
          : 0x60a5fa;
      const arrowHelper = new THREE.ArrowHelper(
        direction,
        fromPos,
        length,
        color,
        Math.min(0.45, length * 0.45),
        Math.min(0.28, length * 0.3)
      );
      arrowHelper.renderOrder = 999;
      arrowHelper.line.material = new THREE.LineBasicMaterial({ color, depthTest: false, depthWrite: false });
      if (arrowHelper.cone.material) {
        (arrowHelper.cone.material as THREE.Material).dispose();
      }
      arrowHelper.cone.material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, depthTest: false, depthWrite: false });
      this.arrowsGroup.add(arrowHelper);
    });
  }

  public renderStepNodes(stepState: PathfindingStepState, nodesMap: Map<string, GraphNode>) {
    if (this.nodesGroup.children.length === 0) return;

    let nodeInstanced = this.nodesGroup.children[0] as THREE.InstancedMesh | undefined;
    if (!nodeInstanced && this.nodePlatformGroup.children.length > 0) {
      nodeInstanced = this.nodePlatformGroup.children[0] as THREE.InstancedMesh;
    }
    if (!nodeInstanced || !nodeInstanced.instanceColor) return;

    const defaultColor = new THREE.Color(0x60a5fa);  // Brighter cyan
    const openColor = new THREE.Color(0xfacc15);     // Yellow
    const closedColor = new THREE.Color(0x64748b);   // Slate Gray
    const currentColor = new THREE.Color(0xa855f7);  // Purple
    const pathColor = new THREE.Color(0x22c55e);    // Final path green
    const startColor = new THREE.Color(0x16a34a);   // Strong green
    const targetColor = new THREE.Color(0xef4444);  // Red

    const openListIds = new Set(stepState.openList?.map((n) => String(n.id)) || []);
    const closedListIds = stepState.closedList || new Set<string>();
    const pathIds = new Set(stepState.pathFound?.map((n) => String(n.id)) || []);

    closedListIds.forEach((id) => this.visitedNodeIds.add(id));
    openListIds.forEach((id) => this.visitedNodeIds.add(id));
    if (stepState.currentNode) {
      this.visitedNodeIds.add(String(stepState.currentNode.id));
    }

    const orderedIds = this.nodeIdsOrdered.length > 0 ? this.nodeIdsOrdered : Array.from(nodesMap.keys());

    orderedIds.forEach((nodeId) => {
      const index = this.nodeIndexMap.get(nodeId);
      if (index === undefined) return;

      let color = defaultColor;

      if (nodeId === this.startNodeId) {
        color = startColor;
      } else if (nodeId === this.targetNodeId) {
        color = targetColor;
      } else if (pathIds.has(nodeId)) {
        color = pathColor;
      } else if (stepState.currentNode && nodeId === String(stepState.currentNode.id)) {
        color = currentColor;
      } else if (openListIds.has(nodeId)) {
        color = openColor;
      } else if (closedListIds.has(nodeId) || this.visitedNodeIds.has(nodeId)) {
        color = closedColor;
      }

      nodeInstanced.setColorAt(index, color);
    });

    nodeInstanced.instanceColor.needsUpdate = true;
  }

  public renderPath(path: GraphNode[]) {
    this.clearGroup(this.pathGroup);
    if (path.length < 2) return;

    const points = path.map((node) => new THREE.Vector3(node.position.x, node.position.y, node.position.z));
    const pathIds = new Set(path.map((node) => String(node.id)));
    this.colorNodesForPath(pathIds);

    const elevatedPoints = points.map((point) => point.clone().setY(point.y + 0.22));
    const lineGeo = new THREE.BufferGeometry().setFromPoints(elevatedPoints);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffcc00, linewidth: 4, depthTest: false, depthWrite: false });
    const line = new THREE.Line(lineGeo, lineMat);
    line.renderOrder = 999;
    this.pathGroup.add(line);

    const markerGeo = new THREE.SphereGeometry(0.28, 16, 16);
    const startMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.9, depthTest: false, depthWrite: false });
    const targetMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.9, depthTest: false, depthWrite: false });

    const startMesh = new THREE.Mesh(markerGeo, startMat);
    startMesh.position.copy(points[0]).setY(points[0].y + 0.26);
    startMesh.renderOrder = 999;
    const targetMesh = new THREE.Mesh(markerGeo, targetMat);
    targetMesh.position.copy(points[points.length - 1]).setY(points[points.length - 1].y + 0.26);
    targetMesh.renderOrder = 999;

    this.pathGroup.add(startMesh, targetMesh);
  }

  public clearPath() {
    this.clearGroup(this.pathGroup);
  }

  private colorNodesForPath(pathIds: Set<string>) {
    if (this.nodesGroup.children.length === 0) return;

    let nodeInstanced = this.nodesGroup.children[0] as THREE.InstancedMesh | undefined;
    if (!nodeInstanced && this.nodePlatformGroup.children.length > 0) {
      nodeInstanced = this.nodePlatformGroup.children[0] as THREE.InstancedMesh;
    }
    if (!nodeInstanced || !nodeInstanced.instanceColor) return;

    const pathColor = new THREE.Color(0x22c55e);
    const defaultColor = new THREE.Color(0x60a5fa);

    const count = nodeInstanced.count;
    for (let i = 0; i < count; i++) {
      nodeInstanced.setColorAt(i, defaultColor);
    }

    for (const pathNodeId of pathIds) {
      const index = this.nodeIndexMap.get(pathNodeId);
      if (index !== undefined) {
        nodeInstanced.setColorAt(index, pathColor);
      }
    }

    if (this.startNodeId) {
      const startIndex = this.nodeIndexMap.get(this.startNodeId);
      if (startIndex !== undefined) {
        nodeInstanced.setColorAt(startIndex, new THREE.Color(0x22c55e));
      }
    }
    if (this.targetNodeId) {
      const targetIndex = this.nodeIndexMap.get(this.targetNodeId);
      if (targetIndex !== undefined) {
        nodeInstanced.setColorAt(targetIndex, new THREE.Color(0xef4444));
      }
    }

    nodeInstanced.instanceColor.needsUpdate = true;
  }

  public setCameraMode(mode: 'orbit' | 'first-person', focusNode?: GraphNode) {
    if (mode === 'orbit' || !focusNode) {
      this.cameraManager.setOrbitView();
      return;
    }

    const startPosition = new THREE.Vector3(focusNode.position.x, focusNode.position.y, focusNode.position.z);
    const colliders = Array.from(this.colliderGroup.children);
    this.cameraManager.setFirstPersonView(startPosition, colliders);
  }

  private updateStartTargetHighlights() {
    if (this.nodesGroup.children.length === 0) return;

    let nodeInstanced = this.nodesGroup.children[0] as THREE.InstancedMesh | undefined;
    if (!nodeInstanced && this.nodePlatformGroup.children.length > 0) {
      nodeInstanced = this.nodePlatformGroup.children[0] as THREE.InstancedMesh;
    }
    if (!nodeInstanced || !nodeInstanced.instanceColor) return;

    const defaultColor = new THREE.Color(0x60a5fa);
    const startColor = new THREE.Color(0x22c55e);
    const targetColor = new THREE.Color(0xef4444);

    const count = nodeInstanced.count;
    for (let i = 0; i < count; i++) {
      nodeInstanced.setColorAt(i, defaultColor);
    }

    if (this.startNodeId) {
      const startIndex = this.nodeIndexMap.get(this.startNodeId);
      if (startIndex !== undefined) {
        nodeInstanced.setColorAt(startIndex, startColor);
      }
    }
    if (this.targetNodeId) {
      const targetIndex = this.nodeIndexMap.get(this.targetNodeId);
      if (targetIndex !== undefined) {
        nodeInstanced.setColorAt(targetIndex, targetColor);
      }
    }

    nodeInstanced.instanceColor.needsUpdate = true;
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
    this.clearGroup(this.nodePlatformGroup);
    this.clearGroup(this.obstaclesGroup);
    this.clearGroup(this.colliderGroup);
    this.clearGroup(this.pathGroup);
    this.clearGroup(this.arrowsGroup);
    this.cameraManager.destroy();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
