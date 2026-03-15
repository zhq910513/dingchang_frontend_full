// src/router/index.js
import {createRouter, createWebHistory} from "vue-router";
import {useSessionStore} from "../store/session";

// 全部懒加载
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

// 报价助手（新模块）
const AiAssistantWorkbench = () => import("../views/ai-assistant/AiAssistantWorkbench.vue");

/**
 * 路由层只做：
 * - 登录态守卫（未登录跳转 /login）
 * - 已登录访问 /login 时回到默认首页
 *
 * 说明：
 * - 订单详情页与财务详情页共用同一个 OrderDetail 组件
 * - 通过不同路由入口区分订单视图与财务视图：
 *   - /orders/:id
 *   - /finance/orders/:id
 * - 详情页内部自行判断当前视图类型并调用对应 API
 */
const DEFAULT_HOME = "/orders/all";

const routes = [
    {path: "/login", name: "login", component: Login},

    {
        path: "/",
        name: "dashboard",
        component: Dashboard,
        redirect: () => DEFAULT_HOME,
        children: [
            {path: "orders", redirect: DEFAULT_HOME},
            {path: "orders/import", name: "orders-import", component: OrderImport},
            {path: "orders/all", name: "orders-all", component: OrderList},
            {path: "orders/finished", name: "orders-finished", component: OrderFinished},
            {path: "orders/unfinished", name: "orders-unfinished", component: OrderUnfinished},
            {path: "orders/create", name: "orders-create", component: OrderCreate},
            {path: "orders/:id", name: "orders-detail", component: OrderDetail},

            {path: "ai-assistant", name: "ai-assistant", component: AiAssistantWorkbench},

            {path: "users", name: "users", component: UserList},

            {path: "finance", name: "finance", component: FinanceList},
            {
                path: "finance/orders/:id",
                name: "finance-order-detail",
                component: OrderDetail,
            },

            {path: "customers", name: "customers", component: CustomerList},
            {path: "channels", name: "channels", component: ChannelList},
        ],
    },

    {path: "/:pathMatch(.*)*", redirect: "/"},
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
});

// 登录守卫（仅校验登录态，不做 role/route.meta 权限推断）
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
        return {path: "/login", query: {redirect: to.fullPath}, replace: true};
    }

    if (isLoginPage && loggedIn) {
        return {path: DEFAULT_HOME, replace: true};
    }

    return true;
});

export default router;