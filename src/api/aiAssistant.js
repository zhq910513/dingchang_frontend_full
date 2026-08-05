// src/api/aiAssistant.js
import http from "./http";

function cleanUndefined(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function toSessionId(sessionId) {
  const s = String(sessionId || "").trim();
  if (!s) throw new Error("aiAssistant api: invalid session_id");
  return s;
}

/** 会话列表 */
export function listAiSessions(params = {}) {
  return http.get("/ai-assistant/sessions", {
    params: cleanUndefined({
      cursor: params.cursor ? String(params.cursor).trim() : undefined,
      limit: params.limit ? Number(params.limit) : undefined,
    }),
  });
}

/** 新建会话 */
export function createAiSession(payload = {}) {
  return http.post(
    "/ai-assistant/sessions",
    cleanUndefined({
      title: payload.title ? String(payload.title).trim() : undefined,
    })
  );
}

/** 会话历史 */
export function getAiSessionHistory(sessionId, params = {}) {
  return http.get(`/ai-assistant/sessions/${encodeURIComponent(toSessionId(sessionId))}/history`, {
    params: cleanUndefined({
      cursor: params.cursor ? String(params.cursor).trim() : undefined,
      limit: params.limit ? Number(params.limit) : undefined,
      today_only: params.today_only === true ? true : undefined,
    }),
  });
}

/** 删除会话 */
export function deleteAiSession(sessionId) {
  return http.delete(`/ai-assistant/sessions/${encodeURIComponent(toSessionId(sessionId))}`);
}

/** 平台账号字段配置 */
export function listAiQuotePlatforms() {
  return http.get("/ai-assistant/platforms");
}

/** 绑定/更新平台账号资料 */
function normalizePlatformAccountPayload(payload = {}) {
  const hasQuotaLimit = Object.prototype.hasOwnProperty.call(payload, "quota_limit");
  const hasQuotaPeriodType = Object.prototype.hasOwnProperty.call(payload, "quota_period_type");
  return cleanUndefined({
    platform_code: payload.platform_code ? String(payload.platform_code).trim() : undefined,
    platform_name: payload.platform_name ? String(payload.platform_name).trim() : undefined,
    account_type_name: payload.account_type_name ? String(payload.account_type_name).trim() : undefined,
    account_username: payload.account_username ? String(payload.account_username).trim() : undefined,
    account_password: payload.account_password ? String(payload.account_password).trim() : undefined,
    login_phone: payload.login_phone ? String(payload.login_phone).trim() : undefined,
    email: payload.email ? String(payload.email).trim() : undefined,
    account_owner_user_id: payload.account_owner_user_id ? Number(payload.account_owner_user_id) : undefined,
    account_owner_name: payload.account_owner_name ? String(payload.account_owner_name).trim() : undefined,
    auto_login: !!payload.auto_login,
    enabled: !!payload.enabled,
    quota_limit: hasQuotaLimit
      ? payload.quota_limit === "" || payload.quota_limit === undefined || payload.quota_limit === null
        ? null
        : Number(payload.quota_limit)
      : undefined,
    quota_period_type: hasQuotaPeriodType ? String(payload.quota_period_type || "day").trim() : undefined,
    confirm_enabled_edit: !!payload.confirm_enabled_edit,
  });
}

export function createAiPlatformAccount(payload = {}) {
  return http.post("/ai-assistant/platform-accounts", normalizePlatformAccountPayload(payload));
}

export function listAiPlatformAccountTypes(params = {}) {
  return http.get("/ai-assistant/platform-account-types", {
    params: cleanUndefined({
      platform_code: params.platform_code ? String(params.platform_code).trim() : undefined,
    }),
  });
}

export function listAiPlatformAccounts(params = {}) {
  return http.get("/ai-assistant/platform-accounts", {
    params: cleanUndefined({
      platform_code: params.platform_code ? String(params.platform_code).trim() : undefined,
      account_type_name: params.account_type_name ? String(params.account_type_name).trim() : undefined,
      enabled: params.enabled,
      login_status: params.login_status ? String(params.login_status).trim() : undefined,
      quota_status: params.quota_status ? String(params.quota_status).trim() : undefined,
      keyword: params.keyword ? String(params.keyword).trim() : undefined,
    }),
  });
}

export function getAiPlatformAccount(accountId, params = {}) {
  return http.get(`/ai-assistant/platform-accounts/${encodeURIComponent(String(accountId))}`, {
    params: cleanUndefined({
      include_quota: params.include_quota !== undefined ? !!params.include_quota : undefined,
    }),
  });
}

export function updateAiPlatformAccount(accountId, payload = {}) {
  return http.put(
    `/ai-assistant/platform-accounts/${encodeURIComponent(String(accountId))}`,
    normalizePlatformAccountPayload(payload)
  );
}

export function loginAiPlatformAccount(accountId) {
  return http.post(`/ai-assistant/platform-accounts/${encodeURIComponent(String(accountId))}/login`);
}

export function submitAiPlatformAccountLoginChallenge(taskId, payload = {}) {
  return http.post(
    `/ai-assistant/platform-account-login-tasks/${encodeURIComponent(String(taskId))}/challenge`,
    cleanUndefined({
      code: payload.code ? String(payload.code).trim() : undefined,
    })
  );
}

/** 报价助手图片上传：只进入报价材料池，不要求订单写权限 */
function normalizePlatformDefaultConfigPayload(payload = {}) {
  const defaultValues =
    payload.default_values && typeof payload.default_values === "object" && !Array.isArray(payload.default_values)
      ? payload.default_values
      : {};
  return cleanUndefined({
    platform_code: payload.platform_code ? String(payload.platform_code).trim() : undefined,
    platform_name: payload.platform_name ? String(payload.platform_name).trim() : undefined,
    account_type_name: payload.account_type_name ? String(payload.account_type_name).trim() : "",
    default_values: defaultValues,
    enabled: payload.enabled !== undefined ? !!payload.enabled : true,
  });
}

export function listAiPlatformDefaultConfigs(params = {}) {
  return http.get("/ai-assistant/platform-default-configs", {
    params: cleanUndefined({
      platform_code: params.platform_code ? String(params.platform_code).trim() : undefined,
      account_type_name: params.account_type_name ? String(params.account_type_name).trim() : undefined,
      enabled: params.enabled,
    }),
  });
}

export function resolveAiPlatformDefaultConfig(params = {}) {
  return http.get("/ai-assistant/platform-default-configs/resolve", {
    params: cleanUndefined({
      platform_code: params.platform_code ? String(params.platform_code).trim() : undefined,
      account_type_name: params.account_type_name ? String(params.account_type_name).trim() : undefined,
    }),
  });
}

export function createAiPlatformDefaultConfig(payload = {}) {
  return http.post("/ai-assistant/platform-default-configs", normalizePlatformDefaultConfigPayload(payload));
}

export function updateAiPlatformDefaultConfig(configId, payload = {}) {
  return http.put(
    `/ai-assistant/platform-default-configs/${encodeURIComponent(String(configId))}`,
    normalizePlatformDefaultConfigPayload(payload)
  );
}

export function deleteAiPlatformDefaultConfig(configId) {
  return http.delete(`/ai-assistant/platform-default-configs/${encodeURIComponent(String(configId))}`);
}

export function uploadAiAssistantImage({ slot_key = "related", file } = {}) {
  const sk = String(slot_key || "related").trim() || "related";
  if (!file) throw new Error("请选择要上传的图片");
  const fd = new FormData();
  fd.append("slot_key", sk);
  fd.append("file", file);
  return http.post("/ai-assistant/images/upload", fd);
}

/** 撤回会话中的图片，并同步移出报价材料池 */
export function recallAiSessionImages(sessionId, payload = {}) {
  const keys = Array.isArray(payload.storage_keys)
    ? payload.storage_keys.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  return http.post(
    `/ai-assistant/sessions/${encodeURIComponent(toSessionId(sessionId))}/images/recall`,
    cleanUndefined({
      storage_keys: keys,
      message_id: payload.message_id ? String(payload.message_id).trim() : undefined,
    })
  );
}

/**
 * 非流式聊天
 * ✅ 后端返回结构：{ ok, session_id, reply, intent, confidence, actions, trace_id, usage, data }
 * 前端页面务必优先使用 res.data.data（结构化），不要再解析 reply 文案。
 */
export function aiChat(payload = {}) {
  return http.post(
    "/ai-assistant/chat",
    cleanUndefined({
      session_id: payload.session_id ? String(payload.session_id).trim() : undefined,
      client_msg_id: payload.client_msg_id ? String(payload.client_msg_id).trim() : undefined,
      message: String(payload.message || "").trim(),
      images: Array.isArray(payload.images) ? payload.images : [],
      history: Array.isArray(payload.history) ? payload.history : [],
      context: payload.context && typeof payload.context === "object" ? payload.context : {},
      stream: false,
    })
  );
}

/**
 * “伪流式”聊天（对齐后端现状）
 *
 * 说明：
 * - 当前后端没有 /ai-assistant/chat/stream 路由（不要请求不存在的接口）
 * - 但为了不大改前端 UI，我们保留 aiChatStream 入口：
 *   直接调用 /ai-assistant/chat（stream:true 仅作为标记），拿到完整结果后，调用 onEvent({type:'final', data: resp})
 *
 * onEvent 建议处理：
 * - type === 'final'：最终一次性响应（resp 即后端 AiChatResponse）
 * - type === 'error'：错误
 */
export async function aiChatStream({
  session_id,
  client_msg_id,
  message,
  images = [],
  history = [],
  context = {},
  onEvent,
  signal,
} = {}) {
  try {
    // ✅ 走现有后端 /chat
    const resp = await http.post(
      "/ai-assistant/chat",
      cleanUndefined({
        session_id: session_id ? String(session_id).trim() : undefined,
        client_msg_id: client_msg_id ? String(client_msg_id).trim() : undefined,
        message: String(message || "").trim(),
        images: Array.isArray(images) ? images : [],
        history: Array.isArray(history) ? history : [],
        context: context && typeof context === "object" ? context : {},
        stream: true,
      }),
      // 如果你的 http 是 axios 封装，常见支持 signal；不支持也没关系
      { signal }
    );

    // 兼容 http 封装返回：可能是 {data: ...} 或者直接是响应体
    const data = resp && resp.data !== undefined ? resp.data : resp;

    if (typeof onEvent === "function") {
      onEvent({ type: "final", data });
    }

    return data;
  } catch (e) {
    const msg = e?.message ? String(e.message) : "aiChatStream failed";
    if (typeof onEvent === "function") onEvent({ type: "error", message: msg });
    throw e;
  }
}
