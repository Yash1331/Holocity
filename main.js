// main.js
// Minimal version: city + avatars walking + unique animations + day/night sky

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { GVRM } from 'gvrm';
import { createSky, updateSky, loadCity, enableFog } from './scene.js';
import { Walker } from './walker.js';

// UI
let width = window.innerWidth;
let height = window.innerHeight;

// Params
const params = new URL(window.location.href).searchParams;

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);

// Camera
const camera = new THREE.PerspectiveCamera(65.0, width / height, 0.01, 2000.0);
camera.position.set(2.0, 6.0, 12.0);
camera.aspect = width / height;
camera.updateProjectionMatrix();

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.screenSpacePanning = true;
controls.target.set(0.0, 0.8, 0.0);
controls.minDistance = 0.1;
controls.maxDistance = 50;
controls.enableDamping = true;
controls.enableZoom = false;
controls.enablePan = false;
controls.update();

const controls2 = new TrackballControls(camera, renderer.domElement);
controls2.noRotate = true;
controls2.target.set(0.0, 0.4, 0.0);
controls2.noPan = false;
controls2.noZoom = false;
controls2.zoomSpeed = 0.25;
controls2.useDummyMouseWheel = true;
controls2.update();

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Fog
enableFog(scene, 0x050510, 30, 600);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const light = new THREE.DirectionalLight(0xffffff, Math.PI);
light.position.set(10.0, 10.0, 10.0);
scene.add(light);

// Sky
let sky = createSky(scene);

// City
let city = null;
loadCity(scene).then(c => {
  city = c;
  console.log('City loaded', city);
}).catch(err => {
  console.error('Failed to load city:', err);
});

// Time system (accelerated time, 24 hours in 1 real minute)
let virtualTime = 8;             // Start at 08:00
const timeSpeed = 24 / 60;       // 24 hours / 60 seconds

// Animations and avatars
const fbxFiles = [
  './assets/Breathing.fbx',
  './assets/Capoeira.fbx',
  './assets/Listening.fbx',
  './assets/Shrugging.fbx',
  './assets/Texting.fbx',
  './assets/Warrior.fbx',
  './assets/Around.fbx'
];

const gvrmFiles = [
  './assets/sample1.gvrm',
  './assets/sample2.gvrm',
  './assets/sample3.gvrm',
  './assets/sample4.gvrm',
  './assets/sample5.gvrm',
  './assets/sample6.gvrm',
  './assets/sample7.gvrm',
  './assets/sample8.gvrm',
  './assets/sample9.gvrm'
];

// Limit avatar count to not exceed gvrmFiles length
const requestedN = parseInt(params.get('n')) || 4;
let N = Math.min(requestedN, gvrmFiles.length); // Max 9 avatars

// Track animation index for each model
const modelAnimations = [];

const gvrms = [];
const walkers = [];
let loadCount = 0;
let totalLoadCount = N;
let allModelsReady = false;

// Simple loading display (optional; remove if unused)
const loadDisplay = document.getElementById('loaddisplay');

function updateLoadingDisplay() {
  if (!loadDisplay) return;
  const percentage = Math.floor((loadCount / totalLoadCount) * 100);
  loadDisplay.textContent = percentage + '%';
}

