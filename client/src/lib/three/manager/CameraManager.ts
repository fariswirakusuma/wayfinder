import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export enum CameraMode {
  DEFAULT_TOP_VIEW,
  FOLLOW_NODE,
  FREE_ORBIT,
  FIRST_PERSON
}

export class CameraManager {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private pointerLockControls: PointerLockControls;

  private mode: CameraMode = CameraMode.DEFAULT_TOP_VIEW;
  private targetNode: THREE.Object3D | null = null;
  private followOffset: THREE.Vector3 = new THREE.Vector3(0, 5, 10);

  private tempDesiredPos = new THREE.Vector3();
  private defaultTopPos = new THREE.Vector3(0, 200, 0);
  private defaultTargetPos = new THREE.Vector3(0, 0, 0);

  private fpEnabled = false;
  private fpMoveForward = false;
  private fpMoveBackward = false;
  private fpMoveLeft = false;
  private fpMoveRight = false;
  private fpCanJump = false;
  private fpVelocity = new THREE.Vector3();
  private fpDirection = new THREE.Vector3();
  private fpPrevTime = performance.now();
  private fpColliderObjects: THREE.Object3D[] = [];

  private cameraInputStream: MediaStream | null = null;
  private cameraInputVideo: HTMLVideoElement | null = null;
  private cameraInputCanvas: HTMLCanvasElement | null = null;
  private cameraInputContext: CanvasRenderingContext2D | null = null;
  private cameraInputResolution = { width: 32, height: 32 };
  private cameraInputThreshold = 128;
  private cameraInputCallback: ((pattern: boolean[][]) => void) | null = null;
  private cameraInputActive = false;
  private cameraModeChangedCallback: ((mode: 'orbit' | 'first-person') => void) | null = null;

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

    this.pointerLockControls = new PointerLockControls(this.camera, domElement);
    this.pointerLockControls.addEventListener('lock', () => {
      this.fpEnabled = true;
    });
    this.pointerLockControls.addEventListener('unlock', () => {
      this.fpEnabled = false;
      if (this.mode === CameraMode.FIRST_PERSON) {
        this.setOrbitView();
      }
    });

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  public setModeChangeCallback(callback: (mode: 'orbit' | 'first-person') => void) {
    this.cameraModeChangedCallback = callback;
  }

