// src/views/ai-assistant/composables/useAiAssistantSession.js
import { computed, ref } from "vue";
import { ElMessage, ElNotification } from "element-plus";
import {
  aiChat,
  aiChatStream,
  createAiSession,
  listAiSessions,
  getAiSessionHistory,
  deleteAiSession,
} from "../../../api/aiAssistant";
import { parseAiCommand } from "../utils/commandParser";
import { redactQuoteSensitiveText, sanitizeQuoteUserText } from "../utils/sensitiveRedaction";
import { getApiErrorMessage } from "../../../utils/errorMessage";

function normalizeErrMsg(e, fallback = "操作失败，请稍后重试") {
  return sanitizeQuoteUserText(getApiErrorMessage(e, fallback, { withRequest: false }), fallback);
}

function isNotFoundError(e) {
  return Number(e?.response?.status || 0) === 404;
}


function isAbortLikeError(e) {
  const name = String(e?.name || "").toLowerCase();
  const code = String(e?.code || "").toUpperCase();
  const message = String(e?.message || e || "").toLowerCase();
  return (
    name === "aborterror" ||
    code === "ERR_CANCELED" ||
    message.includes("aborted") ||
    message.includes("canceled") ||
    message.includes("cancelled")
  );
}

const USER_FACING_METADATA_KEYS = new Set([
  "message",
  "content",
  "detail",
  "error",
  "error_detail",
  "last_error",
  "last_error_message",
  "challenge_prompt",
  "reason",
  "title",
  "label",
  "description",
]);

function sanitizeHistoryMetadata(value, parentKey = "") {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeHistoryMetadata(item, parentKey));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeHistoryMetadata(item, key)])
    );
  }
  if (typeof value === "string") {
    return USER_FACING_METADATA_KEYS.has(String(parentKey || "").toLowerCase())
      ? sanitizeQuoteUserText(value, value)
      : value;
  }
  return value;
}

function normalizeSessionList(resp) {
  const data = resp?.data?.data ?? resp?.data ?? {};
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map((x) => ({
    session_id: x.session_id,
    title: x.title || "新会话",
    created_at: x.created_at || "",
    updated_at: x.updated_at || "",
    last_message_preview: sanitizeQuoteUserText(x.last_message_preview || "", ""),
    message_count: x.message_count ?? 0,
  }));
}

function normalizeSessionPage(resp) {
  const data = resp?.data?.data ?? resp?.data ?? {};
  return {
    items: normalizeSessionList(resp),
    next_cursor: data?.next_cursor || "",
    has_more: !!data?.has_more,
  };
}

function sessionSyncFingerprint(item) {
  if (!item || typeof item !== "object") return "";
  const sid = String(item.session_id || "").trim();
  if (!sid) return "";
  return [
    sid,
    String(item.updated_at || ""),
    String(item.message_count ?? 0),
    String(item.last_message_preview || ""),
  ].join("|");
}

function normalizeHistoryItems(resp) {
  const data = resp?.data?.data ?? resp?.data ?? {};
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map((m, idx) => ({
    id: m.id || `${m.created_at || "t"}_${idx}`,
    role: m.role || "assistant",
    content: sanitizeQuoteUserText(m.content || "", ""),
    created_at: m.created_at || "",
    metadata: sanitizeHistoryMetadata(m.metadata || {}),
  }));
}

function normalizeHistoryPage(resp) {
  const data = resp?.data?.data ?? resp?.data ?? {};
  return {
    items: normalizeHistoryItems(resp),
    next_cursor: data?.next_cursor || "",
    has_more: !!data?.has_more,
  };
}

function isPersistentLocalImageMessage(message) {
  if (String(message?.role || "").toLowerCase() !== "user") return false;
  const id = String(message?.id || "");
  if (!id.startsWith("local_") && !id.startsWith("client_")) return false;
  const meta = message?.metadata || {};
  const images = Array.isArray(meta.images) ? meta.images : [];
  if (images.length > 0) return true;
  const pageImages = Array.isArray(meta.page_context?.uploaded_images) ? meta.page_context.uploaded_images : [];
  return pageImages.length > 0;
}

function normalizeImageIdentityPart(value) {
  return String(value || "")
    .trim()
    .replace(/^"+|"+$/g, "")
    .replace(/^'+|'+$/g, "");
}

function stableImageUrlForMerge(image) {
  if (!image || typeof image !== "object") return "";
  return normalizeImageIdentityPart(image.remote_url || image.url || image.preview_url || image.image_url).split("#", 1)[0].split("?", 1)[0];
}

function imageUrlPathTail(url) {
  const raw = normalizeImageIdentityPart(url).split("#", 1)[0].split("?", 1)[0];
  if (!raw) return "";
  try {
    const parsed = new URL(raw, "http://local.invalid");
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.slice(-3).join("/");
  } catch {
    const parts = raw.split("/").filter(Boolean);
    return parts.slice(-3).join("/");
  }
}

function imageHashToken(value) {
  const raw = normalizeImageIdentityPart(value).split("#", 1)[0].split("?", 1)[0];
  if (!raw) return "";
  const tail = raw.split("/").filter(Boolean).pop() || raw;
  const stem = tail.replace(/\.[A-Za-z0-9]{2,8}$/, "");
  return /^[a-f0-9]{16,}$/i.test(stem) ? stem.toLowerCase() : "";
}

function imageMergeKeys(image) {
  if (!image || typeof image !== "object") return new Set();
  const keys = new Set();
  const add = (prefix, value) => {
    const normalized = normalizeImageIdentityPart(value);
    if (normalized) keys.add(`${prefix}:${normalized}`);
  };
  add("storage", image.storage_key || image.key);
  add("md5", image.md5);
  add("etag", image.etag);
  add("hash", imageHashToken(image.storage_key || image.key));
  add("hash", imageHashToken(image.md5));
  add("hash", imageHashToken(image.etag));
  add("id", image.image_id || image.file_id);
  const name = normalizeImageIdentityPart(image.original_name || image.name);
  const size = Number(image.size || 0);
  if (name && size > 0) add("file", `${name}:${size}`);
  const url = stableImageUrlForMerge(image);
  add("url", url);
  const tail = imageUrlPathTail(url);
  if (tail) add("url_tail", tail);
  add("hash", imageHashToken(url));
  return keys;
}

function imagesShareIdentity(left, right) {
  const leftKeys = imageMergeKeys(left);
  if (!leftKeys.size) return false;
  const rightKeys = imageMergeKeys(right);
  for (const key of leftKeys) {
    if (rightKeys.has(key)) return true;
  }
  return false;
}

function messageImageLists(message) {
  const meta = message?.metadata || {};
  return [meta.images, meta.page_context?.images, meta.page_context?.uploaded_images].filter(Array.isArray);
}

function messageImageKeys(message) {
  const keys = new Set();
  for (const list of messageImageLists(message)) {
    for (const item of list) {
      for (const key of imageMergeKeys(item)) {
        if (key) keys.add(key);
      }
    }
  }
  return keys;
}

function messagesShareImageKeys(left, right) {
  const leftKeys = messageImageKeys(left);
  if (!leftKeys.size) return false;
  const rightKeys = messageImageKeys(right);
  for (const key of leftKeys) {
    if (rightKeys.has(key)) return true;
  }
  return false;
}

