// src/main.js

import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { createPinia } from "pinia";

import ElementPlus from "element-plus";
import "element-plus/dist/index.css";

// ✅ Element Plus 中文（影响 DatePicker / Pagination 等内置文案）
import zhCn from "element-plus/es/locale/lang/zh-cn";

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
