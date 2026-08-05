<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { SceneManager } from '$lib/three/SceneManager.js';
  import type { Node as GraphNode, Obstacle } from '$lib/three/types';

  interface Scene3DProps {
    nodes?: GraphNode[];
    obstacles?: Obstacle[];
    path?: GraphNode[];
    startNodeId?: string;
    targetNodeId?: string;
  }

  let {
    nodes = [],
    obstacles = [],
    path = [],
    startNodeId = '',
    targetNodeId = ''
  }: Scene3DProps = $props();

  let containerElement: HTMLDivElement;
  let sceneManager: SceneManager | null = null;

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
      if (typeof sceneManager.renderGraph === 'function') {
        sceneManager.renderGraph(nodes, obstacles, startNodeId, targetNodeId);
      }
      if (typeof sceneManager.renderPath === 'function') {
        sceneManager.renderPath(path);
      }
    }
  });
</script>

<div class="scene-container" bind:this={containerElement}>
</div>

<style>
  .scene-container {
    width: 100%;
    height: 100vh;
    position: relative;
    overflow: hidden;
  }
</style>
