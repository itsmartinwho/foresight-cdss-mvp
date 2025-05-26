"use client";

import { useEffect } from 'react';
import * as THREE from 'three'; // Corrected import statement

/**
 * Animated gradient flow background that sits behind all UI elements.
 * Creates a sophisticated, flowing effect suitable for professional medical applications.
 * Respects "prefers-reduced-motion" and pauses when tab is not visible.
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

  // Constants for gradient flow effect
  const float FLOW_SCALE = 0.8;     // Larger scale for smoother gradients
  const float TIME_SPEED = 0.008;   // Even slower for professional feel
  const float VERTICAL_DRIFT = 0.3; // Subtle vertical movement
  const float LAYER_COUNT = 3.0;    // Multiple layers for depth
  
  void main() {
    vec2 scaledUv = vUv * FLOW_SCALE;
    float time = u_time * TIME_SPEED;
    
    // Create gradient base
    float gradientBase = 0.0;
    
    // Layer multiple noise octaves for smooth flow
    for (float i = 0.0; i < LAYER_COUNT; i++) {
      float layerScale = 1.0 + i * 0.5;
      float layerSpeed = 1.0 - i * 0.3;
      
      // Add vertical drift to create flowing motion
      vec2 flowUv = scaledUv * layerScale;
      flowUv.y += time * VERTICAL_DRIFT * layerSpeed;
      
      // Sample noise at different scales
      float noise = snoise(vec3(flowUv, time * layerSpeed));
      
      // Smooth the noise for gradient-like appearance
      noise = noise * 0.5 + 0.5; // Normalize to 0-1
      noise = smoothstep(0.3, 0.7, noise); // Create smooth transitions
      
      // Accumulate with decreasing influence
      gradientBase += noise / pow(2.0, i);
    }
    
    // Normalize the accumulated value
    gradientBase /= 1.75;
    
    // Define a more professional color palette
    // Muted teal (medical/healthcare appropriate)
    vec3 color1 = vec3(0.4, 0.7, 0.75);  // Soft medical teal
    vec3 color2 = vec3(0.85, 0.88, 0.9); // Cool light grey
    vec3 color3 = vec3(0.94, 0.95, 0.96); // Near white
    vec3 color4 = vec3(0.98, 0.98, 0.99); // Subtle white
    
    // Create smooth gradient transitions
    vec3 finalColor;
    
    if (gradientBase < 0.33) {
      finalColor = mix(color1, color2, gradientBase * 3.0);
    } else if (gradientBase < 0.66) {
      finalColor = mix(color2, color3, (gradientBase - 0.33) * 3.0);
    } else {
      finalColor = mix(color3, color4, (gradientBase - 0.66) * 3.0);
    }
    
    // Add subtle luminosity variation
    float luminosity = 0.95 + 0.05 * sin(gradientBase * 3.14159);
    finalColor *= luminosity;
    
    // Very subtle vignette for depth
    float vignette = smoothstep(1.2, 0.4, length(vUv - 0.5));
    finalColor *= 0.9 + 0.1 * vignette;
    
    // Output with controlled opacity for glassmorphism
    gl_FragColor = vec4(finalColor, 0.55); // Slightly lower opacity for subtlety
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
  const gradient = ctx.createLinearGradient(
    0,
    0,
    0,
    canvas.height
  );
  // Professional medical teal gradient
  gradient.addColorStop(0, 'rgba(102, 178, 191, 0.4)');    // Soft medical teal
  gradient.addColorStop(0.5, 'rgba(217, 224, 230, 0.3)');  // Cool light grey
  gradient.addColorStop(1, 'rgba(240, 242, 245, 0.2)');    // Near white
  
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
    canvas.style.backgroundColor = 'white'; // Set initial background to white

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