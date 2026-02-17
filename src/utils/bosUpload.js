// src/utils/bosUpload.js
/**
 * 方案B1（STS + MD5 Key + HEAD 去重）
 *
 * 新增：上传前图片预处理（>2MB 触发）：缩放 + 轻压缩（优先保 OCR 清晰）
 */

import { preprocessImageForUpload } from "./imagePreprocess";

// ✅ slotKey -> BOS prefix
const SLOT_PREFIX_MAP = {
  vehicle_cert: "cert",
  idcard_front: "idcard",
  idcard_back: "idcard",
  driving_license_main: "dl",
  driving_license_sub: "dl",
  related: "backup",
};

function _makeErr(messageZh, debug) {
  const err = new Error(String(messageZh || "上传失败"));
  if (debug) err.__debug = typeof debug === "string" ? debug : JSON.stringify(debug);
  return err;
}

function _prefixFromSlot(slotKey) {
  const k = String(slotKey || "").trim();
  const p = SLOT_PREFIX_MAP[k];
  if (!p) {
    throw _makeErr("上传失败：图片类型不支持或参数异常", { slotKey: k });
  }
  return p;
}

// -------------------------
// MD5（ArrayBuffer -> hex）
// -------------------------
function _toHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function _md5ArrayBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  const len = bytes.length;

  function cmn(q, a, b, x, s, t) {
    a = (a + q + x + t) | 0;
    return (((a << s) | (a >>> (32 - s))) + b) | 0;
  }

  function ff(a, b, c, d, x, s, t) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }

  function gg(a, b, c, d, x, s, t) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }

  function hh(a, b, c, d, x, s, t) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function ii(a, b, c, d, x, s, t) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  const n = ((len + 8) >>> 6 << 4) + 16;
  const x = new Uint32Array(n);
  let i;
  for (i = 0; i < len; i++) {
    x[i >> 2] |= bytes[i] << ((i % 4) * 8);
  }
  x[i >> 2] |= 0x80 << ((i % 4) * 8);
  x[n - 2] = (len * 8) >>> 0;
  x[n - 1] = ((len * 8) / 0x100000000) >>> 0;

  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;

  for (i = 0; i < x.length; i += 16) {
    const oa = a,
      ob = b,
      oc = c,
      od = d;

    a = ff(a, b, c, d, x[i + 0], 7, -680876936);
    d = ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = ff(c, d, a, b, x[i + 2], 17, 606105819);
    b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = ff(a, b, c, d, x[i + 4], 7, -176418897);
    d = ff(d, a, b, c, x[i + 5], 12, 1200080426);
    c = ff(c, d, a, b, x[i + 6], 17, -1473231341);
    b = ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = ff(a, b, c, d, x[i + 8], 7, 1770035416);
    d = ff(d, a, b, c, x[i + 9], 12, -1958414417);
    c = ff(c, d, a, b, x[i + 10], 17, -42063);
    b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = ff(a, b, c, d, x[i + 12], 7, 1804603682);
    d = ff(d, a, b, c, x[i + 13], 12, -40341101);
    c = ff(c, d, a, b, x[i + 14], 17, -1502002290);
    b = ff(b, c, d, a, x[i + 15], 22, 1236535329);

    a = gg(a, b, c, d, x[i + 1], 5, -165796510);
    d = gg(d, a, b, c, x[i + 6], 9, -1069501632);
    c = gg(c, d, a, b, x[i + 11], 14, 643717713);
    b = gg(b, c, d, a, x[i + 0], 20, -373897302);
    a = gg(a, b, c, d, x[i + 5], 5, -701558691);
    d = gg(d, a, b, c, x[i + 10], 9, 38016083);
    c = gg(c, d, a, b, x[i + 15], 14, -660478335);
    b = gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = gg(a, b, c, d, x[i + 9], 5, 568446438);
    d = gg(d, a, b, c, x[i + 14], 9, -1019803690);
    c = gg(c, d, a, b, x[i + 3], 14, -187363961);
    b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = gg(a, b, c, d, x[i + 13], 5, -1444681467);
    d = gg(d, a, b, c, x[i + 2], 9, -51403784);
    c = gg(c, d, a, b, x[i + 7], 14, 1735328473);
    b = gg(b, c, d, a, x[i + 12], 20, -1926607734);

    a = hh(a, b, c, d, x[i + 5], 4, -378558);
    d = hh(d, a, b, c, x[i + 8], 11, -2022574463);
    c = hh(c, d, a, b, x[i + 11], 16, 1839030562);
    b = hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = hh(a, b, c, d, x[i + 1], 4, -1530992060);
    d = hh(d, a, b, c, x[i + 4], 11, 1272893353);
    c = hh(c, d, a, b, x[i + 7], 16, -155497632);
    b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = hh(a, b, c, d, x[i + 13], 4, 681279174);
    d = hh(d, a, b, c, x[i + 0], 11, -358537222);
    c = hh(c, d, a, b, x[i + 3], 16, -722521979);
    b = hh(b, c, d, a, x[i + 6], 23, 76029189);
    a = hh(a, b, c, d, x[i + 9], 4, -640364487);
    d = hh(d, a, b, c, x[i + 12], 11, -421815835);
    c = hh(c, d, a, b, x[i + 15], 16, 530742520);
    b = hh(b, c, d, a, x[i + 2], 23, -995338651);

    a = ii(a, b, c, d, x[i + 0], 6, -198630844);
    d = ii(d, a, b, c, x[i + 7], 10, 1126891415);
    c = ii(c, d, a, b, x[i + 14], 15, -1416354905);
    b = ii(b, c, d, a, x[i + 5], 21, -57434055);
    a = ii(a, b, c, d, x[i + 12], 6, 1700485571);
    d = ii(d, a, b, c, x[i + 3], 10, -1894986606);
    c = ii(c, d, a, b, x[i + 10], 15, -1051523);
    b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
    a = ii(a, b, c, d, x[i + 8], 6, 1873313359);
    d = ii(d, a, b, c, x[i + 15], 10, -30611744);
    c = ii(c, d, a, b, x[i + 6], 15, -1560198380);
    b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
    a = ii(a, b, c, d, x[i + 4], 6, -145523070);
    d = ii(d, a, b, c, x[i + 11], 10, -1120210379);
    c = ii(c, d, a, b, x[i + 2], 15, 718787259);
    b = ii(b, c, d, a, x[i + 9], 21, -343485551);

    a = (a + oa) | 0;
    b = (b + ob) | 0;
    c = (c + oc) | 0;
    d = (d + od) | 0;
  }

  const out = new Uint8Array(16);
  const words = [a, b, c, d];
  for (let j = 0; j < 4; j++) {
    const w = words[j];
    out[j * 4 + 0] = w & 0xff;
    out[j * 4 + 1] = (w >>> 8) & 0xff;
    out[j * 4 + 2] = (w >>> 16) & 0xff;
    out[j * 4 + 3] = (w >>> 24) & 0xff;
  }
  return _toHex(out);
}

