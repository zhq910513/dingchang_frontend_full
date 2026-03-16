// src/api/users.js
import http from "./http";

function _trimStr(v) {
    return String(v ?? "").trim();
}

function _lowerTrimStr(v) {
    return _trimStr(v).toLowerCase();
}

function _normalizeTeamNames(v) {
    const arr = Array.isArray(v) ? v : [];
    return [...new Set(arr.map((x) => String(x || "").trim()).filter(Boolean))].sort();
}

function _joinTeamNamesCsv(v) {
    return _normalizeTeamNames(v).join(",");
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

    const role = _lowerTrimStr(params.role);
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
 * - team_name?: string | null
 * - team_names?: string[] -> CSV
 */
export function createUser(data = {}) {
    const payload = {
        username: _trimStr(data.username),
        password: _trimStr(data.password),
        role_name: _lowerTrimStr(data.role_name),
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
 * - team_name?: string | null
 * - team_names?: string[] | null -> CSV | null
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
        if (data.team_names === null) {
            payload.team_names = null;
        } else {
            const teamNamesCsv = _joinTeamNamesCsv(data.team_names);
            payload.team_names = teamNamesCsv || null;
        }
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
