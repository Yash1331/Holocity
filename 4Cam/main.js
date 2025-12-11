import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

let renderer, scene;
let mainCamera;
let splitCameras = [];
let useSplitView = false;
let city;

 async function loadCity() {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.181.2/examples/jsm/libs/draco/');
  loader.setDRACOLoader(dracoLoader);

  const gltf = await loader.loadAsync('./GLTF/Lowpoly_City.gltf');
  city = gltf.scene;
  city.scale.setScalar(0.3002599999964239);
  city.position.set(0, -1.1707599999964238, 0);
  scene.add(city);
}

init();
animate();

async function init() {
  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202020);

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(10, 20, 10);
  scene.add(dir);

  // Main camera (single full-screen)
  const aspect = window.innerWidth / window.innerHeight;
  mainCamera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
  mainCamera.position.set(0, 5, 10);
  mainCamera.lookAt(0, 0, 0);

  // Create 4 cameras for 360° split view
  createSplitCameras();

  await loadCity();  // load the city after scene/cameras exist

  // Handle resize
  window.addEventListener('resize', onWindowResize);

  // Toggle camera mode with "C"
  window.addEventListener('keydown', (event) => {
    if (event.key === 'c' || event.key === 'C') {
      useSplitView = !useSplitView;
      console.log('Split view:', useSplitView);
    }
  });
}

function createSplitCameras() {
  // Target: 4 cameras around Y, each 90° horizontally.
  // Here we approximate; the key is consistent setup.
  const baseWidth = window.innerWidth / 2;
  const baseHeight = window.innerHeight / 2;
  const aspect = baseWidth / baseHeight;

  // Horizontal FOV per camera
  const hfovDeg = 90;
  const hfov = THREE.MathUtils.degToRad(hfovDeg);
  const vfov = 2 * Math.atan(Math.tan(hfov / 2) / aspect);
  const vfovDeg = THREE.MathUtils.radToDeg(vfov);

  splitCameras = [];

  for (let i = 0; i < 4; i++) {
    const cam = new THREE.PerspectiveCamera(vfovDeg, aspect, 0.1, 1000);
    cam.position.set(0, 5, 0); // place at "center" of scene

    // Rotate around Y by 0, 90, 180, 270 degrees
    const yaw = i * (Math.PI / 2);
    cam.rotation.set(0, yaw, 0);

    splitCameras.push(cam);
  }
}

function onWindowResize() {
  // Update main camera
  mainCamera.aspect = window.innerWidth / window.innerHeight;
  mainCamera.updateProjectionMatrix();

  // Recreate split cameras to keep aspect consistent
  createSplitCameras();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Render single camera or 4-camera split
function render() {
  if (!useSplitView) {
    // One camera, full screen
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.setScissorTest(false);
    renderer.render(scene, mainCamera);
    return;
  }

  // 4 cameras: 2x2 grid on the screen
  renderer.setScissorTest(true);

  const halfW = Math.floor(window.innerWidth / 2);
  const halfH = Math.floor(window.innerHeight / 2);

  // Top-left: camera 0
  renderer.setViewport(0, halfH, halfW, halfH);
  renderer.setScissor(0, halfH, halfW, halfH);
  renderer.render(scene, splitCameras[0]);

  // Top-right: camera 1
  renderer.setViewport(halfW, halfH, halfW, halfH);
  renderer.setScissor(halfW, halfH, halfW, halfH);
  renderer.render(scene, splitCameras[1]);

  // Bottom-left: camera 2
  renderer.setViewport(0, 0, halfW, halfH);
  renderer.setScissor(0, 0, halfW, halfH);
  renderer.render(scene, splitCameras[2]);

  // Bottom-right: camera 3
  renderer.setViewport(halfW, 0, halfW, halfH);
  renderer.setScissor(halfW, 0, halfW, halfH);
  renderer.render(scene, splitCameras[3]);

  renderer.setScissorTest(false);
}

function animate() {
  requestAnimationFrame(animate);
  render();
}
