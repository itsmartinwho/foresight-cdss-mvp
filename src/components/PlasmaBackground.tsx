"use client";

import { useEffect } from 'react';
import * as THREE from 'three'; // Corrected import statement

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
  precision highp float;
  uniform vec2 u_resolution;
  uniform float u_time;
  varying vec2 vUv;

  ${noiseGLSL}

  // Organic flow parameters
  const float FLOW_SCALE = 3.0;
  const float TIME_SPEED = 0.01;
  const float FLOW_STRENGTH = 0.3;

  void main() {
    vec2 scaledUv = vUv * FLOW_SCALE;
    float time = u_time * TIME_SPEED;

    // Create multiple layers of flow
    float flow1 = snoise(vec3(scaledUv * 1.0, time * 0.8));
    float flow2 = snoise(vec3(scaledUv * 1.7, time * 1.2));
    float flow3 = snoise(vec3(scaledUv * 2.3, time * 0.6));
    
    // Create directional flow by warping UV coordinates
    vec2 warpedUv = scaledUv + vec2(flow1, flow2) * FLOW_STRENGTH;
    float mainFlow = snoise(vec3(warpedUv, time));
    
    // Combine flows for organic complexity
    float combinedFlow = (mainFlow + flow3 * 0.4) * 0.5;
    
    // Map to control signals
    float r_control = (combinedFlow + 1.0) * 0.5;
    float g_control = (flow2 + 1.0) * 0.5;
    float b_control = (flow3 + 1.0) * 0.5;
    
    // Professional medical palette with flow
    vec3 color1 = vec3(0.88, 0.94, 0.97); // Soft medical blue
    vec3 color2 = vec3(0.93, 0.96, 0.98); // Light blue-white
    vec3 color3 = vec3(0.96, 0.97, 0.99); // Almost white
    vec3 color4 = vec3(1.0, 1.0, 1.0);    // Pure white
    
    // Organic color mixing based on flow
    vec3 finalColor = mix(color1, color2, r_control * 0.6);
    finalColor = mix(finalColor, color3, g_control * 0.4);
    finalColor = mix(finalColor, color4, smoothstep(0.75, 1.0, b_control) * 0.3);

    gl_FragColor = vec4(finalColor, 0.45);
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
    canvas.width * 0.3,
    canvas.height * 0.3,
    0,
    canvas.width * 0.7,
    canvas.height * 0.7,
    Math.max(canvas.width, canvas.height) * 0.8
  );
  // Organic flow static gradient
  gradient.addColorStop(0, 'rgba(224, 240, 247, 0.4)');    
  gradient.addColorStop(0.4, 'rgba(237, 245, 249, 0.3)'); 
  gradient.addColorStop(0.8, 'rgba(245, 248, 251, 0.2)');   
  gradient.addColorStop(1, 'rgba(250, 251, 252, 0.1)');   
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ------------------
// Main React wrapper (returns null)
// ------------------
export default function PlasmaBackground() {
  useEffect(() => {
    // If already initialised, nothing to do
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
    canvas.style.backgroundColor = 'white';

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

    // ------------------  Three.js init  ------------------
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    };
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Expose for DevTools debugging
    (canvas as any).__plasmaUniforms = uniforms;

    const clock = new THREE.Clock();
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      uniforms.u_time.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const destroy = () => {
      cancelAnimationFrame(frameId);
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