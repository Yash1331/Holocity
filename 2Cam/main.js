import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { CameraRig } from './camera.js';

let renderer, scene, city, rig;

const desiredWidth = 8768;
const desiredHeight = 1000;

init();
animate();

async function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(desiredWidth, desiredHeight, false);
  renderer.setPixelRatio(1);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202020);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(10, 20, 10);
  scene.add(ambient, dir);

  rig = new CameraRig(renderer, scene);
  await loadCity();

  window.addEventListener('resize', onResize);
}

async function loadCity() {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.181.2/examples/jsm/libs/draco/');
  loader.setDRACOLoader(dracoLoader);
  loader.setMeshoptDecoder(MeshoptDecoder);

  const gltf = await loader.loadAsync('./City/City.gltf');
  city = gltf.scene;
  city.scale.setScalar(0.3);
  city.position.set(0, -1.2, 0);
  scene.add(city);
}

function onResize() {
  renderer.setSize(desiredWidth, desiredHeight);
}

function render() {
  const cams = rig.getActiveCameras();

  if (rig.currentMode === 'pov') {
    renderer.render(scene, cams[0]);
  } else {
    renderer.setScissorTest(true);
    const halfWidth = desiredWidth / 2;

    // Front camera
    renderer.setViewport(0, 0, halfWidth, window.innerHeight);
    renderer.setScissor(0, 0, halfWidth, window.innerHeight);
    renderer.render(scene, cams[0]);

    // Back camera
    renderer.setViewport(halfWidth, 0, halfWidth, window.innerHeight);
    renderer.setScissor(halfWidth, 0, halfWidth, window.innerHeight);
    renderer.render(scene, cams[1]);

    renderer.setScissorTest(false);
  }
}

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

function animate() {
  requestAnimationFrame(animate);
  rig.update();
  render();
}