// Shuffle FBX indices so animations are unique per avatar
function shuffleAnimations() {
  const indices = [...Array(fbxFiles.length).keys()];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

// Generate random position around center
function generateRandomPosition(boundary) {
  const x = (Math.random() - 0.5) * boundary * 2;
  const z = (Math.random() - 0.5) * boundary * 2;
  return { x, z };
}

// Load avatars and assign unique animations
async function loadAllModels() {
  const boundary = 11.25;
  const animOrder = shuffleAnimations(); // unique animation per avatar until list exhausted

  for (let i = 0; i < N; i++) {
    const fileName = gvrmFiles[i].split('/').pop();
    const promise = GVRM.load(gvrmFiles[i], scene, camera, renderer, fileName);

    promise.then(async (gvrm) => {
      const pos = generateRandomPosition(boundary);
      const randomX = pos.x;
      const randomZ = pos.z;
      const randomY = 0;

      const randomRotationY = (Math.random() - 0.5) * Math.PI * 2;

      const vrmScene = gvrm.character.currentVrm.scene;
      vrmScene.position.set(randomX, randomY, randomZ);
      vrmScene.rotation.y = randomRotationY;

      const characterIndex = gvrms.length;
      gvrms.push(gvrm);

      // Pick animation index (wrap if more avatars than fbx files)
      const animIndex = animOrder[characterIndex % animOrder.length];
      modelAnimations.push(animIndex);

      // Create Walker for each avatar
      const walker = new Walker(gvrm, characterIndex);
      walkers.push(walker);

      // Load chosen FBX animation and init Walker
      await gvrm.changeFBX(fbxFiles[animIndex]);
      loadCount++;
      updateLoadingDisplay();
      walker.initAnimations();

      if (loadCount === totalLoadCount) {
        allModelsReady = true;
      }
    });

    await promise;
  }
}

// Optional helper: change animation on a single avatar
async function setModelAnimation(gvrm, animationIndex) {
  if (gvrm && gvrm.isReady && !gvrm.character.isLoading()) {
    await gvrm.changeFBX(fbxFiles[animationIndex]);
  }
}

// Render order tweak for Gaussian splats (keep if you still use those)
function updateRenderOrder() {
  if (!allModelsReady || gvrms.length === 0) return;

  const cameraPosition = camera.position.clone();

  const modelDistances = gvrms.map((gvrm, index) => {
    if (!gvrm || !gvrm.isReady || !gvrm.character || !gvrm.character.currentVrm) {
      return { index, distance: Infinity };
    }
    const modelPosition = gvrm.character.currentVrm.scene.position.clone();
    const distance = modelPosition.distanceTo(cameraPosition);
    return { index, distance };
  });

  modelDistances.sort((a, b) => b.distance - a.distance);

  modelDistances.forEach((model, sortedIndex) => {
    const { index } = model;
    const gvrm = gvrms[index];
    if (
      gvrm &&
      gvrm.isReady &&
      gvrm.gs &&
      gvrm.gs.viewer &&
      gvrm.gs.viewer.viewer &&
      gvrm.gs.viewer.viewer.splatMesh
    ) {
      gvrm.gs.viewer.viewer.splatMesh.renderOrder = sortedIndex;
    }
  });
}

// Resize handling
window.addEventListener('resize', () => {
  width = window.innerWidth;
  height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
});

// Space key: pause/resume all animations
let stateAnim = "play";
window.addEventListener('keydown', (event) => {
  if (event.code === "Space") {
    if (stateAnim === "play") {
      stateAnim = "pause";
      for (const gvrm of gvrms) {
        if (gvrm && gvrm.character && gvrm.character.action) {
          gvrm.character.action.stop();
        }
      }
    } else {
      stateAnim = "play";
      for (const gvrm of gvrms) {
        if (gvrm && gvrm.character && gvrm.character.action) {
          gvrm.character.action.reset();
          gvrm.character.action.play();
        }
      }
    }
  }
});

// Main loop
function animate() {
  if (!allModelsReady) {
    requestAnimationFrame(animate);
    return;
  }

  // Advance virtual time
  virtualTime += timeSpeed / 60; // timeSpeed per second; assume ~60fps
  if (virtualTime >= 24) {
    virtualTime -= 24;
  }

  // Update sky for time-of-day
  updateSky(sky, virtualTime);

  // Update walkers and avatars
  for (let i = 0; i < gvrms.length; i++) {
    const gvrm = gvrms[i];
    if (gvrm && gvrm.isReady) {
      if (walkers[i]) {
        walkers[i].update();
      }
      gvrm.update();
    }
  }

  updateRenderOrder();
  controls.update();
  controls2.update();

  renderer.setViewport(0, 0, width, height);
  renderer.setScissor(0, 0, width, height);
  renderer.setScissorTest(true);
  renderer.render(scene, camera);
  renderer.setScissorTest(false);

  requestAnimationFrame(animate);
}

// Kick everything off
loadAllModels();
animate();
