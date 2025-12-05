import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GVRM } from 'gvrm';
import { buildScene, city } from './scene.js';

// Renderer and scene
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(2.4, 2.4, 4);
camera.lookAt(0, 1, 0);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.enablePan = false;
controls.enableZoom = false;
controls.update();

// Build world (lights, sky, city)
await buildScene(scene);

// GVRM avatar
let gvrm = await GVRM.load('./avatars/sample.gvrm', scene, camera, renderer);
let character = gvrm.character.currentVrm.scene;
character.position.set(0, 0.05, 0);

await gvrm.changeFBX('./animations/Walking.fbx');
gvrm.character.action.play();
gvrm.character.transitionDuration = 0.2;

// ---------- DEBUG GIZMO FOR CITY (MOVE + SCALE) ----------

// Create TransformControls for the city
const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.visible = false;        // start hidden
transformControls.enabled = false;
transformControls.setMode('translate');   // default mode
scene.add(transformControls);

// Prevent OrbitControls from interfering while dragging the gizmo
transformControls.addEventListener('mouseDown', () => {
  controls.enabled = false;
});
transformControls.addEventListener('mouseUp', () => {
  controls.enabled = true;
});

// Toggle debug gizmo with key: G
let debugGizmoEnabled = false;
window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();

  // Toggle gizmo on/off
  if (key === 'g') {
    debugGizmoEnabled = !debugGizmoEnabled;

    if (debugGizmoEnabled && city) {
      transformControls.attach(city);
      transformControls.visible = true;
      transformControls.enabled = true;
      console.log('Debug gizmo ON: use mouse to move/scale the city');
    } else {
      transformControls.detach();
      transformControls.visible = false;
      transformControls.enabled = false;
      console.log('Debug gizmo OFF');
    }
  }

  // While gizmo is active, allow switching between move/scale modes
  if (debugGizmoEnabled) {
    if (key === '1') {
      transformControls.setMode('translate'); // move
      console.log('Gizmo mode: translate');
    }
    if (key === '2') {
      transformControls.setMode('scale'); // scale
      console.log('Gizmo mode: scale');
    }
  }
});

// ---------- MOVEMENT / INPUT FOR AVATAR ----------

const keys = {};
window.addEventListener('keydown', (e) => (keys[e.key.toLowerCase()] = true));
window.addEventListener('keyup', (e) => (keys[e.key.toLowerCase()] = false));

let lastTime = performance.now();
const targetFPS = 60;
const speed = 0.02;
const speedBoost = 4.0;
const rotationSpeed = 0.05;
let currentAnimation = 'walking';
let rot0 = character.rotation0.clone();

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Main loop
renderer.setAnimationLoop(async () => {
  const now = performance.now();
  const deltaTime = now - lastTime;
  lastTime = now;
  const deltaScale = deltaTime / (1000 / targetFPS);

  gvrm.update();
  controls.update();
  transformControls.updateMatrixWorld(); // keep gizmo in sync

  const isBoosting = keys['shift'] || keys['arrowdown'];
  const currentSpeed = (isBoosting ? speed * speedBoost : speed) * deltaScale;
  const currentRotationSpeed = (isBoosting ? rotationSpeed * speedBoost : rotationSpeed) * deltaScale;

  // Disable avatar movement while dragging gizmo, but allow when gizmo is idle
  if (!transformControls.dragging) {
    if (keys['a']) character.rotation.y += currentRotationSpeed;
    if (keys['d']) character.rotation.y -= currentRotationSpeed;

    const angle = character.rotation.y - rot0.y;
    if (keys['w']) {
      character.position.x += currentSpeed * Math.sin(angle);
      character.position.z += currentSpeed * Math.cos(angle);
    }
    if (keys['s']) {
      character.position.x -= currentSpeed * Math.sin(angle);
      character.position.z -= currentSpeed * Math.cos(angle);
    }
  }

  renderer.render(scene, camera);
});
