// Minimal world: city.glb + procedural sky + optional fog

import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Load your city/world GLB
export async function loadCity(scene) {
  const loader = new GLTFLoader();

  // Adjust path for your structure / GitHub Pages
  // e.g. '/your-repo/assets/city.glb' or './assets/city.glb'
  const gltf = await loader.loadAsync('./city.glb');

  const city = gltf.scene;

  // Tweak transform so the city sits nicely in front of the camera
  city.position.set(0, -0.15, 0);
  city.rotation.set(0, 0, 0);
  city.scale.set(0.75, 0.75, 0.75);

  // Make meshes cast/receive shadows if you use lights + shadows
  city.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      // Optional: ensure correct color space
      if (obj.material && obj.material.map) {
        obj.material.map.encoding = THREE.sRGBEncoding;
      }
    }
  });

  scene.add(city);
  return city;
}

// Create procedural sky dome
export function createSky(scene) {
  const sky = new Sky();
  sky.scale.setScalar(450000);
  scene.add(sky);
  return sky;
}

// Optional: enable fog on the scene for atmospheric depth
export function enableFog(scene, color = 0x222233, near = 10, far = 400) {
  scene.fog = new THREE.Fog(color, near, far);
}

// Animate sky over timeOfDay in [0, 24)
export function updateSky(sky, timeOfDay) {
  const sky_uniforms = sky.material.uniforms;

  let elevation, turbidity, rayleigh;

  if (timeOfDay >= 6 && timeOfDay < 8) {
    // Dawn
    const t = (timeOfDay - 6) / 2;
    elevation = THREE.MathUtils.lerp(-5, 40, t);
    turbidity = THREE.MathUtils.lerp(5, 0.3, t);
    rayleigh = THREE.MathUtils.lerp(0.5, 0.1, t);
  } else if (timeOfDay >= 8 && timeOfDay < 16) {
    // Day
    elevation = 40;
    turbidity = 0.3;
    rayleigh = 0.1;
  } else if (timeOfDay >= 16 && timeOfDay < 18) {
    // Dusk
    const t = (timeOfDay - 16) / 2;
    elevation = THREE.MathUtils.lerp(40, -5, t);
    turbidity = THREE.MathUtils.lerp(0.3, 8, t);
    rayleigh = THREE.MathUtils.lerp(0.1, 0.5, t);
  } else {
    // Night
    elevation = -10;
    turbidity = 10;
    rayleigh = 0.5;
  }

  sky_uniforms['turbidity'].value = turbidity;
  sky_uniforms['rayleigh'].value = rayleigh;
  sky_uniforms['mieCoefficient'].value = 0.005;
  sky_uniforms['mieDirectionalG'].value = 0.8;

  const sun = new THREE.Vector3();
  const azimuth = 180;
  const phi = THREE.MathUtils.degToRad(90 - elevation);
  const theta = THREE.MathUtils.degToRad(azimuth);
  sun.setFromSphericalCoords(1, phi, theta);
  sky_uniforms['sunPosition'].value.copy(sun);
}
