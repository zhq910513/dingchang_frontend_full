import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
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
    // ✅ 只是不想被 500kb 的“提醒”刷屏的话可以调大；不影响拆包
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // ✅ 稳定拆 vendor：按库分组（你日志里那些 vendor-xxx 就会更可控）
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
