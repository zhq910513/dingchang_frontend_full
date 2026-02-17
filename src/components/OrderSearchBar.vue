<!-- src/components/OrderSearchBar.vue -->
<template>
  <el-card shadow="never" class="search-card">
    <el-form :model="model" label-width="0" class="search-form" size="small">
      <!-- ✅ 财务搜索（对齐后端筛选集合） -->
      <template v-if="variant === 'finance'">
        <div class="row">
          <!-- ✅ 团队筛选：只展示具体团队；清空代表“不过滤” -->
          <el-select
            v-model="model.team_name"
            clearable
            filterable
            placeholder="团队"
            class="w180"
            :disabled="loading || teamSelectDisabled"
            @clear="onAutoSearchByClear"
            @change="onTeamChange"
          >
            <el-option
              v-for="t in resolvedTeamOptions"
              :key="t.value"
              :label="t.label"
              :value="t.value"
            />
          </el-select>

          <el-date-picker
            v-model="model.created_date"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            clearable
            class="w260"
            :disabled="loading"
            @change="(v) => onMaybeAutoSearchByValue(v)"
            @clear="onAutoSearchByClear"
          />

          <el-select
            v-model="model.channel_group_id"
            clearable
            filterable
            placeholder="渠道"
            class="w180"
            :disabled="loading"
            @clear="onAutoSearchByClear"
            @change="onSelectChange"
          >
            <el-option
              v-for="g in channelGroups"
              :key="g.id"
              :label="g.group_name || g.channel_name || g.channel_code"
              :value="g.id"
            />
          </el-select>

          <el-select
            v-model="model.customer_group_id"
            clearable
            filterable
            placeholder="客户"
            class="w180"
            :disabled="loading"
            @clear="onAutoSearchByClear"
            @change="onSelectChange"
          >
            <el-option
              v-for="g in customerGroups"
              :key="g.id"
              :label="g.group_name || g.customer_name || g.customer_code"
              :value="g.id"
            />
          </el-select>

          <el-input
            v-model="model.market"
            clearable
            placeholder="市场（模糊）"
            class="w180"
            :disabled="loading"
            @keyup.enter="emitSearch"
            @clear="onAutoSearchByClear"
          />
          <el-input
            v-model="model.owner_name"
            clearable
            placeholder="车主（模糊）"
            class="w160"
            :disabled="loading"
            @keyup.enter="emitSearch"
            @clear="onAutoSearchByClear"
          />
        </div>

        <div class="row mt10">
          <el-date-picker
            v-model="model.insurance_expire_date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="保险到期日"
            clearable
            class="w180"
            :disabled="loading"
            @change="(v) => onMaybeAutoSearchByValue(v)"
            @clear="onAutoSearchByClear"
          />

          <el-date-picker
            v-model="model.first_register_date"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="初登开始"
            end-placeholder="初登结束"
            clearable
            class="w260"
            :disabled="loading"
            @change="(v) => onMaybeAutoSearchByValue(v)"
            @clear="onAutoSearchByClear"
          />

          <el-select
            v-model="model.is_paid"
            clearable
            placeholder="是否回款"
            class="w160"
            :disabled="loading"
            @clear="onAutoSearchByClear"
            @change="onSelectChange"
          >
            <el-option label="是" :value="true" />
            <el-option label="否" :value="false" />
          </el-select>

          <el-select
            v-model="model.is_rebate"
            clearable
            placeholder="是否返点"
            class="w160"
            :disabled="loading"
            @clear="onAutoSearchByClear"
            @change="onSelectChange"
          >
            <el-option label="是" :value="true" />
            <el-option label="否" :value="false" />
          </el-select>

          <el-button type="primary" @click="emitSearch" :loading="loading">查询</el-button>
          <el-button @click="emitReset" :disabled="loading">重置</el-button>
        </div>
      </template>

      <!-- ✅ 订单搜索（含团队筛选 + 业务员随团队过滤） -->
      <template v-else>
        <div class="row">
          <el-input
            v-model="model.owner_name"
            clearable
            placeholder="姓名"
            class="w160"
            :disabled="loading"
            @keyup.enter="emitSearch"
            @clear="onAutoSearchByClear"
          />
          <el-input
            v-model="model.id_number"
            clearable
            placeholder="身份证号"
            class="w200"
            :disabled="loading"
            @keyup.enter="emitSearch"
            @clear="onAutoSearchByClear"
          />
          <el-input
            v-model="model.vin"
            clearable
            placeholder="车架号"
            class="w200"
            :disabled="loading"
            @keyup.enter="emitSearch"
            @clear="onAutoSearchByClear"
          />
          <el-input
            v-model="model.engine_no"
            clearable
            placeholder="发动机号"
            class="w180"
            :disabled="loading"
            @keyup.enter="emitSearch"
            @clear="onAutoSearchByClear"
          />

          <el-button type="primary" @click="emitSearch" :loading="loading">查询</el-button>
          <el-button @click="emitReset" :disabled="loading">重置</el-button>

          <el-button text class="more-btn" @click="toggleMore" :disabled="loading">
            {{ showMore ? "收起" : "更多" }}
          </el-button>
        </div>

        <el-collapse-transition>
          <div v-show="showMore" class="more">
            <div class="row">
              <!-- ✅ 团队筛选（订单）：只展示具体团队；清空代表“不过滤” -->
              <el-select
                v-model="model.team_name"
                clearable
                filterable
                placeholder="团队"
                class="w180"
                :disabled="loading || teamSelectDisabled"
                @clear="onAutoSearchByClear"
                @change="onTeamChange"
              >
                <el-option
                  v-for="t in resolvedTeamOptions"
                  :key="t.value"
                  :label="t.label"
                  :value="t.value"
                />
              </el-select>

              <el-input
                v-model="model.plate_no"
                clearable
                placeholder="号牌号码"
                class="w160"
                :disabled="loading"
                @keyup.enter="emitSearch"
                @clear="onAutoSearchByClear"
              />
              <el-input
                v-model="model.vehicle_model"
                clearable
                placeholder="车辆型号"
                class="w180"
                :disabled="loading"
                @keyup.enter="emitSearch"
                @clear="onAutoSearchByClear"
              />
              <el-input
                v-model="model.remark"
                clearable
                placeholder="备注"
                class="w180"
                :disabled="loading"
                @keyup.enter="emitSearch"
                @clear="onAutoSearchByClear"
              />

              <el-select
                v-model="model.customer_group_id"
                clearable
                filterable
                placeholder="客户群"
                class="w180"
                :disabled="loading"
                @clear="onAutoSearchByClear"
                @change="onSelectChange"
              >
                <el-option v-for="g in customerGroups" :key="g.id" :label="g.group_name" :value="g.id" />
              </el-select>

              <el-select
                v-model="model.channel_group_id"
                clearable
                filterable
                placeholder="渠道群"
                class="w180"
                :disabled="loading"
                @clear="onAutoSearchByClear"
                @change="onSelectChange"
              >
                <el-option v-for="g in channelGroups" :key="g.id" :label="g.group_name" :value="g.id" />
              </el-select>

              <el-select
                v-if="showSalesperson"
                v-model="model.salesperson_id"
                clearable
                filterable
                placeholder="业务员"
                class="w180"
                :disabled="loading"
                @clear="onAutoSearchByClear"
                @change="onSelectChange"
              >
                <el-option
                  v-for="u in filteredSalespersons"
                  :key="u.id"
                  :label="u.full_name || u.real_name || u.username"
                  :value="u.id"
                />
              </el-select>

              <el-date-picker
                v-model="model.created_date"
                type="daterange"
                value-format="YYYY-MM-DD"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                clearable
                class="w260"
                :disabled="loading"
                @change="(v) => onMaybeAutoSearchByValue(v)"
                @clear="onAutoSearchByClear"
              />
            </div>
          </div>
        </el-collapse-transition>
      </template>
    </el-form>
  </el-card>
