<!-- src/views/users/CreateUser.vue -->
<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="90px" autocomplete="off">
    <input type="text" style="display:none" autocomplete="off" />
    <input type="password" style="display:none" autocomplete="new-password" />

    <el-form-item label="用户名" prop="username">
      <el-input
        v-model="form.username"
        placeholder="请输入登录账号"
        autocomplete="off"
        :disabled="isEdit && !canEditUsername"
      />
      <div v-if="isEdit && !canEditUsername" style="margin-left: 8px; color: #999; font-size: 12px;">
        当前角色无权限修改用户名
      </div>
    </el-form-item>

    <el-form-item label="角色姓名" prop="real_name">
      <el-input v-model="form.real_name" placeholder="请输入业务员/财务姓名" autocomplete="off" />
    </el-form-item>

    <el-form-item :label="isEdit ? '密码(可选)' : '密码'" prop="password">
      <el-input
        v-model="form.password"
        type="password"
        show-password
        autocomplete="new-password"
        :placeholder="isEdit ? '不修改请留空' : '请输入登录密码'"
      />
    </el-form-item>

    <el-form-item label="角色类型" prop="role_id">
      <el-select
        v-model="form.role_id"
        placeholder="请选择角色类型"
        style="width: 100%"
        :disabled="isEdit"
        @change="onRoleChange"
      >
        <el-option v-for="opt in roleOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>

      <div v-if="!roleOptions.length" style="margin-left: 8px; color: #999; font-size: 12px;">
        当前账号暂无可创建的下级角色
      </div>
      <div v-if="isEdit" style="margin-left: 8px; color: #999; font-size: 12px;">
        编辑模式不允许修改角色类型
      </div>
    </el-form-item>

    <!-- ✅ 编辑：状态 -->
    <el-form-item v-if="isEdit" label="状态" prop="status">
      <el-select v-model="form.status" style="width: 100%" placeholder="请选择状态">
        <el-option label="启用" :value="1" />
        <el-option label="禁用" :value="0" />
      </el-select>
    </el-form-item>

    <!-- ✅ super_admin 创建/编辑经理：团队多选 -->
    <el-form-item v-if="needManagerTeams" label="团队" prop="team_names">
      <el-select
        v-model="form.team_names"
        multiple
        filterable
        clearable
        collapse-tags
        collapse-tags-tooltip
        placeholder="请选择团队（可多选）"
        style="width: 100%"
      >
        <el-option v-for="t in TEAM_NAMES" :key="t" :label="t" :value="t" />
      </el-select>
      <div style="margin-left: 8px; color: #999; font-size: 12px;">
        经理账号必须分配团队（可多选）
      </div>
    </el-form-item>

    <!-- ✅ super_admin 创建下属：必须选择归属经理（编辑模式下本页一般拿不到该类账号，但保留能力） -->
    <el-form-item v-if="needManager" label="归属经理" prop="manager_id">
      <el-select
        v-model="form.manager_id"
        placeholder="请选择归属经理"
        filterable
        clearable
        style="width: 100%"
        :loading="managersLoading"
        @change="onManagerChange"
      >
        <el-option
          v-for="m in managers"
          :key="m.id"
          :label="`${m.real_name || '-'}（${m.username}）`"
          :value="m.id"
        />
      </el-select>
      <div style="margin-left: 8px; color: #999; font-size: 12px;">
        超级账号创建业务/财务/市场必须挂在某个经理名下
      </div>
    </el-form-item>

    <!-- ✅ 下属账号团队选择 -->
    <el-form-item v-if="needChildTeam" label="所属团队" prop="team_name">
      <el-select
        v-model="form.team_name"
        placeholder="请选择所属团队"
        filterable
        clearable
        style="width: 100%"
        :disabled="teamSelectDisabled"
        :loading="myTeamsLoading"
      >
        <el-option v-for="t in childTeamOptions" :key="t" :label="t" :value="t" />
      </el-select>

      <div v-if="isSuperAdmin && needManager" style="margin-left: 8px; color: #999; font-size: 12px;">
        团队选项来自“所选归属经理”的团队集合
      </div>
      <div v-else-if="isManager" style="margin-left: 8px; color: #999; font-size: 12px;">
        团队选项来自“当前经理账号创建时分配的团队集合”
      </div>
    </el-form-item>

    <el-form-item>
      <div class="form-actions">
        <el-button type="primary" :loading="loading" @click="submit">
          {{ isEdit ? "保存" : "创建" }}
        </el-button>
      </div>
    </el-form-item>
  </el-form>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { createUser, listManagers, getMe, updateUser } from "../../api/users";
