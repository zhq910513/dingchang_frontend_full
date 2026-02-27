<!-- src/views/ai-assistant/AiAssistantWorkbench.vue -->
<template>
  <div class="ai-page">
    <el-card shadow="never" class="head-card">
      <div class="head-row">
        <div>
          <div class="title-wrap">
            <h2 class="page-title">报价助手</h2>
            <el-tag size="small" type="warning" effect="plain">功能说明</el-tag>
          </div>

          <div class="guide-box">
            <div class="guide-title">使用提示</div>
            <div class="guide-text">
              先上传车辆资料图片（如合格证、身份证、行驶证等），再输入平台报价指令（例如：<b>太平洋报价</b>）。
            </div>
            <div class="guide-sub">
              你也可以继续补充说明（如车型、险种、特殊要求），报价助手会按当前会话材料继续处理。
            </div>
          </div>

          <div class="head-meta">
            <span>当前会话：<b>{{ currentSessionTitleSafe }}</b></span>
            <span v-if="currentSessionIdSafe">Session: <code>{{ currentSessionIdSafe }}</code></span>
            <span v-if="orderIdSafe">订单：<code>{{ orderIdSafe }}</code></span>
          </div>
        </div>

        <div class="head-actions">
          <el-button size="small" @click="createNewSessionLocalSafe">新会话</el-button>
          <el-button size="small" @click="refreshSessionsSafe" :loading="loadingSessionsSafe">刷新会话</el-button>
        </div>
      </div>

      <div v-if="processHintSafe" class="top-hint">
        <el-alert :title="processHintSafe" type="info" :closable="false" show-icon />
      </div>
    </el-card>

    <div class="main-grid">
      <!-- 左侧会话列表 + 上传面板 -->
      <el-card shadow="never" class="side-card">
        <template #header>
          <div class="card-header">
            <span>会话列表</span>
            <el-tag size="small" effect="plain">{{ sessionsSafe.length }}</el-tag>
          </div>
        </template>

        <div class="side-body">
          <div v-if="loadingInitSafe || loadingSessionsSafe" class="empty-wrap">
            <el-skeleton :rows="4" animated />
          </div>

          <div v-else-if="!sessionsSafe.length" class="empty-wrap">
            <el-empty description="暂无历史会话" />
          </div>

          <div v-else class="session-list">
            <div
              v-for="s in sessionsSafe"
              :key="s.session_id"
              class="session-item"
              :class="{ active: s.session_id === currentSessionIdSafe }"
              @click="handleSwitchSession(s.session_id)"
            >
              <div class="s-title">{{ s.title || "新会话" }}</div>
              <div class="s-preview">{{ s.last_message_preview || "暂无回复预览" }}</div>
              <div class="s-foot">
                <span>{{ formatTime(s.updated_at || s.created_at) }}</span>
                <span>消息 {{ s.message_count ?? 0 }}</span>
              </div>
              <div class="s-actions" @click.stop>
                <el-button size="small" type="danger" link @click="handleDeleteSession(s.session_id)">
                  删除
                </el-button>
              </div>
            </div>
          </div>

          <!-- ✅ 材料上传与绑定闭环 -->
          <div class="upload-box">
            <div class="upload-head">
              <div class="upload-title">材料上传</div>
              <el-select v-model="uploadMode" size="small" style="width: 160px" @change="persistUploadMode">
                <el-option label="稳定模式（后端代传）" value="stable" />
                <el-option label="智能模式（优先直传，失败回退）" value="smart" />
                <el-option label="直传模式（STS+BOS）" value="direct" />
              </el-select>
            </div>

            <div class="upload-slots">
              <div v-for="slot in AI_IMAGE_SLOTS" :key="slot.key" class="upload-slot">
                <div class="upload-slot-title">
                  <span>{{ slot.label }}</span>
                  <el-tag v-if="slot.ocrEnabled" size="small" type="success">OCR</el-tag>
                  <el-tag v-else size="small" type="info">非OCR</el-tag>
                  <span class="upload-slot-meta" v-if="slotUploadingCount(slot.key) > 0">
                    上传中 {{ slotUploadingCount(slot.key) }}
                  </span>
                  <span class="upload-slot-meta" v-else-if="slotUploadedCount(slot.key) > 0">
                    已上传 {{ slotUploadedCount(slot.key) }}
                  </span>
                </div>

                <el-upload
                  drag
                  action=""
                  :auto-upload="false"
                  :show-file-list="true"
                  :limit="slot.multiple ? 50 : 1"
                  :on-change="(file) => onFileChange(slot.key, file)"
                  :on-exceed="() => onExceedWarn(slot.key)"
                  :file-list="slotFiles[slot.key]"
                  accept="image/*"
                  class="uploader"
                >
                  <div class="upload-tip">
                    <div class="upload-strong">拖拽/点击上传</div>
                    <div class="upload-weak">按槽位上传并生成 storage_key</div>
                  </div>
                </el-upload>

                <div class="slot-preview" v-if="previewUrls(slot.key).length">
                  <el-image
                    v-for="(u, idx) in previewUrls(slot.key)"
                    :key="u + '_' + idx"
                    :src="u"
                    fit="cover"
                    style="width: 72px; height: 72px; margin-right: 6px; border-radius: 8px"
                  />
                </div>
              </div>
            </div>

            <div class="upload-actions">
              <el-button :disabled="uploadingCount > 0" @click="resetAllSlots">清空材料</el-button>
              <el-button type="primary" :disabled="!canBind" @click="handleBindToOrder">
                绑定到订单并触发OCR
              </el-button>
            </div>

            <el-alert
              v-if="uploadingCount > 0"
              type="info"
              show-icon
              :closable="false"
              :title="`正在上传中：${uploadingCount} 个文件...`"
            />
            <el-alert
              v-else
              type="success"
              show-icon
              :closable="false"
              title="上传完成后点击「绑定到订单并触发OCR」即可闭环"
            />
          </div>
        </div>
      </el-card>

      <!-- 右侧聊天 -->
      <el-card shadow="never" class="chat-card">
        <template #header>
          <div class="card-header">
            <span>聊天区</span>
            <div>
              <el-button size="small" text @click="reloadHistory" :loading="loadingHistorySafe">刷新消息</el-button>
            </div>
          </div>
        </template>

        <div class="chat-body" ref="chatBodyRef">
          <div v-if="loadingInitSafe || loadingHistorySafe" class="empty-wrap">
            <el-skeleton :rows="6" animated />
          </div>

          <div v-else-if="!messagesSafe.length" class="empty-wrap">
            <el-empty description="还没有消息，先发一句试试（例如：查订单 / 太平洋报价）" />
          </div>

          <div v-else class="msg-list">
            <div
              v-for="m in messagesSafe"
              :key="m.id"
              class="msg-item"
              :class="[`msg-${m.role || 'system'}`]"
            >
              <div class="msg-avatar">{{ roleShort(m.role) }}</div>

              <div class="msg-content">
                <div class="msg-head">
                  <span class="msg-role">{{ roleLabel(m.role) }}</span>
                  <span class="msg-time">{{ formatTime(m.created_at) }}</span>

                  <el-tag
                    v-if="m.metadata?.status"
                    size="small"
                    :type="statusTagType(m.metadata?.status)"
                    effect="plain"
                  >
                    {{ m.metadata.status }}
                  </el-tag>

                  <el-tag v-if="m.metadata?.intent" size="small" type="info" effect="plain">
                    {{ m.metadata.intent }}
                  </el-tag>

                  <el-tag v-if="m.metadata?.trace_id" size="small" type="warning" effect="plain">
                    trace: {{ String(m.metadata.trace_id).slice(0, 8) }}
                  </el-tag>

                  <el-tag
                    v-if="m.metadata?.data?.result_status"
                    size="small"
                    :type="resultStatusTagType(m.metadata?.data?.result_status)"
                    effect="plain"
                  >
                    {{ resultStatusLabel(m.metadata?.data?.result_status) }}
                  </el-tag>
                </div>

                <div class="msg-bubble">
                  <div class="msg-text">{{ m.content }}</div>

                  <div v-if="m.metadata?.data?.message" class="data-hint">
                    <el-alert
                      :title="String(m.metadata.data.message)"
                      :type="resultStatusAlertType(m.metadata.data.result_status)"
                      :closable="false"
                      show-icon
                    />
                  </div>

                  <div v-if="m.metadata?.data?.payload" class="data-block">
                    <pre class="json-pre">{{ pretty(m.metadata.data.payload) }}</pre>
                  </div>

                  <div v-if="Array.isArray(m.metadata?.actions) && m.metadata.actions.length" class="action-wrap">
                    <div class="action-title">建议动作</div>
                    <div class="action-list">
                      <el-button
                        v-for="(a, idx) in m.metadata.actions"
                        :key="`${m.id}_${idx}`"
                        size="small"
                        @click="handleAction(a)"
                      >
                        {{ a.label || a.type }}
                      </el-button>
                    </div>
                  </div>

                  <div v-if="m.metadata?.error" class="err-wrap">
                    <el-alert
                      :title="m.metadata.error.message || '处理失败'"
                      type="error"
                      :closable="false"
                      show-icon
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="chat-input-wrap">
          <el-input
            v-model="inputText"
            type="textarea"
            :rows="3"
            resize="none"
            placeholder="输入示例：查订单 10086 / 查看当前材料状态 / OCR任务状态 / 太平洋报价"
            @keydown.enter.exact.prevent="handleSend"
          />
          <div class="input-actions">
            <div class="input-tip">
              <span>Shift + Enter 换行；Enter 发送</span>
            </div>
            <div class="btns">
              <el-button @click="inputText = ''" :disabled="sendingSafe">清空</el-button>
              <el-button type="primary" :loading="sendingSafe" @click="handleSend">发送</el-button>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from "vue";
