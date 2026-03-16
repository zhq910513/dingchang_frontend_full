// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import { useSessionStore } from "../store/session";

const Login = () => import("../views/Login.vue");
const Dashboard = () => import("../views/Dashboard.vue");

const OrderList = () => import("../views/orders/OrderList.vue");
const OrderCreate = () => import("../views/orders/OrderCreate.vue");
const OrderDetail = () => import("../views/orders/OrderDetail.vue");
const OrderFinished = () => import("../views/orders/OrderFinished.vue");
const OrderUnfinished = () => import("../views/orders/OrderUnfinished.vue");
const OrderImport = () => import("../views/orders/OrderImport.vue");

const UserList = () => import("../views/users/UserList.vue");
const FinanceList = () => import("../views/finance/FinanceList.vue");
const CustomerList = () => import("../views/customers/CustomerList.vue");
const ChannelList = () => import("../views/channels/ChannelList.vue");
const AiAssistantWorkbench = () => import("../views/ai-assistant/AiAssistantWorkbench.vue");

const DEFAULT_HOME = "/orders/all";

const routes = [
  {
    path: "/login",
    name: "login",
    component: Login,
    meta: { public: true },
  },
  {
    path: "/",
    name: "dashboard",
    component: Dashboard,
    redirect: () => DEFAULT_HOME,
    children: [
      { path: "orders", redirect: DEFAULT_HOME },
      { path: "orders/import", name: "orders-import", component: OrderImport },
      { path: "orders/all", name: "orders-all", component: OrderList },
      { path: "orders/finished", name: "orders-finished", component: OrderFinished },
      { path: "orders/unfinished", name: "orders-unfinished", component: OrderUnfinished },
      { path: "orders/create", name: "orders-create", component: OrderCreate },
      { path: "orders/:id", name: "orders-detail", component: OrderDetail },

      { path: "ai-assistant", name: "ai-assistant", component: AiAssistantWorkbench },

      { path: "users", name: "users", component: UserList },

      { path: "finance", name: "finance", component: FinanceList },
      {
        path: "finance/orders/:id",
        name: "finance-order-detail",
        component: OrderDetail,
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

function normalizePath(path) {
  const p = String(path || "").trim();
  if (!p.startsWith("/")) return "";
  if (p.startsWith("//")) return "";
  if (p.startsWith("/login")) return "";
  return p;
}

router.beforeEach((to) => {
  const store = useSessionStore();
  const isLoginPage = to.path === "/login";
  const loggedIn = Boolean(store.isLoggedIn);

  if (isLoginPage) {
    if (!loggedIn) return true;

    const redirect = normalizePath(to.query?.redirect);
    return { path: redirect || DEFAULT_HOME, replace: true };
  }

  if (!loggedIn) {
    return {
      path: "/login",
      query: { redirect: to.fullPath || DEFAULT_HOME },
      replace: true,
    };
  }

  return true;
});

export default router;