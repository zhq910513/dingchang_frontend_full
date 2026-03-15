// src/api/orders.js
import http from "./http";

/**
 * 全系统时间统一 Asia/Shanghai（北京时间）
 */
const TZ_BJ = "Asia/Shanghai";

/** 订单图片槽位（以后端当前口径为准） */
const ORDER_IMAGE_SLOTS = new Set([
    "vehicle_cert",
    "idcard_front",
    "idcard_back",
    "driving_license_main",
    "driving_license_sub",
    "related",
]);

function toValidId(id) {
    const n = typeof id === "string" ? Number(id.trim()) : Number(id);
    if (!Number.isFinite(n)) throw new Error("orders api: invalid id");
    if (!Number.isInteger(n)) throw new Error("orders api: id must be an integer");
    if (n <= 0) throw new Error("orders api: invalid id");
    return n;
}

function cleanUndefined(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj || {})) {
        if (v !== undefined) out[k] = v;
    }
    return out;
}

function isPlainObject(v) {
    return Object.prototype.toString.call(v) === "[object Object]";
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

/**
 * 订单列表 query 参数归一化：
 * - created_date: [start,end] => created_date_start/created_date_end
 * - first_register_date: [start,end] => first_register_date_start/first_register_date_end
 */
function normalizeListOrdersParams(params) {
    const out = cleanQueryParams(params);

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

function safeObj(v) {
    return isPlainObject(v) ? v : {};
}

function safeMaybeObj(v) {
    if (v === undefined) return undefined;
    return isPlainObject(v) ? v : undefined;
}

function normalizeGroupPageResp(resp) {
    const d = resp?.data;

    if (d && typeof d === "object" && Array.isArray(d.items)) {
        return resp;
    }

    if (Array.isArray(d)) {
        return {
            ...resp,
            data: {
                items: d,
                page: 1,
                page_size: d.length,
                total: d.length,
                has_more: false,
            },
        };
    }

    if (d?.data && typeof d.data === "object" && Array.isArray(d.data.items)) {
        return {
            ...resp,
            data: {
                items: d.data.items,
                page: Number(d.data.page || 1),
                page_size: Number(d.data.page_size || d.data.items.length || 20),
                total: Number(d.data.total || d.data.items.length || 0),
                has_more: !!d.data.has_more,
            },
        };
    }

    if (Array.isArray(d?.data)) {
        return {
            ...resp,
            data: {
                items: d.data,
                page: 1,
                page_size: d.data.length,
                total: d.data.length,
                has_more: false,
            },
        };
    }

    return {
        ...resp,
        data: {
            items: [],
            page: 1,
            page_size: 20,
            total: 0,
            has_more: false,
        },
    };
}

// 列表
export function listOrders(params = {}) {
    const p = normalizeListOrdersParams(params);
    return http.get("/orders", {params: p});
}

// 详情
export function getOrder(id) {
    const oid = toValidId(id);
    return http.get(`/orders/${oid}`);
}

// 创建
export function createOrder(data = {}) {
    const d = safeObj(data);
    const payload = cleanUndefined({
        module: d.module || "order",
        dynamic_data: isPlainObject(d.dynamic_data) ? d.dynamic_data : {},
        salesperson_id: d.salesperson_id ?? undefined,
        customer_group_id: d.customer_group_id ?? undefined,
        channel_group_id: d.channel_group_id ?? undefined,
        is_finished: d.is_finished ?? undefined,
        order_info: safeMaybeObj(d.order_info),
    });
    return http.post("/orders", payload);
}

// 创建订单草稿
export function createOrderDraft(data = {}) {
    const d = safeObj(data);
    const payload = cleanUndefined({
        module: d.module || "order",
        dynamic_data: isPlainObject(d.dynamic_data) ? d.dynamic_data : {},
        customer_group_id: d.customer_group_id ?? undefined,
        channel_group_id: d.channel_group_id ?? undefined,
        salesperson_id: d.salesperson_id ?? undefined,
        order_info: safeMaybeObj(d.order_info),
    });
    return http.post("/orders/draft", payload);
}

function normalizeEtag(etag) {
    const s = String(etag ?? "").trim();
    if (!s) return "";
    return s.replace(/^"+|"+$/g, "");
}

function sanitizeImages(images) {
    if (!Array.isArray(images)) return [];

    const out = [];
    for (const img of images) {
        if (!img || typeof img !== "object") continue;

        const slot_key = img.slot_key != null ? String(img.slot_key).trim() : "";
        const storage_key = img.storage_key != null ? String(img.storage_key).trim().replace(/^\/+/, "") : "";
        const md5 = img.md5 != null ? String(img.md5).trim().toLowerCase() : "";

        if (!slot_key || !ORDER_IMAGE_SLOTS.has(slot_key)) continue;
        if (!storage_key) continue;
        if (!md5) continue;

        const item = {slot_key, storage_key, md5};

        const etag = normalizeEtag(img.etag);
        if (etag) item.etag = etag;

        if (img.size != null && !Number.isNaN(Number(img.size))) {
            const n = Number(img.size);
            if (Number.isFinite(n)) item.size = Math.max(0, n);
        }

        if (img.content_type != null && String(img.content_type).trim()) {
            item.content_type = String(img.content_type).trim();
        }
        if (img.original_name != null && String(img.original_name).trim()) {
            item.original_name = String(img.original_name).trim();
        }

        const url =
            img.url != null && String(img.url).trim()
                ? String(img.url).trim()
                : img.preview_url != null && String(img.preview_url).trim()
                    ? String(img.preview_url).trim()
                    : "";
        if (url) item.url = url;

        out.push(item);
    }
    return out;
}

function sanitizeClearSlots(clear_slots) {
    if (!Array.isArray(clear_slots)) return [];

    const ALLOWED = new Set(["related"]);
    const seen = new Set();
    const out = [];

    for (const x of clear_slots) {
        const s = String(x ?? "").trim();
        if (!s) continue;
        if (!ALLOWED.has(s)) continue;
        if (seen.has(s)) continue;
        seen.add(s);
        out.push(s);
    }
    return out;
}

// finalize
export function finalizeOrderUpload(payload = {}) {
    const src = safeObj(payload);

    const cs = sanitizeClearSlots(src.clear_slots);
    const images = sanitizeImages(src.images);

    const safePayload = cleanUndefined({
        order_id: src.order_id != null ? toValidId(src.order_id) : undefined,
        images,
        clear_slots: cs.length ? cs : undefined,
        dynamic_data: safeMaybeObj(src.dynamic_data),
        salesperson_id: src.salesperson_id ?? undefined,
        order_info: safeMaybeObj(src.order_info),
    });

    return http.post("/orders/finalize", safePayload);
}

// 浏览器上传到后端，由后端代传 BOS
export function uploadOrderImageProxy({slot_key, file} = {}) {
    const sk = String(slot_key ?? "").trim();
    if (!sk) throw new Error("orders api: slot_key is required");
    if (!ORDER_IMAGE_SLOTS.has(sk)) throw new Error("orders api: invalid slot_key");
    if (!file) throw new Error("orders api: file is required");

    const fd = new FormData();
    fd.append("slot_key", sk);
    fd.append("file", file);
    return http.post("/orders/bos-upload", fd);
}

// 待后端该接口确认后再联调
export function bindOrderImagesForAi({order_id, images = [], clear_slots = [], trigger_ocr = true} = {}) {
    const oid = toValidId(order_id);
    const imgs = sanitizeImages(images);
    const cs = sanitizeClearSlots(clear_slots);

    const payload = cleanUndefined({
        images: imgs,
        clear_slots: cs.length ? cs : undefined,
        trigger_ocr: !!trigger_ocr,
    });

    return http.post(`/orders/${oid}/images/bind`, payload);
}

// 更新（详情页保存）
export function updateOrder(id, data = {}) {
    const oid = toValidId(id);
    const d = safeObj(data);

    const payload = cleanUndefined({
        module: d.module ?? undefined,
        dynamic_data: d.dynamic_data !== undefined ? safeMaybeObj(d.dynamic_data) : undefined,
        status: d.status !== undefined ? d.status : undefined,
        audit_status: d.audit_status !== undefined ? d.audit_status : undefined,
        customer_group_id: d.customer_group_id !== undefined ? d.customer_group_id : undefined,
        channel_group_id: d.channel_group_id !== undefined ? d.channel_group_id : undefined,
        salesperson_id: d.salesperson_id !== undefined ? d.salesperson_id : undefined,
        order_info: d.order_info !== undefined ? safeMaybeObj(d.order_info) : undefined,
    });

    return http.put(`/orders/${oid}`, payload);
}

// 单独更新状态
export function updateOrderStatus(id, data = {}) {
    const oid = toValidId(id);
    const d = safeObj(data);

    const payload = cleanUndefined({
        is_finished: d.is_finished !== undefined ? d.is_finished : undefined,
    });

    return http.patch(`/orders/${oid}/status`, payload);
}

// 下拉（订单模块）
export function getCustomerGroups(params = {}) {
    const p = cleanQueryParams(params);
    return http.get("/customer-channel/customers", {params: p}).then(normalizeGroupPageResp);
}

export function getChannelGroups(params = {}) {
    const p = cleanQueryParams(params);
    return http.get("/customer-channel/channels", {params: p}).then(normalizeGroupPageResp);
}

export function getTeams() {
    return http.get("/orders/teams");
}

export function listSalespersons(params = {}) {
    const p0 = params && typeof params === "object" ? params : {};
    const team_name = typeof p0.team_name === "string" ? p0.team_name.trim() : "";

    const statusRaw = p0.status !== undefined && p0.status !== null ? Number(p0.status) : 1;
    const status = Number.isFinite(statusRaw) ? statusRaw : 1;

    const p = cleanUndefined({
        status,
        team_name: team_name || undefined,
    });

    return http.get("/orders/salespersons", {params: p});
}
