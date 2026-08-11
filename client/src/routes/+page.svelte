<script lang="ts">
  import { onMount } from 'svelte';
  import Scene3D from '$lib/components/Scene3D.svelte';
  import ControlsOverlay from '$lib/components/ControlsOverlay.svelte';
  import { fetchGeneratedMap, type MapType } from '$lib/three/generator/MapGenerator';
  import { solvePath } from '$lib/services/pathfindingApi';
  import type { Node, Obstacle, PathfindingAlgorithm, QLearningOptions, SimulatedAnnealingOptions } from '$lib/three/types';

  let gridSize = $state(20);
  let height = $state(1);
  let mapType = $state<MapType>('maze');
  let obstacleDensity = $state(0.3);
  let algorithm = $state<PathfindingAlgorithm>('a-star');
  let startNodeId = $state('');
  let targetNodeId = $state('');
  let animationSpeedMs = $state(50);
  let cameramode = $state<'orbit' | 'first-person'>('orbit');

  let nodes = $state<Node[]>([]);
  let obstacles = $state<Obstacle[]>([]);
  let path = $state<Node[]>([]);

  let isSolving = $state(false);
  let isLoadingMap = $state(false);
  let isExecutingStepByStep = $state(false);
  let executionTime = $state(0);
  let visitedNodes = $state(0);
  let qLearningOptions = $state<QLearningOptions>({
    episodes: 1000,
    maxStepsPerEpisode: 200,
    learningRate: 0.1,
    discountFactor: 0.9,
    epsilon: 0.2
  });
  let simulatedAnnealingOptions = $state<SimulatedAnnealingOptions>({
    numWaypoints: 5,
    initialTemperature: 1000,
    coolingRate: 0.95,
    minTemperature: 0.01
  });

  let scene3dRef = $state<{
    resetHighlight: () => void;
    resetCamera: () => void;
    runStepByStepAnimation: () => Promise<void>;
  } | null>(null);

  function handleCameraModeChange(newMode: 'orbit' | 'first-person') {
    cameramode = newMode;
  }

  async function handleGenerateMap() {
    try {
      isLoadingMap = true;
      handleClear();

      const data = await fetchGeneratedMap({
        width: gridSize,
        height,
        depth: gridSize,
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

  async function handleInstantSolve() {
    if (!startNodeId || !targetNodeId || nodes.length === 0 || isExecutingStepByStep) return;

    isSolving = true;
    handleClear();

    try {
      const data = await solvePath(algorithm, {
        startNodeId,
        targetNodeId,
        nodes,
        edges: [],
        obstacles,
        qLearningOptions: algorithm === 'q-learning' ? qLearningOptions : undefined,
        simulatedAnnealingOptions: algorithm === 'simulated-annealing' ? simulatedAnnealingOptions : undefined
      });

      path = data.path;
      visitedNodes = data.visitedNodes ?? 0;
      executionTime = data.executionTime ?? 0;
    } catch (error) {
      console.error('Error solving path:', error);
      alert('Gagal mengeksekusi pathfinding.');
    } finally {
      isSolving = false;
    }
  }
  async function handleRunStepByStep() {
    if (!scene3dRef || isExecutingStepByStep) return;

    isExecutingStepByStep = true;
    try {
      await scene3dRef.runStepByStepAnimation();
    } catch (error) {
      console.error('Error running step by step animation:', error);
    } finally {
      isExecutingStepByStep = false;
    }
  }

  function handleClear() {
    isExecutingStepByStep = false;
    handleCameraModeChange('orbit');
    path = [];
    executionTime = 0;
    visitedNodes = 0;

    if (scene3dRef?.resetHighlight) {
      scene3dRef.resetHighlight();
    }
    scene3dRef?.resetCamera();
  }

  onMount(() => {
    handleGenerateMap();
    handleCameraModeChange('orbit');
  });
</script>

<div class="relative w-screen h-screen overflow-hidden bg-slate-950">

  <div class="absolute inset-0 z-0">
    <Scene3D
      bind:this={scene3dRef}
      {nodes}
      {obstacles}
      {path}
      {startNodeId}
      {targetNodeId}
      {algorithm}
      {animationSpeedMs}
      {cameramode}
      {qLearningOptions}
      {simulatedAnnealingOptions}
    />
  </div>
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
      bind:gridSize
      bind:height
      bind:mapType
      bind:obstacleDensity
      bind:algorithm
      bind:startNodeId
      bind:targetNodeId
      bind:animationSpeedMs
      bind:isExecutingStepByStep
      bind:cameramode
      bind:qLearningOptions
      bind:simulatedAnnealingOptions
      {nodes}
      {isSolving}
      {isLoadingMap}
      {executionTime}
      {visitedNodes}
      onCameraModeChange={handleCameraModeChange}
      onGenerate={handleGenerateMap}
      onSolve={handleInstantSolve}
      onRunStepByStep={handleRunStepByStep}
      onClear={handleClear}
    />
  </div>
</div>
