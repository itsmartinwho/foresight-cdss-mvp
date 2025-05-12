# Plasma Background Effect

This document explains the implementation, configuration, and layering expectations of the **PlasmaBackground** shader effect that now runs behind all UI in Foresight.

---

## 1  Overview

* **Technology** – Three.js + a custom GLSL fragment shader.
* **Noise source** – Ashima 3-D simplex-noise (public-domain) compiled in the fragment shader.
* **Visual goal** – A subtle, slow-moving, filament-like "gas/plasma" animation that never interferes with readability and still shines through the product's glass / opacity layers.
* **Implementation Pattern:** A singleton pattern managed *outside* the main React render tree. The `<PlasmaBackground />` component (used in `layout.tsx`) runs a `useEffect` hook **once** on initial mount to create a `<canvas id="plasma-bg">` element, prepend it directly to `document.body`, and start the Three.js animation loop. The component itself then renders `null`. This avoids React re-renders or DOM manipulations affecting the canvas during navigation, ensuring a stable, persistent background.
* **Motion-reduction** – Honours the user's `prefers-reduced-motion` setting. If true, the initial `useEffect` skips Three.js initialization and instead paints a static radial-gradient onto the canvas.

---

## 2  Component & Layer Stack

Render order **inside `<body>`** (Dashboard and every other page share the same stack):

| Order | Element | Key classes / style | Z-index | Notes |
|------:|---------|----------------------|:-------:|-------|
| 1 | `<canvas id="plasma-bg">` | `position:fixed; inset:0; z-index:0; pointer-events:none;` | `0` | Created once by `PlasmaBackground` component's effect, then lives outside React. Current shader opacity is **0.65** (65 %). |
| 2 | `GlassHeader` | `fixed top-0 inset-x-0 z-40 bg-glass` | `40` | Semi-transparent glass header (current alpha ≈8%). |
| 3 | Flex container | — | auto | Wrapper that holds sidebar + main. |
| 3a | `GlassSidebar` | `bg-glass backdrop-blur-lg` | auto | Glass panel (current alpha ≈8%). │
| 3b | `<main>` content | `relative bg-background/60` | auto | Primary background layer is semi-transparent (60% opacity) allowing plasma to show through. │
| 4 | `IridescentCanvas` `<canvas>` | `fixed inset-0 -z-10` | `-10` | Legacy iridescent tint. Left in place for now, behind plasma. |

> **Note:** The visibility of the plasma effect depends on both its own shader settings (brightness, alpha) and the transparency of the UI elements above it (`GlassHeader`, `GlassSidebar`, `main`). These values have been tuned together.

---

## 3  Shader Essentials

```glsl
// inside fragmentShader
#include "noiseGLSL"             // Ashima 3-D simplex noise
...
const float BRIGHTNESS = 1.25;   // Base brightness multiplier
const float CONTRAST = 0.4;
...
float noise = snoise(vec3(uv * 2.0, u_time * 0.05));
...
float vignette = smoothstep(0.95, 0.4, length(vUv - 0.5)); // Gentle vignette
finalColor *= vignette * 0.8 + 0.2;
...
gl_FragColor = vec4(finalColor, 0.65); // 65 % global alpha
```

* **Noise scaling** – `uv * 2.0` gives a gentle spatial frequency.
* **Time scaling** – `u_time * 0.05` keeps motion extremely slow.
* **Colour pipeline** – Maps noise to three sine-based channels, mixes four theme colours, applies a gentle vignette.

You are free to tweak constants such as `PLASMA_SCALE`, `TIME_SPEED`, or colour stops to suit future branding. `BRIGHTNESS`, `CONTRAST`, vignette parameters, and the final alpha value in `gl_FragColor` directly control the visual intensity.

---

## 4  Motion-reduction Fallback

When `window.matchMedia('(prefers-reduced-motion: reduce)')` is **true**:

1. The initial `useEffect` in `PlasmaBackground` detects this.
2. Three.js initialization is **skipped**.
3. A 2-D canvas context paints a static radial gradient onto the single `<canvas id="plasma-bg">`.
4. The rest of the stack is unchanged.

---

## 5  Implementation Details

The `<PlasmaBackground />` component is included once in the root `src/app/layout.tsx`. Its core logic resides in a `useEffect` hook that runs only once:

1.  Checks if `globalThis.__plasmaSingleton` already exists. If so, does nothing.
2.  Creates the `<canvas id="plasma-bg">` element.
3.  Applies fixed positioning and `z-index: 0` via inline styles.
4.  Prepends the canvas directly to `document.body`.
5.  Checks `prefers-reduced-motion`:
    *   **If true:** Calls a helper to paint a static gradient onto the canvas.
    *   **If false:** Initializes the Three.js scene, renderer, shader material, and starts the animation loop.
6.  Stores the canvas element and a `destroy` function in `globalThis.__plasmaSingleton`.
7.  Adds a `beforeunload` event listener (once only) to call the `destroy` function, ensuring cleanup (stopping animation frame, disposing Three.js resources, removing canvas from DOM).

This approach completely decouples the canvas lifecycle from React component re-renders, solving previous issues with flickering and animation restarts during client-side navigation.

**UI Transparency:** To ensure the plasma effect is visible, key UI elements above it use transparency:
*   `GlassHeader` / `GlassSidebar`: Use `.bg-glass`, which has a low background alpha (e.g., `hsla(var(--surface-1) / .08)`).
*   `<main>` content area: Uses `bg-background/60` for 60% opacity.

Avoid adding opaque backgrounds to pages if you want the plasma effect to remain visible.

---

## 6  Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Plasma invisible, shader compile errors in console | GLSL syntax error after edits | Ensure fragment shader compiles (WebGL 1 only supports GLSL 1.0). |
| Plasma visible but too strong/weak | Adjust `BRIGHTNESS`, `CONTRAST`, vignette params, or final alpha in `gl_FragColor`. Also check opacity of UI layers above (see Section 5). |
| Plasma covers UI | Incorrect `z-index` (should be 0) or `pointer-events` (should be `none`). The singleton init code sets these correctly. |

---

## 7  Future Work

* Convert remaining background effects (`IridescentCanvas`) to use a unified effect stack if desired.
* Expose palette constants via CSS variables so design can tweak colours without recompiling the shader. 