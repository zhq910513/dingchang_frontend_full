<!-- src/views/ai-assistant/AiAssistantWorkbench.vue -->
<template>
  <div
    class="ai-workbench-shell"
    :class="{ 'workbench-drag-over': workbenchDragOver, 'multi-open-enabled': multiOpenEnabled }"
    @dragenter.prevent="handleWorkbenchDragEnter"
    @dragover.prevent="handleWorkbenchDragOver"
    @dragleave.prevent="handleWorkbenchDragLeave"
    @drop.prevent="handleWorkbenchDrop"
  >
    <el-card shadow="never" class="head-card">
      <div class="head-row">
        <div class="head-main">
          <h2 class="page-title">欢迎进入报价流程</h2>
        </div>

        <div class="head-actions">
          <div class="manage-actions">
            <el-button v-if="canManageQuoteAccounts" size="small" type="primary" plain @click="openAccountDialog">
              平台账号管理
            </el-button>
            <el-button v-if="isSuperAdmin" size="small" plain @click="openDefaultConfigDialog">
              默认参数配置
            </el-button>
            <div class="workbench-mode-toggle">
              <span>多开</span>
              <el-switch
                :model-value="multiOpenEnabled"
                :active-color="'#67c23a'"
                :inactive-color="'#dcdfe6'"
                @change="toggleMultiOpen"
              />
            </div>
          </div>
          <el-popover placement="bottom-end" trigger="click" width="320" popper-class="quote-guide-popover">
            <template #reference>
              <el-button class="guide-trigger" size="small" circle title="操作指南">?</el-button>
            </template>
            <div class="guide-pop">
              <div class="guide-pop-title">操作指南</div>
              <div class="guide-pop-line">1. 拖入资料图片；客户不方便给图片时，输入“手工”填写表单。</div>
              <div class="guide-pop-line">2. 后台会静默识别、卡槽归位、整理字段。</div>
              <div class="guide-pop-line">3. 输入“平台名+报价”，例如：人保报价。</div>
              <div class="guide-pop-tip">图片不全时可输入“补资料”；开启多开后最多同时处理 3 个会话。</div>
            </div>
          </el-popover>
        </div>
      </div>
    </el-card>

    <div class="pane-grid" :class="`pane-count-${paneCount}`">
      <section
        v-for="(pane, index) in panes"
        :key="pane.key"
        class="multi-pane"
        :class="{ active: pane.key === activePaneKey }"
        @pointerdown.capture="activatePane(pane.key)"
        @focusin.capture="activatePane(pane.key)"
      >
        <AiAssistantChatPane
          :ref="(el) => setPaneRef(pane.key, el)"
          pane-mode
          :multi-open-enabled="multiOpenEnabled"
          :can-add-pane="canAddPane"
          :pane-index="index + 1"
          :pane-count="paneCount"
          :show-close-button="multiOpenEnabled && paneCount > 1"
          @toggle-multi-open="toggleMultiOpen"
          @new-session-request="addPane"
          @close-session-request="closePane(pane.key)"
        />
      </section>
    </div>

    <div v-if="workbenchDragOver" class="workbench-drop-mask">
      <div class="workbench-drop-card">
        <strong>释放图片</strong>
        <span>将发送到当前激活的会话窗口</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from "vue";
import { ElMessage } from "element-plus";
import { ROLE } from "../../constants";
import { useSessionStore } from "../../store/session";
import AiAssistantChatPane from "./AiAssistantChatPane.vue";

const MAX_MULTI_PANES = 3;

const sessionStore = useSessionStore();
const isSuperAdmin = computed(() => String(sessionStore.roleName || "").trim() === ROLE.SUPER_ADMIN);
const canManageQuoteAccounts = computed(() => isSuperAdmin.value);

let paneSeq = 0;
function makePaneKey() {
  paneSeq += 1;
  return `quote-pane-${Date.now()}-${paneSeq}`;
}

const panes = ref([{ key: makePaneKey() }]);
const activePaneKey = ref(panes.value[0].key);
const multiOpenEnabled = ref(false);
const workbenchDragOver = ref(false);
const workbenchDragDepth = ref(0);
const paneRefs = new Map();

