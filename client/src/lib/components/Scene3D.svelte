<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { SceneManager } from '$lib/three/SceneManager';
  import { PathfindingController } from '$lib/three/manager/PathfindingController';
  import { solvePathStepByStep } from '$lib/services/pathfindingApi';
  import type { Node as GraphNode, Obstacle, PathfindingAlgorithm } from '$lib/three/types';

  interface Scene3DProps {
    nodes?: GraphNode[];
    obstacles?: Obstacle[];
    path?: GraphNode[];
    startNodeId?: string;
    targetNodeId?: string;
    algorithm?: PathfindingAlgorithm;
    animationSpeedMs?: number;
    cameramode?: 'orbit' | 'first-person';
  }

  let {
    nodes = [],
    obstacles = [],
    path = [],
    startNodeId = '',
    targetNodeId = '',
    algorithm = 'a-star',
    animationSpeedMs = 50,
    cameramode = 'orbit'
  }: Scene3DProps = $props();

  let containerElement: HTMLDivElement;
  let sceneManager: SceneManager | null = null;
  let isExecutingStepByStep = $state(false);
  let hasStepByStepResult = $state(false);

  onMount(() => {
    if (containerElement) {
      sceneManager = new SceneManager(containerElement);
    }
  });

  onDestroy(() => {
    if (sceneManager) {
      sceneManager.destroy();
    }
  });

  $effect(() => {
    if (sceneManager) {
      sceneManager.renderGraph(nodes, obstacles, startNodeId, targetNodeId);
      if (!isExecutingStepByStep && !hasStepByStepResult) {
        sceneManager.renderPath(path);
      }
    }
  });

  $effect(() => {
    if (!sceneManager) return;
    const startNode = nodes.find((node) => String(node.id) === String(startNodeId));
    sceneManager.setCameraMode(cameramode, startNode);
  });

  export function resetHighlight() {
    if (!sceneManager) return;
    hasStepByStepResult = false;
    sceneManager.renderGraph(nodes, obstacles, startNodeId, targetNodeId);
    sceneManager.clearPath();
  }

  export function resetCamera() {
    sceneManager?.resetCamera();
  }


  export async function runStepByStepAnimation() {
    if (!sceneManager || !startNodeId || !targetNodeId || isExecutingStepByStep) return;

    isExecutingStepByStep = true;
    resetHighlight();
    hasStepByStepResult = true;

    try {
      const response = await solvePathStepByStep(algorithm, {
        startNodeId,
        targetNodeId,
        nodes,
        obstacles,
        stepByStep: true
      });

      const rawGraph = response.graph || (response as any).Graph;
      const arrows = response.arrows ?? [];

      if (!rawGraph && (!response.steps || response.steps.length === 0)) {
        console.warn('Backend tidak mengembalikan data graph maupun steps.', response);
        return;
      }

      const nodesMap = new Map<string, GraphNode>(nodes.map((n) => [String(n.id), n]));
      const startNode = nodesMap.get(String(startNodeId));
      const targetNode = nodesMap.get(String(targetNodeId));

      if (!startNode || !targetNode) {
        console.error('Start Node atau Target Node tidak ditemukan di nodesMap');
        return;
      }

      if (response.steps && response.steps.length > 0) {
        for (const rawStep of response.steps) {
          if (!isExecutingStepByStep) break;
          const stepState = {
            ...rawStep,
            currentNode: rawStep.currentNodeId || (rawStep as any).currentNode
          };

          sceneManager.renderStepNodes(stepState as any, nodesMap);
          if (stepState.parentMap) {
            const parentMapAsMap = stepState.parentMap instanceof Map
              ? stepState.parentMap
              : new Map<string, string>(Object.entries(stepState.parentMap));

            sceneManager.renderStepArrows(arrows, { ...stepState, parentMap: parentMapAsMap } as any, nodesMap);
          }

          await new Promise((r) => setTimeout(r, animationSpeedMs));

          if (stepState.pathFound && stepState.pathFound.length > 0) {
            await sceneManager.animatePath(stepState.pathFound, animationSpeedMs);
            break;
          }
        }
      } 
      else if (rawGraph) {
        const graphAdjacencyMap: Record<string, string[]> = {};
        for (const [nodeId, neighbors] of Object.entries(rawGraph)) {
          if (Array.isArray(neighbors)) {
            graphAdjacencyMap[String(nodeId)] = neighbors.map((neighbor: any) => {
              if (typeof neighbor === 'string') return neighbor;
              if (typeof neighbor === 'number') return String(neighbor);
              return String(neighbor.id || neighbor.Id || '');
            }).filter((id) => id !== '');
          }
        }

        

        const controller = new PathfindingController(
          sceneManager.nodeManager,
          sceneManager.cameraManager
        );

        let generator;
        if (algorithm === 'a-star') {
          generator = controller.solveAStarStepByStep(startNode, targetNode, nodesMap, graphAdjacencyMap);
        } else if (algorithm === 'dijkstra') {
          generator = controller.solveDijkstraStepByStep(startNode, targetNode, nodesMap, graphAdjacencyMap);
        } else {
          generator = controller.solveBellmanFordStepByStep(startNode, targetNode, nodesMap, graphAdjacencyMap);
        }

        for await (const stepState of generator) {
          if (!isExecutingStepByStep) break;

          sceneManager.renderStepNodes(stepState as any, nodesMap);
          if (stepState.parentMap) {
            sceneManager.renderStepArrows(arrows, stepState, nodesMap);
          }

          await new Promise((r) => setTimeout(r, animationSpeedMs));

          if (stepState.pathFound) {
            await sceneManager.animatePath(stepState.pathFound, animationSpeedMs);
            break;
          }
        }
      }
    } catch (err) {
      console.error('Terjadi kesalahan saat animasi step-by-step:', err);
    } finally {
      isExecutingStepByStep = false;
    }
  }
</script>

<div class="scene-container" bind:this={containerElement}></div>

<style>
  .scene-container {
    width: 100%;
    height: 100vh;
    position: relative;
    overflow: hidden;
  }
</style>
