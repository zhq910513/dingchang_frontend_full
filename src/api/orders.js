// src/api/orders.js
import http from "./http";

/**
 * ✅ 全系统时间统一 Asia/Shanghai（北京时间）
 * - 与 finance.js 同策略：日期输出 YYYY-MM-DD，避免本地时区/UTC 跨日坑
 */
const TZ_BJ = "Asia/Shanghai";

function toValidId(id) {
  // ✅ 更严格：必须是正整数（拒绝 1.2 这种被截断的脏输入）
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

function isValidDate(d) {
  return d instanceof Date && Number.isFinite(d.getTime());
}

function formatYmdInTz(d, timeZone = TZ_BJ) {
  const dt = isValidDate(d) ? d : new Date(d);
  if (!isValidDate(dt)) return "";

  // en-CA 默认就是 YYYY-MM-DD
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

    // 兼容 YYYYMMDD
    if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;

    // 兼容 YYYY-MM-DD 或 YYYY-MM-DDTHH:mm:ss...
    const m1 = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m1) return m1[1];

    // 兼容 YYYY/MM/DD
    const m2 = s.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
    if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;

    return s;
  }

  // 兜底：number/other
  const s2 = String(v).trim();
  return s2 || "";
}

function normalizeRangeToYmdPair(v) {
  if (!Array.isArray(v) || v.length !== 2) return null;
  const a = normalizeYmd(v[0]);
  const b = normalizeYmd(v[1]);
  if (!a || !b) return null;
  return [a, b];
}

/**
 * ✅ 清洗 query 参数：
 * - 去掉 null / undefined
 * - 字符串 trim 后为空则去掉
 * - 数组去掉空值后为空则去掉
 * - number: NaN/Infinity 丢弃
 * - Date: 自动转 YYYY-MM-DD（北京时间）
 * - 其他类型原样保留（boolean/object）
 *
 * ❗注意：daterange 不在这里做“拆 start/end”，由 normalizeListOrdersParams 统一处理
 */
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
 * ✅ 订单列表 query 参数归一化：
 * - created_date: [start,end] => created_date_start/created_date_end
 * - first_register_date: [start,end] => first_register_date_start/first_register_date_end
 * - 成对护栏：*_start 与 *_end 必须同时存在，否则两者都不发（避免后端 400）
 */
