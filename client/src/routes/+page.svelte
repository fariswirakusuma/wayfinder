<script lang="ts">
  import Scene3D from '$lib/components/Scene3D.svelte';
  import ControlsOverlay from '$lib/components/ControlsOverlay.svelte';
  import type { Node as GraphNode, Edge, Obstacle, PathfindingRequest } from '$lib/three/types';
  import { MapGenerator3D,type MapType } from '$lib/three/generator/MapGenerator';
  import { solvePath } from '$lib/services/pathfindingApi';

  let width = $state(11);
  let height = $state(5);
  let depth = $state(11);
  let mapType = $state<MapType>('maze');
  let obstacleDensity = $state(0.3);

  let algorithm = $state<'a-star' | 'dijkstra' | 'bellman-ford'>('a-star');
  let isSolving = $state(false);
  let executionTime = $state(0);
  let visitedNodes = $state(0);

  // Graph Data
  let nodes = $state<GraphNode[]>([]);
  let edges = $state<Edge[]>([]);
  let obstacles = $state<Obstacle[]>([]);
  let path = $state<GraphNode[]>([]);

  let startNodeId = $state('');
  let targetNodeId = $state('');

  function handleGenerateMap() {
    path = [];
    const generator = new MapGenerator3D(width, height, depth);
    const mapData = generator.generate(mapType, obstacleDensity);

    nodes = mapData.nodes;
    edges = mapData.edges;
    obstacles = mapData.obstacles;

    if (nodes.length > 0) {
      startNodeId = nodes[0].id;
      targetNodeId = nodes[nodes.length - 1].id;
    } else {
      startNodeId = '';
      targetNodeId = '';
    }
  }

  async function handleSolve() {
    if (!startNodeId || !targetNodeId) return;

    isSolving = true;
    const request: PathfindingRequest = {
      startNodeId,
      targetNodeId,
      nodes,
      edges,
      obstacles
    };

    try {
      const res = await solvePath(algorithm, request);
      path = res.found ? res.path : [];
      executionTime = res.executionTime ?? 0;
      visitedNodes = res.visitedNodes ?? 0;

      if (!res.found) alert('No path found!');
    } catch (err) {
      console.error(err);
    } finally {
      isSolving = false;
    }
  }

  // Auto-generate map saat halaman pertama dibuka
  $effect(() => {
    handleGenerateMap();
  });
</script>

<main class="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
  <div class="absolute inset-0 z-0">
    <Scene3D {nodes} {obstacles} {path} />
  </div>

  <div class="absolute inset-0 z-10 pointer-events-none p-6 flex flex-col justify-between">
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
      {executionTime}
      {visitedNodes}
      onGenerate={handleGenerateMap}
      onSolve={handleSolve}
    />

    {#if path.length > 0}
      <div class="pointer-events-auto self-start bg-slate-900/80 backdrop-blur-md border border-slate-800 p-4 rounded-xl shadow-2xl flex items-center gap-6">
        <div>
          <span class="text-xs text-slate-400 block uppercase tracking-wider font-semibold">Nodes in Path</span>
          <span class="text-lg font-bold text-emerald-400">{path.length}</span>
        </div>
        <div class="h-8 w-px bg-slate-800"></div>
        <div>
          <span class="text-xs text-slate-400 block uppercase tracking-wider font-semibold">Algorithm</span>
          <span class="text-lg font-bold text-indigo-400 uppercase">{algorithm}</span>
        </div>
      </div>
    {/if}
  </div>
</main>