<!-- src/views/orders/OrderImport.vue -->
<template>
  <div class="page">
    <div class="page-header">
      <h2>导入 / 创建订单</h2>

      <div class="page-header-right">
        <el-button size="small" @click="goBack">返回</el-button>

        <el-badge :value="pendingCount" :hidden="pendingCount === 0" :max="99" class="task-badge">
          <el-button class="task-btn" type="primary" @click="taskDrawer = true">
            <el-icon class="task-icon">
              <Tickets />
            </el-icon>
            图片识别任务
          </el-button>
        </el-badge>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="top-tabs" @tab-change="onTabChange">
      <!-- ================= 导入订单 ================= -->
      <el-tab-pane label="导入订单" name="import">
        <el-card shadow="never" class="block-card">
          <template #header>
            <div class="card-title">
              <span>创建订单（拖拽上传：MD5 去重 + 直传 BOS）</span>

              <div class="card-title-right">
                <!-- ✅ 上传模式：智能/直传/稳定（兼容 VPN） -->
                <div class="upload-mode">
                  <span class="upload-mode-label">上传模式</span>
                  <el-select v-model="uploadMode" size="small" style="width: 160px" @change="persistUploadMode">
                    <el-option label="智能（推荐）" value="smart" />
                    <el-option label="直传（更快）" value="direct" />
                    <el-option label="稳定（兼容VPN）" value="stable" />
                  </el-select>
                </div>

                <el-button size="small" @click="resetImages" :disabled="submitting || uploadingCount > 0">
                  清空图片
                </el-button>

                <el-button
                  size="small"
                  type="primary"
                  :loading="submitting"
                  :disabled="uploadingCount > 0 || !canSubmitImport"
                  @click="submitImport"
                >
                  提交 OCR 导入
                </el-button>
              </div>
            </div>
          </template>

          <!-- 顶部筛选（✅ 必选：客户/渠道） -->
          <div class="filters">
            <el-form
              ref="filtersFormRef"
              :model="filters"
              :rules="filtersRules"
              label-width="80px"
              class="filters-form"
            >
              <el-row :gutter="12">
                <el-col :span="12">
                  <el-form-item label="客户群" prop="customer_group_id">
                    <el-select
                      v-model="filters.customer_group_id"
                      clearable
                      filterable
                      placeholder="必选"
                      style="width: 100%"
                      :loading="groupsLoading"
                      :disabled="groupsLoading"
                    >
                      <el-option
                        v-for="g in customerGroups"
                        :key="String(g.id)"
                        :label="customerGroupLabel(g)"
                        :value="g.id"
                      />
                    </el-select>
                  </el-form-item>
                </el-col>

                <el-col :span="12">
                  <el-form-item label="渠道群" prop="channel_group_id">
                    <el-select
                      v-model="filters.channel_group_id"
                      clearable
                      filterable
                      placeholder="必选"
                      style="width: 100%"
                      :loading="groupsLoading"
                      :disabled="groupsLoading"
                    >
                      <el-option
                        v-for="g in channelGroups"
                        :key="String(g.id)"
                        :label="channelGroupLabel(g)"
                        :value="g.id"
                      />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
            </el-form>
          </div>

          <!-- 上传中的明显提示条 -->
          <el-alert
            v-if="uploadingCount > 0"
            class="upload-alert"
            type="warning"
            :closable="false"
            show-icon
            title="正在上传"
            :description="`正在上传 ${uploadingCount} 个文件…（全部上传完成后才能提交）`"
          />

          <!-- 分卡证上传 -->
          <div class="upload-grid">
            <div v-for="slot in IMAGE_SLOTS" :key="slot.key" class="slot-card">
              <div class="slot-head">
                <div class="slot-name">{{ slot.label }}</div>
                <div class="slot-tip">
                  <el-tag size="small" type="info" effect="plain">
                    {{ slot.multiple ? "可多张" : "单张" }}
                  </el-tag>
                </div>
              </div>

              <!-- ✅ 单图槽：已有文件则锁定（必须先删除） -->
              <el-upload
                v-if="!slot.multiple"
                drag
                :auto-upload="false"
                :multiple="false"
                :limit="1"
                :show-file-list="false"
                :file-list="slotFiles[slot.key]"
                :disabled="isSingleSlotLocked(slot.key) || submitting || uploadingCount > 0"
                :on-change="(file) => onFileChange(slot.key, file)"
                :on-exceed="() => onExceedWarn(slot.key)"
                accept="image/*"
                class="upload-box upload-one"
              >
                <template #default>
                  <div v-if="firstFile(slot.key)" class="one-wrap">
                    <el-image
                      :src="firstFile(slot.key)?.url"
                      :preview-src-list="previewUrls(slot.key)"
                      fit="contain"
                      class="one-img"
                    />
                    <div class="one-mask">
                      <div class="one-mask-text">已上传，删除后可重新上传</div>
                    </div>
                  </div>

                  <div v-else class="upload-empty">
                    <div class="empty-center">
                      <div class="empty-title">拖拽图片到此处</div>
                      <div class="empty-sub">或点击选择文件</div>
                    </div>
                  </div>
                </template>
              </el-upload>

              <!-- ✅ 多图槽 -->
              <template v-else>
                <el-upload
                  drag
                  :auto-upload="false"
                  :multiple="true"
                  :limit="20"
                  :show-file-list="false"
                  :file-list="slotFiles[slot.key]"
                  :disabled="submitting || uploadingCount > 0"
                  :on-change="(file) => onFileChange(slot.key, file)"
                  accept="image/*"
                  class="upload-box upload-multi"
                >
                  <div class="upload-empty">
                    <div class="empty-center">
                      <div class="empty-title">拖拽图片到此处</div>
                      <div class="empty-sub">或点击选择文件（可多张）</div>
                    </div>
                  </div>
                </el-upload>

                <div v-if="(slotFiles[slot.key] || []).length" class="preview-wall">
                  <div v-for="f in slotFiles[slot.key]" :key="f.uid" class="preview-item">
                    <el-image
                      v-if="f.url"
                      :src="f.url"
                      :preview-src-list="previewUrls(slot.key)"
                      fit="cover"
                      class="preview-img"
                    />
                    <div v-else class="preview-img preview-empty"></div>

                    <div class="preview-meta">
                      <div class="preview-name" :title="f.name">{{ f.name }}</div>

                      <div class="preview-status">
                        <el-tag v-if="uploadState[f.uid]?.status === 'uploading'" size="small" type="warning">
                          上传中
                        </el-tag>
                        <el-tag v-else-if="uploadState[f.uid]?.status === 'done'" size="small" type="success">
                          已就绪
                        </el-tag>
                        <el-tag v-else-if="uploadState[f.uid]?.status === 'error'" size="small" type="danger">
                          失败
                        </el-tag>
                        <el-tag v-else size="small" type="info" effect="plain">
                          待上传
                        </el-tag>
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <!-- ✅ 上传提示：放在卡槽下方 -->
              <div v-if="slotUploadingCount(slot.key) > 0" class="uploading-tip">
                正在上传：{{ slotUploadingCount(slot.key) }} 个文件…（上传完成后才能提交）
              </div>

              <!-- ✅ 底部状态：已就绪 + 亮绿色实体球；移除按钮在右侧 -->
              <div class="slot-foot">
                <div class="slot-foot-left">
                  <template v-if="slotUploadedCount(slot.key) > 0">
                    <span>已就绪：{{ slotUploadedCount(slot.key) }} 张</span>
                    <span class="ready-dot" aria-hidden="true"></span>
                  </template>
                  <span v-else class="muted">未上传</span>
                </div>

                <div class="slot-foot-right">
                  <el-button
                    v-if="(slotFiles[slot.key] || []).length"
                    size="small"
                    type="danger"
                    link
                    class="slot-remove"
                    :disabled="submitting || uploadingCount > 0"
                    @click="clearSlot(slot.key)"
                  >
                    移除
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 图片识别任务抽屉 -->
        <el-drawer v-model="taskDrawer" direction="rtl" size="60%" :with-header="true">
          <template #header>
            <div class="drawer-header">
              <div class="drawer-title">图片识别任务列表</div>
              <div class="drawer-actions">
                <el-button size="small" :loading="loadingTasks" @click="loadTasks">刷新</el-button>
                <el-button size="small" @click="goUnfinished">去未完成订单</el-button>
              </div>
            </div>
          </template>

          <div class="table-scroll">
            <el-table :data="tasks" border stripe v-loading="loadingTasks" height="calc(100vh - 140px)">
            <el-table-column prop="id" label="任务ID" width="90" />
            <el-table-column prop="order_id" label="订单ID" width="90" />
            <el-table-column label="状态" width="120">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag>
              </template>
            </el-table-column>

            <el-table-column label="进度" width="180">
              <template #default="{ row }">
                <el-progress
                  :percentage="row.progress || 0"
                  :status="row.status === 'failed' ? 'exception' : row.status === 'finished' ? 'success' : 'active'"
                />
              </template>
            </el-table-column>

            <el-table-column label="错误信息">
              <template #default="{ row }">
                <span
                  v-if="row?.error_message"
                  class="task-error"
                  @click="showTaskError(row)"
                  :title="hasChinese(row.error_message) ? '' : '点击查看详情'"
                >
                  {{ formatTaskError(row.error_message) }}
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>

            <el-table-column label="查看" width="140">
              <template #default="{ row }">
                <el-button size="small" @click="goOrder(row.order_id)" :disabled="!row.order_id">详情</el-button>
              </template>
            </el-table-column>
            </el-table>
          </div>
        </el-drawer>
      </el-tab-pane>

      <!-- ================= 手动新建 ================= -->
      <el-tab-pane label="手动新建" name="manual">
        <OrderCreateForm :embedded="true" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox, ElNotification } from "element-plus";