import { ElMessage, ElMessageBox, ElNotification } from "element-plus";

/**
 * ✅ 关键修复：useAiAssistantSession 采用 named export
 * - 生产构建期 Rollup 会严格检查 export/import 契约
 */
import { useAiAssistantSession } from "./composables/useAiAssistantSession";
import { useAiUploadSlots } from "./composables/useAiUploadSlots";

const chatBodyRef = ref(null);
const inputText = ref("");

const s = (typeof useAiAssistantSession === "function" ? useAiAssistantSession() : {}) || {};
const loadingInit = s.loadingInit ?? ref(false);
const loadingSessions = s.loadingSessions ?? ref(false);
const loadingHistory = s.loadingHistory ?? ref(false);
const sending = s.sending ?? ref(false);
const sessions = s.sessions ?? ref([]);
const currentSessionId = s.currentSessionId ?? ref("");
const currentSessionTitle = s.currentSessionTitle ?? ref("新会话");
const messages = s.messages ?? ref([]);
const processHint = s.processHint ?? ref("");

const ensureInit = s.ensureInit ?? (async () => {});
const refreshSessions = s.refreshSessions ?? (async () => {});
const loadHistory = s.loadHistory ?? (async () => {});
const switchSession = s.switchSession ?? (async () => {});
const createNewSessionLocal = s.createNewSessionLocal ?? (() => {});
const removeSession = s.removeSession ?? (async () => {});
const sendMessage = s.sendMessage ?? (async () => {});

