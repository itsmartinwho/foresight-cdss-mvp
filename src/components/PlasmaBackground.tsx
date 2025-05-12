"use client";

import React, { useRef, useEffect, useState } from 'react';
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
  const float BRIGHTNESS = 0.6; // Overall brightness
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
    float vignette = smoothstep(0.8, 0.2, length(vUv - 0.5));
    finalColor *= vignette * 0.8 + 0.2; // Apply vignette

    gl_FragColor = vec4(finalColor, 0.3); // Output with 30% opacity for subtlety
  }
`;


interface PlasmaBackgroundProps {
  className?: string;
}

// Maintain a single shared instance across component mounts so that the heavy
// Three.js scene is created just once per session. The instance keeps the
// canvas element and a destroy method we can call on a *hard* page refresh
// (beforeunload) but we intentionally keep it alive when navigating between
// screens so the animation never restarts.

interface PlasmaSingleton {
  canvas: HTMLCanvasElement;
  destroy: () => void;
  isStatic?: boolean; // Flag to indicate if it's a static canvas for reduced motion
}

const globalAny = globalThis as any;
// Initialize the singleton container on globalThis if it doesn't exist
if (typeof globalAny.__plasmaSingleton === 'undefined') {
  globalAny.__plasmaSingleton = null as PlasmaSingleton | null;
}
// Ensure a global beforeunload listener flag exists
if (typeof globalAny.__plasmaBeforeUnloadListenerAttached === 'undefined') {
  globalAny.__plasmaBeforeUnloadListenerAttached = false;
}

const PlasmaBackground: React.FC<PlasmaBackgroundProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  // Removed isInitializedRef as the singleton state itself should be the source of truth

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };
    updateMotionPreference(); // Initial check
    mediaQuery.addEventListener('change', updateMotionPreference);
    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const targetCanvasClassName = `absolute top-0 left-0 w-full h-full z-0 ${className || ''}`;

    // --- Reduced Motion Handling ---
    if (prefersReducedMotion) {
      // If currently showing 3D canvas or a different static canvas, clean up
      if (globalAny.__plasmaSingleton && (!globalAny.__plasmaSingleton.isStatic || globalAny.__plasmaSingleton.canvas?.parentElement !== container)) {
        if (globalAny.__plasmaSingleton.destroy) {
          // console.log('Plasma: Reduced motion - destroying existing instance.');
          globalAny.__plasmaSingleton.destroy();
        }
        globalAny.__plasmaSingleton = null; // Clear the singleton reference
      }
      // Clear container before adding new static canvas
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      // If already has a suitable static canvas, do nothing
      if (globalAny.__plasmaSingleton?.isStatic && globalAny.__plasmaSingleton.canvas?.parentElement === container) {
         if (globalAny.__plasmaSingleton.canvas.className !== targetCanvasClassName) {
            globalAny.__plasmaSingleton.canvas.className = targetCanvasClassName;
         }
        // console.log('Plasma: Reduced motion - static canvas already in place.');
        return;
      }
      
      // console.log('Plasma: Reduced motion - rendering static gradient.');
      const staticCanvas = document.createElement('canvas');
      staticCanvas.className = targetCanvasClassName;
      staticCanvas.width = container.clientWidth || window.innerWidth;
      staticCanvas.height = container.clientHeight || window.innerHeight;
      container.appendChild(staticCanvas);

      const ctx = staticCanvas.getContext('2d');
      if (ctx) {
        const gradient = ctx.createRadialGradient(
          staticCanvas.width / 2, staticCanvas.height / 2, 0,
          staticCanvas.width / 2, staticCanvas.height / 2, Math.max(staticCanvas.width, staticCanvas.height) / 1.5
        );
        gradient.addColorStop(0, 'rgba(30, 50, 100, 0.8)');
        gradient.addColorStop(0.5, 'rgba(10, 20, 50, 0.7)');
        gradient.addColorStop(1, 'rgba(0, 5, 20, 0.6)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, staticCanvas.width, staticCanvas.height);
      }
      
      const destroyStatic = () => {
        // console.log('Plasma: Destroying static canvas instance.');
        if (staticCanvas.parentElement) {
          staticCanvas.parentElement.removeChild(staticCanvas);
        }
        if (globalAny.__plasmaSingleton?.canvas === staticCanvas) {
          globalAny.__plasmaSingleton = null;
        }
      };
      globalAny.__plasmaSingleton = { canvas: staticCanvas, destroy: destroyStatic, isStatic: true };
      return;
    }

    // --- Full Motion (Three.js) Handling ---

    // If previously in reduced motion (static canvas exists), destroy it
    if (globalAny.__plasmaSingleton?.isStatic) {
      // console.log('Plasma: Full motion - destroying static canvas.');
      if (globalAny.__plasmaSingleton.destroy) {
        globalAny.__plasmaSingleton.destroy();
      }
      globalAny.__plasmaSingleton = null;
      // Clear container as it held the static canvas
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    }

    // If a Three.js singleton already exists:
    if (globalAny.__plasmaSingleton?.canvas && !globalAny.__plasmaSingleton.isStatic) {
      const singletonCanvas = globalAny.__plasmaSingleton.canvas;
      if (singletonCanvas.className !== targetCanvasClassName) {
        // console.log('Plasma: Full motion - updating existing singleton canvas className.');
        singletonCanvas.className = targetCanvasClassName;
      }
      if (singletonCanvas.parentElement !== container) {
        // console.log('Plasma: Full motion - appending existing singleton canvas to container.');
        // Ensure container is empty before appending, just in case.
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        container.appendChild(singletonCanvas);
      }
      // console.log('Plasma: Full motion - singleton canvas already active.');
      return; 
    }

    // console.log('Plasma: Full motion - initializing Three.js scene.');
    const threeCanvas = document.createElement('canvas');
    threeCanvas.className = targetCanvasClassName;
    // Append to container *before* renderer init to get clientWidth/Height
    container.appendChild(threeCanvas);

    // Initialize Three.js (helper function defined below or inline)
    initializeThreeJS(threeCanvas, container);


    function initializeThreeJS(canvasElement: HTMLCanvasElement, canvasContainer: HTMLDivElement) {
      // console.log('Plasma: Three.js init helper running.');
      const renderer = new THREE.WebGLRenderer({ canvas: canvasElement, alpha: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      
      const setSize = () => {
        const width = canvasContainer.clientWidth;
        const height = canvasContainer.clientHeight;
        if (width > 0 && height > 0) {
            renderer.setSize(width, height, false);
            uniforms.u_resolution.value.set(width, height);
        }
      };

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      camera.position.z = 1;
      const clock = new THREE.Clock();
      const geometry = new THREE.PlaneGeometry(2, 2);
      const uniforms = {
        u_time: { value: 0.0 },
        u_resolution: { value: new THREE.Vector2(1,1) }, // Initial dummy value
      };
      const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      let animationFrameId: number;
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        uniforms.u_time.value = clock.getElapsedTime();
        renderer.render(scene, camera);
      };
      
      const resizeObserver = new ResizeObserver(setSize); // Use setSize directly
      resizeObserver.observe(canvasContainer);

      setSize(); // Initial size setup
      animate();

      const destroy = () => {
        // console.log('Plasma: Destroying Three.js instance.');
        cancelAnimationFrame(animationFrameId);
        resizeObserver.disconnect();
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        if (canvasElement.parentElement) {
          canvasElement.parentElement.removeChild(canvasElement);
        }
        if (globalAny.__plasmaSingleton?.canvas === canvasElement) {
          globalAny.__plasmaSingleton = null;
        }
      };
      
      globalAny.__plasmaSingleton = { canvas: canvasElement, destroy, isStatic: false };

      if (!globalAny.__plasmaBeforeUnloadListenerAttached) {
        // console.log('Plasma: Attaching beforeunload listener.');
        const beforeUnloadHandler = () => {
            if (globalAny.__plasmaSingleton?.destroy) {
                // console.log('Plasma: beforeunload - destroying singleton.');
                globalAny.__plasmaSingleton.destroy();
                globalAny.__plasmaSingleton = null;
            }
        };
        window.addEventListener('beforeunload', beforeUnloadHandler);
        globalAny.__plasmaBeforeUnloadListenerAttached = true;
      }
    }
    // Initial call if canvas dimensions are immediately available
    if (threeCanvas.clientWidth > 0 && threeCanvas.clientHeight > 0) {
        // initializeThreeJS(threeCanvas, container); // Already called above
    } else {
        // console.warn('Plasma: Canvas dimensions zero initially. Relying on ResizeObserver or delayed call.');
        // ResizeObserver should pick it up. Optionally, add a small timeout as a fallback.
        setTimeout(() => {
            if (threeCanvas.clientWidth === 0 || threeCanvas.clientHeight === 0) {
                // console.log('Plasma: Retrying Three.js initialization after delay if still needed.');
                // Check if already initialized by another path or if container is gone
                if (containerRef.current && !globalAny.__plasmaSingleton?.canvas) {
                   // initializeThreeJS(threeCanvas, containerRef.current); // Logic seems to already cover this by initial call + resize
                }
            }
        }, 100);
    }

  }, [prefersReducedMotion, className]);

  return (
    <div
      ref={containerRef}
      className={`plasma-container fixed inset-0 z-0 pointer-events-none ${className || ''}`}
      style={{ display: 'block' }} // Ensure it takes up space for clientWidth/Height
    />
  );
};

export default PlasmaBackground; 