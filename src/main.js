// src/main.js

import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { createPinia } from "pinia";

import ElementPlus from "element-plus";
import "element-plus/dist/index.css";

// ✅ Element Plus 中文（影响 DatePicker / Pagination 等内置文案）
import zhCn from "element-plus/es/locale/lang/zh-cn";

const PRELOAD_RELOAD_KEY = "vite-preload-reloaded";

function installPreloadErrorReload() {
  if (typeof window === "undefined") return;

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();

    try {
      const ss = window.sessionStorage;
      if (ss.getItem(PRELOAD_RELOAD_KEY) === "1") return;
      ss.setItem(PRELOAD_RELOAD_KEY, "1");
    } catch {
      // ignore
    }

    window.location.reload();
  });

  window.addEventListener(
    "load",
    () => {
      try {
        window.sessionStorage.removeItem(PRELOAD_RELOAD_KEY);
      } catch {
        // ignore
      }
    },
    { once: true }
  );
}

installPreloadErrorReload();

const app = createApp(App);

// ✅ 先装 pinia，再装 router（更稳）
const pinia = createPinia();
app.use(pinia);
app.use(router);

// ✅ 全局中文
app.use(ElementPlus, { locale: zhCn });

// ✅ 等路由准备好再挂载，避免首屏导航/重定向时序问题
router.isReady().then(() => {
  app.mount("#app");
});
