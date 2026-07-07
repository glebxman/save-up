import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envDir = path.resolve(__dirname, "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, "");
  const backendPort = env.PORT || "3000";

  return {
    envDir,
    plugins: [
      tailwindcss(),
      react(),
      VitePWA({
        registerType: "autoUpdate",
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: { cacheName: "google-fonts", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
            },
            {
              urlPattern: /\/rpc$/,
              handler: "NetworkFirst",
              options: { cacheName: "rpc-cache", networkTimeoutSeconds: 10, expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 } },
            },
          ],
        },
        manifest: {
          name: "Save Up",
          short_name: "SaveUp",
          description: "Personal finance tracker",
          theme_color: "#ffffff",
          background_color: "#ffffff",
          display: "standalone",
          start_url: "/",
          icons: [
            { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@finance-twa/shared-types": path.resolve(__dirname, "../../packages/shared-types/src/index.ts"),
        "@finance-twa/shared-utils": path.resolve(__dirname, "../../packages/shared-utils/src/index.ts"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        "/rpc": {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replaceAll("\\", "/");

            if (normalizedId.includes("/src/locales/")) return "locales";
            if (normalizedId.includes("/node_modules/@heroicons/")) return "icons-vendor";
            if (normalizedId.includes("/node_modules/@tanstack/react-query/")) return "query-vendor";
            if (normalizedId.includes("/node_modules/framer-motion/")) return "motion-vendor";
            if (
              normalizedId.includes("/node_modules/i18next/") ||
              normalizedId.includes("/node_modules/react-i18next/")
            ) {
              return "i18n-vendor";
            }
            if (
              normalizedId.includes("/node_modules/react/") ||
              normalizedId.includes("/node_modules/react-dom/") ||
              normalizedId.includes("/node_modules/react-router-dom/")
            ) {
              return "react-vendor";
            }
            if (normalizedId.includes("/node_modules/xlsx/")) return "xlsx";
          },
        },
      },
    },
  };
});
