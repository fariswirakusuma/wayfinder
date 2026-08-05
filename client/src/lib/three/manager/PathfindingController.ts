// Managing active selection IDs
import { NodeManager } from './NodeManager';
import { CameraManager } from './CameraManager';

export class PathfindingController {
  public startNodeId: string | null = null;
  public targetNodeId: string | null = null;

  private nodeManager: NodeManager;
  private cameraManager: CameraManager;

  constructor(nodeManager: NodeManager, cameraManager: CameraManager) {
    this.nodeManager = nodeManager;
    this.cameraManager = cameraManager;
  }

  public setStartNode(nodeId: string) {
    if (this.startNodeId) {
      this.nodeManager.highlightNode(this.startNodeId, 'default');
    }
    this.startNodeId = nodeId;
    this.nodeManager.highlightNode(nodeId, 'start');

    const nodeMesh = this.nodeManager.getMeshById(nodeId);
    if (nodeMesh) {
      this.cameraManager.followNode(nodeMesh);
    }
  }

  public setTargetNode(nodeId: string) {
    if (this.targetNodeId) {
      this.nodeManager.highlightNode(this.targetNodeId, 'default');
    }

    this.targetNodeId = nodeId;
    this.nodeManager.highlightNode(nodeId, 'target');
  }
}