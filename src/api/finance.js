// src/api/finance.js
import http from "./http";

/**
 * 财务：只对齐新后端（去兼容）
 * - GET    /finance/orders
 * - GET    /finance/orders/summary
 * - GET    /finance/orders/{orderId}
 * - PATCH  /finance/orders/{orderId}/status   body: { is_rebate?, is_paid? }
 * - POST   /finance/orders/{orderId}/return
 *
 * ✅ 关键对齐：
 * - 前端筛选组件常用：
 *   - created_date: [start,end]
 *   - first_register_date: [start,end]
 * - 后端通常收：
 *   - created_date_start / created_date_end
 *   - first_register_date_start / first_register_date_end
 *   => 这里负责映射 + 成对护栏
 *
 * ✅ 重要：全系统时间统一 Asia/Shanghai（北京时间）
 */

const TZ_BJ = "Asia/Shanghai";

function toValidId(orderId) {
  // ✅ 更严格：必须是正整数（拒绝 1.2 这种被截断的脏输入）
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
  // ✅ 用指定时区输出 YYYY-MM-DD（避免本地时区/UTC 跨日坑）
  const dt = isValidDate(d) ? d : new Date(d);
  if (!isValidDate(dt)) return "";

  // en-CA 默认就是 YYYY-MM-DD（符合我们输出）
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

  // 兜底：允许 number/other（极少见），直接转 string
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
 * ❗注意：daterange 不在这里做“拆 start/end”，由 normalizeFinanceListParams 统一处理
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
 * ✅ 财务列表 query 参数归一化（对齐后端）：
 * - created_date: [start,end] => created_date_start/created_date_end
 * - first_register_date: [start,end] => first_register_date_start/first_register_date_end
 * - 成对护栏：*_start 与 *_end 必须同时存在，否则两者都不发（避免后端 400）
 */
function normalizeFinanceListParams(params) {
  const out = cleanQueryParams(params);

  // 1) 从 daterange 字段拆分
  if (Object.prototype.hasOwnProperty.call(out, "created_date")) {
    const pair = normalizeRangeToYmdPair(out.created_date);
    delete out.created_date;
    if (pair) {
      out.created_date_start = pair[0];
      out.created_date_end = pair[1];
    }
  }

  if (Object.prototype.hasOwnProperty.call(out, "first_register_date")) {
    const pair = normalizeRangeToYmdPair(out.first_register_date);
    delete out.first_register_date;
    if (pair) {
      out.first_register_date_start = pair[0];
      out.first_register_date_end = pair[1];
    }
  }

  // 2) 成对护栏（避免只传 start 或只传 end）
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

/**
 * ✅ 只允许发 is_paid / is_rebate，并做布尔兜底
 */
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

export function listFinanceOrders(params = {}) {
  const p = normalizeFinanceListParams(params);
  return http.get("/finance/orders", { params: p });
}

/** ✅ 汇总（同筛选条件，全量汇总，不受分页影响） */
export function getFinanceOrdersSummary(params = {}) {
  const p = normalizeFinanceListParams(params);
  return http.get("/finance/orders/summary", { params: p });
}

export function getFinanceOrderDetail(orderId) {
  const id = toValidId(orderId);
  return http.get(`/finance/orders/${id}`);
}

export function updateFinanceOrderStatus(orderId, data = {}) {
  const id = toValidId(orderId);
  const body = normalizeStatusPatch(data);

  // ✅ 避免空 PATCH（常见误操作/脏调用会导致“成功但没改”）
  if (!Object.keys(body).length) {
    throw new Error("finance api: status patch requires is_paid and/or is_rebate boolean");
  }

  return http.patch(`/finance/orders/${id}/status`, body);
}

export function returnFinanceOrder(orderId) {
  const id = toValidId(orderId);
  return http.post(`/finance/orders/${id}/return`);
}
