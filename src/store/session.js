// src/store/session.js
import { defineStore } from "pinia";

const TOKEN_KEY = "sessionToken";
const ROLE_KEY = "roleName";
const USER_KEY = "userInfo";

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

function normalizeInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function normalizeStringArray(v) {
  if (!Array.isArray(v)) return [];
  const out = [];
  for (const item of v) {
    const s = normalizeStr(item);
    if (!s) continue;
    out.push(s);
  }
  return out;
}

function normalizeUser(user) {
  if (!isPlainObject(user)) return null;

  const out = { ...user };

  if ("id" in out) {
    const n = normalizeInt(out.id);
    if (n !== null) out.id = n;
  }
  if ("user_id" in out) {
    const n = normalizeInt(out.user_id);
    if (n !== null) out.user_id = n;
  }

  if ("username" in out) out.username = normalizeStr(out.username);
  if ("real_name" in out) out.real_name = normalizeStr(out.real_name);
  if ("full_name" in out) out.full_name = normalizeStr(out.full_name);
  if ("role_name" in out) out.role_name = normalizeStr(out.role_name);
  if ("role_label" in out) out.role_label = normalizeStr(out.role_label);
  if ("team_name" in out) out.team_name = normalizeStr(out.team_name);
  if ("team_names" in out) out.team_names = normalizeStringArray(out.team_names);

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

function writeString(ss, key, value) {
  if (!ss) return;
  const s = normalizeStr(value);
  if (s) ss.setItem(key, s);
  else ss.removeItem(key);
}

function writeUser(ss, user) {
  if (!ss) return;
  if (!user) {
    ss.removeItem(USER_KEY);
    return;
  }
  ss.setItem(USER_KEY, JSON.stringify(user));
}

function extractRoleName(user, explicitRoleName = "") {
  const roleFromArg = normalizeStr(explicitRoleName);
  if (roleFromArg) return roleFromArg;
  return normalizeStr(user?.role_name);
}

export const useSessionStore = defineStore("session", {
  state: () => ({
    sessionToken: readString(TOKEN_KEY),
    roleName: readString(ROLE_KEY),
    user: readUserInfo(),
    authVersion: 0,
  }),

  getters: {
    isLoggedIn: (state) => !!normalizeStr(state.sessionToken),

    hasCompleteSession: (state) => {
      return (
        !!normalizeStr(state.sessionToken) &&
        !!normalizeStr(state.roleName) &&
        !!normalizeStr(state.user?.username)
      );
    },

    displayName: (state) =>
      normalizeStr(state.user?.full_name) ||
      normalizeStr(state.user?.real_name) ||
      normalizeStr(state.user?.username),

    roleLabel: (state) =>
      normalizeStr(state.user?.role_label) || normalizeStr(state.roleName),
  },

  actions: {
    commitLogin(payload = {}) {
      const ss = getSessionStorageSafe();

      const token = normalizeStr(payload.token);
      const user = normalizeUser(payload.user);
      const roleName = extractRoleName(user, payload.roleName);

      if (!token) {
        throw new Error("commitLogin requires token");
      }
      if (!roleName) {
        throw new Error("commitLogin requires roleName");
      }
      if (!user) {
        throw new Error("commitLogin requires user");
      }

      this.sessionToken = token;
      this.roleName = roleName;
      this.user = {
        ...user,
        role_name: roleName,
      };
      this.authVersion += 1;

      writeString(ss, TOKEN_KEY, this.sessionToken);
      writeString(ss, ROLE_KEY, this.roleName);
      writeUser(ss, this.user);
    },

    setToken(token) {
      const ss = getSessionStorageSafe();
      this.sessionToken = normalizeStr(token);
      writeString(ss, TOKEN_KEY, this.sessionToken);
      this.authVersion += 1;
    },

    setRoleName(roleName) {
      const ss = getSessionStorageSafe();
      this.roleName = normalizeStr(roleName);
      writeString(ss, ROLE_KEY, this.roleName);
      this.authVersion += 1;
    },

    setUser(user) {
      const ss = getSessionStorageSafe();
      const normalized = normalizeUser(user);
      this.user = normalized;

      const roleFromUser = normalizeStr(normalized?.role_name);
      if (roleFromUser) {
        this.roleName = roleFromUser;
      }

      writeUser(ss, normalized);
      if (roleFromUser) {
        writeString(ss, ROLE_KEY, roleFromUser);
      }

      this.authVersion += 1;
    },

    clearSession() {
      const ss = getSessionStorageSafe();

      this.sessionToken = "";
      this.roleName = "";
      this.user = null;
      this.authVersion += 1;

      if (!ss) return;
      ss.removeItem(TOKEN_KEY);
      ss.removeItem(ROLE_KEY);
      ss.removeItem(USER_KEY);
    },
  },
});