import { Tickets } from "@element-plus/icons-vue";

import http from "../../api/http";
import { createOrderDraft, finalizeOrderUpload, getChannelGroups, getCustomerGroups, uploadOrderImageProxy } from "../../api/orders";
import OrderCreateForm from "./OrderCreateForm.vue";
import { uploadOrReuseByMd5 } from "../../utils/bosUpload";
import { preprocessImageForUpload } from "../../utils/imagePreprocess";

const router = useRouter();
const route = useRoute();

const activeTab = ref("import");

function onTabChange() {
  router.replace({ path: "/orders/import", query: { tab: activeTab.value } });
}

onMounted(() => {
  const tab = route.query?.tab;
  if (tab === "manual" || tab === "import") activeTab.value = tab;
});

/** ====================== 回退逻辑（带 from） ====================== */
function goBack() {
  const from = route.query?.from;
  if (typeof from === "string" && from.startsWith("/")) {
    router.push(from);
    return;
  }
  if (window.history.length > 1) {
    router.back();
    return;
  }
  router.push({ path: "/orders/all" });
}

/** ====================== 上传模式（智能/直传/稳定） ====================== */
const UPLOAD_MODE_KEY = "order_import_upload_mode";
const uploadMode = ref("smart");

function loadUploadMode() {
  const v = localStorage.getItem(UPLOAD_MODE_KEY);
  if (v === "smart" || v === "direct" || v === "stable") uploadMode.value = v;
}

