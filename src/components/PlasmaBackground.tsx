"use client";

import { useEffect } from 'react';
import ** THREE from 'three';

// Keep noiseGLSL for later
const noiseGLSL = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v)
  { /* ... rest of your snoise function ... */
  const vec2  C = vec2(1.0/6.0, 1.0/3.0);
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; 
  vec3 x3 = x0 - D.yyy;      
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 1.0/7.0; 
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.y;
  vec4 y = y_ *ns.x + ns.y;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 normVal = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= normVal.x;
  p1 *= normVal.y;
  p2 *= normVal.z;
  p3 *= normVal.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
  }
`;

// Explicit GLSL 3.00 ES Vertex Shader - NO LEADING SPACE before #version
const vertexShader = `#version 300 es
precision highp float;

// Attributes from THREE.PlaneGeometry (Three.js provides these if #version is detected correctly)
// If using RawShaderMaterial, you'd declare them yourself.
// With ShaderMaterial and a correct #version pragma, Three.js should still map
// its standard attribute names (position, uv) if they exist in your shader.
in vec3 position;
in vec2 uv;

// Uniforms from Three.js
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

// Varying to pass UV to fragment shader
out vec2 vUv; 

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Explicit GLSL 3.00 ES Fragment Shader - NO LEADING SPACE before #version
const fragmentShader = `#version 300 es
precision highp float;

in vec2 vUv;

uniform vec2 u_resolution;
uniform float u_time;
// uniform vec3 u_viewDirection;

out vec4 out_FragColor;

void main() {
  out_FragColor = vec4(vUv.x, vUv.y, 0.0, 1.0); 
}
`;

interface PlasmaSingleton {
  canvas: HTMLCanvasElement;
  destroy: () => void;
  renderer?: THREE.WebGLRenderer;
}
const globalAny = globalThis as any;

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
  useEffect(() => {
    // The double initialization logs ("Initializing WebGL for PlasmaBackground.")
    // are likely due to React.StrictMode in development, which runs effects twice.
    // This is usually fine and for debugging. The singleton check *should* ideally
    // prevent full re-initialization on the second run, but HMR can complicate this.
    // Let's ensure the destroy logic is robust.

    if (globalAny.__plasmaSingleton) {
      console.log("PlasmaSingleton exists. Forcing destroy for HMR / StrictMode testing.");
      // To handle React StrictMode's double invoke or HMR,
      // ensure previous instance is cleaned up if re-running.
      // This is aggressive for dev, might remove if it causes issues.
      // globalAny.__plasmaSingleton.destroy(); 
      // For now, let's rely on the HMR dispose below or manual refresh for clean state.
      // If you still see double init *without* HMR or strict mode issues later,
      // then the singleton check needs strengthening.
      // For now, we just return if it exists to avoid problems, the main issue is shader.
      return; 
    }
    console.log("No PlasmaSingleton, proceeding with init.");


    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // --- FOR DEBUGGING: ---
    // const prefersReducedMotion = false; 
    // console.log("Prefers Reduced Motion (DEBUG):", prefersReducedMotion);


    const canvas = document.createElement('canvas');
    canvas.id = 'plasma-bg';
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '0';
    canvas.style.pointerEvents = 'none';

    // Defensively remove old canvas if any, before prepending new one
    const existingCanvas = document.getElementById('plasma-bg');
    if (existingCanvas) {
        console.log("Removing existing plasma-bg canvas.");
        existingCanvas.remove();
    }
    document.body.prepend(canvas);

    if (prefersReducedMotion) {
      console.log("Painting static gradient.");
      paintStaticGradient(canvas);
      globalAny.__plasmaSingleton = {
        canvas,
        destroy: () => {
          if (canvas.parentElement) canvas.parentElement.removeChild(canvas);
          globalAny.__plasmaSingleton = null;
          console.log("Static plasma destroyed.");
        },
      } as PlasmaSingleton;
      return;
    }

    console.log("Initializing WebGL for PlasmaBackground.");
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0x000000, 0);

    const isWebGL2 = renderer.capabilities.isWebGL2;
    console.log("Using WebGL 2:", isWebGL2);
    if (!isWebGL2) {
        console.error("CRITICAL: WebGL2 is NOT available. GLSL 3.00 ES shaders will fail.");
        // Fallback or error handling
        paintStaticGradient(canvas);
        globalAny.__plasmaSingleton = { canvas, destroy: () => { if (canvas.parentElement) canvas.parentElement.removeChild(canvas); globalAny.__plasmaSingleton = null; } };
        return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      // No glslVersion needed if #version is correct in strings
    });
    material.blending = THREE.NormalBlending;


    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    (canvas as any).__plasmaUniforms = uniforms;

    const clock = new THREE.Clock();
    let frameId: number;

    function animateLoop() {
      // Robust check if singleton still matches THIS instance's canvas
      if (!globalAny.__plasmaSingleton || globalAny.__plasmaSingleton.canvas !== canvas || !canvas.isConnected) {
        console.log("Animation loop stopping: Singleton changed, canvas detached, or destroyed.");
        if (frameId) cancelAnimationFrame(frameId);
        return;
      }
      uniforms.u_time.value = clock.getElapsedTime();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animateLoop);
    }
    
    console.log("Starting animation loop.");
    frameId = requestAnimationFrame(animateLoop);

    const handleResize = () => {
      if (!renderer) return;
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    const destroy = () => {
      console.log("Destroying PlasmaBackground (WebGL instance). ID: plasma-bg");
      if (frameId) cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      material.dispose();
      if (renderer) renderer.dispose();
      if (canvas.parentElement) canvas.parentElement.removeChild(canvas);
      
      // Only nullify if THIS instance is the one being destroyed
      if (globalAny.__plasmaSingleton && globalAny.__plasmaSingleton.canvas === canvas) {
        globalAny.__plasmaSingleton = null;
        console.log("Global __plasmaSingleton nulled.");
      }
    };

    globalAny.__plasmaSingleton = { canvas, destroy, renderer } as PlasmaSingleton;
    window.addEventListener('beforeunload', destroy, { once: true });
    
    // HMR Cleanup for Next.js
    // This is a bit tricky with singletons. The goal is to clean up the *old* instance.
    const currentModule = module; // Capture current module
    if (currentModule.hot) {
        currentModule.hot.dispose(() => {
            console.log("HMR disposing old PlasmaBackground instance.");
            destroy(); // This will destroy the instance associated with the *old* module
        });
    }

  }, []);

  return null;
}