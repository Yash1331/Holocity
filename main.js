// Copyright (c) 2025 naruya
// Licensed under the MIT License. See LICENSE file in the project root for full license information.


import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { GVRM, GVRMUtils } from 'gvrm';
import { FPSCounter } from './utils/fps.js';
import { createSky, updateSky, loadCity, enableFog } from './scene.js';
import { Walker } from './walker.js';

// UI
let width = window.innerWidth;
let height = window.innerHeight;

// params
const params = new URL(window.location.href).searchParams;

// renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
document.body.appendChild(renderer.domElement);
renderer.setSize(width, height);

// camera
const camera = new THREE.PerspectiveCamera(65.0, width / height, 0.01, 2000.0);
camera.position.set(2.0, 6.0, 12.0);
camera.aspect = width / height;
camera.updateProjectionMatrix();

// controls
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

// scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Fog:
enableFog(scene, 0x050510, 30, 600); // tweak to taste

// Ambient light (constant illumination)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Directional light
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
let virtualTime = 8; // Start at 8:00 AM (in hours, 0-24)
const timeSpeed = 24 / 60; // 60 real seconds = 24 virtual hours, so 1 second = 0.4 hours = 24 minutes

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

// Character name mapping (sample filename -> display name)
const characterNames = {
  'sample1.gvrm': 'しゅりくん',
  'sample2.gvrm': 'すわさん',
  'sample3.gvrm': '鈴木さん',
  'sample4.gvrm': 'まつゆー',
  'sample5.gvrm': '清水さん',
  'sample6.gvrm': 'ふぉとんさん',
  'sample7.gvrm': '大先生',
  'sample8.gvrm': 'YouTuber',
  'sample9.gvrm': 'なまちゃん'
};

// Limit avatar count to not exceed gvrmFiles length
const requestedN = parseInt(params.get('n')) || 4;
let N = Math.min(requestedN, gvrmFiles.length); // Max 9 avatars

// Track current animation state for each model
const modelAnimations = [];

const gvrms = [];
const walkers = [];
let loadCount = 0;
let totalLoadCount = N;
window.gvrms = gvrms;

let allModelsReady = false;

const loadDisplay = document.getElementById('loaddisplay');

// Speech bubble system
const speechBubbles = [];
let lastTwoHourBlock = Math.floor(8 / 2); // Start at 8:00 AM (same as virtualTime), track 2-hour blocks
let gagsData = null;
let lastRandomSpeechTime = 0; // Track last random speech time to prevent multiple speeches

// Object detection system for Character 1
const detectableObjects = [];
const detectionCooldowns = new Map(); // Track when we last detected each object
const DETECTION_COOLDOWN = 5000; // 5 seconds cooldown per object
let detectionComments = null; // Comments for detected objects

// Function to register detectable objects
function registerDetectableObject(name, object3D) {
  detectableObjects.push({ name, object: object3D });
}

// Function to check if object is in character's view using position and direction
function isObjectInCharacterView(character, object3D, maxDistance = 15, minDotProduct = 0.5) {
  // Get character's position and forward direction
  const characterPos = character.position.clone();
  const characterForward = new THREE.Vector3(0, 0, -1); // Default forward is -Z
  characterForward.applyQuaternion(character.quaternion);

  // Get object position
  const objectPos = object3D.position.clone();

  // Calculate vector from character to object
  const toObject = objectPos.clone().sub(characterPos);
  const distance = toObject.length();

  // Check if within max distance
  if (distance > maxDistance) {
    return false;
  }

  // Normalize the vector
  toObject.normalize();

  // Check if object is in front of character (dot product > threshold)
  // dot product of 1 = directly ahead, 0.5 ≈ 60 degree cone
  const dotProduct = characterForward.dot(toObject);

  return dotProduct > minDotProduct;
}

// Function to check visible objects and make Character 1 comment
function checkVisibleObjects() {
  if (!gvrms[0] || !gvrms[0].isReady || !gvrms[0].character || !gvrms[0].character.currentVrm) return;
  if (!detectionComments) return; // Wait for comments to load
  if (!walkers[0]) return; // Wait for walker to be initialized

  const character1 = gvrms[0].character.currentVrm.scene;
  const now = Date.now();
  const walker = walkers[0];

  // Check if playing special animation (not idle or walk)
  if (walker.isPlayingSpecial && walker.currentSpecialAnimation) {
    // Use animation comment instead of object detection
    const animComment = detectionComments[walker.currentSpecialAnimation];
    if (animComment) {
      // Only show once per animation (check cooldown)
      const lastDetection = detectionCooldowns.get(`anim_${walker.currentSpecialAnimation}`);
      if (!lastDetection || (now - lastDetection) > DETECTION_COOLDOWN) {
        showSpeechBubble(0, animComment);
        detectionCooldowns.set(`anim_${walker.currentSpecialAnimation}`, now);
        addTimelineEvent(virtualTime, `しゅり: ${animComment}`);
      }
    }
    return; // Don't check objects while playing special animation
  }

  for (const detectable of detectableObjects) {
    const { name, object } = detectable;

    // Skip if object doesn't exist
    if (!object) continue;

    // Check cooldown
    const lastDetection = detectionCooldowns.get(name);
    if (lastDetection && (now - lastDetection) < DETECTION_COOLDOWN) {
      continue;
    }

    // Check if object is in character's view (using position and direction)
    if (isObjectInCharacterView(character1, object)) {
      // Object is in view! Make Character 1 comment with additional comment
      const comment = detectionComments[name] || '';
      const fullComment = comment ? `あ、${name}だ。${comment}` : `あ、${name}だ`;
      showSpeechBubble(0, fullComment);
      detectionCooldowns.set(name, now);

      // Add to timeline
      addTimelineEvent(virtualTime, `しゅり: ${fullComment}`);
    }
  }
}

