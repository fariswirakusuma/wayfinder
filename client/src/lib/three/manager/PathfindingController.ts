import { NodeManager } from './NodeManager';
import { CameraManager } from './CameraManager';
import type { Node, Point3D,QLearningOptions } from '../types';

export interface PathfindingStepState {
  currentNode: Node;
  openList?: Node[];
  closedList?: Set<string>;
  distances?: Map<string, number>;
  parentMap: Map<string, string>; 
  pathFound?: Node[];
}

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
  private getDistance(a: Point3D, b: Point3D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  public async *solveAStarStepByStep(
    startNode: Node,
    targetNode: Node,
    nodesMap: Map<string, Node>,
    graphMap: Record<string, string[]>
  ): AsyncGenerator<PathfindingStepState> {
    const openList: Node[] = [startNode];
    const closedList = new Set<string>();
    const parentMap = new Map<string, string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    gScore.set(startNode.id, 0);
    fScore.set(startNode.id, this.heuristic(startNode, targetNode));

    while (openList.length > 0) {
      openList.sort((a, b) => (fScore.get(a.id) ?? Infinity) - (fScore.get(b.id) ?? Infinity));
      const current = openList.shift()!;

      if (current.id === targetNode.id) {
        const path = this.reconstructPath(parentMap, current, nodesMap);
        yield { currentNode: current, openList, closedList, parentMap, pathFound: path };
        return;
      }

      closedList.add(current.id);

      const neighborIds = graphMap[current.id] || [];
      for (const neighborId of neighborIds) {
        const neighbor = nodesMap.get(neighborId);
        if (!neighbor || closedList.has(neighbor.id)) continue;

        const tentativeG = (gScore.get(current.id) ?? Infinity) + this.getDistance(current.position, neighbor.position);

        if (tentativeG < (gScore.get(neighbor.id) ?? Infinity)) {
          parentMap.set(neighbor.id, current.id);
          gScore.set(neighbor.id, tentativeG);
          fScore.set(neighbor.id, tentativeG + this.heuristic(neighbor, targetNode));

          if (!openList.some((n) => n.id === neighbor.id)) {
            openList.push(neighbor);
          }
        }
      }

      yield { currentNode: current, openList, closedList, parentMap };
    }
  }
  public async *solveDijkstraStepByStep(
    startNode: Node,
    targetNode: Node,
    nodesMap: Map<string, Node>,
    graphMap: Record<string, string[]>
  ): AsyncGenerator<PathfindingStepState> {
    const distances = new Map<string, number>();
    const parentMap = new Map<string, string>();
    const unvisited = new Set<string>();

    nodesMap.forEach((_, id) => {
      distances.set(id, Infinity);
      unvisited.add(id);
    });

    distances.set(startNode.id, 0);

    while (unvisited.size > 0) {
      let currentId: string | null = null;
      let minDistance = Infinity;

      for (const id of unvisited) {
        const dist = distances.get(id) ?? Infinity;
        if (dist < minDistance) {
          minDistance = dist;
          currentId = id;
        }
      }

      if (!currentId || minDistance === Infinity) break;

      const current = nodesMap.get(currentId)!;
      unvisited.delete(currentId);

      if (current.id === targetNode.id) {
        const path = this.reconstructPath(parentMap, current, nodesMap);
        yield { currentNode: current, distances, parentMap, pathFound: path };
        return;
      }

      const neighborIds = graphMap[current.id] || [];
      for (const neighborId of neighborIds) {
        if (!unvisited.has(neighborId)) continue;

        const neighbor = nodesMap.get(neighborId);
        if (!neighbor) continue;

        const alt = minDistance + this.getDistance(current.position, neighbor.position);
        if (alt < (distances.get(neighborId) ?? Infinity)) {
          distances.set(neighborId, alt);
          parentMap.set(neighborId, current.id);
        }
      }

      yield { currentNode: current, distances, parentMap };
    }
  }
  public async *solveBellmanFordStepByStep(
    startNode: Node,
    targetNode: Node,
    nodesMap: Map<string, Node>,
    graphMap: Record<string, string[]>
  ): AsyncGenerator<PathfindingStepState> {
    const distances = new Map<string, number>();
    const parentMap = new Map<string, string>();

    nodesMap.forEach((_, id) => distances.set(id, Infinity));
    distances.set(startNode.id, 0);

    const totalNodes = nodesMap.size;

    for (let i = 0; i < totalNodes - 1; i++) {
      let updatedInThisIteration = false;

      for (const [uId, neighborIds] of Object.entries(graphMap)) {
        const uNode = nodesMap.get(uId);
        const distU = distances.get(uId) ?? Infinity;

        if (!uNode || distU === Infinity) continue;

        for (const vId of neighborIds) {
          const vNode = nodesMap.get(vId);
          if (!vNode) continue;

          const weight = this.getDistance(uNode.position, vNode.position);
          if (distU + weight < (distances.get(vId) ?? Infinity)) {
            distances.set(vId, distU + weight);
            parentMap.set(vId, uId);
            updatedInThisIteration = true;

            yield { currentNode: vNode, distances, parentMap };
          }
        }
      }

      if (!updatedInThisIteration) break;
    }

    const target = nodesMap.get(targetNode.id);
    if (target && distances.get(targetNode.id) !== Infinity) {
      const path = this.reconstructPath(parentMap, target, nodesMap);
      yield { currentNode: target, distances, parentMap, pathFound: path };
    }
  }
  public async *solveQLearningStepByStep(
    startNode: Node,
    targetNode: Node,
    nodesMap: Map<string, Node>,
    graphMap: Record<string, string[]>,
    options?: QLearningOptions
  ): AsyncGenerator<PathfindingStepState> {
    const episodes = options?.episodes ?? 300;
    const maxSteps = options?.maxStepsPerEpisode ?? 100;
    const alpha = options?.learningRate ?? 0.1;
    const gamma = options?.discountFactor ?? 0.9;
    const epsilon = options?.epsilon ?? 0.2;

    const qTable = new Map<string, number>();
    const parentMap = new Map<string, string>();
    const distances = new Map<string, number>();

    const getQKey = (uId: string, vId: string) => `${uId}_${vId}`;

    const getQ = (uId: string, vId: string): number => {
      return qTable.get(getQKey(uId, vId)) ?? 0;
    };

    const getMaxQ = (uId: string): number => {
      const neighbors = graphMap[uId] ?? [];
      if (neighbors.length === 0) return 0;
      return Math.max(...neighbors.map(vId => getQ(uId, vId)));
    };

    nodesMap.forEach((_, id) => distances.set(id, Infinity));
    distances.set(startNode.id, 0);

    for (let ep = 0; ep < episodes; ep++) {
      let currId = startNode.id;

      for (let step = 0; step < maxSteps; step++) {
        if (currId === targetNode.id) break;

        const currNode = nodesMap.get(currId);
        const neighbors = graphMap[currId] ?? [];
        if (!currNode || neighbors.length === 0) break;

        let chosenNextId: string;
        if (Math.random() < epsilon) {
          chosenNextId = neighbors[Math.floor(Math.random() * neighbors.length)];
        } else {
          let maxVal = -Infinity;
          let bestCandidates: string[] = [];

          for (const nextId of neighbors) {
            const qVal = getQ(currId, nextId);
            if (qVal > maxVal) {
              maxVal = qVal;
              bestCandidates = [nextId];
            } else if (qVal === maxVal) {
              bestCandidates.push(nextId);
            }
          }
          chosenNextId = bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
        }

        const nextNode = nodesMap.get(chosenNextId);
        if (!nextNode) break;

        const weight = this.getDistance(currNode.position, nextNode.position);
        
        // Reward function logic
        let reward = -weight;
        if (chosenNextId === targetNode.id) {
          reward = 100;
        }

        const oldQ = getQ(currId, chosenNextId);
        const maxNextQ = chosenNextId === targetNode.id ? 0 : getMaxQ(chosenNextId);
        const newQ = oldQ + alpha * (reward + gamma * maxNextQ - oldQ);

        qTable.set(getQKey(currId, chosenNextId), newQ);
        if (newQ > 0 || !parentMap.has(chosenNextId)) {
          parentMap.set(chosenNextId, currId);
          distances.set(chosenNextId, (distances.get(currId) ?? 0) + weight);
        }

        currId = chosenNextId;

        // Yield state per beberapa langkah/episode agar rendering tetap optimal
        if (step % 5 === 0 || currId === targetNode.id) {
          yield {
            currentNode: nextNode,
            distances,
            parentMap
          };
        }
      }
    }

    const path: Node[] = [startNode];
    let currExtracted = startNode.id;
    const visitedInExtraction = new Set<string>([startNode.id]);
    let maxExtractSteps = nodesMap.size;

    while (currExtracted !== targetNode.id && maxExtractSteps-- > 0) {
      const neighbors = graphMap[currExtracted] ?? [];
      let bestNext: string | null = null;
      let maxQVal = -Infinity;

      for (const nextId of neighbors) {
        if (visitedInExtraction.has(nextId)) continue;
        const qVal = getQ(currExtracted, nextId);
        if (qVal > maxQVal) {
          maxQVal = qVal;
          bestNext = nextId;
        }
      }

      if (!bestNext) break;

      const nextNode = nodesMap.get(bestNext);
      if (nextNode) {
        path.push(nextNode);
        visitedInExtraction.add(bestNext);
        currExtracted = bestNext;
      }
    }

    const target = nodesMap.get(targetNode.id);
    if (target && currExtracted === targetNode.id) {
      yield {
        currentNode: target,
        distances,
        parentMap,
        pathFound: path
      };
    }
  }

  private heuristic(a: Node, b: Node): number {
    return this.getDistance(a.position, b.position);
  }

  private reconstructPath(parentMap: Map<string, string>, current: Node, nodesMap: Map<string, Node>): Node[] {
    const path: Node[] = [current];
    let currId = current.id;
    while (parentMap.has(currId)) {
      currId = parentMap.get(currId)!;
      const parentNode = nodesMap.get(currId);
      if (parentNode) path.unshift(parentNode);
    }
    return path;
  }
}