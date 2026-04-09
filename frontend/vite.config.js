import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://backend-proyecto-0ccj.onrender.com",
        changeOrigin: true,
      },
    },
  },
});