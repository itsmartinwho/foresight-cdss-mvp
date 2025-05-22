"use client";

import { useEffect, useRef } from 'react'; 
import * as THREE from 'three';

const globalAny = globalThis as any; // Keep this for future use if needed

// noiseGLSL constant is NOT defined here for this specific magenta test,
// as we've removed its usage from the shader string below.

const vertexShader = `// #version 300 es <--- REMOVED
precision highp float;
in vec3 position; 
in vec2 uv;       
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix; 
out vec2 vUv; 
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `// #version 300 es <--- REMOVED
precision highp float;
// ${noiseGLSL} // THIS LINE IS NOW EFFECTIVELY COMMENTED OUT or REMOVED if noiseGLSL const is missing
in vec2 vUv;
uniform vec2 u_resolution; 
uniform float u_time;     
uniform vec3 u_viewDirection; 
out vec4 out_FragColor;
void main() {
  out_FragColor = vec4(1.0, 0.0, 1.0, 1.0); // Bright Magenta, Opaque
}
`;

interface PlasmaSingleton {
  canvas: HTMLCanvasElement;
  destroy: () => void;
  renderer?: THREE.WebGLRenderer;
}

// paintStaticGradient function can be kept from previous versions
function paintStaticGradient(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const gradient = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, 0,
    canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 1.5
  );
  gradient.addColorStop(0.0, 'rgba(214,191,254,0.3)');
  gradient.addColorStop(0.25,'rgba(179,209,255,0.15)');
  gradient.addColorStop(0.75,'rgba(236,239,241,0.1)');
  gradient.addColorStop(1.0, 'rgba(153,246,228,0.3)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}


export default function PlasmaBackground() {
  const isInitialized = useRef(false); 

  useEffect(() => {
    if (isInitialized.current) {
      console.log("PlasmaBackground: Already initialized, skipping run.");
      return;
    }
    console.log("PlasmaBackground: First time initialization running...");

    const prefersReducedMotion = false; 
    console.log("PlasmaBackground: Prefers Reduced Motion (FORCED FALSE for test):", prefersReducedMotion);

    if (prefersReducedMotion) {
      return;
    }

    let canvas = document.getElementById('plasma-bg') as HTMLCanvasElement | null;
    if (canvas) {
      console.log("PlasmaBackground: Removing existing plasma-bg canvas.");
      canvas.remove();
    }
    
    canvas = document.createElement('canvas');
    canvas.id = 'plasma-bg';
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '0'; 
    canvas.style.pointerEvents = 'none';
    // canvas.style.backgroundColor = 'rgba(0,255,0,0.2)'; // DEBUG: Green transparent BG 

    document.body.prepend(canvas);
    console.log("PlasmaBackground: Canvas created and prepended.");

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0x000000, 0); 

    console.log("PlasmaBackground: Renderer initialized. WebGL2:", renderer.capabilities.isWebGL2);

    const scene = new THREE.Scene();
    // scene.background = new THREE.Color(0x0000ff); // DEBUG: Blue scene background

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1; 

    const geometry = new THREE.PlaneGeometry(2, 2);
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_viewDirection: { value: new THREE.Vector3(0, 0, 1) }
    };

    const material = new THREE.RawShaderMaterial({
      vertexShader,       
      fragmentShader,     
      uniforms,
      transparent: true, 
      glslVersion: THREE.GLSL3
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const clock = new THREE.Clock();
    let frameId: number;

    function animate() {
      frameId = requestAnimationFrame(animate);
      uniforms.u_time.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    }
    
    console.log("PlasmaBackground: Starting animation loop (FORCED MAGENTA).");
    animate();
    isInitialized.current = true; 

    const currentCanvas = canvas; 

    return () => {
      console.log("PlasmaBackground: Cleanup function running.");
      cancelAnimationFrame(frameId);
      renderer.dispose();
      material.dispose();
      geometry.dispose();
      if (currentCanvas && currentCanvas.parentElement) {
        console.log("PlasmaBackground: Removing canvas from DOM in cleanup.");
        currentCanvas.parentElement.removeChild(currentCanvas);
      }
      isInitialized.current = false; 
      console.log("PlasmaBackground: Cleanup complete.");
    };
  }, []);

  return null;
}