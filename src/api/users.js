// src/api/users.js
import http from "./http";

/**
 * 将后端可能的多种返回格式统一成数组（兼容：[] / {items:[]} / {data:{items:[]}} / {data:[]}）
 * 并“就地”把 resp.data 变成数组，保持你现有调用方写法 resp.data || [] 不改即可稳定工作。
 */
function _normalizeListResponse(resp) {
  try {
    const d = resp?.data;

    // 直接就是数组：OK
    if (Array.isArray(d)) return resp;

    // 常见结构：{ items: [] }
    if (Array.isArray(d?.items)) {
      resp.data = d.items;
      return resp;
    }

    // 常见结构：{ data: [] } 或 { data: { items: [] } }
    if (Array.isArray(d?.data)) {
      resp.data = d.data;
      return resp;
    }
    if (Array.isArray(d?.data?.items)) {
      resp.data = d.data.items;
      return resp;
    }

    // 兜底：不是数组就给空数组，避免页面崩
    resp.data = [];
    return resp;
  } catch {
    return resp;
  }
}

function _trimStr(v) {
  return String(v ?? "").trim();
}

/**
 * 获取当前账号信息（含 team_names/team_name）
 * GET /users/me
 */
export function getMe() {
  return http.get("/users/me");
}

/**
 * 获取子账号列表
 * GET /users/children
 */
export function listChildren() {
  return http.get("/users/children").then(_normalizeListResponse);
}

/**
 * 获取经理列表（给 super_admin 创建 sales/finance/market 选归属经理）
 * GET /users/managers
 */
export function listManagers(params = {}) {
  return http.get("/users/managers", { params: { ...params } }).then(_normalizeListResponse);
}

/**
 * 创建子账号
 * data = { username, password, role_id, real_name, manager_id?, team_name?, team_names? }
 */
export function createUser(data = {}) {
  const roleId = Number(data.role_id);

  const payload = {
    username: _trimStr(data.username),
    password: _trimStr(data.password),
    role_id: Number.isNaN(roleId) ? 0 : roleId,
    real_name: _trimStr(data.real_name),
  };

  if (data.manager_id !== undefined) payload.manager_id = data.manager_id;
  if (data.team_name !== undefined) payload.team_name = data.team_name;
  if (Array.isArray(data.team_names)) payload.team_names = data.team_names;

  return http.post("/users", payload);
}

/**
 * 编辑用户
 * PUT /users/{user_id}
 * data 可包含：{ username?, real_name?, password?, status?, team_name?, team_names?, manager_id? }
 */
export function updateUser(userId, data = {}) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) throw new Error("invalid userId");

  const payload = {};

  if (data.username !== undefined) payload.username = _trimStr(data.username);
  if (data.real_name !== undefined) payload.real_name = _trimStr(data.real_name);

  // password：空串不下发（避免后端拒绝）
  if (data.password !== undefined) {
    const pwd = _trimStr(data.password);
    if (pwd) payload.password = pwd;
  }

  if (data.status !== undefined) payload.status = data.status;

  if (data.manager_id !== undefined) payload.manager_id = data.manager_id;

  if (data.team_name !== undefined) payload.team_name = data.team_name;

  if (data.team_names !== undefined) payload.team_names = data.team_names;

  return http.put(`/users/${uid}`, payload);
}

/**
 * 删除用户（硬删除）
 * DELETE /users/{user_id}
 */
export function deleteUser(userId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) throw new Error("invalid userId");
  return http.delete(`/users/${uid}`);
}
