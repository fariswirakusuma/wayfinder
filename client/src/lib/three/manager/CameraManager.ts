import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';


export enum CameraMode {
  DEFAULT_TOP_VIEW,
  FOLLOW_NODE,
  FREE_ORBIT
}

export class CameraManager {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  
  private mode: CameraMode = CameraMode.DEFAULT_TOP_VIEW;
  private targetNode: THREE.Object3D | null = null;
  private followOffset: THREE.Vector3 = new THREE.Vector3(0, 5, 10);
  
  private tempDesiredPos = new THREE.Vector3();
  private defaultTopPos = new THREE.Vector3(0, 200, 0);
  private defaultTargetPos = new THREE.Vector3(0, 0, 0);

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    
    // Inisialisasi OrbitControls
    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    this.controls.addEventListener('start', () => {
      this.mode = CameraMode.FREE_ORBIT;
    });
  }

  // --- Public Controls ---

  public setTopView(offsetPosition = new THREE.Vector3(0, 200, 0)) {
    this.mode = CameraMode.DEFAULT_TOP_VIEW;
    this.defaultTopPos.copy(offsetPosition);
  }

  public followNode(node: THREE.Object3D, offset = new THREE.Vector3(0, 5, 10)) {
    this.mode = CameraMode.FOLLOW_NODE;
    this.targetNode = node;
    this.followOffset.copy(offset);
  }

  // --- Wajib dipanggil setiap Frame di Animation Loop (`animate()`) ---
  public update() {
    if (this.mode === CameraMode.FOLLOW_NODE && this.targetNode) {
      // 1. Hitung posisi kamera yang diinginkan
      this.tempDesiredPos.copy(this.targetNode.position).add(this.followOffset);
      this.camera.position.lerp(this.tempDesiredPos, 0.1);

      // 2. Sync OrbitControls target dengan node position
      this.controls.target.lerp(this.targetNode.position, 0.1);
      this.controls.update();

    } else if (this.mode === CameraMode.DEFAULT_TOP_VIEW) {
      // 1. Lerp ke posisi Top View
      this.camera.position.lerp(this.defaultTopPos, 0.1);

      // 2. Lerp target OrbitControls ke pusat (0,0,0)
      this.controls.target.lerp(this.defaultTargetPos, 0.1);
      this.controls.update();

    } else if (this.mode === CameraMode.FREE_ORBIT) {
      // Bebas digerakkan manual via OrbitControls
      this.controls.update();
    }
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public destroy() {
    this.controls.dispose();
  }
}