function persistUploadMode() {
  try {
    localStorage.setItem(UPLOAD_MODE_KEY, uploadMode.value);
  } catch {
    // ignore
  }
}

loadUploadMode();

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
  if (low.includes("cors")) return "跨域受限或网络拦截，请切换网络后重试";

  if (status === 401) return "登录状态已失效，请重新登录";
  if (status === 403) return "无权限执行该操作";
  if (status >= 500) return "服务器异常，请稍后重试";
  if (status) return fallback;

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
    m.includes("hint=浏览器请求可能走了本机代理") ||
    m.includes("127.0.0.1:7890")
  );
}

async function suggestSwitchToStableOnce() {
  try {
    await ElMessageBox.confirm(
      `上传可能被当前网络环境拦截（常见于 VPN/代理/公司网关）。\n\n建议切换到【稳定模式上传】继续，无需任何设置。`,
      "上传失败（网络拦截）",
      {
        confirmButtonText: "切换为稳定模式",
        cancelButtonText: "继续直传重试",
        type: "warning",
        center: true,
        distinguishCancelAndClose: true,
      }
    );
    uploadMode.value = "stable";
    persistUploadMode();
    return true;
  } catch {
    return false;
  }
}

/** ====================== 渠道/客户筛选（✅ 必选） ====================== */
const filtersFormRef = ref(null);

