/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx,jsx,js,mdx}",
    "./src/components/**/*.{ts,tsx,jsx,js,mdx}",
    "./src/pages/**/*.{ts,tsx,jsx,js,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        text: {
          DEFAULT: "#000000", // Black for main text
          placeholder: "#64748b", // slate-500 for placeholder text (lightened)
          darkUI: "#FFFFFF", // White for text on dark UI elements
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        /* ----- New surface and accent tokens (UI refresh) ----- */
        surface: {
          0: "hsl(var(--surface-0) / <alpha-value>)",
          1: "hsl(var(--surface-1) / <alpha-value>)",
          2: "hsl(var(--surface-2) / <alpha-value>)",
          3: "hsl(var(--surface-3) / <alpha-value>)",
        },
        glass: "rgba(255, 255, 255, 0.15)",
        glassHover: "rgba(255, 255, 255, 0.18)",
        neon: "#5ff3ff",
        ink: "#0a0d12",
        lavenderBg: "#f4f6ff",
        sidebar: "rgba(255,255,255,0.08)",
        "sidebar-border": "rgba(255,255,255,0.12)",
        "sidebar-ring": "#5ff3ff",
        "sidebar-accent": "rgba(255,255,255,0.18)",
        "sidebar-accent-foreground": "#ffffff",
        "sidebar-foreground": "rgba(255,255,255,0.92)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        card: "1.25rem",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      fontSize: {
        base: "1.25rem",
        "step--1": "var(--step--1)",
        "step-0": "var(--step-0)",
        "step-1": "var(--step-1)",
        "step-2": "var(--step-2)",
        "step-3": "var(--step-3)",
      },
      boxShadow: {
        card: "0 6px 18px rgba(0,0,0,.14)",
        "card-dark": "0 6px 18px rgba(0,0,0,.25)",
      },
      backdropBlur: {
        none: '0',
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in-down": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "gradient": {
          "0%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
          "100%": { "background-position": "0% 50%" },
        },
        "badge-pulse": {
          "0%": { transform: "scale(1)", opacity: "0.08" },
          "70%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        "specular-flash": {
          "0%": { opacity: "0.15", transform: "scale(0.8)" },
          "100%": { opacity: "0", transform: "scale(1.8)" },
        },
        "conic-spin": {
          "from": { "transform": "rotate(0turn)" },
          "to": { "transform": "rotate(1turn)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-down": "fade-in-down 0.12s ease-out forwards",
        "pulse-slow": "pulse-slow 6s ease-in-out infinite",
        "gradient": "gradient 45s ease infinite",
        "badge-pulse": "badge-pulse 2s linear 8s infinite",
        "specular-flash": "specular-flash 180ms ease-out",
        "conic-spin": "conic-spin 4s linear infinite",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function ({ addUtilities, addVariant }) {
      const newUtilities = {
        '.frost-frame': {
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12), var(--tw-shadow)',
        },
        '.glass-dense': {
          'background-color': 'rgba(255,255,255,0.15)',
        },
      }
      addUtilities(newUtilities, ['responsive', 'hover', 'dark'])
      addVariant('mobile-card', "@media (max-width: theme('screens.sm'))")
    }
  ],
}; 