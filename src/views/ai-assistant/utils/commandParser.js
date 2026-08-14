// src/views/ai-assistant/utils/commandParser.js
function normalizeText(s) {
  return String(s || "").trim();
}

function isValidQuotePlatformHint(value) {
  const text = normalizeText(value).replace(/\s+/g, "");
  return !!text && !["重新", "再次", "再"].includes(text);
}

function isShortQuoteCommand(value) {
  const text = normalizeText(value).replace(/\s+/g, "");
  return [
    "报",
    "报价",
    "开始报",
    "开始报价",
    "直接报",
    "直接报价",
    "现在报",
    "现在报价",
    "提交报价",
    "全保",
    "人保全保",
    "中国人保全保",
    "PICC全保",
    "全保报价",
    "人保全保报价",
    "中国人保全保报价",
    "PICC全保报价",
    "交三",
    "人保交三",
    "中国人保交三",
    "PICC交三",
    "交三报价",
    "人保交三报价",
    "中国人保交三报价",
    "PICC交三报价",
    "单商",
    "人保单商",
    "中国人保单商",
    "PICC单商",
    "单商报价",
    "人保单商报价",
    "中国人保单商报价",
    "PICC单商报价",
    "续保",
    "人保续保",
    "中国人保续保",
    "PICC续保",
    "续保报价",
    "人保续保报价",
    "中国人保续保报价",
    "PICC续保报价",
    "续保交三",
    "人保续保交三",
    "中国人保续保交三",
    "PICC续保交三",
    "续保单商",
    "人保续保单商",
    "中国人保续保单商",
    "PICC续保单商",
  ].includes(text);
}

function parseProfessionalPiccQuoteCommand(value) {
  const text = normalizeText(value).replace(/\s+/g, "");
  if (
    [
      "全保",
      "人保全保",
      "中国人保全保",
      "PICC全保",
      "全保报价",
      "人保全保报价",
      "中国人保全保报价",
      "PICC全保报价",
      "全保重报",
      "人保全保重报",
      "中国人保全保重报",
      "PICC全保重报",
      "交三",
      "人保交三",
      "中国人保交三",
      "PICC交三",
      "交三报价",
      "人保交三报价",
      "中国人保交三报价",
      "PICC交三报价",
      "交三重报",
      "人保交三重报",
      "中国人保交三重报",
      "PICC交三重报",
      "单商",
      "人保单商",
      "中国人保单商",
      "PICC单商",
      "单商报价",
      "人保单商报价",
      "中国人保单商报价",
      "PICC单商报价",
      "单商重报",
      "人保单商重报",
      "中国人保单商重报",
      "PICC单商重报",
      "续保",
      "人保续保",
      "中国人保续保",
      "PICC续保",
      "续保报价",
      "人保续保报价",
      "中国人保续保报价",
      "PICC续保报价",
      "续保全保",
      "人保续保全保",
      "中国人保续保全保",
      "PICC续保全保",
      "续保全保报价",
      "人保续保全保报价",
      "中国人保续保全保报价",
      "PICC续保全保报价",
      "续保交三",
      "人保续保交三",
      "中国人保续保交三",
      "PICC续保交三",
      "续保交三报价",
      "人保续保交三报价",
      "中国人保续保交三报价",
      "PICC续保交三报价",
      "续保单商",
      "人保续保单商",
      "中国人保续保单商",
      "PICC续保单商",
      "续保单商报价",
      "人保续保单商报价",
      "中国人保续保单商报价",
      "PICC续保单商报价",
    ].includes(text)
  ) {
    return { kind: "quote", action: "quote", platform_hint: "人保", text: normalizeText(value) };
  }
  return null;
}

export function parseAiCommand(text) {
  const t = normalizeText(text);
  if (!t) return { kind: "empty" };

  // 显式动作
  if (t === "新一单" || t.toLowerCase() === "/new") {
    return { kind: "action", action: "new_session", text: t };
  }

  const professionalPiccQuote = parseProfessionalPiccQuoteCommand(t);
  if (professionalPiccQuote) return professionalPiccQuote;

  if (isShortQuoteCommand(t)) {
    return { kind: "quote", action: "quote", platform_hint: "", text: t };
  }

  // 平台报价（前端只做体验提示；最终以后端识别为准）
  const m = t.match(/^(.+?)\s*(?:重新|再次|再)?报价$/) || t.match(/^(.+?)\s*重报$/);
  if (m) {
    const platformText = String(m[1] || "").trim();
    if (isValidQuotePlatformHint(platformText)) {
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
