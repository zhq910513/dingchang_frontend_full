// src/views/ai-assistant/composables/useAiAssistantSession.js
import { computed, ref } from "vue";
import { ElMessage, ElNotification } from "element-plus";
import {
  aiChat,
  aiChatStream,
  listAiSessions,
  getAiSessionHistory,
  deleteAiSession,
} from "../../../api/aiAssistant";
import { parseAiCommand } from "../utils/commandParser";

function hasChinese(s) {
  return /[\u4e00-\u9fa5]/.test(String(s || ""));
}

function normalizeErrMsg(e, fallback = "操作失败，请稍后重试") {
  const detail = e?.response?.data?.detail;
  const msg = e?.response?.data?.message || e?.message || "";
  if (typeof detail === "string" && detail && hasChinese(detail)) return detail;
  if (typeof msg === "string" && msg && hasChinese(msg)) return msg;
  const status = e?.response?.status;
  if (status === 401) return "登录状态已失效，请重新登录";
  if (status === 403) return "无权限执行该操作";
  if (status >= 500) return "服务器异常，请稍后重试";
  return fallback;
}

function normalizeSessionList(resp) {
  const data = resp?.data?.data ?? resp?.data ?? {};
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map((x) => ({
    session_id: x.session_id,
    title: x.title || "新会话",
    created_at: x.created_at || "",
    updated_at: x.updated_at || "",
    last_message_preview: x.last_message_preview || "",
    message_count: x.message_count ?? 0,
  }));
}

function normalizeHistory(resp) {
  const data = resp?.data?.data ?? resp?.data ?? {};
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map((m, idx) => ({
    id: `${m.created_at || "t"}_${idx}`,
    role: m.role || "assistant",
    content: m.content || "",
    created_at: m.created_at || "",
    metadata: m.metadata || {},
  }));
}

