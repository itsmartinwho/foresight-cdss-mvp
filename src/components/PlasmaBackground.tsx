"use client";

import { useEffect } from 'react';
import * as THREE from 'three';

/**
 * Animated plasma-style background that sits behind all UI elements.
 * Rendering is intentionally low-fidelity & low-opacity so that the effect is
 * barely noticeable. The component respects the user's "prefers-reduced-motion"
 * setting (hidden via media query) and automatically pauses when the tab is
 * not visible.
 */

// 3D Simplex Noise by Ashima Arts (public domain)
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

  //   x0 = x0 - 0.0 + 0.0 * C
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy;      // -1.0 + 3.0*C.x = -0.5

  // Permutations
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  // Gradients: 7x7 points over a square, mapped onto an octahedron.
  float n_ = 1.0/7.0; // 1/7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  // mod(p,7*7)

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

  // Normalise gradients
  vec4 normVal = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= normVal.x;
  p1 *= normVal.y;
  p2 *= normVal.z;
  p3 *= normVal.w;

  // Mix contributions from corners
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
  }
`;

// Fractal Brownian Motion for more complex noise
const fbmGLSL = `
float fbm(vec3 p) {
  float v = 0.0;
  float amp = 0.5;
  v += amp * snoise(p); p *= 2.0; amp *= 0.5;
  v += amp * snoise(p); p *= 2.0; amp *= 0.5;
  v += amp * snoise(p); p *= 2.0; amp *= 0.5;
  v += amp * snoise(p);
  return v;
}
`;

const vertexShader = `
precision highp float;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif

precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_viewDirection;

varying vec2 vUv;

${noiseGLSL}
${fbmGLSL}

// Constants for the metallic sheen plasma effect
const float PLASMA_SCALE = 1.2;     // Broader noise pattern
const float TIME_SPEED = 0.03;      // Slower animation
const float SPECULAR_POWER = 48.0;  // Sharpness of highlights
const float SPECULAR_WEIGHT = 0.3;  // Intensity of highlights