const filters = ref({
  customer_group_id: null,
  channel_group_id: null,
});

const filtersRules = {
  customer_group_id: [{ required: true, message: "客户必选", trigger: "change" }],
  channel_group_id: [{ required: true, message: "渠道必选", trigger: "change" }],
};

const canSubmitImport = computed(() => {
  return Boolean(filters.value.customer_group_id) && Boolean(filters.value.channel_group_id);
});

const customerGroups = ref([]);
const channelGroups = ref([]);
const groupsLoading = ref(false);

/** ====================== 下拉展示：代码 + 名称（同时可模糊搜索） ====================== */
function _pickStr(obj, keys = []) {
  if (!obj || typeof obj !== "object") return "";
  for (const k of keys) {
    const v = obj?.[k];
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

// ✅ 这里改成 “code - name” 形式（中间更开一点）
const CODE_NAME_SEP = " - ";

function _formatCodeNameLabel(code, name, fallback = "") {
  const c = String(code || "").trim();
  const n = String(name || "").trim();
  if (c && n) return `${c}${CODE_NAME_SEP}${n}`;
  if (c) return c;
  if (n) return n;
  return String(fallback || "").trim() || "-";
}

function customerGroupLabel(g) {
  const code = _pickStr(g, ["customer_code", "customerCode", "code", "group_code", "groupCode"]);
  const name = _pickStr(g, ["customer_name", "customerName", "name", "group_name", "groupName"]);
  const fallback = _pickStr(g, ["group_name", "groupName", "customer_name", "customerName"]) || (g?.id != null ? String(g.id) : "");
  return _formatCodeNameLabel(code, name, fallback);
}

function channelGroupLabel(g) {
  const code = _pickStr(g, ["channel_code", "channelCode", "code", "group_code", "groupCode"]);
  const name = _pickStr(g, ["channel_name", "channelName", "name", "group_name", "groupName"]);
  const fallback = _pickStr(g, ["group_name", "groupName", "channel_name", "channelName"]) || (g?.id != null ? String(g.id) : "");
  return _formatCodeNameLabel(code, name, fallback);
}

async function loadGroups() {
  groupsLoading.value = true;
  try {
    const [cg, ch] = await Promise.all([getCustomerGroups(), getChannelGroups()]);
    customerGroups.value = cg?.data?.items || cg?.data || [];
    channelGroups.value = ch?.data?.items || ch?.data || [];
  } catch (e) {
    console.error(e);
    ElNotification.error({
      title: "加载失败",
      message: normalizeErrMsg(e, "加载客户/渠道群失败，请稍后重试"),
      duration: 4000,
    });
  } finally {
    groupsLoading.value = false;
  }
}

/** ====================== 上传槽位 ====================== */
const IMAGE_SLOTS = [
  { key: "vehicle_cert", label: "合格证", multiple: false },
  { key: "idcard_front", label: "身份证正面", multiple: false },
  { key: "idcard_back", label: "身份证反面", multiple: false },
  { key: "driving_license_main", label: "行驶证主页", multiple: false },
  { key: "driving_license_sub", label: "行驶证副页", multiple: false },
  { key: "related", label: "相关图片(多张)", multiple: true },
];

const slotFiles = ref(
  IMAGE_SLOTS.reduce((acc, s) => {
    acc[s.key] = [];
    return acc;
  }, {})
);

const submitting = ref(false);

const uploadedMap = ref({});
const uploadState = ref({});
const uploadingCount = ref(0);

const localPreviewUrlMap = ref({});

/** ====================== STS 缓存（直传用） ====================== */
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
  if (cachedSts && cachedStsExpireAt && now + 120_000 < cachedStsExpireAt) return cachedSts;

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

/** ====================== helpers ====================== */
function isMultipleSlot(slotKey) {
  const s = IMAGE_SLOTS.find((x) => x.key === slotKey);
  return !!s?.multiple;
}

function slotLabel(slotKey) {
  return IMAGE_SLOTS.find((s) => s.key === slotKey)?.label || slotKey;
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

function _ensureLocalPreview(file) {
  const raw = file?.raw;
  if (!raw) return;
  if (!file.url) {
    const u = URL.createObjectURL(raw);
    file.url = u;
    localPreviewUrlMap.value[file.uid] = u;
  }
}

function _replaceFileRawAndPreview(fileObj, newRaw) {
  if (!fileObj || !newRaw) return;
  const uid = fileObj.uid;

  const oldUrl = uid ? localPreviewUrlMap.value[uid] : fileObj.url;
  if (oldUrl) {
    try {
      URL.revokeObjectURL(oldUrl);
    } catch {
      // ignore
    }
    if (uid) delete localPreviewUrlMap.value[uid];
  }

  const u = URL.createObjectURL(newRaw);
  fileObj.raw = newRaw;
  fileObj.url = u;
  if (uid) localPreviewUrlMap.value[uid] = u;
}

function clearSlot(slotKey) {
  const list = slotFiles.value[slotKey] || [];
  for (const f of list) {
    const uid = f?.uid;
    if (!uid) continue;

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
  slotFiles.value[slotKey] = [];
}

/** ====================== Upload handlers ====================== */
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
      console.error(e);
      ElNotification.error({
        title: "上传失败",
        message: normalizeErrMsg(e, "上传失败，请稍后重试"),
        duration: 5000,
      });
    });
    return;
  }

  const list = slotFiles.value[slotKey] || [];
  if (!list.find((x) => x.uid === file.uid)) list.push(file);
  slotFiles.value[slotKey] = list;

  _ensureLocalPreview(file);

  startUpload(slotKey, file).catch((e) => {
    console.error(e);
    ElNotification.error({
      title: "上传失败",
      message: normalizeErrMsg(e, "上传失败，请稍后重试"),
      duration: 5000,
    });
  });
}

