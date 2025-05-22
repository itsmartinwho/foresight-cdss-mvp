"use client";

import { useEffect } from 'react';
import * as THREE from 'three';

const noiseGLSL = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v)
  {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0);
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

  // Other corners
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

// Vertex Shader - No changes needed from the working version
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

// Fragment Shader with Metallic Sheen Logic
const fragmentShader = `// #version 300 es <--- REMOVED
precision highp float;

${noiseGLSL} // <<< --- INCLUDE THE NOISE FUNCTIONS HERE

in vec2 vUv;

uniform vec2 u_resolution; 
uniform float u_time;     
uniform vec3 u_viewDirection; // Added for specular lighting

out vec4 out_FragColor;

// Constants from your PLASMA_EFFECT.md (can be tweaked)
const float PLASMA_SCALE = 2.0; // "uv * 2.0" from docs, or adjust
const float TIME_SPEED = 0.05;

void main() {
  vec2 scaledUv = vUv * PLASMA_SCALE;
  float timeVal = u_time * TIME_SPEED;

  // Generate noise value
  float noiseValue = snoise(vec3(scaledUv, timeVal));

  // Base color from noise
  vec3 baseColor = vec3(noiseValue * 0.5 + 0.5); // Map noise from [-1,1] to [0,1]

  // Desaturate base hues to near‐silver
  vec3 silver = vec3(0.92);
  vec3 finalColor = mix(silver, baseColor, 0.2);  

  // Add specular lighting term (Blinn–Phong)
  // For a flat plane, normal is (0,0,1) in view space if plane is XY & camera looks down Z
  // Or, if we want to simulate surface detail from noise, we'd derive normals.
  // For now, let's use a simple normal based on UVs for some variation, or flat (0,0,1).
  // vec3 normal = normalize(vec3(vUv * 2.0 - 1.0, 1.0)); // Approximated from UVs
  vec3 normal = normalize(vec3(0.0, 0.0, 1.0)); // Flat normal, good starting point

  vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5)); // Example light direction
  vec3 viewDir = normalize(u_viewDirection); // Comes from camera
  vec3 halfVec = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfVec), 0.0), 64.0); // Specular power
  finalColor += spec * 0.2; // Specular contribution

  // Tint micro‐highlights with pastel accents
  vec3 accentLav = vec3(0.847, 0.706, 0.996); // Lavender
  vec3 accentTeal = vec3(0.6, 0.98, 0.89);  // Teal
  // Use noiseValue for highlight mask - only apply accents to brighter parts of noise
  float highlightMask = smoothstep(0.8, 1.0, noiseValue * 0.5 + 0.5); // Remap noiseValue to [0,1] first
  
  // Modulate between accent colors over time
  float accentMix = mod(u_time * 0.1, 1.0); // Slower modulation for accents
  vec3 accentColor = mix(accentLav, accentTeal, accentMix);
  finalColor += highlightMask * accentColor * 0.3; // Modest accent contribution

  finalColor = clamp(finalColor, 0.0, 1.0);

  // Gentle vignette
  float vignette = smoothstep(0.95, 0.4, length(vUv - 0.5)); 
  finalColor *= vignette * 0.8 + 0.2;

  // Final global alpha
  out_FragColor = vec4(finalColor, 0.1); // 10% global alpha as per docs
}
`;

// ... (rest of your PlasmaBackground.tsx component remains the same,
//      but we need to add u_viewDirection to the uniforms)

export default function PlasmaBackground() {
  useEffect(() => {
    if (globalAny.__plasmaSingleton) {
      console.log("PlasmaSingleton exists. Component useEffect run again (Strict Mode or HMR), returning to prevent re-init of existing singleton.");
      return;
    }
    console.log("No PlasmaSingleton, proceeding with init.");

    // ... (prefersReducedMotion, canvas setup, etc. - NO CHANGES HERE) ...
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const canvas = document.createElement('canvas');
    canvas.id = 'plasma-bg';
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '0';
    canvas.style.pointerEvents = 'none';

    const existingCanvas = document.getElementById('plasma-bg');
    if (existingCanvas) {
        console.log("Removing existing plasma-bg canvas before prepending new one.");
        existingCanvas.remove();
    }
    document.body.prepend(canvas);

    if (prefersReducedMotion) {
      console.log("Painting static gradient due to prefers-reduced-motion.");
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

    console.log("Initializing WebGL for PlasmaBackground (Metallic Sheen).");
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0x000000, 0);

    const isWebGL2 = renderer.capabilities.isWebGL2;
    console.log("Using WebGL 2:", isWebGL2);
    if (!isWebGL2) {
        console.error("CRITICAL: WebGL2 is NOT available. GLSL 3.00 ES shaders will fail.");
        paintStaticGradient(canvas);
        globalAny.__plasmaSingleton = { canvas, destroy: () => { if (canvas.parentElement) canvas.parentElement.removeChild(canvas); globalAny.__plasmaSingleton = null; } };
        return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1; // Camera is at (0,0,1) looking towards (0,0,0)

    const geometry = new THREE.PlaneGeometry(2, 2);
    
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      // For an orthographic camera at (0,0,1) looking at origin, the view direction into the scene is (0,0,-1)
      // However, shaders often expect viewDirection FROM the surface TO the camera.
      // If camera is at (0,0,1) and surface is at (0,0,0), vector from surface to camera is (0,0,1).
      u_viewDirection: { value: new THREE.Vector3(0, 0, 1) } 
    };

    const material = new THREE.RawShaderMaterial({
      vertexShader,       
      fragmentShader,     
      uniforms,
      transparent: true,
      glslVersion: THREE.GLSL3 
    });
    material.blending = THREE.NormalBlending;

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    (canvas as any).__plasmaUniforms = uniforms;

    const clock = new THREE.Clock();
    let frameId: number;

    function animateLoop() {
      if (!globalAny.__plasmaSingleton || globalAny.__plasmaSingleton.canvas !== canvas || !canvas.isConnected) {
        if (frameId) cancelAnimationFrame(frameId);
        return;
      }
      uniforms.u_time.value = clock.getElapsedTime();
      // u_viewDirection is static for this camera setup, so no need to update it per frame
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animateLoop);
    }
    
    console.log("Starting animation loop (Metallic Sheen).");
    frameId = requestAnimationFrame(animateLoop);

    const handleResize = () => {
      if (!renderer) return;
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    const destroy = () => {
      console.log("Destroying PlasmaBackground (WebGL instance). Canvas ID: plasma-bg");
      if (frameId) cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      material.dispose();
      if (renderer) renderer.dispose();
      if (canvas.parentElement) canvas.parentElement.removeChild(canvas);
      
      if (globalAny.__plasmaSingleton && globalAny.__plasmaSingleton.canvas === canvas) {
        globalAny.__plasmaSingleton = null;
        console.log("Global __plasmaSingleton nulled for this instance.");
      }
    };

    globalAny.__plasmaSingleton = { canvas, destroy, renderer } as PlasmaSingleton;
    window.addEventListener('beforeunload', destroy, { once: true });
    
    const currentModule = module; 
    if (currentModule.hot) {
        currentModule.hot.dispose(() => {
            console.log("HMR disposing old PlasmaBackground instance from module.");
            destroy(); 
        });
    }

  }, []);

  return null;
}