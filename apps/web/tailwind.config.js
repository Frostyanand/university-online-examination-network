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
        background: "#090d16",
        foreground: "#f8fafc",
        panel: "#0f172a",
        border: "#1e293b",
        accent: {
          blue: "#38bdf8",
          green: "#22c55e",
          amber: "#f59e0b",
          red: "#ef4444",
          purple: "#a855f7"
        }
      },
    },
  },
  plugins: [],
};

