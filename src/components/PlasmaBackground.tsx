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
  uniform vec3 u_viewDirection; // Added for specular calculation
  varying vec2 vUv;

  ${noiseGLSL} // Include the noise function

  // Fractal Brownian Motion
  float fbm(vec3 p) {
    float v = 0.0;
    float amp = 0.5;
    // Loop unrolling for older GLSL versions / performance
    v += amp * snoise(p); p *= 2.0; amp *= 0.5;
    v += amp * snoise(p); p *= 2.0; amp *= 0.5;
    v += amp * snoise(p); p *= 2.0; amp *= 0.5;
    v += amp * snoise(p); // p *= 2.0; amp *= 0.5; // 4 octaves
    return v;
  }

  // HSL to RGB conversion
  // Source: https://stackoverflow.com/a/17897228/131264
  vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0);
    return c.z + c.y * (rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
  }


  void main() {
    // Layered FBM for macro & micro texture
    float coarse = fbm(vec3(vUv * 0.6, u_time * 0.02));
    float fine   = fbm(vec3(vUv * 3.0, u_time * 0.1)) * 0.3;
    float n = coarse + fine;

    // Dynamic Pastel Hue Mapping with subtle drift
    float hueBase = 0.65;      // tealish base (0.0-1.0)
    hueBase += sin(u_time * 0.005) * 0.02; // subtle hue shift over time
    float hueRange = 0.1;      // ± variation
    float hue = mod(hueBase + (n - 0.5) * hueRange + u_time * 0.02, 1.0);
    vec3 baseColor = hsl2rgb(vec3(hue, 0.6, 0.8)); // Saturation 0.6, Lightness 0.8

    // Animated Specular Sheen with moving light
    vec3 lightDir = normalize(vec3(sin(u_time * 0.1), cos(u_time * 0.1), 0.6));
    vec3 viewDir = normalize(u_viewDirection);

    // Fallback flat normal (derivatives removed for compatibility)
    vec3 norm = vec3(0.0, 0.0, 1.0);

    vec3 halfVec = normalize(lightDir + viewDir);
    float spec = pow(max(dot(norm, halfVec), 0.0), 64.0); // Specular power 64
    vec3 finalColor = baseColor + spec * 0.6; // Boosted specular weight

    // Optional contrast boost
    finalColor = mix(vec3(0.5), finalColor, 1.2);

    // Softened vignette to avoid dark center
    float vig = smoothstep(0.8, 0.2, length(vUv - 0.5));
    finalColor *= vig * 0.6 + 0.4;

    // Exposure/Gamma boost to enhance saturation
    finalColor = pow(finalColor * 1.2, vec3(1.1));

    gl_FragColor = vec4(finalColor, 0.4); // Keep initial alpha
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
    renderer.setClearColor(0x000000, 0); // Transparent clear for additive blending

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
    material.blending = THREE.AdditiveBlending; // Highlights glow over glass

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Expose for DevTools debugging
    (canvas as any).__plasmaUniforms = uniforms;

    const clock = new THREE.Clock();
    let frameId: number;

    const animate = () => {
      // Throttle to ~30 FPS
      frameId = window.setTimeout(() => {
        // Check if component might have been unmounted or canvas removed
        if (!globalAny.__plasmaSingleton || !globalAny.__plasmaSingleton.canvas.isConnected) {
          return;
        }
        uniforms.u_time.value = clock.getElapsedTime();
        renderer.render(scene, camera);
        requestAnimationFrame(animate); // Call RAF for next "setTimeout gate"
      }, 33); 
    };
    
    // Initial call to start the throttled loop
    requestAnimationFrame(animate);

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const destroy = () => {
      clearTimeout(frameId); // Clear timeout on destroy
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