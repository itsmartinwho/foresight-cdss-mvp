"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function IridescentCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    // Plane geometry covering viewport
    const geometry = new THREE.PlaneGeometry(2, 2, 64, 64);

    // Simplex noise GLSL (adapted from Ashima WebGL noise)
    const vertexShader = /* glsl */`
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        vUv = uv;
        vec3 pos = position;
        // small vertical displacement to get subtle ripples
        pos.z += sin((uv.x + uTime * 0.05) * 6.2831) * 0.02;
        gl_Position = vec4(pos, 1.0);
      }
    `;

    const fragmentShader = /* glsl */`
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uColorC;

      // Simple thin-film interference / iridescence approximation
      void main() {
        float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
        float radius = distance(vUv, vec2(0.5));
        float t = fract((angle / 6.2831) + uTime * 0.02);
        vec3 color = mix(uColorA, uColorB, t);
        color = mix(color, uColorC, smoothstep(0.3, 0.8, radius));
        gl_FragColor = vec4(color, 0.45); // 45% opacity
      }
    `;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color("hsl(" + getComputedStyle(document.documentElement).getPropertyValue("--accent-primary").trim() + ")") },
        uColorB: { value: new THREE.Color("hsl(" + getComputedStyle(document.documentElement).getPropertyValue("--accent-secondary") + ")") },
        uColorC: { value: new THREE.Color("hsl(" + getComputedStyle(document.documentElement).getPropertyValue("--accent-tertiary") + ")") },
      },
      transparent: true,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const resize = () => {
      const { innerWidth: w, innerHeight: h } = window;
      renderer.setSize(w, h);
    };
    resize();
    window.addEventListener("resize", resize);

    let last = 0;
    const fpsInterval = 1000 / 8; // 8 FPS

    const animate = (time: number) => {
      frameRef.current = requestAnimationFrame(animate);
      if (document.hidden) return; // pause when not visible
      if (time - last < fpsInterval) return; // throttle
      material.uniforms.uTime.value = time * 0.001;
      renderer.render(scene, camera);
      last = time;
    };
    animate(0);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none [mask-image:linear-gradient(to_bottom,transparent_0%,transparent_40%,black_60%)] [--webkit-mask-image:linear-gradient(to_bottom,transparent_0%,transparent_40%,black_60%)]"
    />
  );
} 