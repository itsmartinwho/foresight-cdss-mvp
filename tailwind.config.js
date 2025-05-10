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
        glass: "rgba(255, 255, 255, 0.12)",
        glassHover: "rgba(255, 255, 255, 0.18)",
        neon: "#5ff3ff",
        ink: "#0c1116",
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
        card: "0 6px 16px rgba(0, 0, 0, 0.08)",
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-down": "fade-in-down 0.12s ease-out forwards",
        "pulse-slow": "pulse-slow 6s ease-in-out infinite",
        "gradient": "gradient 45s ease infinite",
        "badge-pulse": "badge-pulse 8s ease-out infinite",
        "specular-flash": "specular-flash 180ms ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}; 