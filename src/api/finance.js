// src/api/finance.js
import http from "./http";

/**
 * 财务模块：仅保留财务特有接口
 * - GET    /finance/orders/summary
 * - GET    /finance/orders/export
 * - GET    /finance/orders/{orderId}
 * - PATCH  /finance/orders/{orderId}/status
 * - POST   /finance/orders/{orderId}/return
 *
 * 说明：
 * 财务页下的备用图上传 / 删除 / 清空，不再走 finance 域伪接口，
 * 统一复用 orders 域现有接口：
 * - POST /orders/bos-upload
 * - POST /orders/finalize
 *
 * 原因：
 * 后端真实实现集中在 orders.py，且已内置 finance 仅允许操作 related 的 ACL。
 */

const TZ_BJ = "Asia/Shanghai";

const FINANCE_QUERY_KEYS = new Set([
    "created_date",
    "created_date_start",
    "created_date_end",
    "channel_group_id",
    "customer_group_id",
    "market",
    "owner_name",
    "insurance_expire_date",
    "first_register_date",
    "first_register_date_start",
    "first_register_date_end",
    "is_paid",
    "is_rebate",
    "team_name",
    "team_names",
    "ids",
]);

function toValidId(orderId) {
    const n = typeof orderId === "string" ? Number(orderId.trim()) : Number(orderId);
    if (!Number.isFinite(n)) throw new Error("finance api: invalid orderId");
    if (!Number.isInteger(n)) throw new Error("finance api: orderId must be an integer");
    if (n <= 0) throw new Error("finance api: invalid orderId");
    return n;
}

function isValidDate(d) {
    return d instanceof Date && Number.isFinite(d.getTime());
}

function formatYmdInTz(d, timeZone = TZ_BJ) {
    const dt = isValidDate(d) ? d : new Date(d);
    if (!isValidDate(dt)) return "";

    const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });

    return fmt.format(dt);
}

function normalizeYmd(v) {
    if (v === null || v === undefined) return "";
    if (isValidDate(v)) return formatYmdInTz(v, TZ_BJ);

    if (typeof v === "string") {
        const s = v.trim();
        if (!s) return "";

        if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;

        const m1 = s.match(/^(\d{4}-\d{2}-\d{2})/);
        if (m1) return m1[1];

        const m2 = s.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
        if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;

        return "";
    }

    if (typeof v === "number" && Number.isFinite(v)) {
        const d = new Date(v);
        return isValidDate(d) ? formatYmdInTz(d, TZ_BJ) : "";
    }

    return "";
}

function normalizeRangeToYmdPair(v) {
    if (!Array.isArray(v) || v.length !== 2) return null;
    const a = normalizeYmd(v[0]);
    const b = normalizeYmd(v[1]);
    if (!a || !b) return null;
    return [a, b];
}

function cleanQueryParams(params) {
    const out = {};
    const src = params && typeof params === "object" ? params : {};

    for (const [k, v] of Object.entries(src)) {
        if (v === null || v === undefined) continue;

        if (typeof v === "string") {
            const s = v.trim();
            if (!s) continue;
            out[k] = s;
            continue;
        }

        if (typeof v === "number") {
            if (!Number.isFinite(v)) continue;
            out[k] = v;
            continue;
        }

        if (typeof v === "boolean") {
            out[k] = v;
            continue;
        }

        if (isValidDate(v)) {
            out[k] = formatYmdInTz(v, TZ_BJ);
            continue;
        }

        if (Array.isArray(v)) {
            const arr = v
                .map((x) => {
                    if (x === null || x === undefined) return x;
                    if (typeof x === "string") return x.trim();
                    if (typeof x === "number") return Number.isFinite(x) ? x : null;
                    if (typeof x === "boolean") return x;
                    if (isValidDate(x)) return formatYmdInTz(x, TZ_BJ);
                    return x;
                })
                .filter((x) => x !== null && x !== undefined && !(typeof x === "string" && x === ""));
            if (!arr.length) continue;
            out[k] = arr;
            continue;
        }

        out[k] = v;
    }

    return out;
}

function pickFinanceAllowedParams(params) {
    const out = {};
    for (const [k, v] of Object.entries(params || {})) {
        if (!FINANCE_QUERY_KEYS.has(k)) continue;
        out[k] = v;
    }
    return out;
}

function normalizeFinanceParams(params) {
    const picked = pickFinanceAllowedParams(params);
    const out = cleanQueryParams(picked);

    if (Object.prototype.hasOwnProperty.call(out, "created_date")) {
        const hasStart = Object.prototype.hasOwnProperty.call(out, "created_date_start");
        const hasEnd = Object.prototype.hasOwnProperty.call(out, "created_date_end");
        const pair = !hasStart && !hasEnd ? normalizeRangeToYmdPair(out.created_date) : null;
        delete out.created_date;
        if (pair) {
            out.created_date_start = pair[0];
            out.created_date_end = pair[1];
        }
    }

    if (Object.prototype.hasOwnProperty.call(out, "first_register_date")) {
        const hasStart = Object.prototype.hasOwnProperty.call(out, "first_register_date_start");
        const hasEnd = Object.prototype.hasOwnProperty.call(out, "first_register_date_end");
        const pair = !hasStart && !hasEnd ? normalizeRangeToYmdPair(out.first_register_date) : null;
        delete out.first_register_date;
        if (pair) {
            out.first_register_date_start = pair[0];
            out.first_register_date_end = pair[1];
        }
    }

    const pairs = [
        ["created_date_start", "created_date_end"],
        ["first_register_date_start", "first_register_date_end"],
    ];
    for (const [a, b] of pairs) {
        const hasA = Object.prototype.hasOwnProperty.call(out, a) && String(out[a] ?? "").trim() !== "";
        const hasB = Object.prototype.hasOwnProperty.call(out, b) && String(out[b] ?? "").trim() !== "";
        if (hasA !== hasB) {
            delete out[a];
            delete out[b];
        }
    }

    return out;
}

function normalizeStatusPatch(data) {
    const src = data && typeof data === "object" ? data : {};
    const out = {};

    if (Object.prototype.hasOwnProperty.call(src, "is_paid")) {
        if (src.is_paid === true || src.is_paid === false) out.is_paid = src.is_paid;
    }
    if (Object.prototype.hasOwnProperty.call(src, "is_rebate")) {
        if (src.is_rebate === true || src.is_rebate === false) out.is_rebate = src.is_rebate;
    }

    return out;
}

export function getFinanceOrdersSummary(params = {}, config = {}) {
    const p = normalizeFinanceParams(params);
    return http.get("/finance/orders/summary", {
        params: p,
        ...config,
    });
}

export function exportFinanceOrders(params = {}, config = {}) {
    const p = normalizeFinanceParams(params);
    return http.get("/finance/orders/export", {
        params: p,
        responseType: "blob",
        ...config,
    });
}

export function getFinanceOrderDetail(orderId) {
    const id = toValidId(orderId);
    return http.get(`/finance/orders/${id}`);
}

export function updateFinanceOrderStatus(orderId, data = {}) {
    const id = toValidId(orderId);
    const body = normalizeStatusPatch(data);

    if (!Object.keys(body).length) {
        throw new Error("finance api: status patch requires is_paid and/or is_rebate boolean");
    }

    return http.patch(`/finance/orders/${id}/status`, body);
}

export function returnFinanceOrder(orderId) {
    const id = toValidId(orderId);
    return http.post(`/finance/orders/${id}/return`);
}
