// src/views/ai-assistant/composables/useAiUploadSlots.js
import { computed, ref } from "vue";
import { ElMessage, ElNotification } from "element-plus";
import http from "../../../api/http";
import { uploadOrderImageProxy, bindOrderImagesForAi } from "../../../api/orders";
import { uploadOrReuseByMd5 } from "../../../utils/bosUpload";
import { AI_IMAGE_SLOTS, isMultipleSlot, slotLabel } from "../constants/slots";

function hasChinese(s) {
  return /[\u4e00-\u9fa5]/.test(String(s || ""));
}

function _rawErrMsg(e) {
  const m = e?.response?.data?.detail || e?.response?.data?.message || e?.message || "";
  return String(m || "");
}

function normalizeErrMsg(e, fallback = "操作失败，请稍后重试") {
  const detail = e?.response?.data?.detail;
  const msg = _rawErrMsg(e);
  const status = e?.response?.status;
  const code = String(e?.code || "");

  if (typeof detail === "string" && detail && hasChinese(detail)) return detail;
  if (msg && hasChinese(msg)) return msg;

  const low = msg.toLowerCase();
  if (low.includes("network error") || low.includes("failed to fetch")) return "网络异常，请检查网络连接";
  if (low.includes("timeout") || code.includes("ECONNABORTED")) return "请求超时，请稍后重试";
  if (status === 401) return "登录状态已失效，请重新登录";
  if (status === 403) return "无权限执行该操作";
  if (status >= 500) return "服务器异常，请稍后重试";
  return fallback;
}

function isLikelyNetworkBlocked(err) {
  const m = _rawErrMsg(err).toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("network error") ||
    m.includes("err_") ||
    m.includes("cors") ||
    m.includes("代理") ||
    m.includes("vpn") ||
    m.includes("127.0.0.1:7890")
  );
}

