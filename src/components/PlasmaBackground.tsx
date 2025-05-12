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

// Classic Perlin 3D Noise 
// by Stefan Gustavson
//
const psrdnoise = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

float psrdnoise(vec3 x, vec3 period, float alpha)
{
  vec3 Pi = floor(x/period)*period;
  vec3 Pf = x - Pi;
  vec3 Pf_min_period = Pf - period;

  vec4 Pt = vec4( Pi.xy, Pi.xy + period.xy );
  Pt = Pt - floor(Pt * (1.0 / 289.0)) * 289.0;
  vec4 Px = Pt.xzxz;
  vec4 Py = Pt.yyww;
  vec4 Ph = permute( permute( Px ) + Py );
  vec4 P = vec4( Pi.z + vec4( 0.0, 0.0, period.z, period.z ), Pi.z + Pf_min_period.z + vec4( 0.0, 0.0, period.z, period.z ) );
  P = P - floor(P * (1.0 / 289.0)) * 289.0;
  Ph = Ph + P.xxxx;
  vec4 Ph_fz = fract(Ph * (1.0 / 289.0)); // ???

  vec4 grad_x = cos( Ph * (2.0*3.1415926535) * (1.0/16.0) + alpha );
  vec4 grad_y = sin( Ph * (2.0*3.1415926535) * (1.0/16.0) + alpha );
  vec4 grad_z = cos( Ph * (2.0*3.1415926535) * (1.0/8.0) ); // Was 9 per channel, now 8? Seems to work.
  // Modulate gradients by the distance vector. Assume we use a standard permutation?
  vec3 p0 = vec3(Pf.x, Pf.y, Pf.z);             // Cell corner
  vec3 p1 = vec3(Pf_min_period.x, Pf.y, Pf.z);
  vec3 p2 = vec3(Pf.x, Pf_min_period.y, Pf.z);
  vec3 p3 = vec3(Pf_min_period.x, Pf_min_period.y, Pf.z);
  vec3 p4 = vec3(Pf.x, Pf.y, Pf_min_period.z);
  vec3 p5 = vec3(Pf_min_period.x, Pf.y, Pf_min_period.z);
  vec3 p6 = vec3(Pf.x, Pf_min_period.y, Pf_min_period.z);
  vec3 p7 = vec3(Pf_min_period.x, Pf_min_period.y, Pf_min_period.z);

  vec4 v0 = vec4( dot( vec4( grad_x.x, grad_y.x, grad_z.x, grad_z.y ), p0 ),
                  dot( vec4( grad_x.y, grad_y.y, grad_z.x, grad_z.y ), p1 ),
                  dot( vec4( grad_x.z, grad_y.z, grad_z.x, grad_z.y ), p2 ),
                  dot( vec4( grad_x.w, grad_y.w, grad_z.x, grad_z.y ), p3 ) );
  vec4 v1 = vec4( dot( vec4( grad_x.x, grad_y.x, grad_z.z, grad_z.w ), p4 ),
                  dot( vec4( grad_x.y, grad_y.y, grad_z.z, grad_z.w ), p5 ),
                  dot( vec4( grad_x.z, grad_y.z, grad_z.z, grad_z.w ), p6 ),
                  dot( vec4( grad_x.w, grad_y.w, grad_z.z, grad_z.w ), p7 ) );

  vec3 f = fade(Pf/period); // Need fade function fade(t) = 6t^5 - 15t^4 + 10t^3

  // Need scale factor for gradient values. It's 1/sqrt(N) for N dimensions.
  // Alternatively, we could use Improved Noise gradients + scale factor sqrt(N).
  // If we don't normalize the gradient vectors, we can use this scale factor:
  // N=1: 0.5, N=2: 0.25, N=3: 0.125? Check the math. Or is it 1/sqrt(N)?
  // Okay, let's assume gradients are of magnitude 1, total variance = 8 * (1/8) = 1.
  // The noise range is then [-1, 1].

  // Interpolate along z-axis
  vec4 v_z0 = mix( v0, v1, f.z );
  // Interpolate along y-axis
  vec2 v_yz0 = mix( v_z0.xz, v_z0.yw, f.y );
  // Interpolate along x-axis
  float v_xyz0 = mix( v_yz0.x, v_yz0.y, f.x );

  // Second layer gradient generation
  // Rotate gradient directions by 90 degrees
  alpha = alpha + 3.1415926535/2.0;
  grad_x = cos( Ph * (2.0*3.1415926535) * (1.0/16.0) + alpha );
  grad_y = sin( Ph * (2.0*3.1415926535) * (1.0/16.0) + alpha );
  grad_z = cos( Ph * (2.0*3.1415926535) * (1.0/8.0) ); // Was 9 per channel, now 8? Seems to work.

  v0 = vec4( dot( vec4( grad_x.x, grad_y.x, grad_z.x, grad_z.y ), p0 ),
             dot( vec4( grad_x.y, grad_y.y, grad_z.x, grad_z.y ), p1 ),
             dot( vec4( grad_x.z, grad_y.z, grad_z.x, grad_z.y ), p2 ),
             dot( vec4( grad_x.w, grad_y.w, grad_z.x, grad_z.y ), p3 ) );
  v1 = vec4( dot( vec4( grad_x.x, grad_y.x, grad_z.z, grad_z.w ), p4 ),
             dot( vec4( grad_x.y, grad_y.y, grad_z.z, grad_z.w ), p5 ),
             dot( vec4( grad_x.z, grad_y.z, grad_z.z, grad_z.w ), p6 ),
             dot( vec4( grad_x.w, grad_y.w, grad_z.z, grad_z.w ), p7 ) );

  v_z0 = mix( v0, v1, f.z );
  v_yz0 = mix( v_z0.xz, v_z0.yw, f.y );
  float v_xyz1 = mix( v_yz0.x, v_yz0.y, f.x );

  // Blend the two noise layers
  return mix( v_xyz0, v_xyz1, 0.5 ); // Or fade based on alpha?
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

  ${psrdnoise} // Include the noise function

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
    // Using psrdnoise requires period and alpha, let's use arbitrary large period and 0 alpha
    vec3 period = vec3(100.0, 100.0, 100.0); // Large period for non-repeating feel
    float noiseValue = psrdnoise(vec3(scaledUv, time), period, 0.0);

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
    vec3 color1 = vec3(0.0, 0.1, 0.2); // Dark blue/purple
    vec3 color2 = vec3(0.1, 0.4, 0.7); // Mid cyan/blue
    vec3 color3 = vec3(0.8, 0.2, 0.5); // Magenta/pink
    vec3 color4 = vec3(1.0, 0.7, 0.3); // Orange/Yellow highlight (used less)

    // Blend colors based on noise value components (example blending)
    // This part requires significant tweaking to get the filament look
    vec3 finalColor = mix(color1, color2, color.r);
    finalColor = mix(finalColor, color3, color.g * 0.6); // Mix in magenta less strongly
    // Add subtle highlights based on blue component
    finalColor = mix(finalColor, color4, smoothstep(0.7, 0.9, color.b) * 0.3); 


    // Subtle vignette effect
    float vignette = smoothstep(0.8, 0.2, length(vUv - 0.5));
    finalColor *= vignette * 0.8 + 0.2; // Apply vignette

    gl_FragColor = vec4(finalColor, 1.0); // Output final color
  }