function messageImageCount(message) {
  let count = 0;
  const keys = new Set();
  for (const list of messageImageLists(message)) {
    for (const item of Array.isArray(list) ? list : []) {
      const itemKeys = imageMergeKeys(item);
      if (!itemKeys.size) {
        count += 1;
        continue;
      }
      let duplicated = false;
      for (const key of itemKeys) {
        if (keys.has(key)) {
          duplicated = true;
          break;
        }
      }
      if (duplicated) continue;
      count += 1;
      for (const key of itemKeys) keys.add(key);
    }
  }
  return count;
}

function messageUploadBatchId(message) {
  const meta = message?.metadata || {};
  return String(meta.upload_batch_id || meta.page_context?.upload_batch_id || "").trim();
}

function messageClientMsgId(message) {
  const meta = message?.metadata || {};
  return String(meta.client_msg_id || meta.page_context?.client_msg_id || "").trim();
}

function messageTraceId(message) {
  const meta = message?.metadata || {};
  return String(meta.trace_id || meta.data?.trace_id || meta.data?.payload?.trace_id || "").trim();
}

function messageQuoteTaskKey(message) {
  const meta = message?.metadata || {};
  const data = meta.data || {};
  const payload = data.payload || {};
  const taskId =
    payload?.quote_task?.id ||
    payload?.quoteTask?.id ||
    data?.entities?.quote_task_id ||
    payload?.quote_task_id ||
    "";
  return taskId ? `quote_task:${String(taskId).trim()}` : "";
}

function messageQuoteResultPayload(message) {
  const meta = message?.metadata || {};
  const data = meta.data || {};
  const payload = data.payload || {};
  const result =
    payload?.quote_result ||
    payload?.quoteResult ||
    data?.quote_result ||
    data?.quoteResult ||
    meta?.quote_result ||
    meta?.quoteResult ||
    null;
  if (!result || typeof result !== "object" || result.quote_result_unavailable === true) {
    return null;
  }
  return result;
}

function truthyFlag(value) {
  if (value === true) return true;
  const text = String(value ?? "").trim().toLowerCase();
  return text === "true" || text === "1" || text === "yes";
}

function quoteResultImageUrlFromResult(result) {
  const image = result?.result_image || result?.resultImage || null;
  if (typeof image === "string") return image.trim();
  if (!image || typeof image !== "object") return "";
  return String(image.url || image.image_url || image.preview_url || image.remote_url || "").trim();
}

function messageHasPendingQuoteResultImage(message) {
  const result = messageQuoteResultPayload(message);
  if (!result || typeof result !== "object") return false;
  if (quoteResultImageUrlFromResult(result)) return false;
  return truthyFlag(result.result_image_pending) || truthyFlag(result.resultImagePending);
}

function messagesHavePendingQuoteResultImages(messageList) {
  return Array.isArray(messageList) && messageList.some(messageHasPendingQuoteResultImage);
}

function messagePlatformAutoNotice(message) {
  const payload = message?.metadata?.data?.payload || {};
  const notice = payload?.platform_auto_notice;
  return notice && typeof notice === "object" ? notice : null;
}

function messagePlatformDialog(message) {
  const data = message?.metadata?.data || {};
  const payload = data.payload || {};
  const result = messageQuoteResultPayload(message) || {};
  const dialog = payload?.platform_dialog || data?.platform_dialog || result?.platform_dialog || null;
  return dialog && typeof dialog === "object" ? dialog : null;
}

function messageAssistantSemanticKind(message) {
  const meta = message?.metadata || {};
  const data = meta.data || {};
  const payload = data.payload || {};
  const resultStatus = String(data.result_status || "").toLowerCase();
  const result = messageQuoteResultPayload(message);
  if (result && Object.keys(result).length > 0) return "quote_result";

  const autoNotice = messagePlatformAutoNotice(message);
  if (autoNotice) {
    return `auto_notice:${String(autoNotice.type || "notice").toLowerCase()}`;
  }

  const dialog = messagePlatformDialog(message);
  if (dialog) {
    return `platform_dialog:${String(dialog.subtype || dialog.type || "notice").toLowerCase()}`;
  }

  if (resultStatus === "need_more_info") return "quote_need_more_info";
  if (resultStatus === "failed") return "quote_failed";
  if (resultStatus === "not_ready") return "quote_not_ready";
  return resultStatus || String(meta.intent || data.intent || "assistant").toLowerCase() || "assistant";
}

function messagesLikelySameAssistantResponse(localMessage, historyMessage) {
  if (String(localMessage?.role || "").toLowerCase() !== "assistant") return false;
  if (String(historyMessage?.role || "").toLowerCase() !== "assistant") return false;
  if (messageAssistantSemanticKind(localMessage) !== messageAssistantSemanticKind(historyMessage)) return false;
  const localTraceId = messageTraceId(localMessage);
  const historyTraceId = messageTraceId(historyMessage);
  if (localTraceId && historyTraceId && localTraceId === historyTraceId) return true;
  const localTaskKey = messageQuoteTaskKey(localMessage);
  const historyTaskKey = messageQuoteTaskKey(historyMessage);
  if (localTaskKey && historyTaskKey && localTaskKey === historyTaskKey) return true;
  return false;
}

function mergeAssistantResponseMessage(localMessage, historyMessage) {
  const historyId = String(historyMessage?.id || "").trim();
  return {
    ...(localMessage || {}),
    ...(historyMessage || {}),
    id: historyId || localMessage?.id || historyMessage?.id,
    role: "assistant",
    content: String(historyMessage?.content || "").trim() || localMessage?.content || "",
    created_at: historyMessage?.created_at || localMessage?.created_at || "",
    metadata: {
      ...(localMessage?.metadata || {}),
      ...(historyMessage?.metadata || {}),
    },
  };
}

function messagesLikelySameImageUpload(localMessage, historyMessage) {
  if (String(historyMessage?.role || "").toLowerCase() !== "user") return false;
  const localBatchId = messageUploadBatchId(localMessage);
  const historyBatchId = messageUploadBatchId(historyMessage);
  if (localBatchId || historyBatchId) {
    return !!localBatchId && localBatchId === historyBatchId;
  }
  const localCount = messageImageCount(localMessage);
  const historyCount = messageImageCount(historyMessage);
  if (!localCount || !historyCount || localCount !== historyCount) return false;

  const localText = String(localMessage?.content || "").trim();
  const historyText = String(historyMessage?.content || "").trim();
  if (localText && historyText && localText !== historyText) return false;

  const localAt = Date.parse(localMessage?.created_at || "");
  const historyAt = Date.parse(historyMessage?.created_at || "");
  if (Number.isFinite(localAt) && Number.isFinite(historyAt)) {
    return Math.abs(localAt - historyAt) <= 3 * 60 * 1000;
  }
  return true;
}

function mergeImageItems(localItem, remoteItem) {
  const localUrl = localItem?.preview_url || localItem?.url || localItem?.image_url || "";
  const remoteUrl = remoteItem?.preview_url || remoteItem?.url || remoteItem?.image_url || "";
  return {
    ...(remoteItem || {}),
    ...(localItem || {}),
    storage_key: remoteItem?.storage_key || localItem?.storage_key || "",
    md5: remoteItem?.md5 || localItem?.md5 || "",
    etag: remoteItem?.etag || localItem?.etag || "",
    size: remoteItem?.size || localItem?.size || 0,
    content_type: remoteItem?.content_type || localItem?.content_type || "",
    original_name: remoteItem?.original_name || localItem?.original_name || localItem?.name || "",
    url: localUrl || remoteUrl,
    preview_url: localUrl || remoteUrl,
    image_url: localUrl || remoteUrl,
    remote_url: remoteUrl || remoteItem?.remote_url || "",
  };
}

