<script lang="ts">
  import type { MapType } from '$lib/three/generator/MapGenerator';
  import type { Node as GraphNode, PathfindingAlgorithm } from '$lib/three/types';

  let {
    width = $bindable(11),
    height = $bindable(5),
    depth = $bindable(11),
    mapType = $bindable<MapType>('maze'),
    obstacleDensity = $bindable(0.3),
    algorithm = $bindable<PathfindingAlgorithm>('a-star'),
    startNodeId = $bindable(''),
    targetNodeId = $bindable(''),
    animationSpeedMs = $bindable(200),
    isExecutingStepByStep = $bindable(false),
    cameramode = $bindable<'orbit' | 'first-person'>('orbit'),
    nodes = [],
    isSolving = false,
    isLoadingMap = false,
    executionTime = 0,
    visitedNodes = 0,
    onCameraModeChange = () => {},
    onGenerate = () => {},
    onSolve = () => {},
    onRunStepByStep = () => {},
    onClear = () => {}
  }: {
    width?: number;
    height?: number;
    depth?: number;
    mapType?: MapType;
    obstacleDensity?: number;
    algorithm?: PathfindingAlgorithm;
    startNodeId?: string;
    targetNodeId?: string;
    animationSpeedMs?: number;
    isExecutingStepByStep?: boolean;
    cameramode?: 'orbit' | 'first-person';
    nodes?: GraphNode[];
    isSolving?: boolean;
    isLoadingMap?: boolean;
    executionTime?: number;
    visitedNodes?: number;
    onCameraModeChange?: (mode: 'orbit' | 'first-person') => void | Promise<void>;
    onGenerate?: () => void | Promise<void>;
    onSolve?: () => void | Promise<void>;
    onRunStepByStep?: () => void | Promise<void>;
    onClear?: () => void;
  } = $props();
</script>

