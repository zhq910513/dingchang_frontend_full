<!-- src/views/Dashboard.vue -->
<template>
  <el-container class="layout">
    <!-- ✅ PC：左侧菜单；✅ 手机：抽屉菜单（不改权限逻辑，仅换容器） -->
    <el-aside v-if="!isMobile" width="200px">
      <div class="aside-header">
        <span>订单管理系统</span>
      </div>

      <el-menu :default-active="route.path" @select="handleSelect">
        <el-menu-item index="/users" :disabled="!canUsers">
          <span>账号管理</span>
        </el-menu-item>

        <el-menu-item index="/ai-assistant" :disabled="!canAiAssistant">
          <span>报价助手</span>
        </el-menu-item>

        <el-menu-item index="/channels">
          <span>渠道管理</span>
        </el-menu-item>

        <el-menu-item index="/customers">
          <span>客户管理</span>
        </el-menu-item>

        <el-sub-menu index="orders" :disabled="!canOrders">
          <template #title>
            <span>订单管理</span>
          </template>

          <el-menu-item index="/orders/import" :disabled="!canOrderWrite">导入 / 创建订单</el-menu-item>
          <el-menu-item index="/orders/all" :disabled="!canOrders">所有订单</el-menu-item>
          <el-menu-item index="/orders/finished" :disabled="!canOrders">完成订单</el-menu-item>
          <el-menu-item index="/orders/unfinished" :disabled="!canOrders">未完成订单</el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/finance" :disabled="!canFinance">
          <span>财务管理</span>
        </el-menu-item>

        <el-menu-item index="__logout">
          <span>退出登录</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-drawer
      v-else
      v-model="mobileMenuOpen"
      direction="ltr"
      size="240px"
      :with-header="false"
      :append-to-body="true"
    >
      <div class="aside-header mobile-aside-header">
        <span>订单管理系统</span>
      </div>

      <el-menu :default-active="route.path" @select="handleSelectMobile">
        <el-menu-item index="/users" :disabled="!canUsers">
          <span>账号管理</span>
        </el-menu-item>

        <el-menu-item index="/ai-assistant" :disabled="!canAiAssistant">
          <span>报价助手</span>
        </el-menu-item>

        <el-menu-item index="/channels">
          <span>渠道管理</span>
        </el-menu-item>

        <el-menu-item index="/customers">
          <span>客户管理</span>
        </el-menu-item>

        <el-sub-menu index="orders" :disabled="!canOrders">
          <template #title>
            <span>订单管理</span>
          </template>

          <el-menu-item index="/orders/import" :disabled="!canOrderWrite">导入 / 创建订单</el-menu-item>
          <el-menu-item index="/orders/all" :disabled="!canOrders">所有订单</el-menu-item>
          <el-menu-item index="/orders/finished" :disabled="!canOrders">完成订单</el-menu-item>
          <el-menu-item index="/orders/unfinished" :disabled="!canOrders">未完成订单</el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/finance" :disabled="!canFinance">
          <span>财务管理</span>
        </el-menu-item>

        <el-menu-item index="__logout">
          <span>退出登录</span>
        </el-menu-item>
      </el-menu>
    </el-drawer>

    <el-container class="right-shell">
      <el-header class="header">
        <div class="header-left">
          <el-button v-if="isMobile" text class="menu-btn" @click="mobileMenuOpen = true" aria-label="打开菜单">
            <el-icon><Menu /></el-icon>
          </el-button>

          <span class="header-title">{{ isMobile ? "订单管理系统" : "欢迎使用系统" }}</span>
        </div>

        <div class="header-right">
          <span class="who">当前账号：{{ displayName || "-" }}</span>
        </div>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>

      <div v-if="isMobile" class="mobile-bottom-nav">
        <el-button
          text
          class="nav-btn"
          :class="{ active: route.path.startsWith('/orders') }"
          :disabled="!canOrders"
          @click="goto('/orders/all')"
        >
          订单
        </el-button>

        <el-button
          text
          class="nav-btn"
          :class="{ active: route.path === '/orders/unfinished' }"
          :disabled="!canOrders"
          @click="goto('/orders/unfinished')"
        >
          未完成
        </el-button>

        <el-button
          text
          class="nav-btn"
          :class="{ active: route.path === '/orders/finished' }"
          :disabled="!canOrders"
          @click="goto('/orders/finished')"
        >
          已完成
        </el-button>

        <el-button
          text
          class="nav-btn"
          :class="{ active: route.path.startsWith('/finance') }"
          :disabled="!canFinance"
          @click="goto('/finance')"
        >
          财务
        </el-button>

        <el-button text class="nav-btn" @click="mobileMenuOpen = true">
          <el-icon><Menu /></el-icon>
        </el-button>
      </div>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { logout } from "../api/auth";