void main() {
  vec2 scaledUv = vUv * PLASMA_SCALE;
  float time = u_time * TIME_SPEED;

  // Domain warping for more complex patterns
  vec2 q = vec2(
    fbm(vec3(scaledUv + vec2(0.0, 0.0), time)),
    fbm(vec3(scaledUv + vec2(5.2, 1.3), time))
  );
  
  vec2 r = vec2(
    fbm(vec3(scaledUv + 4.0 * q + vec2(1.7, 9.2), time)),
    fbm(vec3(scaledUv + 4.0 * q + vec2(8.3, 2.8), time))
  );

  // Generate layered noise
  float coarseNoise = fbm(vec3(scaledUv + 2.0 * r, time));
  float fineNoise = fbm(vec3(scaledUv * 3.0 + r, time * 1.5));
  
  // Combine noise layers
  float combinedNoise = (coarseNoise + fineNoise * 0.4) / 1.4;
  
  // Normalize and enhance contrast
  float noiseValue = clamp((combinedNoise + 1.0) * 0.5, 0.0, 1.0);
  noiseValue = clamp((noiseValue - 0.35) * 2.0, 0.0, 1.0);

  // Base silver color with subtle desaturation
  vec3 silver = vec3(0.88, 0.90, 0.92);
  vec3 baseColor = mix(silver, vec3(noiseValue), 0.15);

  // Calculate normals from noise for specular lighting
  vec2 texelSize = 1.0 / u_resolution;
  float noiseL = fbm(vec3((vUv + vec2(-texelSize.x, 0.0)) * PLASMA_SCALE + 2.0 * r, time));
  float noiseR = fbm(vec3((vUv + vec2(texelSize.x, 0.0)) * PLASMA_SCALE + 2.0 * r, time));
  float noiseD = fbm(vec3((vUv + vec2(0.0, -texelSize.y)) * PLASMA_SCALE + 2.0 * r, time));
  float noiseU = fbm(vec3((vUv + vec2(0.0, texelSize.y)) * PLASMA_SCALE + 2.0 * r, time));
  
  vec3 normal = normalize(vec3((noiseL - noiseR) * 20.0, (noiseD - noiseU) * 20.0, 1.0));

  // Animated lighting direction
  vec3 lightDir = normalize(vec3(
    sin(time * 0.7) * 0.8 + 0.2,
    cos(time * 0.5) * 0.6 + 0.4,
    0.8
  ));
  
  vec3 viewDir = normalize(u_viewDirection);
  vec3 halfVec = normalize(lightDir + viewDir);
  
  // Blinn-Phong specular calculation
  float specular = pow(max(dot(normal, halfVec), 0.0), SPECULAR_POWER) * SPECULAR_WEIGHT;
  
  // Apply specular highlights
  vec3 finalColor = baseColor + vec3(specular);

  // Pastel accent colors that cycle
  vec3 accentLavender = vec3(0.847, 0.706, 0.996);
  vec3 accentTeal = vec3(0.6, 0.98, 0.89);
  vec3 accentPeach = vec3(1.0, 0.85, 0.7);
  
  // Cycle between accent colors
  float huePhase = mod(time * 0.08, 3.0);
  vec3 currentAccent;
  if (huePhase < 1.0) {
    currentAccent = mix(accentLavender, accentTeal, huePhase);
  } else if (huePhase < 2.0) {
    currentAccent = mix(accentTeal, accentPeach, huePhase - 1.0);
  } else {
    currentAccent = mix(accentPeach, accentLavender, huePhase - 2.0);
  }
  
  // Apply pastel highlights to bright areas
  float highlightMask = smoothstep(0.75, 0.95, noiseValue);
  finalColor = mix(finalColor, currentAccent, highlightMask * 0.2);

  // Subtle vignette effect
  float vignette = smoothstep(0.9, 0.3, length(vUv - 0.5));
  finalColor *= vignette * 0.7 + 0.3;

  // Gamma correction for better color reproduction
  finalColor = pow(finalColor, vec3(0.8));
  
  // Clamp to valid range
  finalColor = clamp(finalColor, 0.0, 1.0);

  // Final output with metallic sheen alpha
  gl_FragColor = vec4(finalColor, 0.18);
}
`;

// ------------------
// Global singleton holder
// ------------------
interface PlasmaSingleton {
  canvas: HTMLCanvasElement;
  destroy: () => void;
}
const globalAny = globalThis as any;

// ------------------
// Helper: static gradient for reduced-motion
// ------------------
function paintStaticGradient(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const gradient = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    0,
    canvas.width / 2,
    canvas.height / 2,
    Math.max(canvas.width, canvas.height) / 1.5
  );
  gradient.addColorStop(0.0, 'rgba(214,191,254,0.15)');   // lavender
  gradient.addColorStop(0.25,'rgba(179,209,255,0.12)');   // blue-lavender
  gradient.addColorStop(0.75,'rgba(236,239,241,0.08)');   // silver
  gradient.addColorStop(1.0, 'rgba(153,246,228,0.15)');   // teal
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ------------------
// Main React wrapper (returns null)
// ------------------
export default function PlasmaBackground() {
  useEffect(() => {
    if (globalAny.__plasmaSingleton) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const canvas = document.createElement('canvas');
    canvas.id = 'plasma-bg';
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '0';
    canvas.style.pointerEvents = 'none';

    document.body.prepend(canvas);

    if (prefersReducedMotion) {
      paintStaticGradient(canvas);
      globalAny.__plasmaSingleton = {
        canvas,
        destroy: () => {
          if (canvas.parentElement) canvas.parentElement.removeChild(canvas);
          globalAny.__plasmaSingleton = null;
        },
      } as PlasmaSingleton;
      return; 
    }

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_viewDirection: { value: new THREE.Vector3(0, 0, 1) }
    };
    
    const material = new THREE.ShaderMaterial({ 
      vertexShader, 
      fragmentShader, 
      uniforms, 
      transparent: true,
      blending: THREE.NormalBlending
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Expose for debugging
    (canvas as any).__plasmaUniforms = uniforms;

    const clock = new THREE.Clock();
    let frameId: number;
    let lastTime = 0;
    const targetFPS = 30; // Throttle to 30fps for performance
    const frameInterval = 1000 / targetFPS;

    function animateLoop(currentTime: number = 0) {
      if (!globalAny.__plasmaSingleton || !globalAny.__plasmaSingleton.canvas.isConnected) {
        if (frameId) cancelAnimationFrame(frameId);
        return;
      }
      
      frameId = requestAnimationFrame(animateLoop);
      
      // Throttle rendering
      if (currentTime - lastTime < frameInterval) return;
      lastTime = currentTime;
      
      uniforms.u_time.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    }
    
    frameId = requestAnimationFrame(animateLoop);

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height, false);
      uniforms.u_resolution.value.set(width, height);
    };
    window.addEventListener('resize', handleResize);

    const destroy = () => {
      if (frameId) cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (canvas.parentElement) canvas.parentElement.removeChild(canvas);
      globalAny.__plasmaSingleton = null;
    };

    globalAny.__plasmaSingleton = { canvas, destroy } as PlasmaSingleton;
    window.addEventListener('beforeunload', destroy, { once: true });
  }, []);

  return null;
}