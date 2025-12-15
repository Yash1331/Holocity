// Minimal world: city.glb + procedural sky + optional fog

import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Load your city/world GLB
export async function loadCity(scene) {
    // Load city from GLTF with Draco compression
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.181.2/examples/jsm/libs/draco/');
    loader.setDRACOLoader(dracoLoader);
    loader.setMeshoptDecoder(MeshoptDecoder);
  
  
    const gltf = await loader.loadAsync('./City/City.gltf');
    city = gltf.scene;
    city.scale.setScalar(1);
    city.position.set(0, -1.1707599999964238, 0);
    scene.add(city);
    return city;
  }
  

// Optional: enable fog on the scene for atmospheric depth
export function enableFog(scene, color = 0x222233, near = 10, far = 400) {
  scene.fog = new THREE.Fog(color, near, far);
}

// skybox texture for background and environment
export function createSky(scene) {
  const loader = new THREE.TextureLoader(); // or RGBELoader for HDR
  loader.load('./assets/skybox.jpeg', (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace; // for r150+, was sRGBEncoding before

  scene.background = texture;      // show as background
  scene.environment = texture;     // optional: reflections for PBR materials
});
}
