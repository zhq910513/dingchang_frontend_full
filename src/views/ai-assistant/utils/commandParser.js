// src/views/ai-assistant/utils/commandParser.js
function normalizeText(s) {
  return String(s || "").trim();
}

export function parseAiCommand(text) {
  const t = normalizeText(text);
  if (!t) return { kind: "empty" };

  // 显式动作
  if (t === "新一单" || t.toLowerCase() === "/new") {
    return { kind: "action", action: "new_session", text: t };
  }

  // 平台报价（Phase1 仅前端识别提示；后端也会识别）
  const m = t.match(/^(.+?)\s*报价$/);
  if (m) {
    const platformText = String(m[1] || "").trim();
    if (platformText) {
      return {
        kind: "quote",
        action: "quote",
        platform_hint: platformText,
        text: t,
      };
    }
  }

  // 兜底
  return { kind: "text", text: t };
}

export function makeClientMsgId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    // ignore
  }
  return `msg_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}
