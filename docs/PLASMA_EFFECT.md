# Plasma Background Effect

This document explains the implementation, configuration, and layering expectations of the **PlasmaBackground** shader effect that now runs behind all UI in Foresight.

---

## 1  Overview

* **Technology** – Three.js + a custom GLSL fragment shader.
* **Noise source** – Ashima 3-D simplex-noise (public-domain) compiled in the fragment shader.
* **Visual goal** – A subtle, slow-moving, filament-like "gas/plasma" animation that never interferes with readability and still shines through the product's glass / opacity layers.
* **Motion-reduction** – Honours the user's `prefers-reduced-motion` setting by swapping the shader for a static radial-gradient painted on the same canvas.

---

## 2  Component & Layer Stack

Render order **inside `<body>`** (Dashboard and every other page share the same stack):

| Order | Element | Key classes / style | Z-index | Notes |
|------:|---------|----------------------|:-------:|-------|
| 1 | `PlasmaBackground` `<canvas>` | `absolute top-0 left-0 w-full h-full z-0` | `0` | Three.js renderer attaches here. Shader opacity is **0.3** (30 %).|
| 2 | `GlassHeader` | `fixed top-0 inset-x-0 z-40` | `40` | Semi-transparent glass header. Always above effects. |
| 3 | Flex container | — | auto | Wrapper that holds sidebar + main. |
| 3a | `GlassSidebar` | `bg-glass backdrop-blur-lg` | auto | Glass panel. │
| 3b | `<main>` content | `relative bg-background` | auto | No opacity modifier so plasma bleeds through. │
| 4 | `IridescentCanvas` `<canvas>` | `fixed inset-0 -z-10` | `-10` | Legacy iridescent tint. Left in place for now. |

> **Compromise** – The iridescent gradient remains **behind** the plasma (`-z-10`). If you want to disable it or raise/lower a layer, adjust the z-index classes in each component.

---

## 3  Shader Essentials

```glsl
// inside fragmentShader
#include "noiseGLSL"             // Ashima 3-D simplex noise
...
float noise = snoise(vec3(uv * 2.0, u_time * 0.05));
...
vec4(finalColor, 0.3);           // 30 % global alpha
```

* **Noise scaling** – `uv * 2.0` gives a gentle spatial frequency.
* **Time scaling** – `u_time * 0.05` keeps motion extremely slow.
* **Colour pipeline** – Maps noise to three sine-based channels, mixes four theme colours, applies a vignette.

You are free to tweak constants such as `PLASMA_SCALE`, `TIME_SPEED`, or colour stops to suit future branding.

---

## 4  Motion-reduction Fallback

When `window.matchMedia('(prefers-reduced-motion: reduce)')` is **true**:

1. Three.js is **not** initialised.
2. A 2-D canvas context paints a static radial gradient.
3. The rest of the stack is unchanged.

---

## 5  Adding or Editing Pages

All pages inherit the background stack from `src/app/layout.tsx`; no extra work is required. **Do not** add local opaque backgrounds if you want the plasma to show through—keeping backgrounds glassy (`bg-glass`, low-alpha colours, or none) is the contract.

---

## 6  Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Plasma invisible, shader compile errors in console | GLSL syntax error after edits | Ensure fragment shader compiles (WebGL 1 only supports GLSL 1.0). |
| Plasma visible but too strong | Lower global alpha in `gl_FragColor` or tweak `BRIGHTNESS / CONTRAST`. |
| Plasma covers UI | Someone raised its `z-index` or added an opaque element above; keep plasma at `z-0`. |

---

## 7  Future Work

* Convert remaining background effects (`IridescentCanvas`) to use a unified effect stack if desired.
* Expose palette constants via CSS variables so design can tweak colours without recompiling the shader. 