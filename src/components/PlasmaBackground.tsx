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
  precision highp float; // Necessary for some mobile devices
  uniform vec2 u_resolution;
  uniform float u_time;
  varying vec2 vUv;

  ${noiseGLSL} // Include the noise function

  // Constants for plasma effect - tweak these!
  const float PLASMA_SCALE = 1.5; // How zoomed in the noise pattern is
  const float TIME_SPEED = 0.05; // How fast the pattern evolves
  const float COLOR_FREQ_R = 0.8;
  const float COLOR_FREQ_G = 0.7;
  const float COLOR_FREQ_B = 0.9;
  const float COLOR_PHASE_R = 0.0;
  const float COLOR_PHASE_G = 1.0; // Phase shifts create color variation
  const float COLOR_PHASE_B = 2.0;
  const float BRIGHTNESS = 1.5; // Overall brightness (~50% over original)
  const float CONTRAST = 0.4; // Contrast adjustment

  void main() {
    vec2 scaledUv = vUv * PLASMA_SCALE; // Scale UV coordinates
    float time = u_time * TIME_SPEED;

    // Calculate noise value - using 3D noise with time as the third dimension
    // Using snoise requires period and alpha, let's use arbitrary large period and 0 alpha
    float noiseValue = snoise(vec3(scaledUv * 2.0, time));

    // Add another layer of noise (octave) for more detail - optional
    // float noiseValue2 = psrdnoise(vec3(scaledUv * 2.5, time * 1.5), period, 0.0);
    // noiseValue = (noiseValue + noiseValue2 * 0.5) / 1.5;

    // Map noise value to color components using sine waves
    float r = sin(noiseValue * COLOR_FREQ_R * 3.14159 + COLOR_PHASE_R) * 0.5 + 0.5;
    float g = sin(noiseValue * COLOR_FREQ_G * 3.14159 + COLOR_PHASE_G) * 0.5 + 0.5;
    float b = sin(noiseValue * COLOR_FREQ_B * 3.14159 + COLOR_PHASE_B) * 0.5 + 0.5;

    // Apply brightness and contrast
    vec3 color = vec3(r, g, b);
    color = (color - 0.5) * (1.0 + CONTRAST) + 0.5; // Contrast
    color *= BRIGHTNESS; // Brightness

    // Clamp colors to valid range
    color = clamp(color, 0.0, 1.0);

    // Define base colors (adjust these for desired palette)
    vec3 color1 = vec3(0.0, 0.3, 0.5); // Brighter blue/purple
    vec3 color2 = vec3(0.2, 0.6, 0.9); // Brighter cyan/blue
    vec3 color3 = vec3(0.9, 0.3, 0.7); // Brighter magenta/pink
    vec3 color4 = vec3(1.0, 0.8, 0.4); // Brighter orange/yellow highlight

    // Blend colors based on noise value components (example blending)
    // This part requires significant tweaking to get the filament look
    vec3 finalColor = mix(color1, color2, color.r);
    finalColor = mix(finalColor, color3, color.g * 0.6); // Mix in magenta less strongly
    // Add subtle highlights based on blue component
    finalColor = mix(finalColor, color4, smoothstep(0.7, 0.9, color.b) * 0.3); 


    // Subtle vignette effect
    float vignette = smoothstep(0.95, 0.4, length(vUv - 0.5));
    finalColor *= vignette * 0.8 + 0.2; // Apply vignette

    gl_FragColor = vec4(finalColor, 0.52); // Decreased opacity
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
  gradient.addColorStop(0, 'rgba(30,50,100,0.8)');
  gradient.addColorStop(0.5, 'rgba(10,20,50,0.7)');
  gradient.addColorStop(1, 'rgba(0,5,20,0.6)');
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

  return null; // React renders nothing
} 