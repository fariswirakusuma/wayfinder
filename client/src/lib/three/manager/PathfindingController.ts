import { NodeManager } from './NodeManager';
import { CameraManager } from './CameraManager';
import type { Node, Point3D, QLearningOptions, SimulatedAnnealingOptions } from '../types';

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

  public async *solveSimulatedAnnealingStepByStep(
    startNode: Node,
    targetNode: Node,
    nodesMap: Map<string, Node>,
    graphMap: Record<string, string[]>,
    options?: SimulatedAnnealingOptions
  ): AsyncGenerator<PathfindingStepState> {
    const numWaypoints = options?.numWaypoints ?? 5;
    const initialTemperature = options?.initialTemperature ?? 1000;
    const coolingRate = options?.coolingRate ?? 0.95;
    const minTemperature = options?.minTemperature ?? 0.01;
    const maxIterations = Math.max(1, Math.ceil(Math.log(minTemperature / initialTemperature) / Math.log(coolingRate)));

    const visitedSet = new Set<string>([startNode.id]);
    let currentPath = this.buildInitialPath(startNode, targetNode, nodesMap, graphMap);
    let currentCost = this.calculatePathCost(currentPath, nodesMap);
    let bestPath = [...currentPath];
    let bestCost = currentCost;
    let temperature = initialTemperature;

    const createParentMap = (path: Node[]) => {
      const map = new Map<string, string>();
      for (let i = 1; i < path.length; i++) {
        map.set(path[i].id, path[i - 1].id);
      }
      return map;
    };

    let parentMap = createParentMap(currentPath);

    for (let iteration = 0; iteration < maxIterations && temperature > minTemperature; iteration++) {
      const currentNode = currentPath[currentPath.length - 1];
      yield {
        currentNode,
        openList: [...currentPath],
        closedList: new Set(visitedSet),
        parentMap: new Map(parentMap)
      };

      const mutationPoint = Math.max(1, Math.min(currentPath.length - 2, Math.floor(Math.random() * (currentPath.length - 1))));
      const prefix = currentPath.slice(0, mutationPoint + 1);
      const prefixEnd = prefix[prefix.length - 1];
      const neighbors = graphMap[prefixEnd.id] ?? [];
      const candidateNeighbors = neighbors.filter((neighborId) => !prefix.some((node) => node.id === neighborId));

      if (candidateNeighbors.length === 0) {
        temperature *= coolingRate;
        continue;
      }

      const nextId = candidateNeighbors[Math.floor(Math.random() * candidateNeighbors.length)];
      const nextNode = nodesMap.get(nextId);
      if (!nextNode) {
        temperature *= coolingRate;
        continue;
      }

      const suffix = this.buildPathByBFS(nextNode.id, targetNode.id, nodesMap, graphMap);
      if (suffix.length === 0) {
        temperature *= coolingRate;
        continue;
      }

      const suffixNodes = suffix.slice(1).map((id) => nodesMap.get(id)).filter((node): node is Node => node !== undefined);
      if (suffixNodes.length !== suffix.length - 1) {
        temperature *= coolingRate;
        continue;
      }

      const newPath = [...prefix, ...suffixNodes];
      const newCost = this.calculatePathCost(newPath, nodesMap);
      const delta = newCost - currentCost;
      if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
        currentPath = newPath;
        currentCost = newCost;
        visitedSet.add(nextId);
        parentMap = createParentMap(currentPath);

        if (currentCost < bestCost) {
          bestCost = currentCost;
          bestPath = [...currentPath];
        }
      }

      temperature *= coolingRate;
    }

    const finalParentMap = createParentMap(bestPath);
    yield {
      currentNode: bestPath[bestPath.length - 1],
      openList: [...bestPath],
      closedList: new Set(visitedSet),
      parentMap: finalParentMap,
      pathFound: [...bestPath]
    };
  }

  private buildInitialPath(
    startNode: Node,
    targetNode: Node,
    nodesMap: Map<string, Node>,
    graphMap: Record<string, string[]>
  ): Node[] {
    const pathIds = this.buildPathByBFS(startNode.id, targetNode.id, nodesMap, graphMap);
    return pathIds.length > 0 ? pathIds.map((id) => nodesMap.get(id)!).filter(Boolean) : [startNode, targetNode];
  }

  private buildPathByBFS(
    startId: string,
    targetId: string,
    nodesMap: Map<string, Node>,
    graphMap: Record<string, string[]>
  ): string[] {
    const queue: string[] = [startId];
    const visited = new Set<string>([startId]);
    const previous = new Map<string, string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === targetId) break;

      for (const neighborId of graphMap[current] ?? []) {
        if (visited.has(neighborId)) continue;
        visited.add(neighborId);
        previous.set(neighborId, current);
        queue.push(neighborId);
      }
    }

    if (!previous.has(targetId) && startId !== targetId) {
      return [];
    }

    const path: string[] = [];
    let currentId = targetId;
    while (currentId !== startId) {
      path.unshift(currentId);
      currentId = previous.get(currentId)!;
    }
    path.unshift(startId);
    return path;
  }

  private calculatePathCost(path: Node[], nodesMap: Map<string, Node>): number {
    let cost = 0;
    for (let i = 0; i < path.length - 1; i++) {
      cost += this.getDistance(path[i].position, path[i + 1].position);
    }
    return cost;
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