// src/api/http.js
import axios from "axios";

const TZ_BJ = "Asia/Shanghai";
const TOKEN_KEY = "sessionToken";
const ROLE_KEY = "roleName";
const USER_KEY = "userInfo";

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

        if (typeof item === "object") continue;

        const s = String(item).trim();
        if (!s) continue;
        usp.append(key, s);
      }
      return;
    }

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
  paramsSerializer: {
    serialize: (params) => buildQueryString(params),
  },
});

function getSessionStorageSafe() {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

function getSessionToken() {
  const ss = getSessionStorageSafe();
  if (!ss) return "";
  return ss.getItem(TOKEN_KEY) || "";
}

function hasHeader(headers, name) {
  if (!headers) return false;

  if (typeof headers.get === "function") {
    const v = headers.get(name);
    return v !== undefined && v !== null && String(v).trim() !== "";
  }

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

function clearClientSessionStorage() {
  const ss = getSessionStorageSafe();
  if (!ss) return;
  ss.removeItem(TOKEN_KEY);
  ss.removeItem(ROLE_KEY);
  ss.removeItem(USER_KEY);
}

http.interceptors.request.use(
  (config) => {
    const token = getSessionToken();

    config.headers = config.headers ?? {};

    if (token && !hasHeader(config.headers, "X-Session-Token")) {
      config.headers = setHeader(config.headers, "X-Session-Token", token);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

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

    clearClientSessionStorage();
    _redirectToLogin();
  } catch (e) {
    console.error(e);
  } finally {
    if (_hasWindow()) {
      window.setTimeout(() => {
        _handlingAuthExpired = false;
      }, 800);
    } else {
      _handlingAuthExpired = false;
    }
  }
}

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
    await tryUnwrapBlobErrorJson(err);

    const status = err?.response?.status;

    if (status === 401 || status === 419) {
      void handleAuthExpiredOnce();
    }

    return Promise.reject(err);
  }
);

export default http;