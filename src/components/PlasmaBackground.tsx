"use client";

import React, { useRef, useEffect } from "react";

/**
 * Animated plasma-style background that sits behind all UI elements.
 * Rendering is intentionally low-fidelity & low-opacity so that the effect is
 * barely noticeable. The component respects the user's "prefers-reduced-motion"
 * setting (hidden via media query) and automatically pauses when the tab is
 * not visible.
 */
export default function PlasmaBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;

    // --- Helpers -----------------------------------------------------------
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const draw = () => {
      const { width: w, height: h } = canvas;
      const imgData = ctx.createImageData(w, h);
      const data = imgData.data;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          // Vibrant plasma: magenta/cyan
          const v =
            128 +
            128 *
              Math.sin(x / 18 + frame / 120) *
              Math.sin(y / 21 + frame / 150);
          data[i] = v; // red channel
          data[i + 1] = 255 - v; // green channel
          data[i + 2] = 255; // blue channel
          data[i + 3] = 120; // alpha ≈ 47 % (120/255)
        }
      }
      ctx.putImageData(imgData, 0, 0);
      frame++;
    };

    // --- Animation loop ----------------------------------------------------
    let rafId: number;
    const fpsInterval = 1000 / 8; // throttle to ~8fps (matches IridescentCanvas)
    let last = 0;

    const loop = (time: number) => {
      // Respect tab visibility
      if (!document.hidden) {
        if (time - last >= fpsInterval) {
          draw();
          last = time;
        }
      }
      rafId = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener("resize", resize);
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        // eslint-disable-next-line react/forbid-dom-props -- inline styles keep things simple here
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          mixBlendMode: "normal", // no blend mode for debug
        }}
        className="motion-reduce:hidden"
      />
    </>
  );
} 