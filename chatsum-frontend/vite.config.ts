import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/backend": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/backend/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            // Critical: prevent backend from seeing a CORS request during dev proxying
            proxyReq.removeHeader("origin");
          });
        },
      },
    },
  },
});
