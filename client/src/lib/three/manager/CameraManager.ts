import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';


export enum CameraMode {
  DEFAULT_TOP_VIEW,
  FOLLOW_NODE,
  FREE_ORBIT,
  FIRST_PERSON
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
    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    this.controls.addEventListener('start', () => {
      if (this.mode !== CameraMode.FIRST_PERSON) {
        this.mode = CameraMode.FREE_ORBIT;
      }
    });
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }


  public setTopView(offsetPosition = new THREE.Vector3(0, 200, 0)) {
    this.mode = CameraMode.DEFAULT_TOP_VIEW;
    this.targetNode = null;
    this.defaultTopPos.copy(offsetPosition);
    this.controls.enablePan = true;
    this.controls.enableZoom = true;
  }

  public setOrbitView() {
    this.mode = CameraMode.FREE_ORBIT;
    this.targetNode = null;
    this.controls.enablePan = true;
    this.controls.enableZoom = true;
  }

  public followNode(node: THREE.Object3D, offset = new THREE.Vector3(0, 5, 10)) {
    this.mode = CameraMode.FOLLOW_NODE;
    this.targetNode = node;
    this.followOffset.copy(offset);
  }

  public update() {
    if (this.mode === CameraMode.FOLLOW_NODE && this.targetNode) {
      this.tempDesiredPos.copy(this.targetNode.position).add(this.followOffset);
      this.camera.position.lerp(this.tempDesiredPos, 0.1);

      this.controls.target.lerp(this.targetNode.position, 0.1);
      this.controls.update();

    } else if (this.mode === CameraMode.DEFAULT_TOP_VIEW) {
      this.camera.position.lerp(this.defaultTopPos, 0.1);

      this.controls.target.lerp(this.defaultTargetPos, 0.1);
      this.controls.update();

    } else if (this.mode === CameraMode.FREE_ORBIT || this.mode === CameraMode.FIRST_PERSON) {
      this.controls.update();
    }
  }

  public firstPersonView(currentNode: THREE.Object3D, offset = new THREE.Vector3(0, 1.6, 0)) {
    this.mode = CameraMode.FIRST_PERSON;
    this.targetNode = null;
    this.controls.enablePan = false;
    this.controls.enableZoom = false;
    this.camera.position.copy(currentNode.position).add(offset);
    this.controls.target.copy(currentNode.position).add(offset).add(new THREE.Vector3(0, 0, -1));
    this.controls.update();
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public destroy() {
    this.controls.dispose();
  }
}