import { useSessionStore } from "../../store/session";
import { ROLE, TEAM_NAMES } from "../../constants";

const props = defineProps({
  mode: { type: String, default: "create" }, // "create" | "edit"

  // ✅ 兼容：UserList.vue 传的是 initial-user；旧代码可能传 user
  initialUser: { type: Object, default: null },
  user: { type: Object, default: null },
});

const emit = defineEmits(["success"]);

const formRef = ref(null);
const loading = ref(false);
const store = useSessionStore();

const isEdit = computed(() => String(props.mode || "create").toLowerCase() === "edit");

const _storeRole = computed(() => String(store.roleName || "").trim().toLowerCase());
const isSuperAdmin = computed(() => _storeRole.value === String(ROLE.SUPER_ADMIN).toLowerCase());
const isManager = computed(() => _storeRole.value === String(ROLE.MANAGER).toLowerCase());

const form = reactive({
  username: "",
  real_name: "",
  password: "",
  role_id: null,

  manager_id: null,
  team_names: [],
  team_name: null,

  status: 1,
});

const origin = ref({
  id: null,
  username: "",
  role_id: null,
});

const managers = ref([]);
const managersLoading = ref(false);

const myTeams = ref([]);
const myTeamsLoading = ref(false);

// role_id（数值）来自后端 Role.id：1=super_admin 2=manager 3=sales 4=finance 5=market
const ROLE_ID = {
  MANAGER: 2,
  SALES: 3,
  FINANCE: 4,
  MARKET: 5,
};

const ROLE_OPTIONS_MAP = {
  [String(ROLE.SUPER_ADMIN).toLowerCase()]: [
    { label: "经理账号", value: ROLE_ID.MANAGER },
    { label: "业务账号", value: ROLE_ID.SALES },
    { label: "财务账号", value: ROLE_ID.FINANCE },
    { label: "市场账号", value: ROLE_ID.MARKET },
  ],
  [String(ROLE.MANAGER).toLowerCase()]: [
    { label: "业务账号", value: ROLE_ID.SALES },
    { label: "财务账号", value: ROLE_ID.FINANCE },
    { label: "市场账号", value: ROLE_ID.MARKET },
  ],
};

const roleOptions = computed(() => {
  return ROLE_OPTIONS_MAP[_storeRole.value] || [];
});

const canEditUsername = computed(() => isSuperAdmin.value);

const isCreatingManager = computed(() => Number(form.role_id) === ROLE_ID.MANAGER);
const isCreatingChild = computed(() => {
  const rid = Number(form.role_id);
  return rid === ROLE_ID.SALES || rid === ROLE_ID.FINANCE || rid === ROLE_ID.MARKET;
});

// super_admin 创建下属：必须选择归属经理（编辑场景一般不会用到，但保留）
const needManager = computed(() => {
  return isSuperAdmin.value && isCreatingChild.value;
});

// super_admin 创建/编辑经理：必须选择团队（多选）
const needManagerTeams = computed(() => {
  return isSuperAdmin.value && isCreatingManager.value;
});

// 下属账号团队选择：
// - manager 创建/编辑：用当前经理的团队集合
// - super_admin 创建下属：用所选 manager 的团队集合
const needChildTeam = computed(() => {
  return isCreatingChild.value && (isManager.value || (isSuperAdmin.value && needManager.value));
});

function _asArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return [v];
}

function _normalizeTeams(arr) {
  const out = [];
  for (const x of _asArray(arr)) {
    const s = (x == null ? "" : String(x)).trim();
    if (!s) continue;
    out.push(s);
  }
  return Array.from(new Set(out)).sort();
}

const selectedManager = computed(() => {
  if (!form.manager_id) return null;
  const mid = Number(form.manager_id);
  return (managers.value || []).find((x) => Number(x.id) === mid) || null;
});

const childTeamOptions = computed(() => {
  if (!needChildTeam.value) return [];
  if (isManager.value) return _normalizeTeams(myTeams.value || []);
  if (isSuperAdmin.value) {
    const m = selectedManager.value;
    if (!m) return [];
    const tns = _normalizeTeams(m.team_names || []);
    const tn = (m.team_name || "").trim();
    return _normalizeTeams([...tns, ...(tn ? [tn] : [])]);
  }
  return [];
});

