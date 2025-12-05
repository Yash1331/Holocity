import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GVRM } from 'gvrm';
import { buildScene } from './scene.js';

// Renderer and scene
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(2.4, 2.4, 4);
camera.lookAt(0, 1, 0);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.enablePan = false;
controls.enableZoom = false;
controls.update();

// World assets
await buildScene(scene);

// GVRM Avatar
let gvrm = await GVRM.load('./avatars/sample.gvrm', scene, camera, renderer);
let character = gvrm.character.currentVrm.scene;
character.position.set(0, 0.05, 0);

// Animation setup
await gvrm.changeFBX('./animations/Walking.fbx');
gvrm.character.action.play();
gvrm.character.transitionDuration = 0.2;

// Movement and input variables
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

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
renderer.setAnimationLoop(async () => {
  const now = performance.now();
  const deltaTime = now - lastTime;
  lastTime = now;
  const deltaScale = deltaTime / (1000 / targetFPS);

  gvrm.update();
  controls.update();

  const isBoosting = keys['shift'] || keys['arrowdown'];
  const currentSpeed = (isBoosting ? speed * speedBoost : speed) * deltaScale;
  const currentRotationSpeed = (isBoosting ? rotationSpeed * speedBoost : rotationSpeed) * deltaScale;

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

  renderer.render(scene, camera);
});
