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
          const v =
            128 +
            128 *
              Math.sin(x / 27 + frame / 340) *
              Math.sin(y / 31 + frame / 410);
          data[i] = 180; // red channel (cyan bias)
          data[i + 1] = v; // greenish shift
          data[i + 2] = 255; // blue bias
          data[i + 3] = 25; // alpha ≈ 10 % (25/255)
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
          zIndex: -1,
          pointerEvents: "none",
          mixBlendMode: "overlay", // stronger blend for visibility
          filter: "blur(40px)", // reduced blur for sharper effect
        }}
        className="motion-reduce:hidden"
      />
    </>
  );
} 