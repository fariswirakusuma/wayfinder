<script lang="ts">
  import { onMount } from 'svelte';
  import Scene3D from '$lib/components/Scene3D.svelte';
  import ControlsOverlay from '$lib/components/ControlsOverlay.svelte';
  import { fetchGeneratedMap, type MapType } from '$lib/three/generator/MapGenerator';
  import { solvePath } from '$lib/services/pathfindingApi';
  import type { Node, Obstacle, PathfindingAlgorithm } from '$lib/three/types';

  let width = $state(11);
  let height = $state(1);
  let depth = $state(11);
  let mapType = $state<MapType>('maze');
  let obstacleDensity = $state(0.3);
  let algorithm = $state<PathfindingAlgorithm>('a-star');
  let startNodeId = $state('');
  let targetNodeId = $state('');
  let nodes = $state<Node[]>([]);
  let obstacles = $state<Obstacle[]>([]);
  let path = $state<Node[]>([]);

  let isSolving = $state(false);
  let isLoadingMap = $state(false);
  let executionTime = $state(0);
  let visitedNodes = $state(0);

  async function handleGenerateMap() {
    try {
      isLoadingMap = true;
      path = [];

      const data = await fetchGeneratedMap({
        width,
        height,
        depth,
        mapType,
        obstacleDensity
      });

      nodes = data.nodes;
      obstacles = data.obstacles;
      if (nodes.length > 0) {
        startNodeId = nodes[0].id;
        targetNodeId = nodes[nodes.length - 1].id;
      }
    } catch (error) {
      console.error('Error fetching map from backend:', error);
      alert('Gagal mengambil data peta dari backend .NET. Pastikan server backend sudah berjalan.');
    } finally {
      isLoadingMap = false;
    }
  }

  async function handleSolve() {
    if (!startNodeId || !targetNodeId || nodes.length === 0) return;

    isSolving = true;
    const startTime = performance.now();

    try {
      const data = await solvePath(algorithm, {
        startNodeId,
        targetNodeId,
        nodes,
        edges: [],
        obstacles
      });

      path = data.path;
      visitedNodes = data.visitedNodes ?? 0;
      executionTime = performance.now() - startTime;
    } catch (error) {
      console.error('Error solving path:', error);
      alert('Gagal mengeksekusi pathfinding.');
    } finally {
      isSolving = false;
    }
  }

  onMount(() => {
    handleGenerateMap();
  });
</script>

<div class="relative w-screen h-screen overflow-hidden bg-slate-950">
  <!-- Layer Canvas 3D -->
  <div class="absolute inset-0 z-0">
    <Scene3D {nodes} {obstacles} {path} {startNodeId} {targetNodeId} />
  </div>

  <!-- Loading State Indicator -->
  {#if isLoadingMap}
    <div class="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm pointer-events-none">
      <div class="flex flex-col items-center gap-3">
        <div class="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sky-400 font-medium text-sm">Generating 3D Map via .NET Backend...</p>
      </div>
    </div>
  {/if}

  <div class="absolute inset-0 z-10 pointer-events-none p-4">
    <ControlsOverlay
      bind:width
      bind:height
      bind:depth
      bind:mapType
      bind:obstacleDensity
      bind:algorithm
      bind:startNodeId
      bind:targetNodeId
      {nodes}
      {isSolving}
      {isLoadingMap}
      {executionTime}
      {visitedNodes}
      onGenerate={handleGenerateMap}
      onSolve={handleSolve}
    />
  </div>
</div>
