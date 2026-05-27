// vite.config.ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "file:///D:/Wrap%20projects/other_projects/save-up/node_modules/.pnpm/@tailwindcss+vite@4.2.2_vite@5.4.21_@types+node@22.19.17_lightningcss@1.32.0_terser@5.46.2_/node_modules/@tailwindcss/vite/dist/index.mjs";
import react from "file:///D:/Wrap%20projects/other_projects/save-up/node_modules/.pnpm/@vitejs+plugin-react-swc@3.11.0_@swc+helpers@0.5.21_vite@5.4.21_@types+node@22.19.17_lightningcss@1.32.0_terser@5.46.2_/node_modules/@vitejs/plugin-react-swc/index.js";
import { defineConfig, loadEnv } from "file:///D:/Wrap%20projects/other_projects/save-up/node_modules/.pnpm/vite@5.4.21_@types+node@22.19.17_lightningcss@1.32.0_terser@5.46.2/node_modules/vite/dist/node/index.js";
import { VitePWA } from "file:///D:/Wrap%20projects/other_projects/save-up/node_modules/.pnpm/vite-plugin-pwa@1.2.0_vite@5.4.21_@types+node@22.19.17_lightningcss@1.32.0_terser@5.46.2__wor_r7ysfs2a7tjpboz7b53oyh7fpi/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_import_meta_url = "file:///D:/Wrap%20projects/other_projects/save-up/apps/client/vite.config.ts";
var __dirname = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var envDir = path.resolve(__dirname, "../..");
var vite_config_default = defineConfig(({ mode }) => {
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
              options: { cacheName: "google-fonts", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
            },
            {
              urlPattern: /\/rpc$/,
              handler: "NetworkFirst",
              options: { cacheName: "rpc-cache", networkTimeoutSeconds: 10, expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 } }
            }
          ]
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
            { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src")
      }
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        "/rpc": {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxXcmFwIHByb2plY3RzXFxcXG90aGVyX3Byb2plY3RzXFxcXHNhdmUtdXBcXFxcYXBwc1xcXFxjbGllbnRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXFdyYXAgcHJvamVjdHNcXFxcb3RoZXJfcHJvamVjdHNcXFxcc2F2ZS11cFxcXFxhcHBzXFxcXGNsaWVudFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovV3JhcCUyMHByb2plY3RzL290aGVyX3Byb2plY3RzL3NhdmUtdXAvYXBwcy9jbGllbnQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSBcIm5vZGU6dXJsXCI7XG5cbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tIFwiQHRhaWx3aW5kY3NzL3ZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gXCJ2aXRlLXBsdWdpbi1wd2FcIjtcblxuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSk7XG5jb25zdCBlbnZEaXIgPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4uLy4uXCIpO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgZW52RGlyLCBcIlwiKTtcbiAgY29uc3QgYmFja2VuZFBvcnQgPSBlbnYuUE9SVCB8fCBcIjMwMDBcIjtcblxuICByZXR1cm4ge1xuICAgIGVudkRpcixcbiAgICBwbHVnaW5zOiBbXG4gICAgICB0YWlsd2luZGNzcygpLFxuICAgICAgcmVhY3QoKSxcbiAgICAgIFZpdGVQV0Eoe1xuICAgICAgICByZWdpc3RlclR5cGU6IFwiYXV0b1VwZGF0ZVwiLFxuICAgICAgICB3b3JrYm94OiB7XG4gICAgICAgICAgZ2xvYlBhdHRlcm5zOiBbXCIqKi8qLntqcyxjc3MsaHRtbCxpY28scG5nLHN2Zyx3b2ZmMn1cIl0sXG4gICAgICAgICAgcnVudGltZUNhY2hpbmc6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC9mb250c1xcLmdvb2dsZWFwaXNcXC5jb21cXC8uKi9pLFxuICAgICAgICAgICAgICBoYW5kbGVyOiBcIkNhY2hlRmlyc3RcIixcbiAgICAgICAgICAgICAgb3B0aW9uczogeyBjYWNoZU5hbWU6IFwiZ29vZ2xlLWZvbnRzXCIsIGV4cGlyYXRpb246IHsgbWF4RW50cmllczogMTAsIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCAqIDM2NSB9IH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXFwvcnBjJC8sXG4gICAgICAgICAgICAgIGhhbmRsZXI6IFwiTmV0d29ya0ZpcnN0XCIsXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHsgY2FjaGVOYW1lOiBcInJwYy1jYWNoZVwiLCBuZXR3b3JrVGltZW91dFNlY29uZHM6IDEwLCBleHBpcmF0aW9uOiB7IG1heEVudHJpZXM6IDUwLCBtYXhBZ2VTZWNvbmRzOiA2MCAqIDUgfSB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBtYW5pZmVzdDoge1xuICAgICAgICAgIG5hbWU6IFwiU2F2ZSBVcFwiLFxuICAgICAgICAgIHNob3J0X25hbWU6IFwiU2F2ZVVwXCIsXG4gICAgICAgICAgZGVzY3JpcHRpb246IFwiUGVyc29uYWwgZmluYW5jZSB0cmFja2VyXCIsXG4gICAgICAgICAgdGhlbWVfY29sb3I6IFwiI2ZmZmZmZlwiLFxuICAgICAgICAgIGJhY2tncm91bmRfY29sb3I6IFwiI2ZmZmZmZlwiLFxuICAgICAgICAgIGRpc3BsYXk6IFwic3RhbmRhbG9uZVwiLFxuICAgICAgICAgIHN0YXJ0X3VybDogXCIvXCIsXG4gICAgICAgICAgaWNvbnM6IFtcbiAgICAgICAgICAgIHsgc3JjOiBcIi9pY29uLTE5Mi5wbmdcIiwgc2l6ZXM6IFwiMTkyeDE5MlwiLCB0eXBlOiBcImltYWdlL3BuZ1wiIH0sXG4gICAgICAgICAgICB7IHNyYzogXCIvaWNvbi01MTIucG5nXCIsIHNpemVzOiBcIjUxMng1MTJcIiwgdHlwZTogXCJpbWFnZS9wbmdcIiB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICBdLFxuICAgIHJlc29sdmU6IHtcbiAgICAgIGFsaWFzOiB7XG4gICAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgICAgfSxcbiAgICB9LFxuICAgIHNlcnZlcjoge1xuICAgICAgaG9zdDogXCIwLjAuMC4wXCIsXG4gICAgICBwb3J0OiA1MTczLFxuICAgICAgcHJveHk6IHtcbiAgICAgICAgXCIvcnBjXCI6IHtcbiAgICAgICAgICB0YXJnZXQ6IGBodHRwOi8vbG9jYWxob3N0OiR7YmFja2VuZFBvcnR9YCxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH07XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBeVYsT0FBTyxVQUFVO0FBQzFXLFNBQVMscUJBQXFCO0FBRTlCLE9BQU8saUJBQWlCO0FBQ3hCLE9BQU8sV0FBVztBQUNsQixTQUFTLGNBQWMsZUFBZTtBQUN0QyxTQUFTLGVBQWU7QUFOaU0sSUFBTSwyQ0FBMkM7QUFRMVEsSUFBTSxZQUFZLEtBQUssUUFBUSxjQUFjLHdDQUFlLENBQUM7QUFDN0QsSUFBTSxTQUFTLEtBQUssUUFBUSxXQUFXLE9BQU87QUFFOUMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxRQUFRLEVBQUU7QUFDcEMsUUFBTSxjQUFjLElBQUksUUFBUTtBQUVoQyxTQUFPO0FBQUEsSUFDTDtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsWUFBWTtBQUFBLE1BQ1osTUFBTTtBQUFBLE1BQ04sUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBLFFBQ2QsU0FBUztBQUFBLFVBQ1AsY0FBYyxDQUFDLHNDQUFzQztBQUFBLFVBQ3JELGdCQUFnQjtBQUFBLFlBQ2Q7QUFBQSxjQUNFLFlBQVk7QUFBQSxjQUNaLFNBQVM7QUFBQSxjQUNULFNBQVMsRUFBRSxXQUFXLGdCQUFnQixZQUFZLEVBQUUsWUFBWSxJQUFJLGVBQWUsS0FBSyxLQUFLLEtBQUssSUFBSSxFQUFFO0FBQUEsWUFDMUc7QUFBQSxZQUNBO0FBQUEsY0FDRSxZQUFZO0FBQUEsY0FDWixTQUFTO0FBQUEsY0FDVCxTQUFTLEVBQUUsV0FBVyxhQUFhLHVCQUF1QixJQUFJLFlBQVksRUFBRSxZQUFZLElBQUksZUFBZSxLQUFLLEVBQUUsRUFBRTtBQUFBLFlBQ3RIO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxRQUNBLFVBQVU7QUFBQSxVQUNSLE1BQU07QUFBQSxVQUNOLFlBQVk7QUFBQSxVQUNaLGFBQWE7QUFBQSxVQUNiLGFBQWE7QUFBQSxVQUNiLGtCQUFrQjtBQUFBLFVBQ2xCLFNBQVM7QUFBQSxVQUNULFdBQVc7QUFBQSxVQUNYLE9BQU87QUFBQSxZQUNMLEVBQUUsS0FBSyxpQkFBaUIsT0FBTyxXQUFXLE1BQU0sWUFBWTtBQUFBLFlBQzVELEVBQUUsS0FBSyxpQkFBaUIsT0FBTyxXQUFXLE1BQU0sWUFBWTtBQUFBLFVBQzlEO0FBQUEsUUFDRjtBQUFBLE1BQ0YsQ0FBQztBQUFBLElBQ0g7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQLE9BQU87QUFBQSxRQUNMLEtBQUssS0FBSyxRQUFRLFdBQVcsT0FBTztBQUFBLE1BQ3RDO0FBQUEsSUFDRjtBQUFBLElBQ0EsUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLFFBQ0wsUUFBUTtBQUFBLFVBQ04sUUFBUSxvQkFBb0IsV0FBVztBQUFBLFVBQ3ZDLGNBQWM7QUFBQSxRQUNoQjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
