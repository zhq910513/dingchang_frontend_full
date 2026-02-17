// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import { useSessionStore } from "../store/session";
import { ROLE } from "../constants";

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

    // ✅ market 允许进入 finance（查看）
    if (p.startsWith("/finance")) return true;

    if (p.startsWith("/customers")) return true;
    if (p.startsWith("/channels")) return true;

    // 未来新增模块：默认拒绝
    if (p.startsWith("/")) return false;
  }

  return true;
}

// ✅ 全部改为懒加载：把页面组件从首包挪走
const Login = () => import("../views/Login.vue");
const Dashboard = () => import("../views/Dashboard.vue");

// 订单相关
const OrderList = () => import("../views/orders/OrderList.vue");
const OrderCreate = () => import("../views/orders/OrderCreate.vue");
const OrderDetail = () => import("../views/orders/OrderDetail.vue");
const OrderFinished = () => import("../views/orders/OrderFinished.vue");
const OrderUnfinished = () => import("../views/orders/OrderUnfinished.vue");
const OrderImport = () => import("../views/orders/OrderImport.vue");

// 账号管理
const UserList = () => import("../views/users/UserList.vue");

// 财务管理
const FinanceList = () => import("../views/finance/FinanceList.vue");

// 客户 / 渠道管理
const CustomerList = () => import("../views/customers/CustomerList.vue");
const ChannelList = () => import("../views/channels/ChannelList.vue");

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
      {
        path: "finance/orders/:id",
        name: "finance-order-detail",
        component: OrderDetail,
        meta: { financeReadOnly: true },
      },

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