export async function computeFileMd5(file) {
  const buf = await file.arrayBuffer();
  return _md5ArrayBuffer(buf);
}

// -------------------------
// BCE auth v1（WebCrypto HMAC-SHA256）
// ✅ 修复：signingKey 必须用二进制，不可用 hex 字符串当 key
// -------------------------
function _utcIsoZ() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function _uriEncode(s, encodeSlash = true) {
  const out = encodeURIComponent(String(s));
  return encodeSlash ? out : out.replace(/%2F/gi, "/");
}

function _canonicalHeaders(headers, signedHeaders) {
  const lines = [];
  const keys = Array.from(new Set(signedHeaders.map((h) => String(h).trim().toLowerCase()))).sort();
  for (const k of keys) {
    const v = (headers[k] ?? "").toString().trim();
    if (!v) continue;
    lines.push(`${_uriEncode(k)}:${_uriEncode(v)}`);
  }
  return lines.sort().join("\n");
}

function _toU8(v) {
  if (v instanceof Uint8Array) return v;
  if (v instanceof ArrayBuffer) return new Uint8Array(v);
  if (ArrayBuffer.isView(v)) return new Uint8Array(v.buffer);
  return null;
}

async function _hmacSha256Raw(keyInput, msgText) {
  const enc = new TextEncoder();
  const msgBytes = enc.encode(String(msgText));

  let keyBytes = _toU8(keyInput);
  if (!keyBytes) keyBytes = enc.encode(String(keyInput));

  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, msgBytes);
  return new Uint8Array(sig);
}

async function _hmacSha256Hex(keyInput, msgText) {
  const u8 = await _hmacSha256Raw(keyInput, msgText);
  return _toHex(u8);
}

async function bceAuthV1({ ak, sk, method, path, timestamp, expireSeconds = 1800, headersToSign, headers }) {
  const authPrefix = `bce-auth-v1/${ak}/${timestamp}/${expireSeconds}`;

  // ✅ signingKey = HMAC-SHA256(sk, authPrefix) 的二进制结果
  const signingKeyBytes = await _hmacSha256Raw(sk, authPrefix);

  const canonicalUri = _uriEncode(path, false);
  const canonicalQuery = "";
  const canonicalHdrs = _canonicalHeaders(headers, headersToSign);

  const canonicalRequest = [method.toUpperCase(), canonicalUri, canonicalQuery, canonicalHdrs].join("\n");

  // ✅ signature = HMAC-SHA256(signingKeyBytes, canonicalRequest)
  const signature = await _hmacSha256Hex(signingKeyBytes, canonicalRequest);

  const signedHeadersStr = Array.from(new Set(headersToSign.map((h) => String(h).toLowerCase())))
    .sort()
    .join(";");
  return `${authPrefix}/${signedHeadersStr}/${signature}`;
}

