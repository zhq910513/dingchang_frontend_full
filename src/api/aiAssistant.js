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
export function listAiSessions() {
  return http.get("/ai-assistant/sessions");
}

/** 新建会话（后端已支持：POST /ai-assistant/sessions） */
export function createAiSession(payload = {}) {
  return http.post(
    "/ai-assistant/sessions",
    cleanUndefined({
      title: payload.title ? String(payload.title).trim() : undefined,
    })
  );
}

/** 会话历史 */
export function getAiSessionHistory(sessionId) {
  return http.get(`/ai-assistant/sessions/${encodeURIComponent(toSessionId(sessionId))}/history`);
}

/** 删除会话 */
export function deleteAiSession(sessionId) {
  return http.delete(`/ai-assistant/sessions/${encodeURIComponent(toSessionId(sessionId))}`);
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
      message: String(payload.message || "").trim(),
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
  message,
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
        message: String(message || "").trim(),
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
