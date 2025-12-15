import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

export class CameraRig {
  constructor(renderer, scene) {
    this.scene = scene;
    this.renderer = renderer;
    this.aspectRatio = 4384 / 1000;
    this.rig = new THREE.Group();

    this.frontCamera = this.createCamera(0);
    this.backCamera = this.createCamera(Math.PI);

    this.povCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.povCamera.position.set(0, 2, 5);

    this.rig.add(this.frontCamera, this.backCamera);
    this.scene.add(this.rig);

    this.currentMode = 'pov'; // or 'rig'

    this.initControls();
    this.initGUI();
  }

  createCamera(rotationY) {
    const fov = 180; // horizontal FOV
    const vfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov / 2)) / this.aspectRatio);
    const vfovDeg = THREE.MathUtils.radToDeg(vfov);

    const cam = new THREE.PerspectiveCamera(vfovDeg, this.aspectRatio, 0.1, 1000);
    cam.rotation.y = rotationY;
    cam.position.set(0, 2, 0);
    return cam;
  }

  initControls() {
    this.rigSpeed = 0.2;
    this.keys = {};

    window.addEventListener('keydown', e => this.keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', e => this.keys[e.key.toLowerCase()] = false);
  }

  updateMovement() {
    const dir = new THREE.Vector3();

    if (this.keys['w']) dir.z -= this.rigSpeed;
    if (this.keys['s']) dir.z += this.rigSpeed;
    if (this.keys['a']) dir.x -= this.rigSpeed;
    if (this.keys['d']) dir.x += this.rigSpeed;

    this.rig.position.add(dir);
    this.povCamera.position.add(dir);
  }

  initGUI() {
    const gui = new GUI();
    const params = {
      frontFOV: 180,
      backFOV: 180,
      switchCamera: () => this.toggleMode()
    };

    gui.add(params, 'frontFOV', 60, 180).onChange(v => this.frontCamera.fov = v);
    gui.add(params, 'backFOV', 60, 180).onChange(v => this.backCamera.fov = v);
    gui.add(params, 'switchCamera');

    gui.close();
  }

  toggleMode() {
    this.currentMode = this.currentMode === 'pov' ? 'rig' : 'pov';
  }

  getActiveCameras() {
    if (this.currentMode === 'rig') {
      return [this.frontCamera, this.backCamera];
    }
    return [this.povCamera];
  }

  update() {
    this.updateMovement();
    this.frontCamera.updateProjectionMatrix();
    this.backCamera.updateProjectionMatrix();
    this.povCamera.updateProjectionMatrix();
  }
}
