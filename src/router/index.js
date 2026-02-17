// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import { useSessionStore } from "../store/session";
import { ROLE } from "../constants";

import Login from "../views/Login.vue";
import Dashboard from "../views/Dashboard.vue";

// 订单相关
import OrderList from "../views/orders/OrderList.vue";
import OrderCreate from "../views/orders/OrderCreate.vue";
import OrderDetail from "../views/orders/OrderDetail.vue";
import OrderFinished from "../views/orders/OrderFinished.vue";
import OrderUnfinished from "../views/orders/OrderUnfinished.vue";
import OrderImport from "../views/orders/OrderImport.vue";

// 账号管理
import UserList from "../views/users/UserList.vue";

// 财务管理
import FinanceList from "../views/finance/FinanceList.vue";

// 客户 / 渠道管理
import CustomerList from "../views/customers/CustomerList.vue";
import ChannelList from "../views/channels/ChannelList.vue";

function _normRole(r) {
  return String(r ?? "").trim().toLowerCase();
}

function defaultHomeByRole(roleName) {
  const rn = _normRole(roleName);
  // ✅ 市场账号默认跳转到“渠道管理”
  if (rn === ROLE.MARKET) return "/channels";
  if (rn === ROLE.FINANCE) return "/finance";
  return "/orders/all";
}

function safeGetHomeOrDefault() {
  try {
    const store = useSessionStore();
    if (store?.isLoggedIn) return defaultHomeByRole(store.roleName);
  } catch (e) {
    // ignore
  }
  return "/orders/all";
}

function hasAccess(roleName, path) {
  const rn = _normRole(roleName);
  const p = String(path || "");

  if (p === "/" || p === "") return true;

  // 账号管理：仅 super_admin/manager
  if (p.startsWith("/users")) {
    return rn === ROLE.SUPER_ADMIN || rn === ROLE.MANAGER;
  }

  // 财务不能看订单
  if (rn === ROLE.FINANCE && p.startsWith("/orders")) return false;

  // 业务员不能看财务
  if (rn === ROLE.SALES && p.startsWith("/finance")) return false;

  // ✅ 市场账号：允许看财务，但不允许订单写入口
  if (rn === ROLE.MARKET) {
    if (p.startsWith("/orders/create")) return false;
    if (p.startsWith("/orders/import")) return false;

    if (p.startsWith("/orders")) return true;

    // ✅ 关键：market 允许进入 finance（查看）
    if (p.startsWith("/finance")) return true;

    if (p.startsWith("/customers")) return true;
    if (p.startsWith("/channels")) return true;

    // 未来新增模块：默认拒绝
    if (p.startsWith("/")) return false;
  }

  return true;
}

const routes = [
  { path: "/login", name: "login", component: Login },

  {
    path: "/",
    name: "dashboard",
    component: Dashboard,
    redirect: () => safeGetHomeOrDefault(),
    children: [
      { path: "orders", redirect: "/orders/all" },
      { path: "orders/import", name: "orders-import", component: OrderImport },
      { path: "orders/all", name: "orders-all", component: OrderList },
      { path: "orders/finished", name: "orders-finished", component: OrderFinished },
      { path: "orders/unfinished", name: "orders-unfinished", component: OrderUnfinished },
      { path: "orders/create", name: "orders-create", component: OrderCreate },
      { path: "orders/:id", name: "orders-detail", component: OrderDetail },

      { path: "users", name: "users", component: UserList },

      // ✅ 财务：meta 方便页面做只读
      { path: "finance", name: "finance", component: FinanceList, meta: { financeReadOnly: true } },
      { path: "finance/orders/:id", name: "finance-order-detail", component: OrderDetail, meta: { financeReadOnly: true } },

      { path: "customers", name: "customers", component: CustomerList },
      { path: "channels", name: "channels", component: ChannelList },
    ],
  },

  { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// 登录守卫 + 权限守卫
router.beforeEach((to) => {
  let store;
  try {
    store = useSessionStore();
  } catch (e) {
    store = null;
  }

  const isLoginPage = to.path === "/login";
  const loggedIn = Boolean(store?.isLoggedIn);

  if (!isLoginPage && !loggedIn) {
    return { path: "/login", query: { redirect: to.fullPath }, replace: true };
  }

  if (isLoginPage && loggedIn) {
    return { path: defaultHomeByRole(store.roleName), replace: true };
  }

  if (loggedIn) {
    const roleName = store?.roleName;
    if (!hasAccess(roleName, to.path)) {
      const fallback = defaultHomeByRole(roleName);
      return { path: fallback, query: { noauth: "1", from: to.fullPath }, replace: true };
    }
  }

  return true;
});

export default router;
