import * as THREE from 'three';
import type { Obstacle } from '../types';

export function animateObstaclesSpawn(obstacles: Obstacle[], parentGroup: THREE.Group) {
  const obstacleGroup = new THREE.Group();
  parentGroup.add(obstacleGroup);

  obstacles.forEach((obs, index) => {
    const geometry = new THREE.BoxGeometry(obs.width, obs.height, obs.depth);
    const material = new THREE.MeshStandardMaterial({ color: 0x334155 });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.copy(obs.position);
    mesh.scale.set(1, 0, 1);
    obstacleGroup.add(mesh);

    setTimeout(() => {
      let progress = 0;
      const animateScale = () => {
        progress += 0.1;
        if (progress <= 1) {
          mesh.scale.y = progress;
          requestAnimationFrame(animateScale);
        } else {
          mesh.scale.y = 1;
        }
      };
      animateScale();
    }, index * 10);
  });
}