const orderIdSafe = computed(() => {
  const arr = Array.isArray(messages.value) ? messages.value : [];
  for (let i = arr.length - 1; i >= 0; i--) {
    const m = arr[i];
    const oid = m?.metadata?.data?.entities?.order_id ?? m?.metadata?.entities?.order_id ?? null;
    const n = Number(oid);
    if (Number.isInteger(n) && n > 0) return n;
  }
  return null;
});

const up = useAiUploadSlots();
const {
  AI_IMAGE_SLOTS,
  uploadMode,
  persistUploadMode,
  slotFiles,
  uploadingCount,
  onFileChange,
  resetAllSlots,
  previewUrls,
  onExceedWarn,
  slotUploadedCount,
  slotUploadingCount,
  collectUploadedImages,
  bindUploadedImagesToOrder,
  destroy: destroyUploads,
} = up;

const canBind = computed(() => {
  if (!orderIdSafe.value) return false;
  if (uploadingCount.value > 0) return false;
  return collectUploadedImages().length > 0;
});

async function handleBindToOrder() {
  if (!orderIdSafe.value) {
    ElMessage.warning("当前会话未识别到 order_id，请先通过指令创建/选择订单");
    return;
  }
  if (uploadingCount.value > 0) {
    ElMessage.info("还有图片正在上传，请稍后再绑定");
    return;
  }
  const imgs = collectUploadedImages();
  if (!imgs.length) {
    ElMessage.warning("请先上传图片");
    return;
  }

  try {
    await bindUploadedImagesToOrder(orderIdSafe.value, { clearRelated: false, triggerOcr: true });
  } catch (e) {
    const msg = e?.response?.data?.detail || e?.message || "绑定失败，请稍后重试";
    ElNotification.error({ title: "绑定失败", message: String(msg), duration: 4000 });
  }
}

const currentSessionTitleSafe = computed(() => String(currentSessionTitle.value || "新会话"));
const currentSessionIdSafe = computed(() => String(currentSessionId.value || ""));

const loadingInitSafe = computed(() => !!loadingInit.value);
const loadingSessionsSafe = computed(() => !!loadingSessions.value);
const loadingHistorySafe = computed(() => !!loadingHistory.value);
const sendingSafe = computed(() => !!sending.value);

