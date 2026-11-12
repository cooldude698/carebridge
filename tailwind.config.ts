import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./design/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        primary: ["var(--font-display)", "sans-serif"],
        serif: ["var(--font-display)", "sans-serif"],
        montserrat: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"],
        secondary: ["var(--font-body)", "sans-serif"],
        dmsans: ["var(--font-body)", "sans-serif"],
        data: ["var(--font-data)", "sans-serif"],
        mono: ["var(--font-data)", "sans-serif"],
        sora: ["var(--font-data)", "sans-serif"],
      },
      colors: {
        paper: "var(--canvas-paper)",
        ink: {
          900: "var(--ink-900)",
          800: "var(--ink-800)",
          700: "var(--ink-700)",
          500: "var(--ink-500)",
          300: "var(--ink-300)",
          200: "var(--ink-200)",
        },
        surface: {
          0: "var(--surface-0)",
          50: "var(--surface-50)",
          100: "var(--surface-100)",
          warm: "var(--surface-warm)",
          teal: "var(--surface-teal)",
          paper: "var(--surface-paper)",
        },
        accent: {
          pink: "var(--accent-pink)",
          lime: "var(--accent-lime)",
          "lime-dark": "var(--accent-lime-dark)",
          yellow: "var(--accent-yellow)",
          lavender: "var(--accent-lavender)",
          "lavender-dark": "var(--accent-lavender-dark)",
          mint: "var(--accent-mint)",
          sky: "var(--accent-sky)",
          orange: "var(--accent-orange)",
        },
        brand: {
          teal: "#0D9488",
          "teal-hover": "#0F766E",
          indigo: "#4F46E5",
          lime: "var(--accent-lime)",
          pink: "var(--accent-pink)",
          yellow: "var(--accent-yellow)",
          lavender: "var(--accent-lavender)",
        },
        risk: {
          red: "var(--risk-red)",
          "red-bg": "var(--risk-red-bg)",
          amber: "var(--risk-amber)",
          "amber-bg": "var(--risk-amber-bg)",
          yellow: "var(--risk-amber)",
          "yellow-bg": "var(--risk-amber-bg)",
          green: "var(--risk-green)",
          "green-bg": "var(--risk-green-bg)",
        },
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
        pill: "var(--r-pill)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        hover: "var(--shadow-hover)",
        brutal: "var(--shadow-card)",
        "brutal-sm": "var(--shadow-card)",
        "brutal-lg": "var(--shadow-hover)",
      },
      maxWidth: {
        portal: "var(--max-portal)",
        patient: "var(--max-patient)",
      },
    },
  },
  plugins: [],
};

export default config;
