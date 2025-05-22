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
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix contributions from corners
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
  }
`;


const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  #extension GL_OES_standard_derivatives : enable
  precision highp float;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec3 u_viewDirection;
  varying vec2 vUv;

  ${noiseGLSL} // noise

  // Fractal Brownian Motion
  float fbm(vec3 p) {
    float v = 0.0;
    float amp = 0.5;
    v += amp * snoise(p); p *= 2.0; amp *= 0.5;
    v += amp * snoise(p); p *= 2.0; amp *= 0.5;
    v += amp * snoise(p); p *= 2.0; amp *= 0.5;
    v += amp * snoise(p);
    return v;
  }

  void main() {
    // Domain-Warped Ridged FBM
    float warpX = fbm(vec3(vUv * 1.1, u_time * 0.04));
    float warpY = fbm(vec3(vUv * 1.1 + 100.0, u_time * 0.04));
    vec2 warp = vec2(warpX, warpY) * 0.8;

    float m1 = abs(snoise(vec3(vUv * 0.9 + warp,  u_time * 0.05)));
    float m2 = abs(snoise(vec3(vUv * 2.1 + warp,  u_time * 0.07)));
    float m3 = abs(snoise(vec3(vUv * 4.3 + warp,  u_time * 0.09)));
    float m4 = abs(snoise(vec3(vUv * 8.7 + warp,  u_time * 0.11))) * 0.12;
    float n  = m1 * 0.30 + m2 * 0.26 + m3 * 0.22 + m4;

    // Force full luminance spread
    n = clamp((n - 0.35) * 2.4, 0.0, 1.0);

    // Animated Pastel Palette
    float drift   = sin(u_time * 0.04) * 0.08;
    vec3 teal     = vec3(0.32 + drift, 0.82, 0.80);
    vec3 blueLav  = vec3(0.52 + drift, 0.72, 0.88);
    vec3 lavender = vec3(0.78 + drift, 0.64, 0.92);
    vec3 iceWhite = vec3(0.98);
    vec3 col = n < 0.33 
      ? mix(teal, blueLav, n / 0.33)
      : n < 0.66
      ? mix(blueLav, lavender, (n - 0.33) / 0.33)
      : mix(lavender, iceWhite, (n - 0.66) / 0.34);

    // Specular Flare
    vec3 viewDir_n = normalize(u_viewDirection);
    vec3 norm = normalize(vec3(dFdx(n), dFdy(n), 0.35));
    vec3 lDir = normalize(vec3(sin(u_time * 0.12), 0.8, 0.6));
    vec3 hVec = normalize(lDir + viewDir_n);
    float spec = pow(max(dot(norm, hVec), 0.0), 48.0);
    col += spec * 0.45;

    // Contrast & Glow
    col = pow(col * 1.3, vec3(1.15));

    // DEBUG - Output raw noise value 'n'
    gl_FragColor = vec4(vec3(n), 1.0);
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
  gradient.addColorStop(0.0, 'rgba(214,191,254,0.3)');   // lavender
  gradient.addColorStop(0.25,'rgba(179,209,255,0.15)'); // blue-lavender
  gradient.addColorStop(0.75,'rgba(236,239,241,0.1)');  // silver
  gradient.addColorStop(1.0, 'rgba(153,246,228,0.3)');   // teal
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ------------------
// Main React wrapper (returns null)
// ------------------
export default function PlasmaBackground() {
  useEffect(() => {
    if (globalAny.__plasmaSingleton) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; // Restored check

    const canvas = document.createElement('canvas');
    canvas.id = 'plasma-bg';
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '0';
    canvas.style.pointerEvents = 'none';

    document.body.prepend(canvas); // ensure it is the first child so always behind

    if (prefersReducedMotion) {
      paintStaticGradient(canvas);
      globalAny.__plasmaSingleton = {
        canvas,
        destroy: () => {
          if (canvas.parentElement) canvas.parentElement.removeChild(canvas);
          globalAny.__plasmaSingleton = null;
        },
      } as PlasmaSingleton;
      return; // Done – static only
    }

    // ------------------  Three.js init  ------------------
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
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
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true });
    material.blending = THREE.NormalBlending;

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Expose for DevTools debugging
    (canvas as any).__plasmaUniforms = uniforms;

    const clock = new THREE.Clock();
    let frameId: number;

    function animateLoop() {
      // Check if component might have been unmounted or canvas removed
      if (!globalAny.__plasmaSingleton || !globalAny.__plasmaSingleton.canvas.isConnected) {
        if (frameId) cancelAnimationFrame(frameId); // Stop further calls if unmounted
        return;
      }
      uniforms.u_time.value = clock.getElapsedTime();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animateLoop); // Plain RAF loop
    }
    
    // Initial call to start the loop
    frameId = requestAnimationFrame(animateLoop);

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
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

  return null; // React renders nothing
} 