export function useAiAssistantSession() {
  const loadingInit = ref(false);
  const loadingSessions = ref(false);
  const loadingHistory = ref(false);
  const sending = ref(false);

  const sessions = ref([]);
  const currentSessionId = ref("");
  const messages = ref([]);
  const processHint = ref("");

  // SSE 中止控制
  let currentAbort = null;

  async function refreshSessions() {
    loadingSessions.value = true;
    try {
      const resp = await listAiSessions();
      sessions.value = normalizeSessionList(resp);
    } catch (e) {
      ElNotification.error({
        title: "会话列表加载失败",
        message: normalizeErrMsg(e, "加载会话列表失败"),
        duration: 4000,
      });
    } finally {
      loadingSessions.value = false;
    }
  }

  async function loadHistory(sessionId) {
    const sid = String(sessionId || currentSessionId.value || "").trim();
    if (!sid) {
      messages.value = [];
      return;
    }

    loadingHistory.value = true;
    try {
      const resp = await getAiSessionHistory(sid);
      currentSessionId.value = sid;
      messages.value = normalizeHistory(resp);
    } catch (e) {
      ElNotification.error({
        title: "历史消息加载失败",
        message: normalizeErrMsg(e, "加载历史消息失败"),
        duration: 4000,
      });
      messages.value = [];
    } finally {
      loadingHistory.value = false;
    }
  }

  async function ensureInit() {
    loadingInit.value = true;
    try {
      await refreshSessions();
      if (sessions.value.length > 0) {
        await loadHistory(sessions.value[0].session_id);
      } else {
        currentSessionId.value = "";
        messages.value = [
          {
            id: `local_${Date.now()}`,
            role: "system",
            content: "报价助手已就绪。你可以直接问：查订单 / 查财务 / 某字段是什么意思 / 平台A 报价",
            created_at: new Date().toISOString(),
            metadata: {},
          },
        ];
      }
    } finally {
      loadingInit.value = false;
    }
  }

  function appendLocalMessage(msg) {
    messages.value.push({
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...msg,
    });
  }

  async function switchSession(sessionId) {
    if (!sessionId) return;
    if (sending.value && currentAbort) {
      try {
        currentAbort.abort();
      } catch {
        // ignore
      }
    }
    await loadHistory(sessionId);
  }

  async function createNewSessionLocal() {
    currentSessionId.value = "";
    messages.value = [
      {
        id: `local_${Date.now()}`,
        role: "system",
        content: "已新建会话（本地态）。发送第一条消息后后端会生成 session_id。",
        created_at: new Date().toISOString(),
        metadata: {},
      },
    ];
    ElMessage.success("已新建会话");
  }

  async function removeSession(sessionId) {
    try {
      await deleteAiSession(sessionId);
      if (String(currentSessionId.value) === String(sessionId)) {
        currentSessionId.value = "";
        messages.value = [];
      }
      await refreshSessions();
      ElMessage.success("会话已删除");
    } catch (e) {
      ElNotification.error({
        title: "删除失败",
        message: normalizeErrMsg(e, "删除会话失败"),
        duration: 4000,
      });
    }
  }

  async function sendMessage(inputText, { useStream = true, pageContext = {} } = {}) {
    const parsed = parseAiCommand(inputText);
    if (parsed.kind === "empty") {
      ElMessage.warning("请输入内容");
      return;
    }

    if (parsed.kind === "action" && parsed.action === "new_session") {
      await createNewSessionLocal();
      return;
    }

    const text = parsed.text;

    // 先追加用户消息
    appendLocalMessage({
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
      metadata: {},
    });

    // 预占位 assistant 消息（便于流式更新）
    const assistantLocalId = `assistant_pending_${Date.now()}`;
    appendLocalMessage({
      id: assistantLocalId,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
      metadata: { status: "sending" },
    });

    sending.value = true;
    processHint.value = parsed.kind === "quote" ? "已识别报价指令，正在处理…" : "正在处理…";

    try {
      if (!useStream) {
        const resp = await aiChat({
          session_id: currentSessionId.value || undefined,
          message: text,
          context: pageContext,
        });

        const data = resp?.data?.data ?? resp?.data ?? {};
        const idx = messages.value.findIndex((x) => x.id === assistantLocalId);
        if (idx >= 0) {
          messages.value[idx] = {
            ...messages.value[idx],
            content: data.reply || "",
            metadata: {
              ...messages.value[idx].metadata,
              status: data.ok ? "success" : "error",
              trace_id: data.trace_id,
              intent: data.intent,
              confidence: data.confidence,
              actions: data.actions || [],
              error: data.error || null,
            },
          };
        }

        if (data.session_id) currentSessionId.value = data.session_id;
        if (!data.ok) {
          ElNotification.warning({
            title: "报价助手返回异常",
            message: data?.error?.message || "请求处理失败",
            duration: 4000,
          });
        }

        await refreshSessions();
        if (currentSessionId.value) {
          // 用后端历史覆盖本地状态，避免本地/后端不一致
          await loadHistory(currentSessionId.value);
        }
        return;
      }

      // 流式
      const ac = new AbortController();
      currentAbort = ac;

      let finalMeta = {
        trace_id: "",
        intent: "",
        confidence: 0,
        actions: [],
      };

      await aiChatStream({
        session_id: currentSessionId.value || undefined,
        message: text,
        context: pageContext,
        signal: ac.signal,
        onEvent: (evt) => {
          const idx = messages.value.findIndex((x) => x.id === assistantLocalId);
          if (idx < 0) return;

          if (evt.type === "meta") {
            if (evt.session_id) currentSessionId.value = evt.session_id;
            messages.value[idx].metadata = {
              ...(messages.value[idx].metadata || {}),
              trace_id: evt.trace_id || "",
              model: evt.model || "",
              status: "streaming",
            };
            return;
          }

          if (evt.type === "delta") {
            messages.value[idx].content = (messages.value[idx].content || "") + String(evt.content || "");
            messages.value[idx].metadata = {
              ...(messages.value[idx].metadata || {}),
              status: "streaming",
            };
            return;
          }

          if (evt.type === "done") {
            finalMeta = {
              trace_id: evt.trace_id || "",
              intent: evt.intent || "",
              confidence: evt.confidence || 0,
              actions: Array.isArray(evt.actions) ? evt.actions : [],
            };
            messages.value[idx].metadata = {
              ...(messages.value[idx].metadata || {}),
              ...finalMeta,
              status: "success",
              cost_ms: evt.cost_ms || 0,
            };
            return;
          }

          if (evt.type === "error") {
            messages.value[idx].content = evt.message || "报价助手流式处理失败";
            messages.value[idx].metadata = {
              ...(messages.value[idx].metadata || {}),
              status: "error",
              error_code: evt.code || "INTERNAL_ERROR",
            };
          }
        },
      });

      await refreshSessions();
      if (currentSessionId.value) {
        await loadHistory(currentSessionId.value);
      }
    } catch (e) {
      const idx = messages.value.findIndex((x) => x.id === assistantLocalId);
      if (idx >= 0) {
        messages.value[idx] = {
          ...messages.value[idx],
          content: normalizeErrMsg(e, "发送失败，请稍后重试"),
          metadata: {
            ...(messages.value[idx].metadata || {}),
            status: "error",
          },
        };
      }

      ElNotification.error({
        title: "发送失败",
        message: normalizeErrMsg(e, "发送失败，请稍后重试"),
        duration: 4000,
      });
    } finally {
      processHint.value = "";
      sending.value = false;
      currentAbort = null;
    }
  }

  const currentSessionTitle = computed(() => {
    const hit = sessions.value.find((x) => x.session_id === currentSessionId.value);
    return hit?.title || (currentSessionId.value ? "当前会话" : "新会话");
  });

  return {
    loadingInit,
    loadingSessions,
    loadingHistory,
    sending,
    sessions,
    currentSessionId,
    currentSessionTitle,
    messages,
    processHint,
    ensureInit,
    refreshSessions,
    loadHistory,
    switchSession,
    createNewSessionLocal,
    removeSession,
    sendMessage,
  };
}
