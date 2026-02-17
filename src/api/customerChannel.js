// src/api/customerChannel.js
// 客户/渠道分组 API（共享数据版）
// - ✅ list 接口支持透传 include_deleted（给超级管理员查看已删除用）
// - ✅ create / update：contacts 仅允许 手机号/座机，做强校验；非法直接拒绝（不能随便填）
// - ✅ 共享数据：统一剔除 team_name 等团队隔离参数，避免前端误传造成“仍在隔离”的错觉

import http from "./http";

// =======================
// contacts 校验/归一
// =======================
const MOBILE_RE = /^1[3-9]\d{9}$/; // 中国大陆 11 位手机号
const LANDLINE_RE = /^(0\d{2,3}-?)?\d{7,8}(-\d{1,6})?$/; // 座机：区号可选，分机可选
const SERVICE_RE = /^(400|800)\d{7}$/; // 400/800

function cleanValue(v) {
  // 仅允许数字和横杠，去空格
  const s = String(v ?? "").replace(/\s+/g, "");
  return s.replace(/[^0-9\-]/g, "");
}

function typeNorm(t) {
  const s = String(t ?? "").trim().toLowerCase();
  return s === "tel" ? "tel" : "mobile";
}

function validateOneContact(c) {
  const t = typeNorm(c?.type);
  const raw = cleanValue(c?.value ?? "");
  if (!raw) return { ok: false, msg: "联系方式不能为空" };

  if (t === "mobile") {
    const digits = raw.replace(/-/g, "");
    if (!MOBILE_RE.test(digits)) return { ok: false, msg: "手机号格式不正确（需 11 位大陆手机号）" };
    return { ok: true, value: digits, type: "mobile" };
  }

  // tel
  const digits = raw.replace(/-/g, "");
  if (SERVICE_RE.test(digits)) return { ok: true, value: digits, type: "tel" };
  if (!LANDLINE_RE.test(raw)) {
    return {
      ok: false,
      msg: "座机格式不正确（示例：010-88888888 / 0571-8888888 / 010-88888888-123 / 400xxxxxxx）",
    };
  }
  return { ok: true, value: raw, type: "tel" };
}

function normalizeContactsArray(arr) {
  const input = Array.isArray(arr) ? arr : [];
  const out = [];
  const seen = new Set();

  for (const c of input) {
    const r = validateOneContact(c);
    if (!r.ok) {
      return { ok: false, msg: r.msg };
    }
    const key = `${r.type}:${r.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type: r.type, value: r.value });
  }
  return { ok: true, contacts: out };
}

/**
 * 兼容旧调用：如果传 string，则只按“号码列表”解析（不再支持 微信：xxx 之类）
 * - 支持换行/逗号/分号分隔
 * - 每段必须是合法 手机/座机，否则直接报错
 */
function parseContactsTextStrict(text) {
  const s = String(text || "").trim();
  if (!s) return { ok: true, contacts: [] };

  const parts = s
    .split(/[\n\r,，;；]+/g)
    .map((x) => String(x || "").trim())
    .filter(Boolean);

  const arr = parts.map((p) => {
    const raw = cleanValue(p);
    // 简单自动识别：11位手机号 => mobile；否则 tel
    const digits = raw.replace(/-/g, "");
    const t = MOBILE_RE.test(digits) ? "mobile" : "tel";
    return { type: t, value: raw };
  });

  return normalizeContactsArray(arr);
}

function normalizeContactsInput(contacts) {
  if (Array.isArray(contacts)) return normalizeContactsArray(contacts);
  if (typeof contacts === "string") return parseContactsTextStrict(contacts);
  return { ok: true, contacts: [] };
}

// =======================
// 共享数据：剔除团队隔离参数（前端层面禁用）
// =======================
function stripTeamScopeParams(params) {
  const p = params && typeof params === "object" ? { ...params } : {};
  // 常见变体都剔除，避免调用方误传
  delete p.team_name;
  delete p.teamName;
  delete p.team_names;
  delete p.teamNames;
  delete p.team_id;
  delete p.teamId;
  delete p.team_ids;
  delete p.teamIds;
  return p;
}

// =======================
// list（分组管理：CRUD 对应的列表）
// =======================
export function listChannelGroups(params = {}) {
  return http.get("/channel-groups", { params: stripTeamScopeParams(params) });
}

export function listCustomerGroups(params = {}) {
  return http.get("/customer-groups", { params: stripTeamScopeParams(params) });
}

// =======================
// list（orders 模块下拉：走 /orders/*）
// =======================
export function listOrderChannelGroups(params = {}) {
  return http.get("/orders/channel-groups", { params: stripTeamScopeParams(params) });
}

export function listOrderCustomerGroups(params = {}) {
  return http.get("/orders/customer-groups", { params: stripTeamScopeParams(params) });
}

// =======================
// create
// =======================
export function createChannelGroup(payload = {}) {
  const normalized = normalizeContactsInput(payload.contacts);
  if (!normalized.ok) {
    return Promise.reject(new Error(normalized.msg || "联系方式不合法"));
  }

  return http.post("/channel-groups", {
    channel_code: payload.channel_code,
    channel_name: payload.channel_name,
    region: payload.region,
    contacts: normalized.contacts,
  });
}

export function createCustomerGroup(payload = {}) {
  const mk = String(payload.market ?? "").trim();

  const normalized = normalizeContactsInput(payload.contacts);
  if (!normalized.ok) {
    return Promise.reject(new Error(normalized.msg || "联系方式不合法"));
  }

  return http.post("/customer-groups", {
    customer_code: payload.customer_code,
    customer_name: payload.customer_name,
    market: mk ? mk : null,
    region: payload.region,
    contacts: normalized.contacts,
  });
}

// =======================
// update
// =======================
export function updateChannelGroup(id, payload = {}) {
  const normalized = normalizeContactsInput(payload.contacts);
  if (!normalized.ok) {
    return Promise.reject(new Error(normalized.msg || "联系方式不合法"));
  }

  return http.put(`/channel-groups/${id}`, {
    channel_code: payload.channel_code,
    channel_name: payload.channel_name,
    region: payload.region,
    contacts: normalized.contacts,
  });
}

export function updateCustomerGroup(id, payload = {}) {
  const mk = String(payload.market ?? "").trim();

  const normalized = normalizeContactsInput(payload.contacts);
  if (!normalized.ok) {
    return Promise.reject(new Error(normalized.msg || "联系方式不合法"));
  }

  return http.put(`/customer-groups/${id}`, {
    customer_code: payload.customer_code,
    customer_name: payload.customer_name,
    market: mk ? mk : null,
    region: payload.region,
    contacts: normalized.contacts,
  });
}

// =======================
// delete
// =======================
export function deleteChannelGroup(id) {
  return http.delete(`/channel-groups/${id}`);
}

export function deleteCustomerGroup(id) {
  return http.delete(`/customer-groups/${id}`);
}
