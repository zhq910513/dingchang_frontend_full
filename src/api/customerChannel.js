// src/api/customerChannel.js
import http from "./http";

// =======================
// contacts 校验/归一
// =======================
const MOBILE_RE = /^1[3-9]\d{9}$/;
const LANDLINE_RE = /^(0\d{2,3}-?)?\d{7,8}(-\d{1,6})?$/;
const SERVICE_RE = /^(400|800)\d{7}$/;

function cleanText(v) {
    return String(v ?? "").trim();
}

function cleanValue(v) {
    const s = String(v ?? "").replace(/\s+/g, "");
    return s.replace(/[^0-9-]/g, "");
}

function typeNorm(t) {
    const s = String(t ?? "").trim().toLowerCase();
    return s === "tel" ? "tel" : "mobile";
}

function validateOneContact(contact) {
    const t = typeNorm(contact?.type);
    const raw = cleanValue(contact?.value);

    if (!raw) {
        return {ok: false, msg: "联系方式不能为空"};
    }

    if (t === "mobile") {
        const digits = raw.replace(/-/g, "");
        if (!MOBILE_RE.test(digits)) {
            return {ok: false, msg: "手机号格式不正确（需 11 位大陆手机号）"};
        }
        return {ok: true, type: "mobile", value: digits};
    }

    const digits = raw.replace(/-/g, "");
    if (SERVICE_RE.test(digits)) {
        return {ok: true, type: "tel", value: digits};
    }

    if (!LANDLINE_RE.test(raw)) {
        return {
            ok: false,
            msg: "座机格式不正确（示例：010-88888888 / 0571-8888888 / 010-88888888-123 / 400xxxxxxx）",
        };
    }

    return {ok: true, type: "tel", value: raw};
}

function normalizeContactsArray(arr) {
    const input = Array.isArray(arr) ? arr : [];
    const out = [];
    const seen = new Set();

    for (const item of input) {
        const r = validateOneContact(item);
        if (!r.ok) return {ok: false, msg: r.msg};

        const dedupeKey = `${r.type}:${r.value}`;
        if (seen.has(dedupeKey)) continue;

        seen.add(dedupeKey);
        out.push({type: r.type, value: r.value});
    }

    return {ok: true, contacts: out};
}

function normalizeContactsInput(contacts) {
    if (Array.isArray(contacts)) return normalizeContactsArray(contacts);
    if (contacts == null) return {ok: true, contacts: []};
    return {ok: false, msg: "contacts 格式不正确"};
}

// =======================
// 下拉接口（轻量）
// =======================
export function listOrderChannelGroups(params = {}) {
    return http.get("/customer-channel/channels", {params});
}

export function listOrderCustomerGroups(params = {}) {
    return http.get("/customer-channel/customers", {params});
}

// 兼容旧调用名
export const getChannelGroups = listOrderChannelGroups;
export const getCustomerGroups = listOrderCustomerGroups;

// =======================
// 管理页 list
// =======================
export function listChannelGroups(params = {}) {
    return http.get("/customer-channel/channel-groups", {params});
}

export function listCustomerGroups(params = {}) {
    return http.get("/customer-channel/customer-groups", {params});
}

// =======================
// 管理页 create
// =======================
export function createChannelGroup(payload = {}) {
    const normalized = normalizeContactsInput(payload.contacts);
    if (!normalized.ok) {
        return Promise.reject(new Error(normalized.msg || "联系方式不合法"));
    }

    return http.post("/customer-channel/channel-groups", {
        channel_code: cleanText(payload.channel_code),
        channel_name: cleanText(payload.channel_name),
        region: cleanText(payload.region) || null,
        contacts: normalized.contacts,
    });
}

export function createCustomerGroup(payload = {}) {
    const normalized = normalizeContactsInput(payload.contacts);
    if (!normalized.ok) {
        return Promise.reject(new Error(normalized.msg || "联系方式不合法"));
    }

    return http.post("/customer-channel/customer-groups", {
        customer_code: cleanText(payload.customer_code),
        customer_name: cleanText(payload.customer_name),
        market: cleanText(payload.market) || null,
        region: cleanText(payload.region) || null,
        contacts: normalized.contacts,
    });
}

// =======================
// 管理页 update
// =======================
export function updateChannelGroup(id, payload = {}) {
    const normalized = normalizeContactsInput(payload.contacts);
    if (!normalized.ok) {
        return Promise.reject(new Error(normalized.msg || "联系方式不合法"));
    }

    return http.put(`/customer-channel/channel-groups/${id}`, {
        channel_code: cleanText(payload.channel_code),
        channel_name: cleanText(payload.channel_name),
        region: cleanText(payload.region) || null,
        contacts: normalized.contacts,
    });
}

export function updateCustomerGroup(id, payload = {}) {
    const normalized = normalizeContactsInput(payload.contacts);
    if (!normalized.ok) {
        return Promise.reject(new Error(normalized.msg || "联系方式不合法"));
    }

    return http.put(`/customer-channel/customer-groups/${id}`, {
        customer_code: cleanText(payload.customer_code),
        customer_name: cleanText(payload.customer_name),
        market: cleanText(payload.market) || null,
        region: cleanText(payload.region) || null,
        contacts: normalized.contacts,
    });
}

// =======================
// 管理页 delete
// =======================
export function deleteChannelGroup(id) {
    return http.delete(`/customer-channel/channel-groups/${id}`);
}

export function deleteCustomerGroup(id) {
    return http.delete(`/customer-channel/customer-groups/${id}`);
}
