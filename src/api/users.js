// src/api/users.js
import http from "./http";

function _trimStr(v) {
    return String(v ?? "").trim();
}

function _joinTeamNamesCsv(v) {
    const arr = Array.isArray(v) ? v : [];
    const cleaned = [...new Set(arr.map((x) => String(x || "").trim()).filter(Boolean))];
    return cleaned.join(",");
}

/**
 * 用户列表
 * GET /users
 * params:
 * - keyword?: string
 * - role?: string
 */
export function listUsers(params = {}) {
    const query = {};

    const keyword = _trimStr(params.keyword);
    if (keyword) query.keyword = keyword;

    const role = _trimStr(params.role);
    if (role) query.role = role;

    return http.get("/users", {params: query});
}

/**
 * 创建用户
 * POST /users
 * data:
 * - username: string
 * - password: string
 * - role_name: string
 * - team_name?: string
 * - team_names?: string[] -> CSV
 */
export function createUser(data = {}) {
    const payload = {
        username: _trimStr(data.username),
        password: _trimStr(data.password),
        role_name: _trimStr(data.role_name),
    };

    const teamName = _trimStr(data.team_name);
    if (teamName) {
        payload.team_name = teamName;
    }

    const teamNamesCsv = _joinTeamNamesCsv(data.team_names);
    if (teamNamesCsv) {
        payload.team_names = teamNamesCsv;
    }

    return http.post("/users", payload);
}

/**
 * 更新用户
 * PUT /users/{user_id}
 * data:
 * - password?: string
 * - team_name?: string
 * - team_names?: string[] -> CSV
 */
export function updateUser(userId, data = {}) {
    const uid = Number(userId);
    if (!Number.isFinite(uid) || uid <= 0) {
        throw new Error("invalid userId");
    }

    const payload = {};

    const password = _trimStr(data.password);
    if (password) {
        payload.password = password;
    }

    if (data.team_name !== undefined) {
        const teamName = _trimStr(data.team_name);
        payload.team_name = teamName || null;
    }

    if (data.team_names !== undefined) {
        payload.team_names = _joinTeamNamesCsv(data.team_names) || null;
    }

    return http.put(`/users/${uid}`, payload);
}

/**
 * 删除用户
 * DELETE /users/{user_id}
 */
export function deleteUser(userId) {
    const uid = Number(userId);
    if (!Number.isFinite(uid) || uid <= 0) {
        throw new Error("invalid userId");
    }
    return http.delete(`/users/${uid}`);
}