function mergeImageList(localList, remoteList) {
  const localImages = Array.isArray(localList) ? localList : [];
  const remoteImages = Array.isArray(remoteList) ? remoteList : [];
  const usedRemote = new Set();
  const merged = [];

  for (let localIndex = 0; localIndex < localImages.length; localIndex += 1) {
    const localItem = localImages[localIndex];
    let matchIndex = -1;
    matchIndex = remoteImages.findIndex((remoteItem, idx) => !usedRemote.has(idx) && imagesShareIdentity(localItem, remoteItem));
    if (matchIndex < 0 && localImages.length === remoteImages.length && !usedRemote.has(localIndex)) {
      matchIndex = localIndex;
    }
    if (matchIndex >= 0) {
      usedRemote.add(matchIndex);
      merged.push(mergeImageItems(localItem, remoteImages[matchIndex]));
    } else {
      merged.push(localItem);
    }
  }

  const mergedKeys = new Set();
  for (const item of merged) {
    for (const key of imageMergeKeys(item)) mergedKeys.add(key);
  }
  remoteImages.forEach((remoteItem, idx) => {
    if (usedRemote.has(idx)) return;
    const remoteKeys = imageMergeKeys(remoteItem);
    for (const key of remoteKeys) {
      if (mergedKeys.has(key)) return;
    }
    for (const key of remoteKeys) mergedKeys.add(key);
    merged.push(remoteItem);
  });
  return merged;
}

function mergeLocalImageMessage(localMessage, historyMessage) {
  const localMeta = localMessage?.metadata || {};
  const historyMeta = historyMessage?.metadata || {};
  const localPageContext = localMeta.page_context || {};
  const historyPageContext = historyMeta.page_context || {};
  const historyId = String(historyMessage?.id || "").trim();
  const localContent = String(localMessage?.content || "").trim();
  const historyContent = String(historyMessage?.content || "").trim();
  return {
    ...(historyMessage || {}),
    ...(localMessage || {}),
    // Once the backend row exists, keep its stable id. Keeping the temporary
    // local id causes the next history sync to append the same image again.
    id: historyId || localMessage?.id || historyMessage?.id,
    role: "user",
    content: localContent || historyContent,
    created_at: historyMessage?.created_at || localMessage?.created_at || "",
    metadata: {
      ...historyMeta,
      ...localMeta,
      upload_batch_id: localMeta.upload_batch_id || historyMeta.upload_batch_id || "",
      images: mergeImageList(localMeta.images, historyMeta.images),
      page_context: {
        ...historyPageContext,
        ...localPageContext,
        upload_batch_id: localPageContext.upload_batch_id || historyPageContext.upload_batch_id || "",
        images: mergeImageList(localPageContext.images, historyPageContext.images),
        uploaded_images: mergeImageList(localPageContext.uploaded_images, historyPageContext.uploaded_images),
      },
    },
  };
}

function mergeDuplicateImageMessages(existingMessage, incomingMessage) {
  const existingId = String(existingMessage?.id || "");
  const incomingId = String(incomingMessage?.id || "");
  const existingIsLocal = existingId.startsWith("local_") || existingId.startsWith("client_");
  const incomingIsLocal = incomingId.startsWith("local_") || incomingId.startsWith("client_");
  const localMessage = incomingIsLocal && !existingIsLocal ? incomingMessage : existingMessage;
  const historyMessage = incomingIsLocal && !existingIsLocal ? existingMessage : incomingMessage;
  return mergeLocalImageMessage(localMessage, historyMessage);
}

function dedupeTimelineImageMessages(items) {
  const out = [];
  for (const item of Array.isArray(items) ? items : []) {
    if (String(item?.role || "").toLowerCase() === "assistant") {
      const idx = out.findIndex((m) => messagesLikelySameAssistantResponse(m, item));
      if (idx >= 0) {
        out[idx] = mergeAssistantResponseMessage(out[idx], item);
        continue;
      }
    }
    if (String(item?.role || "").toLowerCase() === "user" && messageImageCount(item) > 0) {
      const idx = out.findIndex((m) => (
        String(m?.role || "").toLowerCase() === "user" &&
        messageImageCount(m) > 0 &&
        messagesShareImageKeys(m, item)
      ));
      if (idx >= 0) {
        out[idx] = mergeDuplicateImageMessages(out[idx], item);
        continue;
      }
    }
    out.push(item);
  }
  return out;
}

function mergeHistoryWithLocalImages(historyItems, currentMessages) {
  const preserved = Array.isArray(currentMessages) ? currentMessages.filter(isPersistentLocalImageMessage) : [];
  if (!preserved.length) return dedupeTimelineImageMessages(historyItems);
  const mergedHistory = Array.isArray(historyItems) ? [...historyItems] : [];
  const matchedLocal = new Set();

  preserved.forEach((localMessage, localIndex) => {
    const localKeys = messageImageKeys(localMessage);
    if (!localKeys.size && !messageImageCount(localMessage)) return;
    const historyIndex = mergedHistory.findIndex((historyMessage) => {
      if (String(historyMessage?.role || "").toLowerCase() !== "user") return false;
      const historyKeys = messageImageKeys(historyMessage);
      for (const key of localKeys) {
        if (historyKeys.has(key)) return true;
      }
      return messagesLikelySameImageUpload(localMessage, historyMessage);
    });
    if (historyIndex >= 0) {
      mergedHistory[historyIndex] = mergeLocalImageMessage(localMessage, mergedHistory[historyIndex]);
      matchedLocal.add(localIndex);
    }
  });

  const existingIds = new Set(mergedHistory.map((m) => String(m?.id || "")));
  const extras = preserved.filter((m, idx) => !matchedLocal.has(idx) && !existingIds.has(String(m?.id || "")));
  return dedupeTimelineImageMessages([...extras, ...mergedHistory]);
}

