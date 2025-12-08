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
const camera = new THREE.PerspectiveCamera(
  65,
  window.innerWidth / window.innerHeight,
  0.01,
  100
);
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

// ---------- DEBUG GIZMO FOR CITY ONLY ----------

// Create TransformControls and add once
const transformControls = new TransformControls(camera, renderer.domElement);
console.log(transformControls);
scene.add(transformControls);

// Attach to city once it is available
const waitForCity = () => {
  if (city) {
    transformControls.attach(city);

    // Start in translate mode for positioning
    transformControls.setMode('translate');

    // Adjust gizmo size if needed (handles size vs. scene scale)
    transformControls.setSize(1.0); // tweak if city is very large/small
  } else {
    requestAnimationFrame(waitForCity);
  }
};
waitForCity();

// Disable OrbitControls while dragging the gizmo to avoid conflicts
transformControls.addEventListener('dragging-changed', (event) => {
  controls.enabled = !event.value;
});

// If you ever want to change mode from code (no key listeners):
// transformControls.setMode('scale');
// transformControls.setMode('rotate');

// ---------- MOVEMENT / INPUT FOR AVATAR ----------

const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

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

// Main loop (no async needed)
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const deltaTime = now - lastTime;
  lastTime = now;
  const deltaScale = deltaTime / (1000 / targetFPS);

  gvrm.update();
  controls.update();

  const isBoosting = keys['shift'] || keys['arrowdown'];
  const currentSpeed = (isBoosting ? speed * speedBoost : speed) * deltaScale;
  const currentRotationSpeed =
    (isBoosting ? rotationSpeed * speedBoost : rotationSpeed) * deltaScale;

  // Avatar movement (unchanged), still allowed even while gizmo exists.
  // Only blocked while the user is actively dragging the gizmo,
  // which is the usual pattern when combining TransformControls and OrbitControls. [web:24]
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
	renderer.toneMappingExposure = 0.1764;
  renderer.render(scene, camera);
});
