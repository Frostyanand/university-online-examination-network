/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f8fafc",     // Clean off-white background
        foreground: "#0f172a",     // Slate 900
        panel: {
          DEFAULT: "#ffffff",      // Pure white cards
          subtle: "#f1f5f9",       // Slate 100
          hover: "#f8fafc",        // Slate 50
        },
        border: {
          DEFAULT: "#e2e8f0",      // Slate 200
          strong: "#cbd5e1",       // Slate 300
        },
        muted: {
          DEFAULT: "#64748b",      // Slate 500
          light: "#94a3b8",        // Slate 400
        },
        brand: {
          DEFAULT: "#1d4ed8",      // Enterprise Blue 700
          light: "#eff6ff",        // Blue 50
          border: "#bfdbfe",       // Blue 200
          hover: "#1e40af",        // Blue 800
        },
        status: {
          success: "#15803d",
          successBg: "#f0fdf4",
          successBorder: "#bbf7d0",
          warning: "#b45309",
          warningBg: "#fffbeb",
          warningBorder: "#fde68a",
          danger: "#b91c1c",
          dangerBg: "#fef2f2",
          dangerBorder: "#fecaca",
          neutral: "#475569",
          neutralBg: "#f8fafc",
          neutralBorder: "#e2e8f0",
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)",
        dropdown: "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)",
      }
    },
  },
  plugins: [],
};
