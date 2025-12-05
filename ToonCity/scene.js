import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';

// Export a reference so main.js can access the loaded city
export let city = null;

export async function buildScene(scene) {
  // Lighting
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(5, 10, 7.5);
  scene.add(dirLight);

  // Sky
  const sky = new Sky();
  sky.scale.setScalar(450000);
  scene.add(sky);
  sky.material.uniforms['turbidity'].value = 8;
  sky.material.uniforms['rayleigh'].value = 2;
  sky.material.uniforms['mieCoefficient'].value = 0.005;
  sky.material.uniforms['mieDirectionalG'].value = 0.8;

  const sun = new THREE.Vector3();
  const phi = THREE.MathUtils.degToRad(85);
  const theta = THREE.MathUtils.degToRad(180);
  sun.setFromSphericalCoords(1, phi, theta);
  sky.material.uniforms['sunPosition'].value.copy(sun);

  // Load low-poly city
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load('./models/city_lowpoly.glb', (gltf) => {
      city = gltf.scene;
      city.scale.set(1, 1, 1);
      city.position.set(0, 0, 0); // You’ll fine-tune this with the gizmo
      scene.add(city);
      resolve(city);
    }, undefined, reject);
  });
}
