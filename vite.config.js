import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("element-plus")) return "vendor-element-plus";
          if (id.includes("@element-plus")) return "vendor-element-plus";
          if (id.includes("vue-router")) return "vendor-vue-router";
          if (id.includes("pinia")) return "vendor-pinia";
          if (id.includes("vue")) return "vendor-vue";
          if (id.includes("axios")) return "vendor-axios";
          if (id.includes("lodash")) return "vendor-lodash";
          if (id.includes("dayjs") || id.includes("date-fns")) return "vendor-dates";

          return "vendor";
        },
      },
    },
  },
});
