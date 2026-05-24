import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#14A800",
          dark:    "#0d8c00",
          light:   "#e6f9e6",
          teal:    "#00d4aa",
          50:      "#f0fff0",
          100:     "#e0f8f0",
          200:     "#bbf7d0",
        },
        tajik: {
          green: "#006600",
          red:   "#CC0000",
          white: "#FFFFFF",
        },
        border: {
          green: "#e8f5e8",
        },
      },
      backgroundImage: {
        "gradient-brand":       "linear-gradient(135deg, #14A800, #00d4aa)",
        "gradient-brand-light": "linear-gradient(135deg, #f0fff0 0%, #e0f8f0 50%, #f0fff8 100%)",
        "gradient-hero":        "linear-gradient(135deg, #f0fff0 0%, #e0f8f0 60%, #f0fff8 100%)",
      },
      boxShadow: {
        green:       "0 4px 20px rgba(20,168,0,0.12)",
        "green-lg":  "0 6px 30px rgba(20,168,0,0.20)",
        card:        "0 2px 12px rgba(20,168,0,0.08)",
        "card-hover":"0 8px 32px rgba(20,168,0,0.18)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        pill: "20px",
      },
      animation: {
        "fade-in": "fadeIn 0.25s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        float: "float 4s ease-in-out infinite",
        "float-slow": "float 6s ease-in-out infinite",
        "btn-pulse": "btnPulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { transform: "translateY(14px)", opacity: "0" },
          "100%": { transform: "translateY(0)",    opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)"  },
          "50%":      { transform: "translateY(-8px)" },
        },
        btnPulse: {
          "0%, 60%, 100%": { boxShadow: "0 4px 20px rgba(20,168,0,.22)" },
          "70%":           { boxShadow: "0 0 0 6px  rgba(20,168,0,.18)" },
          "82%":           { boxShadow: "0 0 0 12px rgba(20,168,0,.08)" },
          "93%":           { boxShadow: "0 0 0 18px rgba(20,168,0,.0)"  },
        },
      },
    },
  },
  plugins: [],
};
export default config;