// Function to shuffle and assign animations without duplicates
function shuffleAnimations() {
  const indices = [...Array(fbxFiles.length).keys()];

  // Shuffle indices using Fisher-Yates algorithm
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices;
}

// Generate random position within boundary
function generateRandomPosition(boundary) {
  const x = (Math.random() - 0.5) * boundary * 2;
  const z = (Math.random() - 0.5) * boundary * 2;
  return { x, z };
}

async function loadAllModels() {
  const boundary = 11.25; // 1.5x larger boundary (same as walker)

  for (let i = 0; i < N; i++) {
    const fileName = gvrmFiles[i].split('/').pop();
    const promise = GVRM.load(gvrmFiles[i], scene, camera, renderer, fileName);

    promise.then((gvrm) => {
      // Generate random initial position
      const pos = generateRandomPosition(boundary);
      const randomX = pos.x;
      const randomZ = pos.z;
      const randomY = 0;

      // Generate random initial rotation
      const randomRotationY = (Math.random() - 0.5) * Math.PI * 2; // -π to π

      gvrm.character.currentVrm.scene.position.set(randomX, randomY, randomZ);
      gvrm.character.currentVrm.scene.rotation.y = randomRotationY;

      const characterIndex = gvrms.length;
      gvrms.push(gvrm);
      // Set initial animation to Idle
      modelAnimations.push(0);

      // Create Walker
      const walker = new Walker(gvrm, i);
      walkers.push(walker);

      // Load Idle.fbx then initialize Walker
      gvrm.changeFBX('./assets/Idle.fbx').then(() => {
        loadCount++;
        updateLoadingDisplay();

        // Initialize Walker animations
        walker.initAnimations();

        if (loadCount === totalLoadCount) {
          allModelsReady = true;
        }
      });
    });
    await promise;
  }
}

function updateLoadingDisplay() {
  const percentage = Math.floor((loadCount / totalLoadCount) * 100);
  loadDisplay.textContent = percentage + '%';
}

// Function to set animation for individual model
async function setModelAnimation(gvrm, animationIndex) {
  if (gvrm && gvrm.isReady && !gvrm.character.isLoading()) {
    await gvrm.changeFBX(fbxFiles[animationIndex]);
  }
}


loadAllModels();

const fpsc = new FPSCounter();

let stateAnim = "play";

// Get center character (index 0)
  const centerGVRM = gvrms[0];
  if (!centerGVRM || !centerGVRM.isReady) {
    console.error('Center character not ready');
    return;
  }

  try {
    // Read file as Blob
    const blob = new Blob([file], { type: file.type });
    const url = URL.createObjectURL(blob);

    // Save current animation index
    const currentAnimIndex = modelAnimations[0];

    // Remove existing GVRM
    await centerGVRM.remove(scene);

    // Load new GVRM
    const newGVRM = await GVRM.load(url, scene, camera, renderer, file.name);

    // Set position (center position)
    newGVRM.character.currentVrm.scene.position.set(0, 0, 1);

    // Update gvrms array
    gvrms[0] = newGVRM;

    // Apply current animation
    await newGVRM.changeFBX(fbxFiles[currentAnimIndex]);

    // Release URL
    URL.revokeObjectURL(url);

    console.log(`Replaced center character with: ${file.name}`);
  } catch (error) {
    console.error('Failed to load dropped GVRM:', error);
  }
;

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

    if (gvrm && gvrm.isReady && gvrm.gs && gvrm.gs.viewer && gvrm.gs.viewer.viewer && gvrm.gs.viewer.viewer.splatMesh) {
      gvrm.gs.viewer.viewer.splatMesh.renderOrder = sortedIndex;
    }
  });
}

function animate() {
  if (!allModelsReady) {
    requestAnimationFrame(animate);
    return;
  }

  // Update virtual time (1 frame ≈ 0.016s at 60fps, so time advances by ~0.016 * timeSpeed per frame)
  virtualTime += timeSpeed / 60; // timeSpeed is per second, so divide by 60 for per-frame

  // Check if a full day has passed (24 hours)
  if (virtualTime >= 24) {
    virtualTime -= 24; // Wrap around to 0 after 24 hours


    lastDayTime = virtualTime;
  }

  // Update sky based on time
  updateSky(sky, virtualTime);

  // Update analog clock
  const hours = Math.floor(virtualTime) % 12; // 12-hour format (integer part only)
  const minutes = (virtualTime - Math.floor(virtualTime)) * 60;

  const hourHand = document.getElementById('hour-hand');
  const minuteHand = document.getElementById('minute-hand');

  if (hourHand && minuteHand) {
    // Hour hand: 30 degrees per hour + 0.5 degrees per minute
    const hourDegrees = (hours * 30) + (minutes * 0.5);
    // Minute hand: 6 degrees per minute
    const minuteDegrees = minutes * 6;

    hourHand.style.transform = `rotate(${hourDegrees}deg)`;
    minuteHand.style.transform = `rotate(${minuteDegrees}deg)`;
  }

  for (let i = 0; i < gvrms.length; i++) {
    const gvrm = gvrms[i];
    if (gvrm && gvrm.isReady) {
      // Update Walker
      if (walkers[i]) {
        walkers[i].update();
      }

      // Update entire GVRM (includes character.update() and updateByBones())
      gvrm.update();
    }
  }

  updateRenderOrder();
  controls.update();
  controls2.update();

  // Render main view
  renderer.setViewport(0, 0, width, height);
  renderer.setScissor(0, 0, width, height);
  renderer.setScissorTest(true);
  renderer.render(scene, camera);

  renderer.setScissorTest(false);

}

animate();
