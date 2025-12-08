import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
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
  sky.material.uniforms['turbidity'].value = 2.8;
  sky.material.uniforms['rayleigh'].value = 2;
  sky.material.uniforms['mieCoefficient'].value = 0.002;
  sky.material.uniforms['mieDirectionalG'].value = 0.988;

    const sun = new THREE.Vector3();
    const phi = THREE.MathUtils.degToRad( 90 - 45 );
    const theta = THREE.MathUtils.degToRad( 105 );
  
  sun.setFromSphericalCoords( 1, phi, theta );
  sky.material.uniforms[ 'sunPosition' ].value.copy( sun );

  // Load low-poly city from GLTF with Draco compression
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.181.2/examples/jsm/libs/draco/');
  loader.setDRACOLoader(dracoLoader);

  const gltf = await loader.loadAsync('./GLTF/Lowpoly_City.gltf');
  city = gltf.scene;
  city.scale.setScalar(0.3002599999964239);
  city.position.set(0, -1.3677399999856947, 0);
  scene.add(city);
}