async function startUpload(slotKey, file) {
  const raw0 = file?.raw;
  if (!raw0) return;

  if (uploadedMap.value[file.uid]) return;

  uploadingCount.value += 1;
  uploadState.value[file.uid] = { status: "uploading" };

  try {
    // ✅ 统一：上传前预处理（>2MB触发，规则在 imagePreprocess 内）
    let raw = raw0;
    try {
      const pre = await preprocessImageForUpload({ file: raw0, slotKey });
      if (pre?.file) {
        raw = pre.file;
        _replaceFileRawAndPreview(file, raw);
        if (pre?.note) console.info("[image-preprocess]", pre.note);
      }
    } catch {
      raw = raw0;
    }

    // ✅ 稳定模式：走后端代传
    if (uploadMode.value === "stable") {
      const resp = await uploadOrderImageProxy({ slot_key: slotKey, file: raw });
      const meta = resp?.data;

      uploadedMap.value[file.uid] = {
        slot_key: slotKey,
        md5: meta?.md5,
        storage_key: meta?.storage_key,
        etag: meta?.etag || "",
        size: meta?.size || raw.size || 0,
        content_type: meta?.content_type || raw.type || "application/octet-stream",
        original_name: meta?.original_name || raw.name || "file",
        preview_url: meta?.preview_url || "",
      };

      uploadState.value[file.uid] = { status: "done" };
      return;
    }

    // ✅ 直传 / 智能：直传 BOS（MD5 去重）
    const sts = await ensureSts();
    if (!bosHost.value) throw new Error("上传配置缺失：bosHost 为空");

    const meta = await uploadOrReuseByMd5({
      bosHost: bosHost.value,
      slotKey,
      file: raw,
      sts,
    });

    uploadedMap.value[file.uid] = {
      slot_key: slotKey,
      ...meta,
      size: meta?.size || raw.size || 0,
      content_type: meta?.content_type || raw.type || "application/octet-stream",
      original_name: meta?.original_name || raw.name || "file",
    };

    uploadState.value[file.uid] = { status: "done" };
  } catch (e) {
    if (uploadMode.value === "smart" && isLikelyNetworkBlocked(e)) {
      const switched = await suggestSwitchToStableOnce();
      if (switched) {
        try {
          const rawRetry = file?.raw || raw0;
          const resp = await uploadOrderImageProxy({ slot_key: slotKey, file: rawRetry });
          const meta = resp?.data;

          uploadedMap.value[file.uid] = {
            slot_key: slotKey,
            md5: meta?.md5,
            storage_key: meta?.storage_key,
            etag: meta?.etag || "",
            size: meta?.size || rawRetry.size || 0,
            content_type: meta?.content_type || rawRetry.type || "application/octet-stream",
            original_name: meta?.original_name || rawRetry.name || "file",
            preview_url: meta?.preview_url || "",
          };

          uploadState.value[file.uid] = { status: "done" };
          return;
        } catch (e2) {
          uploadState.value[file.uid] = {
            status: "error",
            msg: normalizeErrMsg(e2, "上传失败，请稍后重试"),
          };
          throw e2;
        }
      }
    }

    uploadState.value[file.uid] = {
      status: "error",
      msg: normalizeErrMsg(e, "上传失败，请稍后重试"),
    };
    throw e;
  } finally {
    uploadingCount.value -= 1;
  }
}