function mergeHistoryWithCurrentTimeline(historyItems, currentMessages) {
  const current = dedupeTimelineImageMessages(currentMessages);
  if (!current.length) return Array.isArray(historyItems) ? [...historyItems] : [];
  const merged = [...current];
  const seen = new Set(merged.map((m) => String(m?.id || "")));
  for (const item of Array.isArray(historyItems) ? historyItems : []) {
    const id = String(item?.id || "");
    if (!id) continue;
    if (seen.has(id)) {
      const existingIndex = merged.findIndex((m) => String(m?.id || "") === id);
      if (existingIndex >= 0) {
        const existing = merged[existingIndex];
        if (String(item?.role || "").toLowerCase() === "user") {
          merged[existingIndex] = (messageImageCount(existing) > 0 || messageImageCount(item) > 0)
            ? mergeLocalImageMessage(existing, item)
            : {
              ...existing,
              ...item,
              metadata: {
                ...(item.metadata || {}),
                ...(existing.metadata || {}),
              },
            };
        } else if (String(item?.role || "").toLowerCase() === "assistant") {
          merged[existingIndex] = mergeAssistantResponseMessage(existing, item);
        }
      }
      continue;
    }
    if (String(item?.role || "").toLowerCase() === "user") {
      const clientMsgId = messageClientMsgId(item);
      const localIndex = clientMsgId
        ? merged.findIndex((m) => (
          String(m?.role || "").toLowerCase() === "user" &&
          (String(m?.id || "").startsWith("local_") || String(m?.id || "").startsWith("client_")) &&
          messageClientMsgId(m) === clientMsgId
        ))
        : -1;
      if (localIndex >= 0) {
        const localMessage = merged[localIndex];
        merged[localIndex] = (messageImageCount(localMessage) > 0 || messageImageCount(item) > 0)
          ? mergeLocalImageMessage(localMessage, item)
          : {
            ...localMessage,
            ...item,
            metadata: {
              ...(item.metadata || {}),
              ...(localMessage.metadata || {}),
              client_msg_id: clientMsgId,
            },
          };
        seen.add(id);
        continue;
      }
    }
    if (String(item?.role || "").toLowerCase() === "assistant") {
      const localIndex = merged.findIndex((m) => (
        String(m?.role || "").toLowerCase() === "assistant" &&
        (String(m?.id || "").startsWith("assistant_pending_") || String(m?.id || "").startsWith("local_")) &&
        messagesLikelySameAssistantResponse(m, item)
      ));
      if (localIndex >= 0) {
        merged[localIndex] = mergeAssistantResponseMessage(merged[localIndex], item);
        seen.add(id);
        continue;
      }
    }
    if (String(item?.role || "").toLowerCase() === "user" && messageImageCount(item) > 0) {
      const localIndex = merged.findIndex((m) => (
        String(m?.role || "").toLowerCase() === "user" &&
        (String(m?.id || "").startsWith("local_") || String(m?.id || "").startsWith("client_") || messageImageCount(m) > 0) &&
        messagesLikelySameImageUpload(m, item)
      ));
      if (localIndex >= 0) {
        merged[localIndex] = mergeLocalImageMessage(merged[localIndex], item);
        seen.add(id);
        continue;
      }
    }
    seen.add(id);
    merged.push(item);
  }
  return dedupeTimelineImageMessages(merged);
}

function normalizeChatPayload(respOrBody) {
  const body = respOrBody && respOrBody.data !== undefined ? respOrBody.data : respOrBody;
  if (body && typeof body === "object") {
    if (
      Object.prototype.hasOwnProperty.call(body, "reply") ||
      Object.prototype.hasOwnProperty.call(body, "session_id") ||
      Object.prototype.hasOwnProperty.call(body, "intent")
    ) {
      return body;
    }

    const nested = body.data;
    if (
      nested &&
      typeof nested === "object" &&
      (Object.prototype.hasOwnProperty.call(nested, "reply") ||
        Object.prototype.hasOwnProperty.call(nested, "session_id") ||
        Object.prototype.hasOwnProperty.call(nested, "intent"))
    ) {
      return nested;
    }
  }
  return {};
}

function isBusinessFailed(data) {
  return String(data?.data?.result_status || "").toLowerCase() === "failed";
}

const VISIBLE_ASSISTANT_RESULT_STATUSES = new Set([
  "need_more_info",
  "not_ready",
  "failed",
]);

const QUOTE_RESULT_IMAGE_POLL_INITIAL_DELAY_MS = 700;
const QUOTE_RESULT_IMAGE_POLL_DELAY_MS = 1000;
const QUOTE_RESULT_IMAGE_POLL_MAX_MS = 30000;

function quoteResultPayloadFromData(data) {
  const payload = data?.data?.payload || {};
  const result =
    payload?.quote_result ||
    payload?.quoteResult ||
    data?.data?.quote_result ||
    data?.data?.quoteResult ||
    data?.quote_result ||
    data?.quoteResult ||
    null;
  return result && typeof result === "object" ? result : null;
}

function hasQuoteResultFromData(data) {
  const result = quoteResultPayloadFromData(data);
  return !!result && Object.keys(result).length > 0;
}

function isQuoteAssistantResponse(data) {
  const intent = String(data?.intent || data?.data?.intent || "").toLowerCase();
  if (intent.startsWith("quote")) return true;
  const payload = data?.data?.payload || {};
  return !!(
    payload?.quote_case ||
    payload?.quote_task ||
    payload?.quote_result ||
    payload?.quoteResult ||
    data?.data?.quote_result ||
    data?.data?.quoteResult ||
    data?.quote_result ||
    data?.quoteResult
  );
}

function extractQuoteFailureSummary(data, { replyText = "" } = {}) {
  if (!data || typeof data !== "object") return null;
  const intent = String(data?.intent || data?.data?.intent || "").toLowerCase();
  if (intent && !intent.startsWith("quote")) return null;

  const inner = data?.data && typeof data.data === "object" ? data.data : {};
  const payload = inner.payload && typeof inner.payload === "object" ? inner.payload : {};
  const silent = data?.silent === true || inner.silent === true || payload.ui_visible === false;
  const failureCode = String(inner.failure_code || payload.failure_code || "").trim();
  const resultStatus = String(inner.result_status || "").toLowerCase();

  if (hasQuoteResultFromData(data) && resultStatus === "success") return null;
  if (silent && !failureCode) return null;

  const failLike =
    !!failureCode ||
    resultStatus === "failed" ||
    resultStatus === "need_more_info" ||
    (resultStatus === "not_ready" && !!failureCode) ||
    payload.preflight_blocked === true ||
    payload.material_changed === true ||
    payload.result_materialization_failed === true;
  if (!failLike) return null;

  const reason = String(
    inner.failure_reason ||
      payload.failure_reason ||
      inner.message ||
      replyText ||
      data.reply ||
      ""
  ).trim();
  if (!reason && !failureCode) return null;

  const nextAction = String(inner.next_action || payload.next_action || "").trim();
  const quoteCase = payload.quote_case && typeof payload.quote_case === "object" ? payload.quote_case : {};
  const platformAccount =
    payload.platform_account && typeof payload.platform_account === "object" ? payload.platform_account : {};
  const platformName = String(
    quoteCase.platform_name ||
      payload.platform_name ||
      platformAccount.platform_name ||
      ""
  ).trim();
  const platformCode = String(
    quoteCase.platform_code ||
      payload.platform_code ||
      platformAccount.platform_code ||
      ""
  ).trim().toUpperCase();

  let requoteText = "";
  const actions = Array.isArray(data.actions) ? data.actions : [];
  for (const action of actions) {
    const label = String(action?.label || "").trim();
    if (/报价$/.test(label) && !/材料|状态|配置|账号/.test(label)) {
      requoteText = label;
      break;
    }
  }
  if (!requoteText && platformName) requoteText = `${platformName}报价`;
  if (!requoteText) requoteText = "人保报价";

  const shortReason = reason
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .find((line) => !line.startsWith("下一步：")) || reason;

  const summary = {
    failure_code: failureCode || resultStatus || "failed",
    reason: shortReason.slice(0, 180),
    next_action: nextAction,
    platform_name: platformName,
    platform_code: platformCode,
    requote_text: requoteText,
    trace_id: String(data?.trace_id || data?.data?.trace_id || "").trim(),
    at: new Date().toISOString(),
  };
  summary.signature = quoteFailureSignature(summary);
  return summary;
}

