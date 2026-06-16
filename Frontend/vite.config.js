import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// SPA dev server. `/api` is proxied to the FastAPI backend so the browser can
// talk to it without CORS headaches in development. In production the frontend
// points directly at the deployed backend via VITE_API_BASE_URL.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        // Backend runs on 8001 (8000 is often taken by Docker/other tooling).
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
    },
  },
});