function slotUploadedCount(slotKey) {
  const list = slotFiles.value[slotKey] || [];
  let cnt = 0;
  for (const f of list) {
    if (uploadedMap.value[f.uid]) cnt += 1;
  }
  return cnt;
}

function slotUploadingCount(slotKey) {
  const list = slotFiles.value[slotKey] || [];
  let cnt = 0;
  for (const f of list) {
    if (uploadState.value[f.uid]?.status === "uploading") cnt += 1;
  }
  return cnt;
}

const hasAnyImage = computed(() => {
  return IMAGE_SLOTS.some((s) => (slotFiles.value[s.key] || []).length > 0);
});

function collectFinalizeImages() {
  const out = [];
  for (const slot of IMAGE_SLOTS) {
    const list = slotFiles.value[slot.key] || [];
    for (const f of list) {
      const meta = uploadedMap.value[f.uid];
      if (meta) out.push(meta);
    }
  }
  return out;
}

function resetImages() {
  for (const uid of Object.keys(localPreviewUrlMap.value)) {
    try {
      URL.revokeObjectURL(localPreviewUrlMap.value[uid]);
    } catch {
      // ignore
    }
  }
  localPreviewUrlMap.value = {};

  slotFiles.value = IMAGE_SLOTS.reduce((acc, s) => {
    acc[s.key] = [];
    return acc;
  }, {});
  uploadedMap.value = {};
  uploadState.value = {};
}

function previewUrls(slotKey) {
  const list = slotFiles.value[slotKey] || [];
  return list.map((f) => f.url).filter(Boolean);
}