function quoteFailureSignature(summary) {
  if (!summary || typeof summary !== "object") return "";
  return JSON.stringify({
    trace_id: String(summary.trace_id || "").trim(),
    failure_code: String(summary.failure_code || "").trim(),
    reason: String(summary.reason || "").trim(),
    next_action: String(summary.next_action || "").trim(),
    requote_text: String(summary.requote_text || "").trim(),
  });
}

function quoteFailureDismissalKey(sessionId) {
  const sid = String(sessionId || "").trim();
  return sid ? `ai-assistant:last-quote-failure-dismissed:${sid}` : "";
}

function readQuoteFailureDismissal(sessionId) {
  const key = quoteFailureDismissalKey(sessionId);
  if (!key || typeof window === "undefined" || !window.sessionStorage) return "";
  try {
    return window.sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeQuoteFailureDismissal(sessionId, signature) {
  const key = quoteFailureDismissalKey(sessionId);
  if (!key || typeof window === "undefined" || !window.sessionStorage) return;
  try {
    if (signature) {
      window.sessionStorage.setItem(key, signature);
    } else {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Session storage is best-effort only.
  }
}

function extractQuoteFailureSummaryFromMessage(message) {
  if (!message || typeof message !== "object") return null;
  if (String(message.role || "").toLowerCase() !== "assistant") return null;
  const meta = message.metadata || {};
  const data = {
    intent: meta.intent || "",
    reply: message.content || "",
    actions: Array.isArray(meta.actions) ? meta.actions : [],
    silent: meta.silent === true,
    data: meta.data || null,
    trace_id: meta.trace_id || meta.data?.trace_id || "",
  };
  const summary = extractQuoteFailureSummary(data, { replyText: message.content || "" });
  if (!summary) return null;
  if (message.created_at) summary.at = String(message.created_at);
  return summary;
}

function syncLastQuoteFailureFromMessages(messageList, lastQuoteFailureRef, sessionId = "") {
  const dismissedSignature = readQuoteFailureDismissal(sessionId);
  const rows = Array.isArray(messageList) ? messageList : [];
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const summary = extractQuoteFailureSummaryFromMessage(rows[i]);
    if (summary) {
      if (summary.signature && dismissedSignature && summary.signature === dismissedSignature) {
        lastQuoteFailureRef.value = null;
        return null;
      }
      lastQuoteFailureRef.value = summary;
      return summary;
    }
    const meta = rows[i]?.metadata || {};
    const status = String(meta.data?.result_status || "").toLowerCase();
    if (status === "success" && (meta.data?.payload?.quote_result || meta.data?.quote_result)) {
      lastQuoteFailureRef.value = null;
      return null;
    }
  }
  lastQuoteFailureRef.value = null;
  return null;
}

function rememberQuoteOutcome(data, lastQuoteFailureRef, sessionId = "") {
  if (!data || typeof data !== "object") return;
  if (hasQuoteResultFromData(data) && String(data?.data?.result_status || "").toLowerCase() === "success") {
    lastQuoteFailureRef.value = null;
    return;
  }
  const summary = extractQuoteFailureSummary(data);
  if (!summary) return;
  const resolvedSessionId = String(sessionId || data?.session_id || data?.data?.session_id || "").trim();
  if (summary.signature && readQuoteFailureDismissal(resolvedSessionId) === summary.signature) return;
  lastQuoteFailureRef.value = summary;
}

function shouldAppendAssistantResponse(data) {
  if (!data || typeof data !== "object") return false;
  if (data.ok === false || data.error) return true;
  const intent = String(data?.intent || data?.data?.intent || "").toLowerCase();
  const payload = data?.data?.payload || {};
  const silent = data?.silent === true || data?.data?.silent === true;
  const hidden = data?.ui_visible === false || data?.data?.ui_visible === false || payload?.ui_visible === false;
  const resultStatus = String(data?.data?.result_status || "").toLowerCase();
  const failureCode = String(
    data?.data?.failure_code || payload?.failure_code || ""
  ).trim();
  // Classified quote failures must always surface, even if a silent flag leaked through.
  if (failureCode) return true;
  if (hasQuoteResultFromData(data)) return true;
  if (VISIBLE_ASSISTANT_RESULT_STATUSES.has(resultStatus)) return true;
  if (intent === "fallback" || resultStatus === "invalid_command") {
    return !!String(data.reply || "").trim();
  }
  if (intent === "quote" && resultStatus === "success") return true;
  if (silent || hidden || intent === "quote_image_collect") return false;

  // 报价链路的普通成功结果只更新状态，不在聊天框刷屏。
  if (isQuoteAssistantResponse(data)) return false;

  return !!String(data.reply || "").trim();
}

function makeAssistantResponseMessage(data) {
  const failed = isBusinessFailed(data);
  return {
    role: "assistant",
    content: sanitizeQuoteUserText(data?.reply || ""),
    created_at: new Date().toISOString(),
    metadata: {
      status: data?.ok === false || failed ? "error" : "success",
      trace_id: data?.trace_id || "",
      intent: data?.intent || "",
      confidence: data?.confidence || 0,
      actions: Array.isArray(data?.actions) ? data.actions : [],
      data: data?.data || null,
      error: data?.error || null,
      model: data?.model || "",
    },
  };
}

function isWaitingSmsAssistantMessage(message) {
  if (String(message?.role || "").toLowerCase() !== "assistant") return false;
  const meta = message?.metadata || {};
  if (String(meta.intent || "").toLowerCase() !== "quote") return false;
  const status = String(meta.data?.result_status || "").toLowerCase();
  if (status !== "not_ready") return false;
  const text = `${message?.content || ""}\n${meta.data?.message || ""}`;
  return /短信|验证码|校验码|code/i.test(text);
}

function shouldHideUnlabeledSmsCode(text, messages) {
  if (!/^\s*\d{4,8}\s*$/.test(String(text || ""))) return false;
  const list = Array.isArray(messages) ? messages : [];
  return [...list].reverse().some(isWaitingSmsAssistantMessage);
}

export function useAiAssistantSession() {
  const loadingInit = ref(false);
  const loadingSessions = ref(false);
  const loadingHistory = ref(false);
  const loadingMoreHistory = ref(false);
  const loadingMoreSessions = ref(false);
  const sendingCount = ref(0);
  const sending = computed(() => sendingCount.value > 0);

  const sessions = ref([]);
  const currentSessionId = ref("");
  const messages = ref([]);
  const processHint = ref("");
  const lastQuoteFailure = ref(null);
  const sessionsNextCursor = ref("");
  const sessionsHasMore = ref(false);
  const historyNextCursor = ref("");
  const historyHasMore = ref(false);
  const loadedHistoryFingerprints = new Map();

  // SSE 中止控制
  let currentAbort = null;
  const activeAbortControllers = new Set();
  let pendingQuoteImagePollTimer = null;
  let pendingQuoteImagePollStartedAt = 0;
  let pendingQuoteImagePollSessionId = "";
  let pendingQuoteImagePollRunning = false;

  function abortActiveRequests() {
    for (const controller of activeAbortControllers) {
      try {
        controller?.abort?.();
      } catch {
        // ignore
      }
    }
    if (currentAbort && !activeAbortControllers.has(currentAbort)) {
      try {
        currentAbort.abort();
      } catch {
        // ignore
      }
    }
    currentAbort = null;
  }

  function currentMessagesHavePendingQuoteResultImage() {
    return messagesHavePendingQuoteResultImages(messages.value);
  }

  function clearPendingQuoteImagePoll({ resetWindow = true } = {}) {
    if (pendingQuoteImagePollTimer) {
      clearTimeout(pendingQuoteImagePollTimer);
    }
    pendingQuoteImagePollTimer = null;
    pendingQuoteImagePollRunning = false;
    if (resetWindow) {
      pendingQuoteImagePollStartedAt = 0;
      pendingQuoteImagePollSessionId = "";
    }
  }

  function maybeSchedulePendingQuoteImagePoll({ initial = false, resetWindow = false } = {}) {
    const sid = String(currentSessionId.value || "").trim();
    if (!sid || !currentMessagesHavePendingQuoteResultImage()) {
      clearPendingQuoteImagePoll();
      return;
    }

    const now = Date.now();
    if (resetWindow || pendingQuoteImagePollSessionId !== sid || !pendingQuoteImagePollStartedAt) {
      pendingQuoteImagePollSessionId = sid;
      pendingQuoteImagePollStartedAt = now;
    }
    if (now - pendingQuoteImagePollStartedAt >= QUOTE_RESULT_IMAGE_POLL_MAX_MS) {
      clearPendingQuoteImagePoll();
      return;
    }
    if (pendingQuoteImagePollTimer || pendingQuoteImagePollRunning) return;

    const delay = initial ? QUOTE_RESULT_IMAGE_POLL_INITIAL_DELAY_MS : QUOTE_RESULT_IMAGE_POLL_DELAY_MS;
    pendingQuoteImagePollTimer = setTimeout(() => {
      pendingQuoteImagePollTimer = null;
      void pollPendingQuoteImages();
    }, delay);
  }

  async function pollPendingQuoteImages() {
    const sid = pendingQuoteImagePollSessionId || String(currentSessionId.value || "").trim();
    if (!sid || sid !== String(currentSessionId.value || "").trim() || !currentMessagesHavePendingQuoteResultImage()) {
      clearPendingQuoteImagePoll();
      return;
    }
    if (Date.now() - pendingQuoteImagePollStartedAt >= QUOTE_RESULT_IMAGE_POLL_MAX_MS) {
      clearPendingQuoteImagePoll();
      return;
    }

    pendingQuoteImagePollRunning = true;
    try {
      await loadHistory(sid, {
        showLoading: false,
        preserveCurrentTimeline: true,
      });
    } catch {
      // loadHistory already handles visible errors when needed; this poll is best-effort.
    } finally {
      pendingQuoteImagePollRunning = false;
      if (String(currentSessionId.value || "").trim() === sid && currentMessagesHavePendingQuoteResultImage()) {
        maybeSchedulePendingQuoteImagePoll();
      } else {
        clearPendingQuoteImagePoll();
      }
    }
  }

  function resetCurrentSessionView() {
    clearPendingQuoteImagePoll();
    currentSessionId.value = "";
    historyNextCursor.value = "";
    historyHasMore.value = false;
    messages.value = [];
    processHint.value = "";
    lastQuoteFailure.value = null;
  }

  function clearLastQuoteFailure() {
    if (lastQuoteFailure.value?.signature) {
      writeQuoteFailureDismissal(currentSessionId.value, lastQuoteFailure.value.signature);
    }
    lastQuoteFailure.value = null;
  }

  function refreshLastQuoteFailureFromMessages() {
    syncLastQuoteFailureFromMessages(messages.value, lastQuoteFailure, currentSessionId.value);
  }

  function findSessionSummary(sessionId) {
    const sid = String(sessionId || "").trim();
    if (!sid) return null;
    return sessions.value.find((item) => String(item?.session_id || "").trim() === sid) || null;
  }

  function rememberLoadedHistoryFingerprint(sessionId) {
    const sid = String(sessionId || "").trim();
    if (!sid) return;
    const fingerprint = sessionSyncFingerprint(findSessionSummary(sid));
    if (fingerprint) {
      loadedHistoryFingerprints.set(sid, fingerprint);
    } else {
      loadedHistoryFingerprints.delete(sid);
    }
  }

  function sessionHistoryMayHaveChanged(sessionId) {
    const sid = String(sessionId || "").trim();
    if (!sid) return false;
    const fingerprint = sessionSyncFingerprint(findSessionSummary(sid));
    if (!fingerprint) return true;
    return loadedHistoryFingerprints.get(sid) !== fingerprint;
  }

  async function refreshSessions({ limit = 10, cursor = "", append = false, silent = false } = {}) {
    if (!silent) loadingSessions.value = true;
    try {
      const resp = await listAiSessions({ limit, cursor });
      const page = normalizeSessionPage(resp);
      if (append) {
        const seen = new Set(sessions.value.map((x) => String(x.session_id || "")));
        const extra = page.items.filter((x) => x.session_id && !seen.has(String(x.session_id)));
        sessions.value = [...sessions.value, ...extra];
      } else {
        sessions.value = page.items;
      }
      sessionsNextCursor.value = page.next_cursor;
      sessionsHasMore.value = page.has_more;
    } catch (e) {
      if (!silent) {
        ElNotification.error({
          title: "会话列表加载失败",
          message: normalizeErrMsg(e, "加载会话列表失败"),
          duration: 4000,
        });
      }
    } finally {
      if (!silent) loadingSessions.value = false;
    }
  }

  async function loadMoreSessions() {
    if (!sessionsHasMore.value || loadingMoreSessions.value) return false;
    loadingMoreSessions.value = true;
    try {
      const before = sessions.value.length;
      await refreshSessions({
        limit: 10,
        cursor: sessionsNextCursor.value,
        append: true,
        silent: true,
      });
      return sessions.value.length > before || sessionsHasMore.value;
    } catch {
      return false;
    } finally {
      loadingMoreSessions.value = false;
    }
  }

  async function syncCurrentSession({ reloadHistory = true, force = false } = {}) {
    await refreshSessions({ limit: Math.max(10, sessions.value.length || 10), silent: true });
    if (!currentSessionId.value) {
      const latest = sessions.value[0]?.session_id || "";
      if (latest) {
        await loadHistory(latest, { showLoading: false });
        return { historyReloaded: true };
      }
      return { historyReloaded: false };
    }
    if (reloadHistory && !sending.value && !loadingHistory.value && !loadingMoreHistory.value) {
      const hasPendingQuoteImage = currentMessagesHavePendingQuoteResultImage();
      if (!force && !hasPendingQuoteImage && !sessionHistoryMayHaveChanged(currentSessionId.value)) {
        return { historyReloaded: false };
      }
      await loadHistory(currentSessionId.value, { showLoading: false, preserveCurrentTimeline: true });
      return { historyReloaded: true };
    }
    return { historyReloaded: false };
  }

  async function loadHistory(sessionId, { showLoading = true, preserveCurrentTimeline = false } = {}) {
    const sid = String(sessionId || currentSessionId.value || "").trim();
    if (!sid) {
      messages.value = [];
      lastQuoteFailure.value = null;
      return;
    }

    const sameSession = sid && sid === String(currentSessionId.value || "").trim();
    const currentMessages = sameSession ? [...messages.value] : [];
    if (showLoading) {
      loadingHistory.value = true;
    }
    try {
      const resp = await getAiSessionHistory(sid, { limit: 3, today_only: true });
      let page = normalizeHistoryPage(resp);
      if (!page.items.length && page.has_more && page.next_cursor) {
        const fallbackResp = await getAiSessionHistory(sid, { cursor: page.next_cursor, limit: 3 });
        const fallbackPage = normalizeHistoryPage(fallbackResp);
        if (fallbackPage.items.length) {
          page = fallbackPage;
        }
      }
      currentSessionId.value = sid;
      messages.value = preserveCurrentTimeline
        ? mergeHistoryWithCurrentTimeline(page.items, currentMessages)
        : mergeHistoryWithLocalImages(page.items, currentMessages);
      historyNextCursor.value = page.next_cursor;
      historyHasMore.value = page.has_more;
      rememberLoadedHistoryFingerprint(sid);
      refreshLastQuoteFailureFromMessages();
      if (currentMessagesHavePendingQuoteResultImage()) {
        maybeSchedulePendingQuoteImagePoll({ initial: true });
      } else {
        clearPendingQuoteImagePoll();
      }
    } catch (e) {
      if (isNotFoundError(e)) {
        resetCurrentSessionView();
        await refreshSessions({ silent: true });
        return;
      }
      if (showLoading) {
        ElNotification.error({
          title: "历史消息加载失败",
          message: normalizeErrMsg(e, "加载历史消息失败"),
          duration: 4000,
        });
        messages.value = [];
        lastQuoteFailure.value = null;
        historyNextCursor.value = "";
        historyHasMore.value = false;
      }
    } finally {
      if (showLoading) {
        loadingHistory.value = false;
      }
    }
  }

  async function loadMoreHistory() {
    const sid = String(currentSessionId.value || "").trim();
    if (!sid || !historyHasMore.value || loadingMoreHistory.value) {
      return false;
    }

    loadingMoreHistory.value = true;
    try {
      const params = { limit: 5 };
      if (historyNextCursor.value) params.cursor = historyNextCursor.value;
      const resp = await getAiSessionHistory(sid, params);
      const page = normalizeHistoryPage(resp);
      const existing = new Set(messages.value.map((m) => String(m.id || "")));
      const older = page.items.filter((m) => !existing.has(String(m.id || "")));
      if (older.length) {
        messages.value = [...older, ...messages.value];
        refreshLastQuoteFailureFromMessages();
      }
      historyNextCursor.value = page.next_cursor;
      historyHasMore.value = page.has_more;
      return older.length > 0 || page.has_more;
    } catch (e) {
      ElNotification.error({
        title: "历史消息加载失败",
        message: normalizeErrMsg(e, "加载更早历史消息失败"),
        duration: 4000,
      });
      return false;
    } finally {
      loadingMoreHistory.value = false;
    }
  }

  async function ensureInit({ loadLatestSession = true } = {}) {
    loadingInit.value = true;
    try {
      await refreshSessions();
      if (loadLatestSession && sessions.value.length > 0) {
        await loadHistory(sessions.value[0].session_id);
      } else {
        resetCurrentSessionView();
      }
    } finally {
      loadingInit.value = false;
    }
  }

  function appendLocalMessage(msg) {
    messages.value.push({
      id: msg?.id || `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...msg,
    });
  }

  async function switchSession(sessionId) {
    if (!sessionId) return;
    if (sending.value) abortActiveRequests();
    await loadHistory(sessionId);
  }

  async function createNewSessionLocal() {
    if (sending.value) abortActiveRequests();
    currentSessionId.value = "";
    historyNextCursor.value = "";
    historyHasMore.value = false;
    messages.value = [];
    processHint.value = "";
    lastQuoteFailure.value = null;
    try {
      const resp = await createAiSession();
      const data = resp?.data?.data ?? resp?.data ?? {};
      const sid = String(data?.session_id || "").trim();
      currentSessionId.value = sid;
      historyNextCursor.value = "";
      historyHasMore.value = false;
      messages.value = [];
      await refreshSessions();
      return { ok: true, session_id: sid };
    } catch (e) {
      currentSessionId.value = "";
      historyNextCursor.value = "";
      historyHasMore.value = false;
      messages.value = [];
      ElNotification.error({
        title: "新建会话失败",
        message: normalizeErrMsg(e, "新建会话失败"),
        duration: 4000,
      });
      return { ok: false, error: e };
    }
  }

  function schedulePostSendSync() {
    const sid = String(currentSessionId.value || "").trim();
    if (!sid) return;
    void (async () => {
      try {
        await refreshSessions({ limit: Math.max(10, sessions.value.length || 10), silent: true });
        if (currentSessionId.value) {
          await loadHistory(currentSessionId.value, {
            showLoading: false,
            preserveCurrentTimeline: sending.value,
          });
        }
      } catch {
        // keep the chat fast; background sync is best-effort
      } finally {
        if (currentMessagesHavePendingQuoteResultImage()) {
          maybeSchedulePendingQuoteImagePoll({ initial: true, resetWindow: true });
        }
      }
    })();
  }

  function startInFlightHistorySync({ enabled = false } = {}) {
    if (!enabled) return () => {};
    let stopped = false;
    let timer = null;
    let running = false;

    const tick = async () => {
      const sid = String(currentSessionId.value || "").trim();
      if (stopped || running || !sid) return;
      running = true;
      try {
        await refreshSessions({ limit: Math.max(10, sessions.value.length || 10), silent: true });
        if (!stopped && String(currentSessionId.value || "").trim() === sid) {
          await loadHistory(sid, {
            showLoading: false,
            preserveCurrentTimeline: true,
          });
        }
      } catch {
        // The normal response path still reloads history; this only improves long quote visibility.
      } finally {
        running = false;
      }
    };

    const schedule = (delay = 1800) => {
      timer = setTimeout(async () => {
        await tick();
        if (!stopped) schedule(1800);
      }, delay);
    };

    schedule(1200);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
    };
  }

  async function removeSession(sessionId) {
    try {
      if (sending.value) abortActiveRequests();
      await deleteAiSession(sessionId);
      if (String(currentSessionId.value) === String(sessionId)) {
        resetCurrentSessionView();
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

  async function sendMessage(
    inputText,
    {
      useStream = true,
      pageContext = {},
      images = [],
      silentErrors = false,
      displayText,
      processHintText,
      appendUserMessage = true,
      showProcessHint = true,
    } = {}
  ) {
    const parsed = parseAiCommand(inputText);
    if (parsed.kind === "empty") {
      ElMessage.warning("请输入内容");
      return { ok: false, skipped: true, message: "请输入内容" };
    }

    if (parsed.kind === "action" && parsed.action === "new_session") {
      await createNewSessionLocal();
      return { ok: true, skipped: true };
    }

    const text = parsed.text;
    const safeImages = Array.isArray(images) ? images : [];
    const shouldSyncWhileWaiting = parsed.kind === "quote" || safeImages.length > 0;
    const hasDisplayTextOverride = displayText !== undefined;
    const overrideText = hasDisplayTextOverride ? String(displayText || "").trim() : "";
    const visibleText = overrideText || text;
    const clientMsgId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    // 先追加用户消息
    if (appendUserMessage) {
      appendLocalMessage({
        id: clientMsgId,
        role: "user",
        content: redactQuoteSensitiveText(visibleText, {
          hideUnlabeledSmsCode: shouldHideUnlabeledSmsCode(text, messages.value),
        }),
        created_at: new Date().toISOString(),
        metadata: {
          client_msg_id: clientMsgId,
          ...(safeImages.length ? { images: safeImages } : {}),
        },
      });
    }

    const assistantLocalId = `assistant_pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    sendingCount.value += 1;
    if (showProcessHint) {
      processHint.value = processHintText || (parsed.kind === "quote" ? "已识别报价指令，正在处理…" : "正在处理…");
    }
    const stopInFlightHistorySync = startInFlightHistorySync({ enabled: shouldSyncWhileWaiting });
    let localAbort = null;

    try {
      if (!useStream) {
        const resp = await aiChat({
          session_id: currentSessionId.value || undefined,
          client_msg_id: clientMsgId,
          message: text,
          images: safeImages,
          context: pageContext,
        });

        const data = normalizeChatPayload(resp);
        const failed = isBusinessFailed(data);
        const idx = messages.value.findIndex((x) => x.id === assistantLocalId);
        if (idx >= 0) {
          if (!shouldAppendAssistantResponse(data)) {
            messages.value.splice(idx, 1);
          } else {
            messages.value[idx] = {
              ...messages.value[idx],
              content: sanitizeQuoteUserText(data.reply || ""),
              metadata: {
                ...messages.value[idx].metadata,
                status: data.ok === false || failed ? "error" : "success",
                trace_id: data.trace_id,
                intent: data.intent,
                confidence: data.confidence,
                actions: data.actions || [],
                data: data.data || null,
                error: data.error || null,
              },
            };
          }
        }
        if (idx < 0 && shouldAppendAssistantResponse(data)) {
          appendLocalMessage({
            id: assistantLocalId,
            ...makeAssistantResponseMessage(data),
          });
        }

        if (data.session_id) currentSessionId.value = data.session_id;
        rememberQuoteOutcome(data, lastQuoteFailure, currentSessionId.value);
        if (!data.ok) {
          ElNotification.warning({
            title: "报价助手返回异常",
            message: sanitizeQuoteUserText(data?.error?.message, "请求处理失败"),
            duration: 4000,
          });
        }

        schedulePostSendSync();
        return { ok: data.ok !== false && !failed, data };
      }

      // 流式
      const ac = new AbortController();
      localAbort = ac;
      activeAbortControllers.add(ac);
      currentAbort = ac;

      let finalMeta = {
        trace_id: "",
        intent: "",
        confidence: 0,
        actions: [],
      };

      const streamResp = await aiChatStream({
        session_id: currentSessionId.value || undefined,
        client_msg_id: clientMsgId,
        message: text,
        images: safeImages,
        context: pageContext,
        signal: ac.signal,
        onEvent: (evt) => {
          const idx = messages.value.findIndex((x) => x.id === assistantLocalId);

          if (evt.type === "meta") {
            if (evt.session_id) currentSessionId.value = evt.session_id;
            if (idx < 0) return;
            messages.value[idx].metadata = {
              ...(messages.value[idx].metadata || {}),
              trace_id: evt.trace_id || "",
              model: evt.model || "",
              status: "streaming",
            };
            return;
          }

          if (evt.type === "delta") {
            if (idx < 0) return;
            messages.value[idx].content = sanitizeQuoteUserText((messages.value[idx].content || "") + String(evt.content || ""));
            messages.value[idx].metadata = {
              ...(messages.value[idx].metadata || {}),
              status: "streaming",
            };
            return;
          }

          if (evt.type === "done") {
            if (idx < 0) return;
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

          if (evt.type === "final") {
            const data = normalizeChatPayload(evt.data);
            const failed = isBusinessFailed(data);
            if (data.session_id) currentSessionId.value = data.session_id;
            if (idx >= 0) {
              if (!shouldAppendAssistantResponse(data)) {
                messages.value.splice(idx, 1);
              } else {
                messages.value[idx] = {
                  ...messages.value[idx],
                  content: sanitizeQuoteUserText(data.reply || ""),
                  metadata: {
                    ...(messages.value[idx].metadata || {}),
                    status: data.ok === false || failed ? "error" : "success",
                    trace_id: data.trace_id || "",
                    intent: data.intent || "",
                    confidence: data.confidence || 0,
                    actions: Array.isArray(data.actions) ? data.actions : [],
                    data: data.data || null,
                    model: data.model || "",
                  },
                };
              }
            } else if (shouldAppendAssistantResponse(data)) {
              appendLocalMessage({
                id: assistantLocalId,
                ...makeAssistantResponseMessage(data),
              });
            }
            rememberQuoteOutcome(data, lastQuoteFailure, currentSessionId.value);
            return;
          }

          if (evt.type === "error") {
            if (silentErrors) return;
            if (idx >= 0) {
              messages.value[idx].content = sanitizeQuoteUserText(evt.message, "报价助手流式处理失败");
              messages.value[idx].metadata = {
                ...(messages.value[idx].metadata || {}),
                status: "error",
                error_code: evt.code || "INTERNAL_ERROR",
              };
            } else {
              appendLocalMessage({
                id: assistantLocalId,
                role: "assistant",
                content: sanitizeQuoteUserText(evt.message, "报价助手流式处理失败"),
                created_at: new Date().toISOString(),
                metadata: {
                  status: "error",
                  error_code: evt.code || "INTERNAL_ERROR",
                },
              });
            }
          }
        },
      });
      schedulePostSendSync();
      const streamData = normalizeChatPayload(streamResp);
      rememberQuoteOutcome(streamData, lastQuoteFailure, currentSessionId.value);
      return { ok: streamData.ok !== false && !isBusinessFailed(streamData), data: streamData };
    } catch (e) {
      if (isAbortLikeError(e)) {
        return { ok: false, aborted: true };
      }
      const message = normalizeErrMsg(e, "发送失败，请稍后重试");
      if (silentErrors) {
        return { ok: false, error: e, message };
      }
      const idx = messages.value.findIndex((x) => x.id === assistantLocalId);
      if (idx >= 0) {
        messages.value[idx] = {
          ...messages.value[idx],
          content: message,
          metadata: {
            ...(messages.value[idx].metadata || {}),
            status: "error",
          },
        };
      } else {
        appendLocalMessage({
          id: assistantLocalId,
          role: "assistant",
          content: message,
          created_at: new Date().toISOString(),
          metadata: { status: "error" },
        });
      }

      if (!silentErrors) {
        ElNotification.error({
          title: "发送失败",
          message,
          duration: 4000,
        });
      }
      return { ok: false, error: e, message };
    } finally {
      stopInFlightHistorySync();
      if (localAbort) {
        activeAbortControllers.delete(localAbort);
        if (currentAbort === localAbort) {
          currentAbort = Array.from(activeAbortControllers).pop() || null;
        }
      }
      sendingCount.value = Math.max(0, sendingCount.value - 1);
      if (sendingCount.value === 0) {
        processHint.value = "";
        currentAbort = null;
      }
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
    loadingMoreHistory,
    loadingMoreSessions,
    sending,
    sessions,
    currentSessionId,
    currentSessionTitle,
    messages,
    processHint,
    lastQuoteFailure,
    sessionsNextCursor,
    sessionsHasMore,
    historyNextCursor,
    historyHasMore,
    ensureInit,
    refreshSessions,
    loadMoreSessions,
    syncCurrentSession,
    loadHistory,
    loadMoreHistory,
    switchSession,
    createNewSessionLocal,
    removeSession,
    sendMessage,
    abortActiveRequests,
    clearLastQuoteFailure,
  };
}