const sessionsSafe = computed(() => (Array.isArray(sessions.value) ? sessions.value : []));
const messagesSafe = computed(() => (Array.isArray(messages.value) ? messages.value : []));
const processHintSafe = computed(() => String(processHint.value || ""));

async function refreshSessionsSafe() {
  try {
    await refreshSessions();
  } catch {}
}

function createNewSessionLocalSafe() {
  try {
    createNewSessionLocal();
  } catch {}
}

function roleShort(role) {
  const r = String(role || "").toLowerCase();
  if (r === "user") return "我";
  if (r === "assistant") return "报";
  return "系";
}

function roleLabel(role) {
  const r = String(role || "").toLowerCase();
  if (r === "user") return "用户";
  if (r === "assistant") return "报价助手";
  return "系统";
}

function statusTagType(status) {
  const s = String(status || "").toLowerCase();
  if (s === "success") return "success";
  if (s === "streaming" || s === "sending") return "warning";
  if (s === "error" || s === "failed") return "danger";
  return "info";
}

function resultStatusTagType(rs) {
  const s = String(rs || "").toLowerCase();
  if (s === "success") return "success";
  if (s === "not_ready") return "warning";
  if (s === "need_more_info") return "info";
  if (s === "empty") return "info";
  if (s === "invalid_command") return "danger";
  if (s === "failed") return "danger";
  return "info";
}

function resultStatusAlertType(rs) {
  const s = String(rs || "").toLowerCase();
  if (s === "success") return "success";
  if (s === "not_ready") return "warning";
  if (s === "need_more_info") return "info";
  if (s === "empty") return "info";
  if (s === "invalid_command") return "error";
  if (s === "failed") return "error";
  return "info";
}

function resultStatusLabel(rs) {
  const s = String(rs || "").toLowerCase();
  if (s === "success") return "成功";
  if (s === "empty") return "无数据";
  if (s === "invalid_command") return "指令错误";
  if (s === "need_more_info") return "需要补充";
  if (s === "not_ready") return "未就绪";
  if (s === "failed") return "失败";
  return s || "unknown";
}

