// src/store/session.js
import { defineStore } from "pinia";

const TOKEN_KEY = "sessionToken";
const ROLE_KEY = "roleName";
const USER_KEY = "userInfo"; // 保存当前登录用户信息（用于显示“当前账号”）

function getSessionStorageSafe() {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

function readString(key) {
  const ss = getSessionStorageSafe();
  if (!ss) return "";
  const v = ss.getItem(key);
  return typeof v === "string" ? v : "";
}

function isPlainObject(v) {
  return Object.prototype.toString.call(v) === "[object Object]";
}

function normalizeStr(v) {
  if (v == null) return "";
  return String(v).trim();
}

function normalizeUser(user) {
  if (!isPlainObject(user)) return null;

  // 严格按后端当前字段保留；仅做轻量字符串清洗
  const out = { ...user };

  if ("id" in out) {
    const n = Number(out.id);
    out.id = Number.isFinite(n) ? Math.trunc(n) : out.id;
  }

  if ("username" in out) out.username = normalizeStr(out.username);
  if ("real_name" in out) out.real_name = normalizeStr(out.real_name);
  if ("full_name" in out) out.full_name = normalizeStr(out.full_name);
  if ("role_name" in out) out.role_name = normalizeStr(out.role_name);
  if ("role_label" in out) out.role_label = normalizeStr(out.role_label);

  return out;
}

function readUserInfo() {
  const ss = getSessionStorageSafe();
  if (!ss) return null;

  try {
    const raw = ss.getItem(USER_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return normalizeUser(obj);
  } catch {
    return null;
  }
}

export const useSessionStore = defineStore("session", {
  state: () => ({
    sessionToken: readString(TOKEN_KEY),
    roleName: readString(ROLE_KEY),
    user: readUserInfo(), // { id, username, real_name, full_name, role_name, role_label }
  }),

  getters: {
    isLoggedIn: (state) => !!normalizeStr(state.sessionToken),

    // 展示用：优先 full_name / real_name / username
    displayName: (state) =>
      normalizeStr(state.user?.full_name) ||
      normalizeStr(state.user?.real_name) ||
      normalizeStr(state.user?.username),

    // 展示用：优先后端 role_label
    roleLabel: (state) => normalizeStr(state.user?.role_label) || normalizeStr(state.roleName),
  },

  actions: {
    setToken(token) {
      const ss = getSessionStorageSafe();
      const t = normalizeStr(token);

      this.sessionToken = t;

      if (!ss) return;
      if (t) ss.setItem(TOKEN_KEY, t);
      else ss.removeItem(TOKEN_KEY);
    },

    setRoleName(roleName) {
      const ss = getSessionStorageSafe();
      const r = normalizeStr(roleName);

      this.roleName = r;

      if (!ss) return;
      if (r) ss.setItem(ROLE_KEY, r);
      else ss.removeItem(ROLE_KEY);
    },

    // 保存当前用户信息（用于 header / 账号管理页显示）
    setUser(user) {
      const ss = getSessionStorageSafe();
      const u = normalizeUser(user);

      this.user = u;

      // 关键修复：roleName 与 user.role_name 同步，避免路由守卫/权限判断读到旧角色
      const roleFromUser = normalizeStr(u?.role_name);
      if (roleFromUser) {
        this.roleName = roleFromUser;
      }

      if (!ss) return;

      try {
        if (u) ss.setItem(USER_KEY, JSON.stringify(u));
        else ss.removeItem(USER_KEY);

        if (roleFromUser) ss.setItem(ROLE_KEY, roleFromUser);
        else if (!this.roleName) ss.removeItem(ROLE_KEY);
      } catch {
        // ignore
      }
    },

    clearSession() {
      const ss = getSessionStorageSafe();

      this.sessionToken = "";
      this.roleName = "";
      this.user = null;

      if (!ss) return;
      ss.removeItem(TOKEN_KEY);
      ss.removeItem(ROLE_KEY);
      ss.removeItem(USER_KEY);
    },
  },
});