const teamSelectDisabled = computed(() => {
  if (!childTeamOptions.value.length) return true;
  if (isSuperAdmin.value && needManager.value && !form.manager_id) return true;
  if (childTeamOptions.value.length === 1) return true;
  return false;
});

const rules = computed(() => {
  const base = {
    username: [
      { required: true, message: "请输入用户名", trigger: "blur" },
      { min: 3, max: 32, message: "长度在 3-32 个字符", trigger: "blur" },
    ],
    real_name: [{ required: true, message: "请输入角色姓名", trigger: "blur" }],
    role_id: [{ required: true, message: "请选择角色", trigger: "change" }],
    status: [{ required: true, message: "请选择状态", trigger: "change" }],
  };

  if (!isEdit.value) {
    base.password = [
      { required: true, message: "请输入密码", trigger: "blur" },
      { min: 6, message: "至少 6 位密码", trigger: "blur" },
    ];
  } else {
    base.password = [
      {
        validator: (_rule, val, cb) => {
          const s = String(val ?? "").trim();
          if (!s) return cb();
          if (s.length < 6) return cb(new Error("至少 6 位密码"));
          return cb();
        },
        trigger: "blur",
      },
    ];
  }

  if (needManager.value) {
    base.manager_id = [{ required: true, message: "请选择归属经理", trigger: "change" }];
  }

  if (needManagerTeams.value) {
    base.team_names = [{ required: true, type: "array", message: "请选择团队（可多选）", trigger: "change" }];
  }

  if (needChildTeam.value && childTeamOptions.value.length > 0) {
    base.team_name = [{ required: true, message: "请选择所属团队", trigger: "change" }];
  }

  return base;
});

async function loadManagersIfNeeded() {
  if (!needManager.value) return;

  managersLoading.value = true;
  try {
    const resp = await listManagers({ status: 1 });
    managers.value = resp?.data || resp || [];
  } catch (e) {
    console.error(e);
    ElMessage.error(e?.response?.data?.detail || "加载经理列表失败");
  } finally {
    managersLoading.value = false;
  }
}

async function loadMyTeamsIfNeeded() {
  if (!isManager.value) return;
  if (!needChildTeam.value) return;

  const u = store.user || null;
  const fromStore = _normalizeTeams([...(u?.team_names || []), ...(u?.team_name ? [u.team_name] : [])]);
  if (fromStore.length) {
    myTeams.value = fromStore;
    return;
  }

  myTeamsLoading.value = true;
  try {
    const resp = await getMe();
    const data = resp?.data || resp || {};
    const tns = _normalizeTeams([...(data.team_names || []), ...(data.team_name ? [data.team_name] : [])]);
    myTeams.value = tns;
  } catch (e) {
    console.error(e);
    ElMessage.error(e?.response?.data?.detail || "加载当前账号团队失败");
  } finally {
    myTeamsLoading.value = false;
  }
}

function _autoPickSingleTeam() {
  const opts = childTeamOptions.value || [];
  if (opts.length === 1) {
    form.team_name = opts[0];
  }
}

function onManagerChange() {
  form.team_name = null;
  _autoPickSingleTeam();
}

function onRoleChange() {
  if (isEdit.value) return;

  form.manager_id = null;
  form.team_name = null;
  form.team_names = [];

  if (needManager.value) loadManagersIfNeeded();
  if (needChildTeam.value) loadMyTeamsIfNeeded();
}

watch(
  () => needManager.value,
  (v) => {
    if (!v) form.manager_id = null;
    if (v) loadManagersIfNeeded();
  }
);

watch(
  () => needManagerTeams.value,
  (v) => {
    if (!v) form.team_names = [];
  }
);

watch(
  () => needChildTeam.value,
  (v) => {
    if (!v) form.team_name = null;
    if (v) {
      loadMyTeamsIfNeeded();
      _autoPickSingleTeam();
    }
  }
);

watch(
  () => [form.manager_id, childTeamOptions.value.length],
  () => {
    _autoPickSingleTeam();
  }
);

function _roleIdFromRoleName(roleName) {
  const rn = String(roleName || "").trim().toLowerCase();
  if (rn === String(ROLE.MANAGER).toLowerCase()) return ROLE_ID.MANAGER;
  if (rn === String(ROLE.SALES).toLowerCase()) return ROLE_ID.SALES;
  if (rn === String(ROLE.FINANCE).toLowerCase()) return ROLE_ID.FINANCE;
  if (rn === String(ROLE.MARKET).toLowerCase()) return ROLE_ID.MARKET;
  return null;
}