function normalizeListOrdersParams(params) {
  const out = cleanQueryParams(params);

  // 1) 从 daterange 字段拆分（仅当未显式传 start/end 时才使用）
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

  // 2) 成对参数护栏（避免只传 start 或只传 end 导致后端校验 400）
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

// 列表
export function listOrders(params = {}) {
  const p = normalizeListOrdersParams(params);
  return http.get("/orders", { params: p });
}

// 详情（✅ 后端就是 /orders/{id}，且 {id:int} 不会与 /customer-groups 冲突）
export function getOrder(id) {
  const oid = toValidId(id);
  return http.get(`/orders/${oid}`);
}

// 创建（纯文本创建）
export function createOrder(data = {}) {
  const payload = cleanUndefined({
    module: data.module || "order",
    dynamic_data: data.dynamic_data || {},
    image_urls: data.image_urls || [],
    salesperson_id: data.salesperson_id ?? undefined,
    customer_group_id: data.customer_group_id ?? undefined,
    channel_group_id: data.channel_group_id ?? undefined,
    is_finished: data.is_finished ?? undefined,
    is_rebate: data.is_rebate ?? undefined,
    is_paid: data.is_paid ?? undefined,
    order_info: data.order_info ?? undefined,
  });
  return http.post("/orders", payload);
}

// 方案B1：创建订单草稿（拿到 order_id）
export function createOrderDraft(data = {}) {
  const payload = cleanUndefined({
    module: data.module || "order",
    dynamic_data: data.dynamic_data || {},
    // ✅ 后端 OrderDraftIn 没有 order_info：不要传
    customer_group_id: data.customer_group_id ?? undefined,
    channel_group_id: data.channel_group_id ?? undefined,
    salesperson_id: data.salesperson_id ?? undefined,
  });
  return http.post("/orders/draft", payload);
}

/**
 * ✅ 统一清洗 images[]
 */
function sanitizeFinalizeImages(images) {
  if (!Array.isArray(images)) return [];

  const out = [];
  for (const img of images) {
    if (!img || typeof img !== "object") continue;

    const slot_key = img.slot_key != null ? String(img.slot_key).trim() : "";
    const storage_key = img.storage_key != null ? String(img.storage_key).trim().replace(/^\/+/, "") : "";
    const md5 = img.md5 != null ? String(img.md5).trim() : "";

    if (!slot_key || !storage_key) continue;

    const item = {
      slot_key,
      storage_key,
      md5,
    };

    if (img.etag != null && String(img.etag).trim()) item.etag = String(img.etag).trim();

    if (img.size != null && !Number.isNaN(Number(img.size))) {
      const n = Number(img.size);
      item.size = Number.isFinite(n) ? Math.max(0, n) : 0;
    }

    if (img.content_type != null && String(img.content_type).trim()) item.content_type = String(img.content_type).trim();
    if (img.original_name != null && String(img.original_name).trim()) item.original_name = String(img.original_name).trim();
    if (img.url != null && String(img.url).trim()) item.url = String(img.url).trim();

    out.push(item);
  }
  return out;
}

/**
 * ✅ 清洗 clear_slots（目前仅 related）
 */
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

// finalize：提交图片清单
export function finalizeOrderUpload(payload = {}) {
  const src = payload && typeof payload === "object" ? payload : {};

  const cs = sanitizeClearSlots(src.clear_slots);
  const images = sanitizeFinalizeImages(src.images);

  const safePayload = cleanUndefined({
    order_id: src.order_id != null ? toValidId(src.order_id) : undefined,
    images,
    clear_slots: cs.length ? cs : undefined,
    dynamic_data: src.dynamic_data ?? undefined,

    customer_group_id: src.customer_group_id ?? undefined,
    channel_group_id: src.channel_group_id ?? undefined,
    salesperson_id: src.salesperson_id ?? undefined,
  });

  return http.post("/orders/finalize", safePayload);
}

// ✅ 稳定模式：浏览器上传到后端，由后端代传 BOS
export function uploadOrderImageProxy({ slot_key, file }) {
  const fd = new FormData();
  fd.append("slot_key", String(slot_key || "").trim());
  fd.append("file", file);
  return http.post("/orders/bos-upload", fd);
}

// 更新（详情页保存）
export function updateOrder(id, data = {}) {
  const oid = toValidId(id);

  const payload = cleanUndefined({
    module: data.module ?? undefined,
    dynamic_data: data.dynamic_data !== undefined ? data.dynamic_data : undefined,
    status: data.status !== undefined ? data.status : undefined,
    audit_status: data.audit_status !== undefined ? data.audit_status : undefined,
    image_urls: data.image_urls !== undefined ? data.image_urls : undefined,
    is_finished: data.is_finished !== undefined ? data.is_finished : undefined,
    is_rebate: data.is_rebate !== undefined ? data.is_rebate : undefined,
    is_paid: data.is_paid !== undefined ? data.is_paid : undefined,
    customer_group_id: data.customer_group_id !== undefined ? data.customer_group_id : undefined,
    channel_group_id: data.channel_group_id !== undefined ? data.channel_group_id : undefined,
    salesperson_id: data.salesperson_id !== undefined ? data.salesperson_id : undefined,
    order_info: data.order_info !== undefined ? data.order_info : undefined,
  });

  return http.put(`/orders/${oid}`, payload);
}

// 单独更新状态（列表页用）
export function updateOrderStatus(id, data = {}) {
  const oid = toValidId(id);

  const payload = cleanUndefined({
    is_finished: data.is_finished !== undefined ? data.is_finished : undefined,
  });

  return http.patch(`/orders/${oid}/status`, payload);
}

// 客户群 / 渠道群 / 业务员 / 团队 下拉（订单模块用）
export function getCustomerGroups() {
  return http.get("/orders/customer-groups");
}

export function getChannelGroups() {
  return http.get("/orders/channel-groups");
}

/**
 * ✅ 团队下拉：后端 /orders/teams
 * 返回：{ items: [{ team_name: "xxx" }, ...] }
 */
export function getTeams() {
  return http.get("/orders/teams");
}

/**
 * ✅ 业务员下拉：后端 /orders/salespersons
 * - 支持 team_name
 * - 支持 status（默认 1）
 */
export function listSalespersons(params = {}) {
  const p0 = params && typeof params === "object" ? params : {};
  const team_name = typeof p0.team_name === "string" ? p0.team_name.trim() : "";
  const status = p0.status !== undefined && p0.status !== null ? Number(p0.status) : undefined;

  const p = cleanUndefined({
    status: Number.isFinite(status) ? status : undefined,
    team_name: team_name ? team_name : undefined,
  });

  return http.get("/orders/salespersons", { params: p });
}