</template>

<script setup>
import { computed, onMounted, ref, watch, nextTick } from "vue";

const props = defineProps({
  modelValue: { type: Object, required: true },
  loading: { type: Boolean, default: false },

  // orders | finance
  variant: { type: String, default: "orders" },

  customerGroups: { type: Array, default: () => [] },
  channelGroups: { type: Array, default: () => [] },

  /**
   * ✅ 业务员列表：不再从业务员数据反推团队归属；
   * 建议父组件在 team_name 变化时，按 team_name 调接口后传入已过滤的列表。
   */
  salespersons: { type: Array, default: () => [] },
  showSalesperson: { type: Boolean, default: true },

  /**
   * ✅ 新增：团队下拉数据（推荐父组件传入）
   * 支持形态：
   * - ["A","B"]
   * - [{team_name:"A"}] / [{name:"A"}] / [{label:"A", value:"A"}]
   */
  teamOptions: { type: Array, default: () => [] },

  /**
   * ✅ 新增：当前用户角色名（用于默认值策略）
   * 期望：'super_admin' | 'manager'（大小写不敏感）
   */
  roleName: { type: String, default: "" },

  /**
   * ✅ 新增：当前用户可见团队名（当 teamOptions 没传时兜底）
   */
  userTeamNames: { type: Array, default: () => [] },
});