function applyEditUser(u) {
  const user = u && typeof u === "object" ? u : null;
  if (!user) return;

  const rid = _roleIdFromRoleName(user.role_name);
  form.role_id = rid;

  form.username = user.username || "";
  form.real_name = user.real_name || "";
  form.password = ""; // 编辑默认不改
  form.status = Number.isFinite(Number(user.status)) ? Number(user.status) : 1;

  form.team_name = user.team_name || null;

  // ✅ 关键补丁：后端只给 team_name 不给 team_names 时，编辑经理会校验失败；这里兜底补齐
  const tns0 = Array.isArray(user.team_names) ? [...user.team_names] : [];
  const tn0 = String(user.team_name || "").trim();
  const tns = _normalizeTeams([...tns0, ...(tn0 ? [tn0] : [])]);
  form.team_names = tns;

  form.manager_id = user.manager_id || null;

  origin.value = {
    id: user.id ?? null,
    username: user.username || "",
    role_id: rid,
  };

  if (needChildTeam.value) {
    loadMyTeamsIfNeeded();
    _autoPickSingleTeam();
  }
}

const effectiveUser = computed(() => props.initialUser || props.user || null);

async function submit() {
  if (!formRef.value) return;

  try {
    loading.value = true;
    await formRef.value.validate();

    if (!roleOptions.value.length && !isEdit.value) {
      ElMessage.error("当前账号无可创建的角色类型");
      return;
    }

    if (!isEdit.value) {
      // ✅ 创建经理账号时：自动把 team_name 设为 team_names 第一个（更兼容后端）
      const mgrTeamName =
        needManagerTeams.value && Array.isArray(form.team_names) && form.team_names.length
          ? String(form.team_names[0] || "").trim()
          : "";

      await createUser({
        username: form.username,
        password: form.password,
        real_name: form.real_name,
        role_id: form.role_id,

        manager_id: needManager.value ? form.manager_id : undefined,
        team_names: needManagerTeams.value ? form.team_names : undefined,

        // child 用 form.team_name；manager 用 team_names[0] 兜底
        team_name: needChildTeam.value ? form.team_name : (mgrTeamName ? mgrTeamName : undefined),
      });

      ElMessage.success("创建成功");
      emit("success");

      form.username = "";
      form.real_name = "";
      form.password = "";
      form.role_id = null;
      form.manager_id = null;
      form.team_names = [];
      form.team_name = null;
      form.status = 1;
      formRef.value?.clearValidate?.();
      return;
    }

    const uid = Number(origin.value?.id);
    if (!Number.isFinite(uid) || uid <= 0) {
      ElMessage.error("缺少 user.id，无法保存");
      return;
    }

    const payload = {
      real_name: form.real_name,
      status: Number(form.status),
    };

    if (canEditUsername.value && String(form.username || "") !== String(origin.value.username || "")) {
      payload.username = form.username;
    }

    const pwd = String(form.password || "").trim();
    if (pwd) payload.password = pwd;

    if (needManagerTeams.value) {
      payload.team_names = form.team_names;
      if (form.team_name) payload.team_name = form.team_name;
      // 兜底：如果 team_name 为空，给第一个
      if (!payload.team_name && Array.isArray(form.team_names) && form.team_names.length) {
        payload.team_name = String(form.team_names[0] || "").trim() || undefined;
      }
    } else if (needChildTeam.value) {
      payload.team_name = form.team_name;
    }

    if (needManager.value) payload.manager_id = form.manager_id;

    await updateUser(uid, payload);

    ElMessage.success("保存成功");
    emit("success");

    form.password = "";
    formRef.value?.clearValidate?.();
  } catch (e) {
    console.error(e);
    const msg = e?.response?.data?.detail || e?.message || (isEdit.value ? "保存失败" : "创建失败");
    ElMessage.error(msg);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (needManager.value) loadManagersIfNeeded();
  if (needChildTeam.value) loadMyTeamsIfNeeded();
  _autoPickSingleTeam();

  if (isEdit.value && effectiveUser.value) {
    applyEditUser(effectiveUser.value);
  }
});

watch(
  () => effectiveUser.value,
  (u) => {
    if (!isEdit.value) return;
    if (!u) return;
    applyEditUser(u);
  },
  { deep: true }
);
</script>

<style scoped>
.form-actions {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}
</style>
