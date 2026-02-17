// src/api/orders.js
import http from "./http";

function toValidId(id) {
  const n = Number(id);
  if (!Number.isFinite(n)) throw new Error("orders api: invalid id");
  const v = Math.trunc(n);
  if (v <= 0) throw new Error("orders api: invalid id");
  return v;
}

function cleanUndefined(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/**
 * ✅ 清洗 query 参数：
 * - 去掉 null / undefined
 * - 字符串 trim 后为空则去掉
 * - 数组去掉空值后为空则去掉
 * - 其他类型原样保留（boolean/number/object）
 *
 * ✅ 额外护栏：
 * - 日期范围参数必须成对出现（start/end），否则两者都不传，避免后端 400
 */
function normalizeListOrdersParams(params) {
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

    if (Array.isArray(v)) {
      const arr = v
        .map((x) => (typeof x === "string" ? x.trim() : x))
        .filter((x) => x !== null && x !== undefined && !(typeof x === "string" && x === ""));
      if (!arr.length) continue;
      out[k] = arr;
      continue;
    }

    out[k] = v;
  }

  // ✅ 成对参数护栏（避免只传 start 或只传 end 导致后端校验 400）
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
    // ✅ 后端 OrderDraftIn 没有 order_info：不要传，避免“以为生效但其实无效/被忽略”
    customer_group_id: data.customer_group_id ?? undefined,
    channel_group_id: data.channel_group_id ?? undefined,
    salesperson_id: data.salesperson_id ?? undefined,
  });
  return http.post("/orders/draft", payload);
}

/**
 * ✅ 统一清洗 images[]，避免不同页面塞入 preview_url / preprocess_note 等冗余字段
 * 导致后端严格校验（400/422）。
 *
 * 注意：
 * - 后端 FinalizeImageIn 的 md5 有默认值（允许空字符串），所以这里不强制要求 md5。
 * - 必填：slot_key / storage_key（否则后端会 400）
 */
function sanitizeFinalizeImages(images) {
  if (!Array.isArray(images)) return [];

  const out = [];
  for (const img of images) {
    if (!img || typeof img !== "object") continue;

    const slot_key = img.slot_key != null ? String(img.slot_key).trim() : "";
    const storage_key = img.storage_key != null ? String(img.storage_key).trim().replace(/^\/+/, "") : "";
    const md5 = img.md5 != null ? String(img.md5).trim() : "";

    // 必填护栏
    if (!slot_key || !storage_key) continue;

    const item = {
      slot_key,
      storage_key,
      md5, // 允许为空（后端默认值也允许）
    };

    // 可选字段：有就带，没有就不传（保持 payload 干净）
    if (img.etag != null && String(img.etag).trim()) item.etag = String(img.etag).trim();
    if (img.size != null && !Number.isNaN(Number(img.size))) item.size = Number(img.size);
    if (img.content_type != null && String(img.content_type).trim()) item.content_type = String(img.content_type).trim();
    if (img.original_name != null && String(img.original_name).trim()) item.original_name = String(img.original_name).trim();
    if (img.url != null && String(img.url).trim()) item.url = String(img.url).trim();

    out.push(item);
  }
  return out;
}

/**
 * ✅ 清洗 clear_slots（用于 multi-slot 清空：目前后端仅支持 related）
 * - 仅保留非空字符串
 * - trim
 * - 去重
 */
function sanitizeClearSlots(clear_slots) {
  if (!Array.isArray(clear_slots)) return [];
  const seen = new Set();
  const out = [];
  for (const x of clear_slots) {
    const s = String(x ?? "").trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

// finalize：提交图片清单，让后端落库 OrderImage/ImageFile 并创建/复用 OcrTask
export function finalizeOrderUpload(payload = {}) {
  const cs = sanitizeClearSlots(payload?.clear_slots);

  const safePayload = cleanUndefined({
    ...payload,
    order_id: payload?.order_id ?? undefined,
    images: sanitizeFinalizeImages(payload?.images),
    // ✅ 对齐后端：OrderFinalizeIn 有 clear_slots，用它才能把 related 清到 0 张
    clear_slots: cs.length ? cs : undefined,

    dynamic_data: payload?.dynamic_data ?? undefined,
    // ✅ 后端 OrderFinalizeIn 没有 order_info：不要传
    customer_group_id: payload?.customer_group_id ?? undefined,
    channel_group_id: payload?.channel_group_id ?? undefined,
    salesperson_id: payload?.salesperson_id ?? undefined,
  });

  return http.post("/orders/finalize", safePayload);
}

// ✅ 稳定模式：浏览器上传到后端，由后端代传 BOS（解决 VPN/代理/CORS 拦截）
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
    module: data.module ?? undefined, // 不强制覆盖，避免意外改 module
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
// ✅ 后端是 PATCH /orders/{id}/status
export function updateOrderStatus(id, data = {}) {
  const oid = toValidId(id);

  const payload = cleanUndefined({
    is_finished: data.is_finished !== undefined ? data.is_finished : undefined,
    // 你后端明确：finance 字段不能在订单模块 patch（is_rebate/is_paid 会 400）
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
 * - 支持 team_name（用于“业务员下拉跟随团队”）
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
