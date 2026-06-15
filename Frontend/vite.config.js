import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// SPA dev server. `/api` is proxied so that once the Flask/Photoroom backend
// exists you can talk to it without CORS headaches. Until then the app uses
// the mock client in src/lib/api.js and never hits this proxy.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5001",
        changeOrigin: true,
      },
    },
  },
});
