// src/api/auth.js
import http from "./http";

function toStr(v) {
    return v == null ? "" : String(v);
}

// 登录
export function login(data = {}) {
    // data: { username, password }
    const username = toStr(data.username).trim();
    const password = toStr(data.password);

    return http.post("/auth/login", {
        username,
        password,
    });
}

// 退出登录
export function logout() {
    return http.post("/auth/logout");
}