function _guessExt(file) {
  const name = (file?.name || "").toLowerCase();
  if (name.endsWith(".jpeg") || name.endsWith(".jpg")) return ".jpg";
  if (name.endsWith(".png")) return ".png";
  if (name.endsWith(".webp")) return ".webp";
  if (name.endsWith(".bmp")) return ".bmp";
  if (name.endsWith(".heic")) return ".heic";
  const t = (file?.type || "").toLowerCase();
  if (t.includes("jpeg")) return ".jpg";
  if (t.includes("png")) return ".png";
  if (t.includes("webp")) return ".webp";
  return ".bin";
}

export function buildB1Key({ slotKey, md5, file }) {
  const m = (md5 || "").toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(m)) {
    throw _makeErr("上传失败：文件校验异常，请重试", { md5: m });
  }
  const ext = _guessExt(file);
  const prefix = _prefixFromSlot(slotKey);
  return `${prefix}/${m.slice(0, 2)}/${m.slice(2, 4)}/${m}${ext}`;
}

function _pickHeader(resp, name) {
  return resp.headers.get(name) || resp.headers.get(String(name).toLowerCase()) || resp.headers.get(String(name).toUpperCase()) || "";
}

async function _readTextSafe(resp) {
  try {
    return await resp.text();
  } catch {
    return "";
  }
}

function _publicPreviewUrl(bosHost, key) {
  const path = `/${String(key || "").replace(/^\/+/, "")}`;
  return `https://${bosHost}${path}`;
}

// ✅ 先走 public HEAD（不带任何自定义头，不触发预检）
async function headObjectPublic({ bosHost, key }) {
  const path = `/${String(key || "").replace(/^\/+/, "")}`;
  const url = `https://${bosHost}${path}`;
  const resp = await fetch(url, {
    method: "HEAD",
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
  });
  if (resp.status === 200) return { exists: true, etag: _pickHeader(resp, "ETag"), mode: "public" };
  if (resp.status === 404) return { exists: false, mode: "public" };
  return { exists: false, mode: "public", fallback: true, status: resp.status };
}

async function headObjectSigned({ bosHost, key, sts }) {
  const path = `/${String(key || "").replace(/^\/+/, "")}`;
  const url = `https://${bosHost}${path}`;
  const timestamp = _utcIsoZ();

  const headersForSign = {
    host: bosHost,
    "x-bce-date": timestamp,
    "x-bce-security-token": sts.sessionToken,
  };
  const headersToSign = ["host", "x-bce-date", "x-bce-security-token"];

  const authorization = await bceAuthV1({
    ak: sts.accessKeyId,
    sk: sts.secretAccessKey,
    method: "HEAD",
    path,
    host: bosHost,
    timestamp,
    expireSeconds: 1800,
    headersToSign,
    headers: headersForSign,
  });

  const reqHeaders = {
    "x-bce-date": timestamp,
    "x-bce-security-token": sts.sessionToken,
    Authorization: authorization,
  };

  let resp;
  try {
    resp = await fetch(url, {
      method: "HEAD",
      mode: "cors",
      credentials: "omit",
      headers: reqHeaders,
      cache: "no-store",
    });
  } catch (e) {
    throw _makeErr("网络异常：无法访问存储服务，请检查网络/代理设置后重试", {
      step: "HEAD",
      url,
      error: e?.message || String(e),
      hint: "可能走了本机代理(如 127.0.0.1:7890) 或公司网关拦截",
    });
  }

  if (resp.status === 200) return { exists: true, etag: _pickHeader(resp, "ETag"), mode: "signed" };
  if (resp.status === 404) return { exists: false, mode: "signed" };

  const rid = _pickHeader(resp, "x-bce-request-id");
  const dbg = _pickHeader(resp, "x-bce-debug-id");

  // 诊断 GET（只写到 debug，不塞到用户文案里）
  let diag = {};
  try {
    const r2 = await fetch(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      headers: reqHeaders,
      cache: "no-store",
    });
    const t2 = await _readTextSafe(r2);
    diag = {
      get_status: r2.status,
      get_request_id: _pickHeader(r2, "x-bce-request-id"),
      get_debug_id: _pickHeader(r2, "x-bce-debug-id"),
      get_body_preview: String(t2 || "").slice(0, 2000),
    };
  } catch (e) {
    diag = { get_diag_failed: e?.message || String(e) };
  }

  throw _makeErr("存储服务校验失败，请稍后重试", {
    step: "HEAD",
    status: resp.status,
    url,
    "x-bce-request-id": rid,
    "x-bce-debug-id": dbg,
    diag,
  });
}