/** ====================== 提交导入（✅ 直接提交，无二次确认弹窗） ====================== */
async function submitImport() {
  if (!canSubmitImport.value) {
    ElMessage.warning("客户和渠道为必选项，请先选择后再提交");
    try {
      await filtersFormRef.value?.validate?.();
    } catch {
      // ignore
    }
    return;
  }

  if (!hasAnyImage.value) {
    ElMessage.warning("请至少上传一张图片");
    return;
  }
  if (uploadingCount.value > 0) {
    ElMessage.warning("还有文件在上传中，请稍后再提交");
    return;
  }

  const images = collectFinalizeImages();
  if (!images.length) {
    ElMessage.warning("未检测到已上传文件（可能上传失败）");
    return;
  }

  submitting.value = true;
  try {
    const dynamicData = {};

    const draftResp = await createOrderDraft({
      module: "order",
      dynamic_data: dynamicData,
      customer_group_id: filters.value.customer_group_id ?? undefined,
      channel_group_id: filters.value.channel_group_id ?? undefined,
    });

    const draft = draftResp?.data?.data ?? draftResp?.data ?? draftResp;
    const orderId = draft?.order_id;
    if (!orderId) throw new Error("创建订单失败：未获取到订单ID");

    await finalizeOrderUpload({
      order_id: orderId,
      images,
      dynamic_data: dynamicData,
      customer_group_id: filters.value.customer_group_id ?? undefined,
      channel_group_id: filters.value.channel_group_id ?? undefined,
    });

    resetImages();
    await loadTasks();

    ElMessage.success(`订单 ${orderId} 已创建，OCR 识别任务已提交`);
  } catch (e) {
    console.error(e);
    ElNotification.error({
      title: "提交失败",
      message: normalizeErrMsg(e, "提交失败，请稍后重试"),
      duration: 5000,
    });
  } finally {
    submitting.value = false;
  }
}

/** ====================== 任务抽屉 ====================== */
const taskDrawer = ref(false);
const tasks = ref([]);
const loadingTasks = ref(false);

async function loadTasks() {
  if (loadingTasks.value) return;
  loadingTasks.value = true;
  try {
    const resp = await http.get("/orders/ocr-tasks", { params: { limit: 50 } });
    const data = resp?.data;
    tasks.value = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  } catch (e) {
    console.error(e);
    ElNotification.error({
      title: "加载任务失败",
      message: normalizeErrMsg(e, "加载失败，请稍后重试"),
      duration: 4000,
    });
  } finally {
    loadingTasks.value = false;
  }
}

const pendingCount = computed(() => {
  const list = tasks.value || [];
  return list.filter((t) => t?.status === "pending" || t?.status === "processing").length;
});

function formatTaskError(msg) {
  const s = String(msg || "").trim();
  if (!s) return "-";
  if (hasChinese(s)) return s;
  return "识别失败（点击查看详情）";
}

function showTaskError(row) {
  const raw = String(row?.error_message || "").trim();
  if (!raw) return;
  if (hasChinese(raw)) return;
  console.warn("[OCR任务原始错误信息]", { taskId: row?.id, orderId: row?.order_id, error_message: raw });
  ElMessage.info("已在控制台输出任务原始错误信息");
}

function goOrder(orderId) {
  if (!orderId) return;
  router.push({ path: `/orders/${orderId}`, query: { from: route.fullPath } });
}

function goUnfinished() {
  router.push({ path: "/orders/unfinished", query: { from: route.fullPath } });
}

function statusText(s) {
  if (s === "pending") return "排队中";
  if (s === "processing") return "识别中";
  if (s === "finished") return "已完成";
  if (s === "finished_with_errors") return "部分成功";
  if (s === "failed") return "失败";
  if (s === "skipped") return "已跳过";
  return s || "-";
}

function statusTagType(s) {
  if (s === "finished") return "success";
  if (s === "finished_with_errors") return "warning";
  if (s === "failed") return "danger";
  if (s === "processing") return "warning";
  if (s === "skipped") return "info";
  return "info";
}

/** ✅ 抽屉打开后每 3 秒自动刷新；关闭则停止 */
let taskRefreshTimer = null;

function startTaskAutoRefresh() {
  if (taskRefreshTimer) return;
  taskRefreshTimer = window.setInterval(() => {
    if (!taskDrawer.value) return;
    loadTasks();
  }, 3000);
}

function stopTaskAutoRefresh() {
  if (!taskRefreshTimer) return;
  window.clearInterval(taskRefreshTimer);
  taskRefreshTimer = null;
}

watch(
  taskDrawer,
  async (open) => {
    if (open) {
      await loadTasks();
      startTaskAutoRefresh();
    } else {
      stopTaskAutoRefresh();
    }
  },
  { immediate: false }
);

