<template>
  <el-card shadow="never" class="search-card">
    <el-form :model="model" label-width="0" class="search-form" size="small">
      <template v-if="variant === 'finance'">
        <div class="row">
          <el-select
              v-if="financeTeamMultiple"
              v-model="financeTeamMultiModel"
              multiple
              collapse-tags
              collapse-tags-tooltip
              clearable
              filterable
              placeholder="团队（可多选）"
              class="w260"
              :disabled="loading || teamSelectDisabled"
              @clear="onAutoSearchByClear"
              @change="onFinanceTeamChange"
          >
            <el-option v-for="t in resolvedTeamOptions" :key="t.value" :label="t.label" :value="t.value"/>
          </el-select>

          <el-select
              v-else
              v-model="financeTeamSingleModel"
              clearable
              filterable
              placeholder="团队"
              class="w180"
              :disabled="loading || teamSelectDisabled"
              @clear="onAutoSearchByClear"
              @change="onFinanceTeamChange"
          >
            <el-option v-for="t in resolvedTeamOptions" :key="t.value" :label="t.label" :value="t.value"/>
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

          <RemotePagedSelect
              v-model="model.channel_group_id"
              type="channels"
              placeholder="渠道"
              select-class="w180"
              :disabled="loading"
          />

          <RemotePagedSelect
              v-model="model.customer_group_id"
              type="customers"
              placeholder="客户"
              select-class="w180"
              :disabled="loading"
          />

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
            <el-option label="是" :value="true"/>
            <el-option label="否" :value="false"/>
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
            <el-option label="是" :value="true"/>
            <el-option label="否" :value="false"/>
          </el-select>

          <el-button type="primary" @click="emitSearch" :loading="loading">查询</el-button>
          <el-button @click="emitReset" :disabled="loading">重置</el-button>
        </div>
      </template>

      <template v-else-if="variant === 'users'">
        <div class="row">
          <el-input
              v-model="model.keyword"
              clearable
              placeholder="账号关键字"
              class="w200"
              :disabled="loading"
              @keyup.enter="emitSearch"
              @clear="onAutoSearchByClear"
          />

          <el-select
              v-model="model.role"
              clearable
              filterable
              placeholder="角色"
              class="w180"
              :disabled="loading"
              @clear="onAutoSearchByClear"
              @change="onSelectChange"
          >
            <el-option
                v-for="opt in resolvedUserRoleOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
            />
          </el-select>

          <el-button type="primary" @click="emitSearch" :loading="loading">查询</el-button>
          <el-button @click="emitReset" :disabled="loading">重置</el-button>
        </div>
      </template>

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
              <el-select
                  v-model="model.team_name"
                  clearable
                  filterable
                  placeholder="团队"
                  class="w180"
                  :disabled="loading || teamSelectDisabled"
                  @clear="onAutoSearchByClear"
                  @change="onOrderTeamChange"
              >
                <el-option v-for="t in resolvedTeamOptions" :key="t.value" :label="t.label" :value="t.value"/>
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
                  placeholder="订单备注"
                  class="w180"
                  :disabled="loading"
                  @keyup.enter="emitSearch"
                  @clear="onAutoSearchByClear"
              />

              <RemotePagedSelect
                  v-model="model.customer_group_id"
                  type="customers"
                  placeholder="客户"
                  select-class="w180"
                  :disabled="loading"
              />

              <RemotePagedSelect
                  v-model="model.channel_group_id"
                  type="channels"
                  placeholder="渠道"
                  select-class="w180"
                  :disabled="loading"
              />

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
                    :label="u.real_name || u.username"
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
import {computed, nextTick, onMounted, ref, watch} from "vue";
import RemotePagedSelect from "@/components/common/RemotePagedSelect.vue";