const paneCount = computed(() => panes.value.length);
const canAddPane = computed(() => paneCount.value < MAX_MULTI_PANES);

function setPaneRef(key, el) {
  if (el) {
    paneRefs.set(key, el);
  } else {
    paneRefs.delete(key);
  }
}

function activatePane(key) {
  if (key) activePaneKey.value = key;
}

function activePane() {
  return paneRefs.get(activePaneKey.value) || paneRefs.get(panes.value[0]?.key) || null;
}

function openAccountDialog() {
  const pane = activePane();
  if (!pane?.openAccountDialog) {
    ElMessage.warning("会话窗口还在初始化，请稍后再试");
    return;
  }
  pane.openAccountDialog();
}

function openDefaultConfigDialog() {
  const pane = activePane();
  if (!pane?.openDefaultConfigDialog) {
    ElMessage.warning("会话窗口还在初始化，请稍后再试");
    return;
  }
  pane.openDefaultConfigDialog();
}

function toggleMultiOpen() {
  if (!multiOpenEnabled.value) {
    multiOpenEnabled.value = true;
    return;
  }

  multiOpenEnabled.value = false;
  if (panes.value.length <= 1) return;

  const keepPane = panes.value.find((x) => x.key === activePaneKey.value) || panes.value[0];
  panes.value = [keepPane || { key: makePaneKey() }];
  activePaneKey.value = panes.value[0].key;
}

async function addPane() {
  if (!multiOpenEnabled.value) {
    activePane()?.createNewSessionLocalSafe?.();
    return;
  }
  if (!canAddPane.value) {
    ElMessage.info("最多同时打开 3 个会话窗口");
    return;
  }

  const pane = { key: makePaneKey() };
  panes.value = [...panes.value, pane];
  activePaneKey.value = pane.key;
  await nextTick();
  await activePane()?.createNewSessionLocalSafe?.();
}

function closePane(key) {
  if (panes.value.length <= 1) return;
  const nextPanes = panes.value.filter((x) => x.key !== key);
  panes.value = nextPanes.length ? nextPanes : [{ key: makePaneKey() }];
  paneRefs.delete(key);
  if (activePaneKey.value === key) {
    activePaneKey.value = panes.value[Math.max(0, panes.value.length - 1)]?.key || panes.value[0]?.key || "";
  }
}

function eventInsidePane(evt) {
  return !!evt?.target?.closest?.(".multi-pane");
}

function eventMayContainFiles(evt) {
  const types = Array.from(evt?.dataTransfer?.types || []);
  return types.length ? types.includes("Files") : true;
}

function imageFilesFromEvent(evt) {
  const files = Array.from(evt?.dataTransfer?.files || []).filter(Boolean);
  return files.filter((file) => {
    const type = String(file.type || "").toLowerCase();
    const name = String(file.name || "").toLowerCase();
    return type.startsWith("image/") || /\.(jpe?g|png|webp|bmp|gif|heic|heif)$/.test(name);
  });
}

function handleWorkbenchDragEnter(evt) {
  if (eventInsidePane(evt) || !eventMayContainFiles(evt)) return;
  workbenchDragDepth.value += 1;
  workbenchDragOver.value = true;
}

function handleWorkbenchDragOver(evt) {
  if (eventInsidePane(evt) || !eventMayContainFiles(evt)) return;
  if (evt?.dataTransfer) evt.dataTransfer.dropEffect = "copy";
  workbenchDragOver.value = true;
}

function handleWorkbenchDragLeave(evt) {
  if (eventInsidePane(evt) || !eventMayContainFiles(evt)) return;
  workbenchDragDepth.value = Math.max(0, workbenchDragDepth.value - 1);
  if (workbenchDragDepth.value > 0 && evt?.currentTarget?.contains?.(evt?.relatedTarget)) return;
  workbenchDragDepth.value = 0;
  workbenchDragOver.value = false;
}