/** ====================== 生命周期 ====================== */
onMounted(async () => {
  await Promise.all([loadGroups(), loadTasks()]);
});

onBeforeUnmount(() => {
  stopTaskAutoRefresh();

  for (const uid of Object.keys(localPreviewUrlMap.value)) {
    try {
      URL.revokeObjectURL(localPreviewUrlMap.value[uid]);
    } catch {
      // ignore
    }
  }
  localPreviewUrlMap.value = {};
});
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.page-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.task-badge {
  display: inline-flex;
}

/* ✅ 更明显的“图片识别任务”按钮 */
.task-btn {
  border-radius: 12px;
  padding: 8px 14px;
  font-weight: 700;
  letter-spacing: 0.2px;
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.18);
}

.task-icon {
  margin-right: 6px;
}

.block-card {
  margin-bottom: 12px;
  border-radius: 12px;
  border: 1px solid rgba(60, 60, 60, 0.08);
}

.card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 上传模式控件 */
.upload-mode {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 6px;
}

.upload-mode-label {
  font-size: 12px;
  color: rgba(31, 42, 68, 0.72);
  font-weight: 600;
}

.filters {
  margin-bottom: 10px;
  padding: 10px 12px;
  border: 1px dashed rgba(60, 60, 60, 0.14);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.55);
}

.filters-form :deep(.el-form-item) {
  margin-bottom: 10px;
}

.upload-alert {
  margin-bottom: 12px;
}

.upload-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 12px;
}

.slot-card {
  border: 1px solid rgba(60, 60, 60, 0.1);
  border-radius: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.55);
}

.slot-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.slot-name {
  font-weight: 700;
  color: rgba(31, 42, 68, 0.92);
}

.slot-foot {
  margin-top: 8px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.slot-foot-left {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.slot-foot-right {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
}

.muted {
  color: #999;
}

/* ✅ 亮绿色实体球 */
.ready-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #00e676;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.18);
}

/* 任务错误信息：可点查看详情（控制台） */
.task-error {
  cursor: pointer;
  color: rgba(31, 42, 68, 0.9);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* Upload box base */
.upload-box :deep(.el-upload-dragger) {
  border-radius: 12px;
  min-height: 170px;
}

/* ✅ 单图槽：空态提示强制居中 */
.upload-one :deep(.el-upload-dragger) {
  padding: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 多图槽：保留稍微舒展的 padding */
.upload-multi :deep(.el-upload-dragger) {
  padding: 12px;
}

/* 空态居中文案 */
.upload-empty {
  width: 100%;
  height: 170px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-center {
  text-align: center;
  line-height: 1.4;
}

.empty-title {
  font-size: 14px;
  font-weight: 700;
  color: rgba(31, 42, 68, 0.88);
}

.empty-sub {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(31, 42, 68, 0.55);
  font-weight: 650;
}

/* 单图槽：居中预览 */
.one-wrap {
  position: relative;
  width: 100%;
  height: 170px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.one-img {
  width: 100%;
  height: 100%;
}

.one-mask {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.2));
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  padding: 10px;
  pointer-events: none;
}

.one-mask-text {
  color: rgba(255, 255, 255, 0.92);
  font-size: 12px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

/* 多图预览墙 */
.preview-wall {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.preview-item {
  border: 1px solid rgba(60, 60, 60, 0.1);
  border-radius: 10px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.75);
}

.preview-img {
  width: 100%;
  height: 110px;
  border-bottom: 1px solid rgba(60, 60, 60, 0.08);
}

.preview-empty {
  background: rgba(31, 42, 68, 0.03);
}

.preview-meta {
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.preview-name {
  font-size: 12px;
  color: rgba(31, 42, 68, 0.9);
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uploading-tip {
  margin-top: 10px;
  font-size: 12px;
  color: #e6a23c;
}

.drawer-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drawer-title {
  font-weight: 800;
  color: rgba(31, 42, 68, 0.92);
}

.drawer-actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 980px) {
  .upload-grid {
    grid-template-columns: 1fr;
  }

  .preview-wall {
    grid-template-columns: 1fr;
  }
}
</style>