const props = defineProps({
  modelValue: {type: Object, required: true},
  loading: {type: Boolean, default: false},

  variant: {type: String, default: "orders"},

  salespersons: {type: Array, default: () => []},
  showSalesperson: {type: Boolean, default: true},

  teamOptions: {type: Array, default: () => []},
  capabilities: {type: Object, default: () => ({})},
  userTeamNames: {type: Array, default: () => []},
  roleName: {type: String, default: ""},

  userRoleOptions: {type: Array, default: () => []},
});

const emit = defineEmits(["update:modelValue", "search", "reset", "team-change"]);

const showMore = ref(false);

const roleNorm = computed(() => String(props.roleName || "").trim().toLowerCase());
const isSuperAdmin = computed(() => roleNorm.value === "super_admin" || roleNorm.value === "superadmin");
const isManager = computed(() => roleNorm.value === "manager");

const financeTeamMultiple = computed(() => props.variant === "finance");

function cloneObj(v) {
  try {
    return JSON.parse(JSON.stringify(v || {}));
  } catch {
    return {...(v || {})};
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
  if (!v || !Array.isArray(v) || v.length !== 2) return null;
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

function normalizeTeamNames(v) {
  const arr = Array.isArray(v) ? v : [];
  const out = [];
  for (const x of arr) {
    const s = normalizeTeamName(x);
    if (s) out.push(s);
  }
  return Array.from(new Set(out));
}

function normalizeUserRole(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().toLowerCase();
  return s || null;
}

function normalizeModel(obj) {
  const m = cloneObj(obj);

  if ("created_date" in m) m.created_date = normalizeRange(m.created_date);
  if ("first_register_date" in m) m.first_register_date = normalizeRange(m.first_register_date);
  if ("team_name" in m) m.team_name = normalizeTeamName(m.team_name);
  if ("team_names" in m) m.team_names = normalizeTeamNames(m.team_names);
  if ("role" in m) m.role = normalizeUserRole(m.role);
  if ("keyword" in m) m.keyword = String(m.keyword ?? "").trim();

  return m;
}

function normalizeOutgoing(obj) {
  const m = cloneObj(obj);
  if ("created_date" in m) m.created_date = normalizeRange(m.created_date);
  if ("first_register_date" in m) m.first_register_date = normalizeRange(m.first_register_date);
  if ("team_name" in m) m.team_name = normalizeTeamName(m.team_name);
  if ("team_names" in m) m.team_names = normalizeTeamNames(m.team_names);
  if ("role" in m) m.role = normalizeUserRole(m.role);
  if ("keyword" in m) m.keyword = String(m.keyword ?? "").trim();
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
    {deep: true}
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
    {deep: true}
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
  if (typeof t === "string") return t.trim();
  return String(t.label ?? t.team_name ?? t.name ?? t.value ?? "").trim();
}

function _teamValueOf(t) {
  if (t === null || t === undefined) return null;
  if (typeof t === "string") return normalizeTeamName(t);
  return normalizeTeamName(t.value ?? t.team_name ?? t.name ?? t.label);
}

const resolvedTeamOptions = computed(() => {
  let items = _asList(props.teamOptions)
      .map((t) => {
        const value = _teamValueOf(t);
        const label = _teamLabelOf(t) || (value || "");
        return value ? {value, label} : null;
      })
      .filter(Boolean);

  if (!items.length) {
    items = _asList(props.userTeamNames)
        .map((x) => {
          const value = normalizeTeamName(x);
          return value ? {value, label: value} : null;
        })
        .filter(Boolean);
  }

  const map = new Map();
  for (const it of items) map.set(it.value, it.label);

  return Array.from(map.entries())
      .map(([value, label]) => ({value, label}))
      .sort((a, b) => String(a.value).localeCompare(String(b.value), "zh-CN"));
});

const resolvedTeamValues = computed(() => resolvedTeamOptions.value.map((x) => x.value));
const teamSelectDisabled = computed(() => resolvedTeamOptions.value.length <= 1);

const financeTeamSingleModel = computed({
  get() {
    const arr = normalizeTeamNames(model.value?.team_names);
    return arr[0] || null;
  },
  set(val) {
    const t = normalizeTeamName(val);
    model.value.team_names = t ? [t] : [];
  },
});

const financeTeamMultiModel = computed({
  get() {
    return normalizeTeamNames(model.value?.team_names);
  },
  set(vals) {
    model.value.team_names = normalizeTeamNames(vals);
  },
});

let _defaultTeamApplied = false;

function applyDefaultTeamOnce() {
  if (_defaultTeamApplied) return;
  _defaultTeamApplied = true;

  const teamValues = resolvedTeamValues.value;

  if (props.variant === "finance") {
    const cur = normalizeTeamNames(model.value?.team_names).filter((x) => teamValues.includes(x));

    if (isSuperAdmin.value) {
      model.value.team_names = cur;
      return;
    }

    if (isManager.value) {
      model.value.team_names = cur.length ? cur : (teamValues[0] ? [teamValues[0]] : []);
      return;
    }

    model.value.team_names = cur.length ? [cur[0]] : [];
    return;
  }

  if (props.variant === "users") {
    return;
  }

  const cur = normalizeTeamName(model.value?.team_name);
  const hasCur = !!cur && teamValues.includes(cur);

  if (isSuperAdmin.value) {
    model.value.team_name = hasCur ? cur : null;
    return;
  }

  if (isManager.value) {
    if (hasCur) return;
    model.value.team_name = teamValues[0] || null;
    return;
  }

  model.value.team_name = hasCur ? cur : null;
}

onMounted(() => {
  applyDefaultTeamOnce();
});

watch(
    () => [props.variant, roleNorm.value, resolvedTeamValues.value.join("|")],
    () => {
      _defaultTeamApplied = false;
      nextTick(() => applyDefaultTeamOnce());
    }
);

const filteredSalespersons = computed(() => {
  return Array.isArray(props.salespersons) ? props.salespersons : [];
});

const resolvedUserRoleOptions = computed(() => {
  const raw = Array.isArray(props.userRoleOptions) && props.userRoleOptions.length
      ? props.userRoleOptions
      : [
        {label: "经理账号", value: "manager"},
        {label: "业务账号", value: "sales"},
        {label: "财务账号", value: "finance"},
        {label: "市场账号", value: "market"},
      ];

  return raw
      .map((x) => {
        if (!x) return null;
        if (typeof x === "string") {
          const v = normalizeUserRole(x);
          return v ? {label: v, value: v} : null;
        }
        const value = normalizeUserRole(x.value ?? x.role_name ?? x.name ?? x.label);
        const label = String(x.label ?? x.name ?? x.role_name ?? x.value ?? "").trim();
        return value ? {value, label: label || value} : null;
      })
      .filter(Boolean);
});

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

function onOrderTeamChange(v) {
  if (props.loading) return;

  let nextTeam = normalizeTeamName(v);

  if (isManager.value && !nextTeam) {
    nextTeam = resolvedTeamOptions.value[0]?.value || null;
  }

  if (nextTeam && !resolvedTeamValues.value.includes(nextTeam)) {
    nextTeam = null;
  }

  model.value.team_name = nextTeam;

  if ("salesperson_id" in model.value) {
    model.value.salesperson_id = null;
  }

  emit("team-change", nextTeam);
  emit("search");
}

function onFinanceTeamChange(v) {
  if (props.loading) return;

  let teamNames = financeTeamMultiple.value ? normalizeTeamNames(v) : normalizeTeamNames([v]);
  teamNames = teamNames.filter((x) => resolvedTeamValues.value.includes(x));

  if (isManager.value && teamNames.length === 0) {
    const first = resolvedTeamOptions.value[0]?.value;
    if (first) teamNames = [first];
  }

  if (!financeTeamMultiple.value && teamNames.length > 1) {
    teamNames = [teamNames[0]];
  }

  model.value.team_names = teamNames;

  if ("salesperson_id" in model.value) {
    model.value.salesperson_id = null;
  }

  emit("team-change", financeTeamMultiple.value ? [...teamNames] : (teamNames[0] || null));
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
