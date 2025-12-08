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

  // Load low-poly city from GLTF
  const loader = new GLTFLoader();

  // Optional: if needed, set a base path for external bin/textures
  // loader.setPath('./assets/GLTF/');

  return new Promise((resolve, reject) => {
    loader.load(
      // If setPath is NOT used, give the full relative path here:
      './GLTF/Lowpoly_City.gltf',
      (gltf) => {
        city = gltf.scene;
        city.scale.set(0.5, 0.5, 0.5);     // tweak as needed
        city.position.set(0, -1, 0);       // tweak as needed
        scene.add(city);
        resolve(city);
      },
      undefined,
      reject
    );
  });
}