async function handleWorkbenchDrop(evt) {
  if (eventInsidePane(evt)) return;
  workbenchDragDepth.value = 0;
  workbenchDragOver.value = false;

  const files = imageFilesFromEvent(evt);
  if (!files.length) return;

  const pane = activePane();
  if (!pane?.uploadExternalFiles) {
    ElMessage.warning("会话窗口还在初始化，请稍后再试");
    return;
  }
  await pane.uploadExternalFiles(files);
}
</script>

<style scoped>
.ai-workbench-shell {
  position: relative;
  min-height: calc(100vh - 104px);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.head-card {
  border-radius: 12px;
}

.head-card :deep(.el-card__body) {
  padding: 14px 16px 12px;
}

.multi-open-enabled .head-card :deep(.el-card__body) {
  padding: 10px 12px 8px;
}

.head-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.head-main {
  min-width: 0;
}

.page-title {
  margin: 0;
  line-height: 1.2;
  font-size: 22px;
  font-weight: 800;
  color: rgba(31, 42, 68, 0.96);
}

.multi-open-enabled .page-title {
  font-size: 20px;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.multi-open-enabled .head-actions {
  gap: 8px;
}

.manage-actions {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.multi-open-enabled .manage-actions {
  gap: 6px;
}

.workbench-mode-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 8px;
  border: 1px solid rgba(64, 158, 255, 0.22);
  border-radius: 999px;
  background: rgba(64, 158, 255, 0.04);
  color: rgba(31, 42, 68, 0.72);
  font-size: 12px;
  font-weight: 700;
  box-sizing: border-box;
}

.multi-open-enabled .workbench-mode-toggle {
  height: 28px;
  padding: 0 7px;
}

.workbench-mode-toggle :deep(.el-switch) {
  --el-switch-on-color: #67c23a;
  --el-switch-off-color: #dcdfe6;
}

.guide-trigger {
  font-weight: 800;
}

.guide-pop {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: rgba(31, 42, 68, 0.76);
}

.guide-pop-title {
  font-size: 15px;
  font-weight: 800;
  color: rgba(31, 42, 68, 0.96);
}

.guide-pop-line,
.guide-pop-tip {
  font-size: 13px;
  line-height: 1.55;
}

.guide-pop-tip {
  padding-top: 8px;
  border-top: 1px dashed rgba(31, 42, 68, 0.12);
  color: rgba(64, 158, 255, 0.86);
}

.pane-grid {
  flex: 1 1 auto;
  min-height: 560px;
  height: calc(100vh - 184px);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}

.multi-open-enabled .pane-grid {
  gap: 6px;
}

.multi-open-enabled .pane-grid {
  height: calc(100vh - 184px);
}

.pane-grid.pane-count-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.pane-grid.pane-count-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.multi-pane {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-radius: 14px;
}

.multi-open-enabled .multi-pane {
  border-radius: 12px;
}

.multi-pane.active {
  outline: 2px solid rgba(64, 158, 255, 0.22);
  outline-offset: 2px;
}


.workbench-drop-mask {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  border-radius: 16px;
  background: rgba(64, 158, 255, 0.08);
  backdrop-filter: blur(3px);
}

.workbench-drop-card {
  min-width: 220px;
  padding: 18px 20px;
  border-radius: 16px;
  border: 1px solid rgba(64, 158, 255, 0.28);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 48px rgba(31, 42, 68, 0.16);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: rgba(31, 42, 68, 0.72);
}

.workbench-drop-card strong {
  font-size: 18px;
  color: rgba(31, 42, 68, 0.94);
}

@media (max-width: 760px) {
  .head-row {
    flex-direction: column;
  }

  .head-actions {
    width: 100%;
    justify-content: space-between;
  }

  .pane-grid,
  .pane-grid.pane-count-2,
  .pane-grid.pane-count-3 {
    height: auto;
    min-height: 0;
    grid-template-columns: minmax(0, 1fr);
  }

  .multi-open-enabled .pane-grid {
    height: auto;
  }

  .multi-pane {
    min-height: 620px;
  }
}
</style>
