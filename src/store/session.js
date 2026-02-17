// src/store/session.js
import { defineStore } from "pinia";

const TOKEN_KEY = "sessionToken";
const ROLE_KEY = "roleName";
const USER_KEY = "userInfo"; // ✅ 保存当前登录用户信息（用于显示“当前账号”）

function readString(key) {
  const v = sessionStorage.getItem(key);
  return typeof v === "string" ? v : "";
}

function isPlainObject(v) {
  return Object.prototype.toString.call(v) === "[object Object]";
}

function readUserInfo() {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return isPlainObject(obj) ? obj : null;
  } catch {
    return null;
  }
}

function normalizeStr(v) {
  if (v == null) return "";
  return String(v).trim();
}

export const useSessionStore = defineStore("session", {
  state: () => ({
    sessionToken: readString(TOKEN_KEY),
    roleName: readString(ROLE_KEY),
    user: readUserInfo(), // { id, username, real_name, full_name, role_name, role_label }
  }),
  getters: {
    isLoggedIn: (state) => !!state.sessionToken,

    // ✅ 展示用：优先 full_name / real_name / username
    displayName: (state) =>
      state.user?.full_name || state.user?.real_name || state.user?.username || "",

    // ✅ 展示用：优先后端 role_label
    roleLabel: (state) => state.user?.role_label || state.roleName || "",
  },
  actions: {
    setToken(token) {
      const t = normalizeStr(token);
      this.sessionToken = t;
      if (t) sessionStorage.setItem(TOKEN_KEY, t);
      else sessionStorage.removeItem(TOKEN_KEY);
    },

    setRoleName(roleName) {
      const r = normalizeStr(roleName);
      this.roleName = r;
      if (r) sessionStorage.setItem(ROLE_KEY, r);
      else sessionStorage.removeItem(ROLE_KEY);
    },

    // ✅ 保存当前用户信息（用于 header / 账号管理页显示）
    setUser(user) {
      const u = isPlainObject(user) ? user : null;
      this.user = u;
      try {
        if (u) sessionStorage.setItem(USER_KEY, JSON.stringify(u));
        else sessionStorage.removeItem(USER_KEY);
      } catch {
        // ignore
      }
    },

    clearSession() {
      this.sessionToken = "";
      this.roleName = "";
      this.user = null;

      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(ROLE_KEY);
      sessionStorage.removeItem(USER_KEY);
    },
  },
});