  private notifyCameraModeChanged(mode: 'orbit' | 'first-person') {
    if (this.cameraModeChangedCallback) {
      this.cameraModeChangedCallback(mode);
    }
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public setTopView(offsetPosition = new THREE.Vector3(0, 200, 0)) {
    this.mode = CameraMode.DEFAULT_TOP_VIEW;
    this.targetNode = null;
    this.defaultTopPos.copy(offsetPosition);
    this.controls.enabled = true;
    this.controls.enablePan = true;
    this.controls.enableZoom = true;
    this.notifyCameraModeChanged('orbit');
  }

  public setOrbitView() {
    this.mode = CameraMode.FREE_ORBIT;
    this.targetNode = null;
    this.controls.enabled = true;
    this.controls.enablePan = true;
    this.controls.enableZoom = true;
    this.pointerLockControls.unlock();
    this.notifyCameraModeChanged('orbit');
  }

  public followNode(node: THREE.Object3D, offset = new THREE.Vector3(0, 5, 10)) {
    this.mode = CameraMode.FOLLOW_NODE;
    this.targetNode = node;
    this.followOffset.copy(offset);
    this.controls.enabled = true;
    this.controls.enablePan = true;
    this.controls.enableZoom = true;
    this.pointerLockControls.unlock();
  }

  public setFirstPersonView(position: THREE.Vector3, colliders: THREE.Object3D[]) {
    this.mode = CameraMode.FIRST_PERSON;
    this.targetNode = null;
    this.controls.enabled = false;
    this.controls.enablePan = false;
    this.controls.enableZoom = false;
    this.fpColliderObjects = colliders;
    this.fpVelocity.set(0, 0, 0);
    this.fpDirection.set(0, 0, 0);
    this.fpCanJump = false;
    this.fpPrevTime = performance.now();

    const object = this.pointerLockControls.object;
    object.position.copy(position).add(new THREE.Vector3(0, 1.8, 0));
    this.camera.position.copy(object.position);
    this.pointerLockControls.lock();
    this.notifyCameraModeChanged('first-person');
  }

  public update() {
    if (this.cameraInputActive) {
      this.processCameraInputFrame();
    }

    if (this.mode === CameraMode.FOLLOW_NODE && this.targetNode) {
      this.tempDesiredPos.copy(this.targetNode.position).add(this.followOffset);
      this.camera.position.lerp(this.tempDesiredPos, 0.1);

      this.controls.target.lerp(this.targetNode.position, 0.1);
      this.controls.update(0.016);

    } else if (this.mode === CameraMode.DEFAULT_TOP_VIEW) {
      this.camera.position.lerp(this.defaultTopPos, 0.1);

      this.controls.target.lerp(this.defaultTargetPos, 0.1);
      this.controls.update(0.016);

    } else if (this.mode === CameraMode.FREE_ORBIT) {
      this.controls.update(0.016);

    } else if (this.mode === CameraMode.FIRST_PERSON) {
      this.updateFirstPerson();
    }
  }

  private updateFirstPerson() {
    const time = performance.now();
    const delta = Math.min((time - this.fpPrevTime) / 1000, 0.1);
    this.fpPrevTime = time;

    const eyeHeight = 1.8;
    const groundBuffer = 0.18;

    this.fpVelocity.x -= this.fpVelocity.x * 10.0 * delta;
    this.fpVelocity.z -= this.fpVelocity.z * 10.0 * delta;
    this.fpVelocity.y -= 30.0 * delta;

    this.fpDirection.z = Number(this.fpMoveForward) - Number(this.fpMoveBackward);
    this.fpDirection.x = Number(this.fpMoveLeft) - Number(this.fpMoveRight);
    this.fpDirection.normalize();

    if (this.fpMoveForward || this.fpMoveBackward) {
      this.fpVelocity.z -= this.fpDirection.z * 450.0 * delta;
    }
    if (this.fpMoveLeft || this.fpMoveRight) {
      this.fpVelocity.x -= this.fpDirection.x * 450.0 * delta;
    }

    const object = this.pointerLockControls.object;
    const oldPosition = object.position.clone();

    object.translateX(this.fpVelocity.x * delta);
    object.translateZ(this.fpVelocity.z * delta);

    const horizontalPosition = object.position.clone();
    horizontalPosition.y = oldPosition.y;
    if (this.collidesWithEnvironment(horizontalPosition)) {
      object.position.copy(oldPosition);
      this.fpVelocity.x = 0;
      this.fpVelocity.z = 0;
    }

    object.position.y += this.fpVelocity.y * delta;

    const rayOrigin = object.position.clone();
    const ray = new THREE.Raycaster(rayOrigin, new THREE.Vector3(0, -1, 0), 0, eyeHeight + groundBuffer + 0.5);
    const intersects = ray.intersectObjects(this.fpColliderObjects, true);

    if (intersects.length > 0) {
      const distance = intersects[0].distance;
      const targetY = object.position.y - distance + eyeHeight;
      if (distance <= eyeHeight + groundBuffer) {
        object.position.y = targetY;
        this.fpVelocity.y = 0;
        this.fpCanJump = true;
      } else {
        this.fpCanJump = false;
      }
    } else {
      this.fpCanJump = false;
    }

    if (object.position.y < eyeHeight) {
      object.position.y = eyeHeight;
      this.fpVelocity.y = 0;
      this.fpCanJump = true;
    }

    this.pointerLockControls.update(delta);
    this.camera.position.copy(object.position);
  }

  private collidesWithEnvironment(position: THREE.Vector3) {
    if (this.fpColliderObjects.length === 0) {
      return false;
    }

    const sphere = new THREE.Sphere(position, 0.35);
    for (const object of this.fpColliderObjects) {
      const hits = this.raycastSphere(object, sphere);
      if (hits) {
        return true;
      }
    }
    return false;
  }

  private raycastSphere(object: THREE.Object3D, sphere: THREE.Sphere): boolean {
    const meshes: THREE.Mesh[] = [];
    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        meshes.push(child as THREE.Mesh);
      }
    });

    for (const mesh of meshes) {
      const geometry = mesh.geometry;
      if (!geometry.boundingBox) {
        geometry.computeBoundingBox();
      }

      const box = geometry.boundingBox!.clone();
      box.applyMatrix4(mesh.matrixWorld);

      if (box.intersectsSphere(sphere)) {
        return true;
      }
    }
    return false;
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (this.mode !== CameraMode.FIRST_PERSON) return;
    switch (event.code) {
      case 'Escape':
        this.pointerLockControls.unlock();
        break;
      case 'ArrowUp':
      case 'KeyW':
        this.fpMoveForward = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.fpMoveLeft = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.fpMoveBackward = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.fpMoveRight = true;
        break;
      case 'Space':
        if (this.fpCanJump) {
          this.fpVelocity.y = 8;
          this.fpCanJump = false;
        }
        break;
    }
  };

  private onKeyUp = (event: KeyboardEvent) => {
    if (this.mode !== CameraMode.FIRST_PERSON) return;
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.fpMoveForward = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.fpMoveLeft = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.fpMoveBackward = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.fpMoveRight = false;
        break;
    }
  };

  public startDeviceCameraInput(
    callback: (pattern: boolean[][]) => void,
    width = 32,
    height = 32,
    threshold = 128
  ) {
    if (this.cameraInputActive) {
      return;
    }

    this.cameraInputResolution = { width, height };
    this.cameraInputThreshold = threshold;
    this.cameraInputCallback = callback;

    this.cameraInputVideo = document.createElement('video');
    this.cameraInputVideo.autoplay = true;
    this.cameraInputVideo.playsInline = true;
    this.cameraInputVideo.muted = true;

    this.cameraInputCanvas = document.createElement('canvas');
    this.cameraInputCanvas.width = width;
    this.cameraInputCanvas.height = height;
    this.cameraInputContext = this.cameraInputCanvas.getContext('2d');

    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        this.cameraInputStream = stream;
        if (!this.cameraInputVideo) return;
        this.cameraInputVideo.srcObject = stream;

        const onLoaded = () => {
          this.cameraInputActive = true;
        };

        this.cameraInputVideo.addEventListener('loadedmetadata', onLoaded, { once: true });
      })
      .catch((error) => {
        console.error('Device camera input failed:', error);
        this.stopDeviceCameraInput();
      });
  }

  public stopDeviceCameraInput() {
    this.cameraInputActive = false;
    this.cameraInputCallback = null;

    if (this.cameraInputVideo) {
      this.cameraInputVideo.pause();
      this.cameraInputVideo.srcObject = null;
      this.cameraInputVideo.remove();
      this.cameraInputVideo = null;
    }

    if (this.cameraInputStream) {
      this.cameraInputStream.getTracks().forEach((track) => track.stop());
      this.cameraInputStream = null;
    }

    if (this.cameraInputCanvas) {
      this.cameraInputCanvas.remove();
      this.cameraInputCanvas = null;
      this.cameraInputContext = null;
    }
  }

  private processCameraInputFrame() {
    if (!this.cameraInputVideo || !this.cameraInputCanvas || !this.cameraInputContext || !this.cameraInputCallback) {
      return;
    }

    const width = this.cameraInputResolution.width;
    const height = this.cameraInputResolution.height;

    this.cameraInputContext.drawImage(this.cameraInputVideo, 0, 0, width, height);
    const imageData = this.cameraInputContext.getImageData(0, 0, width, height);
    const pattern: boolean[][] = [];

    for (let y = 0; y < height; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        const r = imageData.data[offset];
        const g = imageData.data[offset + 1];
        const b = imageData.data[offset + 2];
        const brightness = (r + g + b) / 3;
        row.push(brightness < this.cameraInputThreshold);
      }
      pattern.push(row);
    }

    this.cameraInputCallback(pattern);
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public destroy() {
    this.stopDeviceCameraInput();
    this.controls.dispose();
    if (typeof this.pointerLockControls.dispose === 'function') {
      this.pointerLockControls.dispose();
    }
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
