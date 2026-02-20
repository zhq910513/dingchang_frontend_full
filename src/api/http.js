// src/api/http.js
import axios from "axios";

function buildQueryString(params) {
  const usp = new URLSearchParams();

  const append = (key, value) => {
    if (value === null || value === undefined) return;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === null || item === undefined) continue;
        usp.append(key, String(item));
      }
      return;
    }

    usp.append(key, String(value));
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
  // ✅ 关键：数组按重复 key 序列化（如 team_names=A&team_names=B）
  paramsSerializer: {
    serialize: (params) => buildQueryString(params),
  },
});

function getSessionToken() {
  // ✅ 只认一种来源：sessionStorage
  return sessionStorage.getItem("sessionToken") || "";
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

    // ✅ 兜底，避免 config.headers 为空导致异常；兼容 AxiosHeaders / plain object
    config.headers = config.headers ?? {};

    // ✅ 不强行覆盖手动传入的 token（含大小写任意形式）
    if (token && !hasHeader(config.headers, "X-Session-Token")) {
      config.headers = setHeader(config.headers, "X-Session-Token", token);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * ✅ Session 过期统一处理（401/419）：
 * - 轻提示（不用 element-plus，避免 http 层反向依赖 UI 框架）
 * - 清 sessionStorage 的 sessionToken
 * - 强制跳转到 /login 并带 redirect（用 location.replace，避免依赖 router）
 *
 * ✅ 注意：
 * - 防重入：同一时间只处理一次
 * - 内部吞异常：保证不会产生未处理 Promise
 */
let _handlingAuthExpired = false;

function _currentFullPath() {
  const p = window.location.pathname || "/";
  const s = window.location.search || "";
  const h = window.location.hash || "";
  return `${p}${s}${h}`;
}

function _redirectToLogin() {
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
    if (!curPath.startsWith("/login")) {
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
    // eslint-disable-next-line no-console
    console.error(e);
  } finally {
    // ✅ 稍微延迟释放，避免并发 401 连续触发多次弹框/跳转
    window.setTimeout(() => {
      _handlingAuthExpired = false;
    }, 800);
  }
}

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;

    // ✅ 401：未登录/过期；419：一些后端会用来表示 session 失效
    if (status === 401 || status === 419) {
      void handleAuthExpiredOnce();
    }

    return Promise.reject(err);
  }
);

export default http;
