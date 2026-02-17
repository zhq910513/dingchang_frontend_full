// src/utils/fieldFormat.js

function findOptionLabel(options, value) {
  if (!options || !options.length) return "";

  for (const op of options) {
    // 结构 1：{ label, value }
    if (op && typeof op === "object") {
      if (String(op.value) === String(value)) {
        return op.label ?? String(op.value ?? "");
      }
    } else {
      // 结构 2："xxx"
      if (String(op) === String(value)) return String(op);
    }
  }
  return "";
}

function isYmd(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isCompactYmd(s) {
  return typeof s === "string" && /^\d{8}$/.test(s);
}

function compactYmdToYmd(s) {
  if (!isCompactYmd(s)) return s;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * 将任意输入尽量格式化为 YYYY-MM-DD（用于前端展示）
 * - 已是 YYYY-MM-DD：原样返回（避免 Date("YYYY-MM-DD") 被当 UTC 解析导致日期漂移）
 * - YYYYMMDD：转为 YYYY-MM-DD
 * - 时间戳（秒/毫秒）、ISO、可被 Date 解析的字符串：转为 YYYY-MM-DD
 * - 无法解析：返回原字符串
 */
export function formatToYMD(val) {
  if (val === null || val === undefined || val === "") return "";

  const s = String(val).trim();
  if (!s) return "";

  // 1) YYYY-MM-DD：原样返回（规避 UTC 解析坑）
  if (isYmd(s)) return s;

  // 2) YYYYMMDD：直接转
  if (isCompactYmd(s)) return compactYmdToYmd(s);

  // 3) 其他：尝试解析为 Date
  const d = tryParseToDate(val);
  if (d) {
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    return `${y}-${m}-${day}`;
  }

  // 4) 兜底：原样字符串
  return s;
}

function tryParseToDate(val) {
  // number: ms or seconds
  if (typeof val === "number" && Number.isFinite(val)) {
    const n = val;
    const ms = n < 1e12 ? n * 1000 : n;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d;
    return null;
  }

  const s = String(val ?? "").trim();
  if (!s) return null;

  // YYYY-MM-DD：不交给 Date 解析（避免按 UTC 解析造成日期漂移）
  if (isYmd(s)) return null;

  // YYYYMMDD：构造本地日期（避免时区漂移）
  if (isCompactYmd(s)) {
    const y = Number(s.slice(0, 4));
    const m = Number(s.slice(4, 6));
    const d = Number(s.slice(6, 8));
    if (
      Number.isFinite(y) &&
      Number.isFinite(m) &&
      Number.isFinite(d) &&
      m >= 1 &&
      m <= 12 &&
      d >= 1 &&
      d <= 31
    ) {
      const dt = new Date(y, m - 1, d);
      if (!Number.isNaN(dt.getTime())) return dt;
    }
    return null;
  }

  // 纯数字：尝试按秒/毫秒解析
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n)) {
      const ms = s.length === 10 ? n * 1000 : n; // 10位秒级；13位毫秒级（或更长直接按毫秒）
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  // 其他字符串：交给 Date 解析（尽量兜底）
  try {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d;
  } catch {}

  return null;
}

export function formatDynamicValue(val, field) {
  if (val === null || val === undefined || val === "") return "";

  const type = field?.type ?? "text";

  if (type === "select") {
    const label = findOptionLabel(field.options, val);
    return label || String(val);
  }

  if (type === "date") {
    // 前端展示：统一 YYYY-MM-DD
    return formatToYMD(val);
  }

  if (type === "image") return "[图片]";

  return String(val);
}