export function useAiUploadSlots() {
  const UPLOAD_MODE_KEY = "ai_assistant_upload_mode";
  const uploadMode = ref("stable"); // AI工作台默认稳一点

  try {
    const v = localStorage.getItem(UPLOAD_MODE_KEY);
    if (v === "smart" || v === "direct" || v === "stable") uploadMode.value = v;
  } catch {
    // ignore
  }

  function persistUploadMode() {
    try {
      localStorage.setItem(UPLOAD_MODE_KEY, uploadMode.value);
    } catch {
      // ignore
    }
  }

  const slotFiles = ref(
    AI_IMAGE_SLOTS.reduce((acc, s) => {
      acc[s.key] = [];
      return acc;
    }, {})
  );

  const uploadedMap = ref({}); // uid -> image meta
  const uploadState = ref({}); // uid -> { status, msg? }
  const uploadingCount = ref(0);
  const localPreviewUrlMap = ref({});

  const bosHost = ref("");
  let cachedSts = null;
  let cachedStsExpireAt = 0;

  function _parseExpireTs(expiration) {
    try {
      return Date.parse(expiration);
    } catch {
      return 0;
    }
  }

  async function ensureSts() {
    const now = Date.now();
    if (cachedSts && cachedStsExpireAt && now + 120000 < cachedStsExpireAt) return cachedSts;

    const resp = await http.get("/orders/bos-sts");
    const data = resp?.data;
    if (!data?.accessKeyId || !data?.secretAccessKey || !data?.sessionToken) {
      throw new Error("获取上传凭证失败：返回数据不完整");
    }
    cachedSts = data;
    bosHost.value = data.bosHost || "";
    cachedStsExpireAt = _parseExpireTs(data.expiration) || now + 10 * 60 * 1000;
    return cachedSts;
  }

  function _ensureLocalPreview(file) {
    const raw = file?.raw;
    if (!raw) return;
    if (!file.url) {
      const u = URL.createObjectURL(raw);
      file.url = u;
      localPreviewUrlMap.value[file.uid] = u;
    }
  }

  function _clearUidState(uid) {
    if (uploadedMap.value[uid]) delete uploadedMap.value[uid];
    if (uploadState.value[uid]) delete uploadState.value[uid];

    const u = localPreviewUrlMap.value[uid];
    if (u) {
      try {
        URL.revokeObjectURL(u);
      } catch {
        // ignore
      }
      delete localPreviewUrlMap.value[uid];
    }
  }

  function clearSlot(slotKey) {
    const list = slotFiles.value[slotKey] || [];
    for (const f of list) {
      if (f?.uid) _clearUidState(f.uid);
    }
    slotFiles.value[slotKey] = [];
  }

  function resetAllSlots() {
    for (const slot of AI_IMAGE_SLOTS) {
      clearSlot(slot.key);
    }
  }

  function isSingleSlotLocked(slotKey) {
    if (isMultipleSlot(slotKey)) return false;
    return (slotFiles.value[slotKey] || []).length >= 1;
  }

  function onExceedWarn(slotKey) {
    ElMessage.warning(`${slotLabel(slotKey)}：请先删除当前图片，再上传新图片`);
  }

  function firstFile(slotKey) {
    const list = slotFiles.value[slotKey] || [];
    return list.length ? list[0] : null;
  }

  async function startUpload(slotKey, file) {
    const raw = file?.raw;
    if (!raw) return;
    if (uploadedMap.value[file.uid]) return;

    uploadingCount.value += 1;
    uploadState.value[file.uid] = { status: "uploading" };

    try {
      if (uploadMode.value === "stable") {
        const resp = await uploadOrderImageProxy({ slot_key: slotKey, file: raw });
        const meta = resp?.data || {};

        const url = meta?.url || meta?.preview_url || "";
        uploadedMap.value[file.uid] = {
          slot_key: slotKey,
          md5: meta?.md5 || "",
          storage_key: meta?.storage_key || "",
          etag: meta?.etag || "",
          size: meta?.size || raw.size || 0,
          content_type: meta?.content_type || raw.type || "application/octet-stream",
          original_name: meta?.original_name || raw.name || "file",
          url,
          preview_url: url,
        };

        // ✅ 回填预览为 BOS url（更稳定）
        if (url) file.url = url;

        uploadState.value[file.uid] = { status: "done" };
        return;
      }

      const sts = await ensureSts();
      if (!bosHost.value) throw new Error("上传配置缺失：bosHost 为空");

      const meta = await uploadOrReuseByMd5({
        bosHost: bosHost.value,
        slotKey,
        file: raw,
        sts,
      });

      const url = meta?.url || meta?.preview_url || "";
      uploadedMap.value[file.uid] = {
        slot_key: slotKey,
        ...meta,
        url,
        preview_url: url,
      };

      // ✅ 回填预览为 BOS url（更稳定）
      if (url) file.url = url;

      uploadState.value[file.uid] = { status: "done" };
    } catch (e) {
      if (uploadMode.value === "smart" && isLikelyNetworkBlocked(e)) {
        try {
          uploadMode.value = "stable";
          persistUploadMode();
          const resp = await uploadOrderImageProxy({ slot_key: slotKey, file: raw });
          const meta = resp?.data || {};
          const url = meta?.url || meta?.preview_url || "";

          uploadedMap.value[file.uid] = {
            slot_key: slotKey,
            md5: meta?.md5 || "",
            storage_key: meta?.storage_key || "",
            etag: meta?.etag || "",
            size: meta?.size || raw.size || 0,
            content_type: meta?.content_type || raw.type || "application/octet-stream",
            original_name: meta?.original_name || raw.name || "file",
            url,
            preview_url: url,
          };

          // ✅ 回填预览为 BOS url（更稳定）
          if (url) file.url = url;

          uploadState.value[file.uid] = { status: "done" };
          ElMessage.warning("已自动切换为稳定上传模式");
          return;
        } catch (e2) {
          uploadState.value[file.uid] = { status: "error", msg: normalizeErrMsg(e2) };
          throw e2;
        }
      }

      uploadState.value[file.uid] = { status: "error", msg: normalizeErrMsg(e) };
      throw e;
    } finally {
      uploadingCount.value -= 1;
    }
  }

  function onFileChange(slotKey, file) {
    if (!isMultipleSlot(slotKey)) {
      if (isSingleSlotLocked(slotKey)) {
        onExceedWarn(slotKey);
        return;
      }
      clearSlot(slotKey);
      _ensureLocalPreview(file);
      slotFiles.value[slotKey] = [file];
      startUpload(slotKey, file).catch((e) => {
        ElNotification.error({ title: "上传失败", message: normalizeErrMsg(e), duration: 4000 });
      });
      return;
    }

    const list = slotFiles.value[slotKey] || [];
    if (!list.find((x) => x.uid === file.uid)) list.push(file);
    slotFiles.value[slotKey] = list;
    _ensureLocalPreview(file);
    startUpload(slotKey, file).catch((e) => {
      ElNotification.error({ title: "上传失败", message: normalizeErrMsg(e), duration: 4000 });
    });
  }

  function slotUploadedCount(slotKey) {
    const list = slotFiles.value[slotKey] || [];
    return list.filter((f) => !!uploadedMap.value[f.uid]).length;
  }

  function slotUploadingCount(slotKey) {
    const list = slotFiles.value[slotKey] || [];
    return list.filter((f) => uploadState.value[f.uid]?.status === "uploading").length;
  }

  function previewUrls(slotKey) {
    const list = slotFiles.value[slotKey] || [];
    return list.map((f) => f.url).filter(Boolean);
  }

  const hasAnyUploadedImage = computed(() => {
    return AI_IMAGE_SLOTS.some((s) => (slotFiles.value[s.key] || []).some((f) => !!uploadedMap.value[f.uid]));
  });

  function collectUploadedImages() {
    const out = [];
    for (const slot of AI_IMAGE_SLOTS) {
      const list = slotFiles.value[slot.key] || [];
      for (const f of list) {
        const meta = uploadedMap.value[f.uid];
        if (meta?.slot_key && meta?.storage_key) out.push(meta);
      }
    }
    return out;
  }

  async function bindUploadedImagesToOrder(orderId, { clearRelated = false, triggerOcr = true } = {}) {
    const oid = Number(orderId);
    if (!Number.isInteger(oid) || oid <= 0) throw new Error("order_id 无效");

    const images = collectUploadedImages();
    if (!images.length) {
      ElMessage.warning("请先上传图片");
      return { ok: false, order_id: oid, bound_count: 0 };
    }

    const clear_slots = clearRelated ? ["related"] : [];

    try {
      const resp = await bindOrderImagesForAi({
        order_id: oid,
        images,
        clear_slots,
        trigger_ocr: !!triggerOcr,
      });
      const data = resp?.data || {};
      if (data?.ok) {
        const extra = data?.ocr_task_id ? `（OCR任务#${data.ocr_task_id}：${data.ocr_status || ""}）` : "";
        ElMessage.success(`材料已绑定：${data.bound_count || 0} 张${extra}`);
      }
      return data;
    } catch (e) {
      const msg = normalizeErrMsg(e, "绑定失败，请稍后重试");
      ElNotification.error({ title: "绑定失败", message: msg, duration: 4000 });
      throw e;
    }
  }

  function destroy() {
    for (const uid of Object.keys(localPreviewUrlMap.value)) {
      try {
        URL.revokeObjectURL(localPreviewUrlMap.value[uid]);
      } catch {
        // ignore
      }
    }
    localPreviewUrlMap.value = {};
  }

  return {
    AI_IMAGE_SLOTS,
    uploadMode,
    persistUploadMode,
    slotFiles,
    uploadedMap,
    uploadState,
    uploadingCount,
    hasAnyUploadedImage,
    onFileChange,
    clearSlot,
    resetAllSlots,
    firstFile,
    previewUrls,
    isSingleSlotLocked,
    onExceedWarn,
    slotUploadedCount,
    slotUploadingCount,
    collectUploadedImages,
    bindUploadedImagesToOrder,
    destroy,
  };
}
