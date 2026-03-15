// src/api/http.js
import axios from "axios";

/** 全系统时间统一 Asia/Shanghai（北京时间） */
const TZ_BJ = "Asia/Shanghai";

function isValidDate(d) {
    return d instanceof Date && Number.isFinite(d.getTime());
}

function formatYmdInTz(d, timeZone = TZ_BJ) {
    const dt = isValidDate(d) ? d : new Date(d);
    if (!isValidDate(dt)) return "";

    const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    return fmt.format(dt);
}

function buildQueryString(params) {
    const usp = new URLSearchParams();

    const append = (key, value) => {
        if (value === null || value === undefined) return;

        // Date 统一按北京时间 YYYY-MM-DD
        if (isValidDate(value)) {
            const s = formatYmdInTz(value);
            if (s) usp.append(key, s);
            return;
        }

        if (Array.isArray(value)) {
            for (const item of value) {
                if (item === null || item === undefined) continue;

                if (isValidDate(item)) {
                    const s = formatYmdInTz(item);
                    if (s) usp.append(key, s);
                    continue;
                }

                // 数组里对象不透传，避免 [object Object]
                if (typeof item === "object") continue;

                const s = String(item).trim();
                if (!s) continue;
                usp.append(key, s);
            }
            return;
        }

        // 普通对象不透传（业务层应先扁平化）
        if (typeof value === "object") return;

        const s = String(value).trim();
        if (!s) return;
        usp.append(key, s);
    };

    if (params && typeof params === "object") {
        for (const [k, v] of Object.entries(params)) {
            append(k, v);
        }
    }

    return usp.toString();
}

const http = axios.create({
    baseURL: "/api",
    timeout: 30000,
    // 数组按重复 key 序列化（如 team_names=A&team_names=B）
    paramsSerializer: {
        serialize: (params) => buildQueryString(params),
    },
});

function getSessionToken() {
    // 只认一种来源：sessionStorage
    try {
        return sessionStorage.getItem("sessionToken") || "";
    } catch {
        return "";
    }
}

function hasHeader(headers, name) {
    if (!headers) return false;

    // Axios v1: AxiosHeaders
    if (typeof headers.get === "function") {
        const v = headers.get(name);
        return v !== undefined && v !== null && String(v).trim() !== "";
    }

    // Plain object
    const lower = String(name || "").toLowerCase();
    for (const k of Object.keys(headers)) {
        if (String(k).toLowerCase() === lower) {
            const v = headers[k];
            return v !== undefined && v !== null && String(v).trim() !== "";
        }
    }
    return false;
}

function setHeader(headers, name, value) {
    if (!headers) headers = {};
    if (typeof headers.set === "function") {
        headers.set(name, value);
        return headers;
    }
    headers[name] = value;
    return headers;
}

http.interceptors.request.use(
    (config) => {
        const token = getSessionToken();

        // 兜底，避免 config.headers 为空导致异常；兼容 AxiosHeaders / plain object
        config.headers = config.headers ?? {};

        // 不强行覆盖手动传入的 token（含大小写任意形式）
        if (token && !hasHeader(config.headers, "X-Session-Token")) {
            config.headers = setHeader(config.headers, "X-Session-Token", token);
        }

        return config;
    },
    (error) => Promise.reject(error)
);

/**
 * Session 过期统一处理（401/419）：
 * - 轻提示（不用 element-plus，避免 http 层反向依赖 UI 框架）
 * - 清 sessionStorage 的 sessionToken
 * - 强制跳转到 /login 并带 redirect（用 location.replace，避免依赖 router）
 *
 * 注意：
 * - 防重入：同一时间只处理一次
 * - 内部吞异常：保证不会产生未处理 Promise
 */
let _handlingAuthExpired = false;

function _hasWindow() {
    return typeof window !== "undefined" && !!window.location;
}

function _currentFullPath() {
    if (!_hasWindow()) return "/";
    const p = window.location.pathname || "/";
    const s = window.location.search || "";
    const h = window.location.hash || "";
    return `${p}${s}${h}`;
}

function _redirectToLogin() {
    if (!_hasWindow()) return;

    const curPath = _currentFullPath();
    if (curPath.startsWith("/login")) return;

    const url = `/login?redirect=${encodeURIComponent(curPath)}`;
    window.location.replace(url);
}

async function handleAuthExpiredOnce() {
    if (_handlingAuthExpired) return;
    _handlingAuthExpired = true;

    try {
        const curPath = _currentFullPath();

        if (_hasWindow() && !curPath.startsWith("/login")) {
            try {
                window.alert("登录已过期，请重新登录。");
            } catch {
                // ignore
            }
        }

        try {
            sessionStorage.removeItem("sessionToken");
        } catch {
            // ignore
        }

        _redirectToLogin();
    } catch (e) {
        console.error(e);
    } finally {
        // 稍微延迟释放，避免并发 401 连续触发多次弹框/跳转
        if (_hasWindow()) {
            window.setTimeout(() => {
                _handlingAuthExpired = false;
            }, 800);
        } else {
            _handlingAuthExpired = false;
        }
    }
}

/**
 * blob 错误兜底：
 * 某些接口（如导出）用了 responseType=blob，但后端报错时可能返回 JSON。
 * 这里尝试把 JSON blob 解开，方便业务层直接拿 err.response.data.message/detail。
 */
async function tryUnwrapBlobErrorJson(err) {
    const resp = err?.response;
    if (!resp) return err;

    const data = resp.data;
    const headers = resp.headers || {};
    const ct = String(headers["content-type"] || headers["Content-Type"] || "").toLowerCase();

    const isBlobLike =
        typeof Blob !== "undefined" &&
        data &&
        typeof data === "object" &&
        data instanceof Blob;

    if (!isBlobLike) return err;

    // 不是 json blob 就不处理（避免误解析 xls）
    const mayBeJson =
        ct.includes("application/json") ||
        ct.includes("text/json") ||
        ct.includes("application/problem+json");

    if (!mayBeJson) return err;

    try {
        const txt = await data.text();
        if (!txt) return err;

        const parsed = JSON.parse(txt);
        err.response.data = parsed;
        return err;
    } catch {
        return err;
    }
}

http.interceptors.response.use(
    (res) => res,
    async (err) => {
        // 先尝试解开 blob 错误 JSON（导出接口常见）
        await tryUnwrapBlobErrorJson(err);

        const status = err?.response?.status;

        // 401：未登录/过期；419：一些后端会用来表示 session 失效
        if (status === 401 || status === 419) {
            void handleAuthExpiredOnce();
        }

        return Promise.reject(err);
    }
);

export default http;