<div class="controls-panel pointer-events-auto">
  <h2>OHL Wayfinder 3D</h2>

  <div class="section-title">Map Settings</div>
  <div class="form-group">
    <label for="mapType">Generator Type:</label>
    <select id="mapType" bind:value={mapType} disabled={isSolving || isExecutingStepByStep}>
      <option value="maze">3D Maze (DFS)</option>
      <option value="random">Random Obstacles</option>
    </select>
  </div>

  {#if mapType === 'random'}
    <div class="form-group">
      <label for="density">Obstacle Density: {Math.round(obstacleDensity * 100)}%</label>
      <input
        type="range"
        id="density"
        min="0.1"
        max="0.6"
        step="0.05"
        bind:value={obstacleDensity}
        disabled={isSolving || isExecutingStepByStep}
      />
    </div>
  {/if}

  <div class="form-group">
    <label for="width">Width (X): {width}</label>
    <input type="range" id="width" min="5" max="25" step="2" bind:value={width} disabled={isSolving || isExecutingStepByStep} />
  </div>

  <div class="form-group">
    <label for="height">Height / Floors (Y): {height}</label>
    <input type="range" id="height" min="1" max="11" step="2" bind:value={height} disabled={isSolving || isExecutingStepByStep} />
  </div>

  <div class="form-group">
    <label for="depth">Depth (Z): {depth}</label>
    <input type="range" id="depth" min="5" max="25" step="2" bind:value={depth} disabled={isSolving || isExecutingStepByStep} />
  </div>

  <div class="section-title">Pathfinding Settings</div>
  <div class="form-group">
    <label for="camera-mode">Camera Mode:</label>
    <select id="camera-mode" bind:value={cameramode} onchange={() => void onCameraModeChange(cameramode)} disabled={isLoadingMap}>
      <option value="orbit">Orbit</option>
      <option value="first-person">First Person (Start Node)</option>
    </select>
  </div>
  <div class="form-group">
    <label for="startNode">Start Node:</label>
    <select id="startNode" bind:value={startNodeId} disabled={isSolving || isExecutingStepByStep}>
      {#each nodes as node (node.id)}
        <option value={node.id}>{node.id} ({node.position.x}, {node.position.y}, {node.position.z})</option>
      {/each}
    </select>
  </div>

  <div class="form-group">
    <label for="targetNode">Target Node:</label>
    <select id="targetNode" bind:value={targetNodeId} disabled={isSolving || isExecutingStepByStep}>
      {#each nodes as node (node.id)}
        <option value={node.id}>{node.id} ({node.position.x}, {node.position.y}, {node.position.z})</option>
      {/each}
    </select>
  </div>

  <div class="form-group">
    <label for="algo">Algorithm:</label>
    <select id="algo" bind:value={algorithm} disabled={isSolving || isExecutingStepByStep}>
      <option value="a-star">A* (A-Star)</option>
      <option value="dijkstra">Dijkstra</option>
      <option value="bellman-ford">Bellman-Ford</option>
    </select>
  </div>

  <div class="section-title">Step-by-Step Visualization</div>
  <div class="form-group">
    <label for="speed-range">Animation Delay: <span>{animationSpeedMs} ms</span></label>
    <input
      id="speed-range"
      type="range"
      min="50"
      max="1000"
      step="50"
      bind:value={animationSpeedMs}
      disabled={isExecutingStepByStep}
    />
  </div>

  <div class="button-group">
    <button
      type="button"
      class="btn btn-secondary"
      onclick={() => void onGenerate()}
      disabled={isSolving || isLoadingMap || isExecutingStepByStep}
    >
      {isLoadingMap ? 'Generating...' : 'Randomize Map'}
    </button>
    <button
      type="button"
      class="btn btn-primary"
      onclick={() => void onSolve()}
      disabled={isSolving || isLoadingMap || isExecutingStepByStep || !startNodeId || !targetNodeId}
    >
      {isSolving ? 'Solving...' : 'Instant Path'}
    </button>
  </div>

  <div class="button-group step-group">
    <button
      type="button"
      class="btn btn-step"
      onclick={() => void onRunStepByStep()}
      disabled={isSolving || isLoadingMap || isExecutingStepByStep || !startNodeId || !targetNodeId}>
      {#if isExecutingStepByStep}
        <span class="spinner"></span> Animating...
      {:else}
        ▶ Visualize Step-by-Step
      {/if}
    </button>
    <button
      type="button"
      class="btn btn-reset"
      onclick={onClear}
      disabled={isExecutingStepByStep}>
      Clear
    </button>
  </div>

  {#if executionTime > 0}
    <div class="stats-box">
      <p><strong>Execution Time:</strong> {executionTime.toFixed(2)} ms</p>
      <p><strong>Visited Nodes:</strong> {visitedNodes}</p>
    </div>
  {/if}
</div>

<style>
  .controls-panel {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 10;
    width: 300px;
    max-height: calc(100vh - 40px);
    overflow-y: auto;
    padding: 18px;
    background: rgba(15, 23, 42, 0.88);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: #f8fafc;
    font-family: system-ui, -apple-system, sans-serif;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.36);
  }

  h2 {
    margin: 0 0 12px 0;
    font-size: 1.2rem;
    color: #38bdf8;
  }

  .section-title {
    margin-top: 14px;
    margin-bottom: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 4px;
  }

  .form-group {
    margin-bottom: 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.82rem;
  }

  .form-group label {
    display: flex;
    justify-content: space-between;
    color: #cbd5e1;
  }

  input[type='range'],
  select {
    width: 100%;
    padding: 6px 8px;
    border-radius: 6px;
    background: #1e293b;
    border: 1px solid #334155;
    color: #fff;
    outline: none;
    box-sizing: border-box;
  }

  input[type='range'] {
    accent-color: #0284c7;
  }

  .button-group {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }

  .step-group {
    margin-top: 8px;
  }

  .btn {
    flex: 1;
    padding: 8px 10px;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.8rem;
    cursor: pointer;
    transition: background 0.2s ease, opacity 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #0284c7;
    color: white;
  }
  .btn-primary:hover:not(:disabled) {
    background: #0369a1;
  }

  .btn-secondary {
    background: #475569;
    color: white;
  }
  .btn-secondary:hover:not(:disabled) {
    background: #334155;
  }

  .btn-step {
    background: #8b5cf6;
    color: white;
  }
  .btn-step:hover:not(:disabled) {
    background: #7c3aed;
  }

  .btn-reset {
    background: #334155;
    color: #cbd5e1;
    flex: 0.4;
  }
  .btn-reset:hover:not(:disabled) {
    background: #475569;
  }

  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .stats-box {
    margin-top: 14px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    font-size: 0.8rem;
  }

  .stats-box p {
    margin: 2px 0;
  }
</style>