function formatTime(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

function pretty(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

async function scrollToBottom() {
  await nextTick();
  const el = chatBodyRef.value;
  if (!el) return;
  try {
    el.scrollTop = el.scrollHeight;
  } catch {}
}

watch(
  () => messagesSafe.value.length,
  async () => {
    await scrollToBottom();
  }
);

async function handleSend() {
  const text = String(inputText.value || "").trim();
  if (!text) {
    ElMessage.warning("请输入内容");
    return;
  }
  const sendingText = text;
  inputText.value = "";

  await sendMessage(sendingText, {
    useStream: true,
    pageContext: {
      module: "quote_assistant_workbench",
      page: "AiAssistantWorkbench",
    },
  });
}

async function reloadHistory() {
  if (!currentSessionIdSafe.value) return;
  await loadHistory(currentSessionIdSafe.value);
}

async function handleSwitchSession(sessionId) {
  await switchSession(sessionId);
}

async function handleDeleteSession(sessionId) {
  try {
    await ElMessageBox.confirm("确认删除该会话？此操作仅删除报价助手内存会话记录。", "删除会话", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }
  await removeSession(sessionId);
}

function handleAction(action) {
  const a = action || {};
  if (a.type === "suggest" && a.label) {
    inputText.value = a.label;
    return;
  }
  if (a.type === "navigate" && a.target) {
    ElMessage.info(`导航动作预留：${a.target}`);
    return;
  }
  ElMessage.info("动作已识别（预留）");
}

onMounted(async () => {
  await ensureInit();
  await scrollToBottom();
});

onBeforeUnmount(() => {
  try {
    destroyUploads?.();
  } catch {}
});
</script>

<style scoped>
/* 你的原样式保持不动 */
.ai-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.head-card,
.side-card,
.chat-card {
  border-radius: 12px;
}

.head-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.page-title {
  margin: 0;
  font-size: 18px;
}

.guide-box {
  margin-top: 10px;
  border: 1px solid #f5c06a;
  background: #fff8e8;
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: inset 0 0 0 1px rgba(245, 192, 106, 0.12);
}

.guide-title {
  font-size: 12px;
  font-weight: 700;
  color: #b26a00;
  margin-bottom: 4px;
}

.guide-text {
  font-size: 13px;
  line-height: 1.55;
  color: #8a5300;
}

.guide-text b {
  color: #a04b00;
}

.guide-sub {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(138, 83, 0, 0.85);
}

.head-meta {
  margin-top: 8px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 13px;
  color: rgba(31, 42, 68, 0.8);
}

.head-actions {
  display: flex;
  gap: 8px;
}

.top-hint {
  margin-top: 10px;
}

.main-grid {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 12px;
  min-height: calc(100vh - 220px);
}

.side-card :deep(.el-card__body),
.chat-card :deep(.el-card__body) {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.side-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.chat-body {
  flex: 1 1 auto;
  min-height: 360px;
  max-height: calc(100vh - 360px);
  overflow: auto;
  padding-right: 4px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.empty-wrap {
  padding: 16px 8px;
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.session-item {
  border: 1px solid rgba(60, 60, 60, 0.1);
  border-radius: 10px;
  padding: 10px;
  background: #fff;
  cursor: pointer;
}

.session-item.active {
  border-color: rgba(64, 158, 255, 0.45);
  background: rgba(64, 158, 255, 0.04);
}

.s-title {
  font-weight: 700;
  font-size: 13px;
  color: rgba(31, 42, 68, 0.95);
}

.s-preview {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(31, 42, 68, 0.7);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.s-foot {
  margin-top: 6px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: rgba(31, 42, 68, 0.55);
}

.s-actions {
  margin-top: 4px;
  text-align: right;
}

/* 上传区域 */
.upload-box {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed rgba(60, 60, 60, 0.12);
}

.upload-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.upload-title {
  font-size: 13px;
  font-weight: 800;
  color: rgba(31, 42, 68, 0.85);
}

.upload-slots {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.upload-slot {
  padding-bottom: 10px;
  border-bottom: 1px dashed rgba(60, 60, 60, 0.08);
}

.upload-slot-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
}

.upload-slot-meta {
  margin-left: auto;
  font-size: 12px;
  color: rgba(31, 42, 68, 0.55);
}

.uploader {
  width: 100%;
}

.upload-tip {
  padding: 8px 0;
  text-align: center;
}

.upload-strong {
  font-weight: 700;
  font-size: 12px;
}

.upload-weak {
  font-size: 12px;
  color: rgba(31, 42, 68, 0.6);
  margin-top: 2px;
}

.slot-preview {
  display: flex;
  flex-wrap: wrap;
  margin-top: 8px;
}

.upload-actions {
  margin: 10px 0;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.msg-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.msg-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.msg-avatar {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.msg-user .msg-avatar {
  background: #409eff;
}
.msg-assistant .msg-avatar {
  background: #67c23a;
}
.msg-system .msg-avatar {
  background: #909399;
}

.msg-content {
  flex: 1 1 auto;
  min-width: 0;
}

.msg-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
  font-size: 12px;
  color: rgba(31, 42, 68, 0.68);
}

.msg-role {
  font-weight: 700;
  color: rgba(31, 42, 68, 0.92);
}

.msg-bubble {
  border: 1px solid rgba(60, 60, 60, 0.1);
  border-radius: 10px;
  background: #fff;
  padding: 10px;
}

.msg-user .msg-bubble {
  background: rgba(64, 158, 255, 0.06);
  border-color: rgba(64, 158, 255, 0.2);
}

.msg-system .msg-bubble {
  background: rgba(144, 147, 153, 0.05);
}

.msg-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(31, 42, 68, 0.95);
}

.data-hint {
  margin-top: 10px;
}

.data-block {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed rgba(60, 60, 60, 0.1);
}

.json-pre {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.45;
  background: rgba(31, 42, 68, 0.04);
  border: 1px solid rgba(60, 60, 60, 0.08);
  border-radius: 10px;
  padding: 8px;
  margin: 0;
}

.action-wrap {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed rgba(60, 60, 60, 0.1);
}

.action-title {
  font-size: 12px;
  font-weight: 700;
  color: rgba(31, 42, 68, 0.72);
  margin-bottom: 6px;
}

.action-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.err-wrap {
  margin-top: 8px;
}

.chat-input-wrap {
  border-top: 1px solid rgba(60, 60, 60, 0.08);
  margin-top: 10px;
  padding-top: 10px;
}

.input-actions {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.input-tip {
  font-size: 12px;
  color: rgba(31, 42, 68, 0.55);
}

.btns {
  display: flex;
  gap: 8px;
}

@media (max-width: 960px) {
  .main-grid {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .chat-body {
    max-height: 420px;
  }

  .guide-box {
    padding: 10px;
  }
}
</style>