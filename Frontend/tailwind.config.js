/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Monochrome "ink" palette — the whole app is grayscale, white is the accent.
        // Tweak these to re-skin everything.
        ink: {
          50: "#f6f6f8",
          100: "#e7e7ec",
          200: "#c9c9d2",
          300: "#9a9aa6",
          400: "#6f6f7c",
          500: "#4c4c57",
          600: "#34343d",
          700: "#26262d",
          800: "#1b1b21",
          850: "#15151a",
          900: "#0f0f12",
          950: "#0a0a0b",
        },
      },
      fontFamily: {
        sans: [
          "Montserrat",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        // Raised dark card, like the CONTACT FORM panel in the references.
        panel: "0 30px 60px -20px rgba(0,0,0,0.7)",
        btn: "0 12px 24px -10px rgba(0,0,0,0.6)",
      },
      letterSpacing: {
        widest: "0.25em",
      },
    },
  },
  plugins: [],
};