import { useSessionStore } from "../store/session";
import { ElMessage } from "element-plus";
import { Menu } from "@element-plus/icons-vue";

const router = useRouter();
const route = useRoute();
const store = useSessionStore();

const roleName = computed(() => String(store.roleName || "").trim().toLowerCase());

const isFinance = computed(() => roleName.value === ROLE.FINANCE);
const isSales = computed(() => roleName.value === ROLE.SALES);
const isMarket = computed(() => roleName.value === ROLE.MARKET);
const isSuperAdmin = computed(() => roleName.value === ROLE.SUPER_ADMIN);

const displayName = computed(() => store.displayName);

const isMobile = ref(false);
const mobileMenuOpen = ref(false);

function updateIsMobile() {
  isMobile.value = typeof window !== "undefined" && window.innerWidth <= 768;
  if (!isMobile.value) {
    mobileMenuOpen.value = false;
  }
}

onMounted(() => {
  updateIsMobile();
  window.addEventListener("resize", updateIsMobile, { passive: true });

  // ✅ 只在主壳子页面锁 body 滚动，不影响登录页
  document.body.classList.add("app-shell-lock");
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateIsMobile);
  document.body.classList.remove("app-shell-lock");
});

function denyNav() {
  ElMessage.error("无权限");
}

function canNavigateTo(path) {
  const p = String(path || "");
  if (!p.startsWith("/")) return true;

  if (p.startsWith("/users")) return canUsers.value;
  if (p.startsWith("/ai-assistant")) return canAiAssistant.value;
  if (p.startsWith("/finance")) return canFinance.value;

  if (p.startsWith("/orders")) {
    if (!canOrders.value) return false;
    if (p.startsWith("/orders/import") || p.startsWith("/orders/create")) return canOrderWrite.value;
    return true;
  }

  return true;
}

watch(
  () => route.query?.noauth,
  (v) => {
    if (!v) return;
    ElMessage.error("无权限");
    const q = { ...(route.query || {}) };
    delete q.noauth;
    delete q.from;
    router.replace({ path: route.path, query: q });
  }
);

async function handleSelect(key) {
  if (key === "__logout") {
    await doLogout();
    return;
  }

  if (!canNavigateTo(key)) {
    denyNav();
    return;
  }

  if (key && key !== route.path) {
    try {
      await router.push(key);
    } catch {
      // ignore
    }
  }
}

async function handleSelectMobile(key) {
  await handleSelect(key);
  if (isMobile.value) {
    mobileMenuOpen.value = false;
  }
}

async function goto(path) {
  const p = String(path || "");
  if (!p) return;
  if (!canNavigateTo(p)) {
    denyNav();
    return;
  }
  if (p !== route.path) {
    try {
      await router.push(p);
    } catch {
      // ignore
    }
  }
}

async function doLogout() {
  try {
    await logout();
  } catch {
    // ignore
  }

  store.clearSession();
  ElMessage.success("已退出登录");
  await router.replace("/login");
}
</script>

<style scoped>
.layout {
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

.right-shell {
  min-width: 0;
  min-height: 0;
}

.aside-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  border-bottom: 1px solid #e5e5e5;
  color: #333;
  background: #f0f2f5;
}

.mobile-aside-header {
  position: sticky;
  top: 0;
  z-index: 1;
}

.header {
  display: flex;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid #e5e5e5;
  background: #fff;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-title {
  font-weight: 500;
}

.menu-btn {
  padding: 6px;
}

.header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

.who {
  color: #333;
  font-size: 13px;
}

.main {
  background: #f5f5f5;
  min-height: 0;
  overflow: auto; /* ✅ 统一主滚动在这里 */
}

@media (max-width: 768px) {
  .header {
    padding: 0 12px;
  }

  .main {
    padding: 12px 12px 76px;
  }

  .mobile-bottom-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 56px;
    background: #fff;
    border-top: 1px solid rgba(60, 60, 60, 0.12);
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding-bottom: env(safe-area-inset-bottom);
    z-index: 2000;
  }

  .nav-btn {
    flex: 1 1 20%;
    height: 56px;
    border-radius: 0;
  }

  .nav-btn.active {
    font-weight: 800;
  }

  .who {
    font-size: 12px;
  }
}
</style>