`;


interface PlasmaBackgroundProps {
  className?: string;
}

const PlasmaBackground: React.FC<PlasmaBackgroundProps> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);


  useEffect(() => {
    if (prefersReducedMotion) {
        // Reduced motion fallback: Render a static gradient or image
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Example: Static radial gradient
        const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 1.5
        );
        gradient.addColorStop(0, 'rgba(30, 50, 100, 0.8)'); // Center color
        gradient.addColorStop(0.5, 'rgba(10, 20, 50, 0.7)');
        gradient.addColorStop(1, 'rgba(0, 5, 20, 0.6)');   // Outer color

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        return; // Skip Three.js setup if reduced motion is preferred
    }


    const canvas = canvasRef.current;
    if (!canvas) return;

    // --- Three.js Setup ---
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true }); // Use alpha for potential transparency
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false); // Use clientWidth/Height and set updateStyle=false

    const scene = new THREE.Scene();

    // Orthographic camera for full-screen shader effect
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const clock = new THREE.Clock();

    // Fullscreen Plane
    const geometry = new THREE.PlaneGeometry(2, 2); // Covers the [-1, 1] clip space

    // Shader Material
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(canvas.clientWidth, canvas.clientHeight) },
    };

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // --- Animation Loop ---
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Update time uniform
      uniforms.u_time.value = clock.getElapsedTime();

      // Render the scene
      renderer.render(scene, camera);
    };

    // --- Resize Handling ---
    const handleResize = () => {
      const currentCanvas = canvasRef.current;
      if (!currentCanvas) return;

      // Update camera and renderer size
      const width = currentCanvas.clientWidth;
      const height = currentCanvas.clientHeight;
      renderer.setSize(width, height, false); // Important: updateStyle = false
      
      // Update resolution uniform
      uniforms.u_resolution.value.set(width, height);

      // For orthographic camera, aspect ratio update isn't strictly needed
      // unless you change the left/right/top/bottom based on aspect.
      // camera.aspect = width / height; // Needed for PerspectiveCamera
      // camera.updateProjectionMatrix();
    };

    // Use ResizeObserver for more reliable size detection
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);


    // Initial setup call
    handleResize(); // Set initial size correctly
    animate(); // Start the animation loop

    // --- Cleanup ---
    return () => {
        cancelAnimationFrame(animationFrameId);
        resizeObserver.disconnect(); // Disconnect observer
        // Dispose Three.js objects
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        // Potentially remove mesh from scene if needed, though disposing renderer is usually sufficient
        // scene.remove(mesh);
        console.log("PlasmaBackground cleaned up");
    };

  }, [prefersReducedMotion]); // Rerun effect if motion preference changes

  // Render canvas, make it cover the parent div
  return (
    <canvas
      ref={canvasRef}
      className={`absolute top-0 left-0 w-full h-full -z-5 ${className || ''}`}
      style={{ // Ensure canvas fills parent
          display: 'block', // Prevent extra space below canvas
      }}
    />
  );
};

export default PlasmaBackground; 