const emit = defineEmits(["update:modelValue", "search", "reset", "team-change"]);

const showMore = ref(false);

const roleNorm = computed(() => String(props.roleName || "").trim().toLowerCase());
const isSuperAdmin = computed(() => roleNorm.value === "super_admin" || roleNorm.value === "superadmin");
const isManager = computed(() => roleNorm.value === "manager");

function cloneObj(v) {
  try {
    return JSON.parse(JSON.stringify(v || {}));
  } catch {
    return { ...(v || {}) };
  }
}

function safeStringify(v) {
  try {
    return JSON.stringify(v ?? {});
  } catch {
    return "";
  }
}

function normalizeRange(v) {
  // ✅ daterange：统一成 null 或 [start,end]（Element Plus 更稳）
  if (!v) return null;
  if (!Array.isArray(v)) return null;
  if (v.length !== 2) return null;
  const a = v[0];
  const b = v[1];
  if (!a || !b) return null;
  return [a, b];
}

function normalizeTeamName(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function normalizeModel(obj) {
  const m = cloneObj(obj);

  if ("created_date" in m) m.created_date = normalizeRange(m.created_date);
  if ("first_register_date" in m) m.first_register_date = normalizeRange(m.first_register_date);

  // ✅ team_name：统一 null/字符串
  if ("team_name" in m) m.team_name = normalizeTeamName(m.team_name);

  return m;
}

function normalizeOutgoing(obj) {
  const m = cloneObj(obj);
  if ("created_date" in m) m.created_date = normalizeRange(m.created_date);
  if ("first_register_date" in m) m.first_register_date = normalizeRange(m.first_register_date);
  if ("team_name" in m) m.team_name = normalizeTeamName(m.team_name);
  return m;
}

const model = ref(normalizeModel(props.modelValue));

let _syncingFromProp = false;
let _lastEmitted = safeStringify(model.value);

watch(
  () => props.modelValue,
  (v) => {
    _syncingFromProp = true;
    const next = normalizeModel(v);
    model.value = next;
    _lastEmitted = safeStringify(next);
    nextTick(() => {
      _syncingFromProp = false;
    });
  },
  { deep: true }
);

watch(
  model,
  (v) => {
    if (_syncingFromProp) return;

    const next = normalizeOutgoing(v);
    const s = safeStringify(next);
    if (s === _lastEmitted) return;

    _lastEmitted = s;
    emit("update:modelValue", next);
  },
  { deep: true }
);

function toggleMore() {
  showMore.value = !showMore.value;
}

function emitSearch() {
  if (props.loading) return;
  emit("search");
}

function emitReset() {
  if (props.loading) return;
  showMore.value = false;
  emit("reset");
}

/** ======================
 *  ✅ 团队 options 归一化
 * ====================== */
function _asList(v) {
  if (v === null || v === undefined) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    if (s.includes(",")) return s.split(",").map((x) => x.trim()).filter(Boolean);
    return [s];
  }
  return [v];
}

function _teamLabelOf(t) {
  if (t === null || t === undefined) return "";
  if (typeof t === "string") return t;
  return String(t.label || t.team_name || t.name || t.value || "").trim();
}

