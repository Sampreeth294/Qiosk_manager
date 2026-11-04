import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget =
<<<<<<< HEAD
    env.VITE_BACKEND_PROXY_TARGET || "http://127.0.0.1:8000";
=======
    env.VITE_BACKEND_PROXY_TARGET || "http://localhost:8001";
>>>>>>> 89d3e54 (Save my local changes)

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/api": {
          target: backendTarget,
        },
        "/ws": {
          target: backendTarget,
          ws: true,
        },
      },
    },
  };
});
