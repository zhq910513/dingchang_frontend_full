<!-- src/views/orders/OrderDetail.vue -->
<template>
  <div class="order-detail">
    <div class="detail-header">
      <h2>订单详情</h2>

      <div class="header-actions">
        <el-button size="small" @click="goBack">返回</el-button>

        <!-- ✅ 所有按钮/入口：只认后端 meta.capabilities -->
        <el-button
          v-if="caps.can_reopen"
          size="small"
          type="warning"
          plain
          :loading="saving"
          :disabled="loading"
          @click="reopenToUnfinishedConfirm"
        >
          退回未完成
        </el-button>

        <el-button
          v-if="caps.can_mark_finished"
          size="small"
          type="success"
          plain
          :loading="saving"
          :disabled="loading"
          @click="markFinishedConfirm"
        >
          标记完成
        </el-button>
      </div>
    </div>

    <el-divider />

    <div v-if="loading" class="loading-wrap">
      <el-skeleton :rows="8" animated />
    </div>

    <div v-else class="detail-body">
      <template v-if="blocks.length">
        <div v-for="(blk, idx) in blocks" :key="blk.key || blk.block_key || blk.name || idx" class="detail-block">
          <div class="block-title">
            {{ blk.title || blk.group_name || blk.name || `区块 ${idx + 1}` }}
          </div>

          <!-- 常见：items = [{label, value, type, options}] -->
          <template v-if="Array.isArray(blk.items) && blk.items.length">
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item
                v-for="(it, i2) in blk.items"
                :key="it.key || it.field_name || it.label || i2"
                :label="it.label || it.field_label || it.key || it.field_name || '-'"
              >
                {{ formatBlockValue(it.value, it) }}
              </el-descriptions-item>
            </el-descriptions>
          </template>

          <!-- 常见：fields = [{label, value}] -->
          <template v-else-if="Array.isArray(blk.fields) && blk.fields.length">
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item
                v-for="(it, i2) in blk.fields"
                :key="it.key || it.field_name || it.label || i2"
                :label="it.label || it.field_label || it.key || it.field_name || '-'"
              >
                {{ formatBlockValue(it.value, it) }}
              </el-descriptions-item>
            </el-descriptions>
          </template>

          <!-- 兜底：未知区块结构直接展示 JSON（用于联调，不做字段猜测/映射） -->
          <template v-else>
            <pre class="json-dump">{{ safeJson(blk) }}</pre>
          </template>
        </div>
      </template>

      <template v-else>
        <el-empty description="暂无详情数据" />
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";

import { getOrder, updateOrderStatus } from "../../api/orders";
import { formatDynamicValue } from "../../utils/fieldFormat";

// ----------------------
// 只认后端详情接口：GET /orders/{id}
// 返回：load_order_detail_blocks 的结构
// 约定最小消费：meta.capabilities + blocks（数组）
// ----------------------

const router = useRouter();
const route = useRoute();

function toValidOrderId(v) {
  const n = typeof v === "string" ? Number(v.trim()) : Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    throw new Error("invalid order id");
  }
  return n;
}

const orderId = (() => {
  try {
    return toValidOrderId(route.params.id);
  } catch {
    return 0;
  }
})();

const loading = ref(false);
const saving = ref(false);

const meta = ref({ source: "orders", capabilities: {} });
const blocks = ref([]);

// ✅ capabilities：页面唯一权限来源
const caps = computed(() => {
  const m = meta.value && typeof meta.value === "object" ? meta.value : {};
  const c = m.capabilities && typeof m.capabilities === "object" ? m.capabilities : {};
  return c;
});

function goBack() {
  router.back();
}

function safeJson(v) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v ?? "");
  }
}

function normalizeDetailResponse(data) {
  const d = data && typeof data === "object" ? data : {};

  // 严格按新口径：meta + blocks
  const m = d.meta && typeof d.meta === "object" ? d.meta : { source: "orders", capabilities: {} };

  // blocks 可能叫 blocks / items / sections（这里不做旧兼容映射，只在 blocks 不存在时用 items 兜底避免白屏）
  const b1 = Array.isArray(d.blocks) ? d.blocks : null;
  const b2 = !b1 && Array.isArray(d.items) ? d.items : null;

  return {
    meta: m,
    blocks: b1 || b2 || [],
  };
}

async function load() {
  if (!orderId) {
    ElMessage.error("订单ID无效");
    router.replace("/orders/all");
    return;
  }

  loading.value = true;
  try {
    const resp = await getOrder(orderId);
    const normalized = normalizeDetailResponse(resp?.data ?? resp ?? {});
    meta.value = normalized.meta;
    blocks.value = normalized.blocks;
  } catch (e) {
    console.error(e);
    ElMessage.error("加载失败");
    meta.value = { source: "orders", capabilities: {} };
    blocks.value = [];
  } finally {
    loading.value = false;
  }
}

function formatBlockValue(val, fieldLike) {
  // ✅ 统一复用 fieldFormat（select/date 等）
  return formatDynamicValue(val, fieldLike);
}

async function markFinishedConfirm() {
  try {
    await ElMessageBox.confirm("确认将该订单标记为完成？", "确认", { type: "warning" });
  } catch {
    return;
  }
  saving.value = true;
  try {
    await updateOrderStatus(orderId, { is_finished: true });
    ElMessage.success("已标记完成");
    await load();
  } catch (e) {
    console.error(e);
    ElMessage.error("操作失败");
  } finally {
    saving.value = false;
  }
}

async function reopenToUnfinishedConfirm() {
  try {
    await ElMessageBox.confirm("确认将该订单退回未完成？", "确认", { type: "warning" });
  } catch {
    return;
  }
  saving.value = true;
  try {
    await updateOrderStatus(orderId, { is_finished: false });
    ElMessage.success("已退回未完成");
    await load();
  } catch (e) {
    console.error(e);
    ElMessage.error("操作失败");
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.order-detail {
  padding: 16px;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-actions > * + * {
  margin-left: 8px;
}

.loading-wrap {
  padding: 8px 0;
}

.detail-block {
  margin-bottom: 16px;
}

.block-title {
  font-weight: 700;
  margin-bottom: 8px;
}

.json-dump {
  background: #0b1020;
  color: #e7e7e7;
  padding: 10px;
  border-radius: 6px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.5;
}
</style>
