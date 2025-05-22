"use client";

import { useEffect, useRef } from 'react'; // Added useRef
import * as THREE from 'three';

const globalAny = globalThis as any;

// --- Keep the shader strings from the previous step where fragmentShader outputs:
// out_FragColor = vec4(1.0, 0.0, 1.0, 1.0); // Bright Magenta, Opaque
// Vertex shader should also be the minimal one.
// For brevity, I'm omitting the full shader strings here, but use the ones that
// were set to output magenta in the fragment shader.

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
// ${noiseGLSL} // Noise not needed for magenta test
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

// paintStaticGradient can be kept as is

export default function PlasmaBackground() {
  const isInitialized = useRef(false); // To prevent re-initialization from StrictMode

  useEffect(() => {
    // ---- SIMPLIFIED INIT LOGIC FOR DEBUGGING ----
    if (isInitialized.current) {
      console.log("PlasmaBackground: Already initialized, skipping run.");
      return;
    }
    console.log("PlasmaBackground: First time initialization running...");

    // const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefersReducedMotion = false; // FORCE ANIMATED PATH for this test
    console.log("PlasmaBackground: Prefers Reduced Motion (FORCED FALSE for test):", prefersReducedMotion);

    if (prefersReducedMotion) {
      // This block should be skipped now
      // paintStaticGradient(canvas); 
      // ...
      return;
    }

    // Cleanup previous canvas if any (helps with HMR issues)
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
    // canvas.style.backgroundColor = 'rgba(0,255,0,0.2)'; // DEBUG: Green transparent BG for canvas itself

    document.body.prepend(canvas);
    console.log("PlasmaBackground: Canvas created and prepended.");

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0x000000, 0); // Clear to transparent black

    console.log("PlasmaBackground: Renderer initialized. WebGL2:", renderer.capabilities.isWebGL2);

    const scene = new THREE.Scene();
    // scene.background = new THREE.Color(0x0000ff); // DEBUG: Blue background FOR THE SCENE

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
      transparent: true, // True because final effect will be transparent
      glslVersion: THREE.GLSL3
      // depthWrite: false, // Often good for transparent effects not to occlude
      // depthTest: false, // "
    });
    // material.blending = THREE.NormalBlending; // Default, but to be sure

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
    isInitialized.current = true; // Mark as initialized

    const currentCanvas = canvas; // Capture canvas for cleanup

    return () => {
      console.log("PlasmaBackground: Cleanup function running.");
      cancelAnimationFrame(frameId);
      // No need to manage globalAny.__plasmaSingleton for this simplified test
      renderer.dispose();
      material.dispose();
      geometry.dispose();
      if (currentCanvas && currentCanvas.parentElement) {
        console.log("PlasmaBackground: Removing canvas from DOM in cleanup.");
        currentCanvas.parentElement.removeChild(currentCanvas);
      }
      isInitialized.current = false; // Reset for potential HMR re-run
      console.log("PlasmaBackground: Cleanup complete.");
    };
  }, []);

  return null;
}