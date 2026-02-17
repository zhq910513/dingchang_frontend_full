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

  // YYYY-MM-DD：原样返回（避免 Date("YYYY-MM-DD") 当 UTC 解析导致日期漂移）
  if (isYmd(s)) return null;

  // YYYYMMDD：直接转
  if (isCompactYmd(s)) return null;

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
    const s = String(val);

    // ✅ 1) YYYY-MM-DD 直接返回（规避 UTC 解析坑）
    if (isYmd(s)) return s;

    // ✅ 2) YYYYMMDD 转 YYYY-MM-DD
    if (isCompactYmd(s)) return compactYmdToYmd(s);

    // ✅ 3) 尝试时间戳/ISO/其他格式
    const d = tryParseToDate(val);
    if (d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }

    return s;
  }

  if (type === "image") return "[图片]";

  return String(val);
}
