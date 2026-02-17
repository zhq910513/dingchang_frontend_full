// src/api/http.js
import axios from "axios";

const http = axios.create({
  baseURL: "/api",
  timeout: 30000,
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

http.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

export default http;