function _teamValueOf(t) {
  if (t === null || t === undefined) return null;
  if (typeof t === "string") return t.trim() || null;
  const v = t.value ?? t.team_name ?? t.name ?? t.label;
  return normalizeTeamName(v);
}

const resolvedTeamOptions = computed(() => {
  const raw = _asList(props.teamOptions);
  let items = raw
    .map((t) => {
      const value = _teamValueOf(t);
      const label = _teamLabelOf(t) || (value ? String(value) : "");
      return value ? { value, label } : null;
    })
    .filter(Boolean);

  // 兜底：如果父组件没传 teamOptions，则尝试用 userTeamNames
  if (!items.length) {
    const raw2 = _asList(props.userTeamNames);
    items = raw2
      .map((x) => {
        const v = normalizeTeamName(x);
        return v ? { value: v, label: v } : null;
      })
      .filter(Boolean);
  }

  // 去重 + 稳定排序
  const m = new Map();
  for (const it of items) m.set(it.value, it.label);
  return Array.from(m.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => String(a.value).localeCompare(String(b.value)));
});

const teamSelectDisabled = computed(() => {
  // 超级管理员也仅展示具体团队；清空代表“不过滤”
  const cnt = resolvedTeamOptions.value.length;
  return cnt <= 1;
});

/** ======================
 *  ✅ 默认团队策略
 *  - super_admin：默认不选（null/清空 = 全部可见范围）
 *  - manager：默认第一个团队
 * ====================== */
let _defaultTeamApplied = false;

function applyDefaultTeamOnce() {
  if (_defaultTeamApplied) return;
  _defaultTeamApplied = true;

  const cur = normalizeTeamName(model.value?.team_name);

  if (isSuperAdmin.value) {
    // 超级：默认不过滤（保持当前值即可）
    model.value.team_name = cur;
    return;
  }

  if (isManager.value) {
    // 经理：必须落到某个团队（由上游限制 options）
    if (cur) return;
    const first = resolvedTeamOptions.value[0]?.value || null;
    if (first) model.value.team_name = first;
  }
}

onMounted(() => {
  applyDefaultTeamOnce();
});

watch(
  () => [isSuperAdmin.value, isManager.value, resolvedTeamOptions.value.length],
  () => {
    // teams 异步加载时补一次默认策略
    _defaultTeamApplied = false;
    nextTick(() => applyDefaultTeamOnce());
  }
);

/** ======================
 *  ✅ 业务员展示：不从业务员数据反推团队
 * ====================== */
const filteredSalespersons = computed(() => {
  const list = Array.isArray(props.salespersons) ? props.salespersons : [];
  return list;
});

/** ======================
 *  筛选框体验：清空即触发一次查询
 * ====================== */
function onAutoSearchByClear() {
  if (props.loading) return;
  emit("search");
}

function onMaybeAutoSearchByValue(v) {
  if (props.loading) return;
  const cleared =
    v === null || v === undefined || v === "" || (Array.isArray(v) && (v.length === 0 || !v[0] || !v[1]));
  if (cleared) emit("search");
}

function onSelectChange(v) {
  if (props.loading) return;
  if (v === null || v === undefined || v === "") emit("search");
}

function onTeamChange(v) {
  // 切换团队：自动触发查询；并且重置业务员选择（避免跨团队残留）
  if (props.loading) return;

  const nextTeam = normalizeTeamName(v);
  model.value.team_name = nextTeam;

  if ("salesperson_id" in model.value) {
    model.value.salesperson_id = null;
  }

  // ✅ 给父组件一个可选钩子：team 变化时可拉取 salespersons(team_name=xxx)
  emit("team-change", nextTeam);

  emit("search");
}
</script>

<style scoped>
.search-card {
  margin-bottom: 10px;
}

.search-form {
  width: 100%;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mt10 {
  margin-top: 10px;
}

.more {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #e5e7eb;
}

.more-btn {
  padding-left: 6px;
  padding-right: 6px;
}

.w160 {
  width: 160px;
}

.w180 {
  width: 180px;
}

.w200 {
  width: 200px;
}

.w260 {
  width: 260px;
}
</style>