async function headObjectWithSts({ bosHost, key, sts }) {
  const pub = await headObjectPublic({ bosHost, key });
  if (pub.exists || (pub.mode === "public" && pub.status === 404)) return pub;

  if (pub.fallback) {
    return await headObjectSigned({ bosHost, key, sts });
  }

  return pub;
}

async function putObjectWithSts({ bosHost, key, file, sts }) {
  const path = `/${String(key || "").replace(/^\/+/, "")}`;
  const url = `https://${bosHost}${path}`;
  const timestamp = _utcIsoZ();

  const contentType = file?.type || "application/octet-stream";

  const headersForSign = {
    host: bosHost,
    "content-type": contentType,
    "x-bce-date": timestamp,
    "x-bce-security-token": sts.sessionToken,
  };
  const headersToSign = ["host", "content-type", "x-bce-date", "x-bce-security-token"];

  const authorization = await bceAuthV1({
    ak: sts.accessKeyId,
    sk: sts.secretAccessKey,
    method: "PUT",
    path,
    host: bosHost,
    timestamp,
    expireSeconds: 1800,
    headersToSign,
    headers: headersForSign,
  });

  let resp;
  try {
    resp = await fetch(url, {
      method: "PUT",
      mode: "cors",
      credentials: "omit",
      headers: {
        "x-bce-date": timestamp,
        "x-bce-security-token": sts.sessionToken,
        Authorization: authorization,
        "Content-Type": contentType,
      },
      body: file,
      cache: "no-store",
    });
  } catch (e) {
    throw _makeErr("网络异常：上传失败，请检查网络/代理设置后重试", {
      step: "PUT",
      url,
      error: e?.message || String(e),
      hint: "可能走了本机代理(如 127.0.0.1:7890) 或公司网关拦截",
    });
  }

  if (resp.status >= 200 && resp.status < 300) {
    return { etag: _pickHeader(resp, "ETag") };
  }

  const rid = _pickHeader(resp, "x-bce-request-id");
  const dbg = _pickHeader(resp, "x-bce-debug-id");
  const text = await _readTextSafe(resp);

  throw _makeErr("存储服务上传失败，请稍后重试", {
    step: "PUT",
    status: resp.status,
    url,
    "x-bce-request-id": rid,
    "x-bce-debug-id": dbg,
    body_preview: String(text || "").slice(0, 2000),
  });
}

/**
 * 拖拽即上传：MD5 去重 + HEAD + PUT（新增：上传前预处理）
 * @returns {Promise<{md5:string, storage_key:string, etag:string, size:number, content_type:string, original_name:string, preview_url:string, preprocess_note?:string, before_bytes?:number, after_bytes?:number}>}
 */
export async function uploadOrReuseByMd5({ bosHost, slotKey, file, sts }) {
  // ✅ 统一 >2MB 开始压缩（但有护栏：不糊字）
  const pre = await preprocessImageForUpload({ file, slotKey });
  const file2 = pre?.file || file;

  const md5 = await computeFileMd5(file2);
  const storage_key = buildB1Key({ slotKey, md5, file: file2 });

  let head;
  try {
    head = await headObjectWithSts({ bosHost, key: storage_key, sts });
  } catch (e) {
    if (e?.__debug) {
      // eslint-disable-next-line no-console
      console.warn("[BOS 上传诊断] headObjectWithSts failed", e.__debug);
    }
    throw e;
  }

  let etag = head.etag || "";

  if (!head.exists) {
    try {
      const put = await putObjectWithSts({ bosHost, key: storage_key, file: file2, sts });
      etag = put.etag || "";
    } catch (e) {
      if (e?.__debug) {
        // eslint-disable-next-line no-console
        console.warn("[BOS 上传诊断] putObjectWithSts failed", e.__debug);
      }
      throw e;
    }
  }

  return {
    md5,
    storage_key,
    etag,
    size: file2?.size || 0,
    content_type: file2?.type || "application/octet-stream",
    original_name: file?.name || "file",
    preview_url: _publicPreviewUrl(bosHost, storage_key),
    preprocess_note: pre?.note || "",
    before_bytes: pre?.beforeBytes ?? undefined,
    after_bytes: pre?.afterBytes ?? undefined,
  };
}
