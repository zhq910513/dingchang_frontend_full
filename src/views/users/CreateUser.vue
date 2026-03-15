<!-- src/views/users/CreateUser.vue -->
<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="90px" autocomplete="off">
    <input type="text" style="display:none" autocomplete="off"/>
    <input type="password" style="display:none" autocomplete="new-password"/>

    <template v-if="!isEdit">
      <el-form-item label="用户名" prop="username">
        <el-input
            v-model="form.username"
            placeholder="请输入登录账号"
            autocomplete="off"
        />
      </el-form-item>

      <el-form-item label="密码" prop="password">
        <el-input
            v-model="form.password"
            type="password"
            show-password
            autocomplete="new-password"
            placeholder="请输入登录密码"
        />
      </el-form-item>

      <el-form-item label="角色类型" prop="role_name">
        <el-select
            v-model="form.role_name"
            placeholder="请选择角色类型"
            style="width: 100%"
            @change="onRoleChange"
        >
          <el-option
              v-for="opt in roleOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
          />
        </el-select>

        <div v-if="!roleOptions.length" style="margin-left: 8px; color: #999; font-size: 12px;">
          当前账号暂无可创建的下级角色
        </div>
      </el-form-item>

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
          <el-option v-for="t in TEAM_NAMES" :key="t" :label="t" :value="t"/>
        </el-select>
        <div style="margin-left: 8px; color: #999; font-size: 12px;">
          经理账号必须分配团队（可多选）
        </div>
      </el-form-item>

      <el-form-item v-if="needChildTeam" label="所属团队" prop="team_name">
        <el-select
            v-model="form.team_name"
            placeholder="请选择所属团队"
            filterable
            clearable
            style="width: 100%"
            :disabled="teamSelectDisabled"
        >
          <el-option v-for="t in childTeamOptions" :key="t" :label="t" :value="t"/>
        </el-select>

        <div v-if="isManager" style="margin-left: 8px; color: #999; font-size: 12px;">
          团队选项来自当前经理账号团队集合
        </div>
      </el-form-item>
    </template>

    <template v-else>
      <el-form-item label="用户名">
        <el-input
            :model-value="displayUsername"
            disabled
            autocomplete="off"
        />
        <div style="margin-left: 8px; color: #999; font-size: 12px;">
          编辑模式不允许修改用户名
        </div>
      </el-form-item>

      <el-form-item label="密码(可选)" prop="password">
        <el-input
            v-model="form.password"
            type="password"
            show-password
            autocomplete="new-password"
            placeholder="不修改请留空"
        />
      </el-form-item>

      <el-form-item v-if="showRoleReadonly" label="角色类型">
        <el-input
            :model-value="displayRoleLabel"
            disabled
            autocomplete="off"
        />
        <div style="margin-left: 8px; color: #999; font-size: 12px;">
          编辑模式不允许修改角色类型
        </div>
      </el-form-item>

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
          <el-option v-for="t in TEAM_NAMES" :key="t" :label="t" :value="t"/>
        </el-select>
        <div style="margin-left: 8px; color: #999; font-size: 12px;">
          经理账号可编辑团队集合
        </div>
      </el-form-item>

      <el-form-item v-if="needChildTeam" label="所属团队" prop="team_name">
        <el-select
            v-model="form.team_name"
            placeholder="请选择所属团队"
            filterable
            clearable
            style="width: 100%"
            :disabled="teamSelectDisabled"
        >
          <el-option v-for="t in childTeamOptions" :key="t" :label="t" :value="t"/>
        </el-select>

        <div v-if="isManager" style="margin-left: 8px; color: #999; font-size: 12px;">
          团队选项来自当前经理账号团队集合
        </div>
      </el-form-item>
    </template>

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
import {computed, onMounted, reactive, ref, watch} from "vue";
import {ElMessage} from "element-plus";
import {createUser, updateUser} from "../../api/users";
import {useSessionStore} from "../../store/session";
import {ROLE, TEAM_NAMES} from "../../constants";

const props = defineProps({
  mode: {type: String, default: "create"}, // create | edit
  initialUser: {type: Object, default: null},
  user: {type: Object, default: null},
});

const emit = defineEmits(["success"]);

const formRef = ref(null);
const loading = ref(false);
const store = useSessionStore();

const isEdit = computed(() => String(props.mode || "create").toLowerCase() === "edit");
const effectiveUser = computed(() => props.initialUser || props.user || null);

const roleName = computed(() => String(store.roleName || "").trim().toLowerCase());
const isSuperAdmin = computed(() => roleName.value === ROLE.SUPER_ADMIN);
const isManager = computed(() => roleName.value === ROLE.MANAGER);

const form = reactive({
  username: "",
  password: "",
  role_name: "",
  team_name: null,
  team_names: [],
});

const origin = ref({
  id: null,
  username: "",
  role_name: "",
});

const ROLE_OPTIONS_MAP = {
  [ROLE.SUPER_ADMIN]: [
    {label: "经理账号", value: ROLE.MANAGER},
    {label: "业务账号", value: ROLE.SALES},
    {label: "财务账号", value: ROLE.FINANCE},
    {label: "市场账号", value: ROLE.MARKET},
  ],
  [ROLE.MANAGER]: [
    {label: "业务账号", value: ROLE.SALES},
    {label: "财务账号", value: ROLE.FINANCE},
    {label: "市场账号", value: ROLE.MARKET},
  ],
};

const roleOptions = computed(() => {
  return ROLE_OPTIONS_MAP[roleName.value] || [];
});

const selectedRole = computed(() => String(form.role_name || "").trim().toLowerCase());

const isManagerRole = computed(() => selectedRole.value === ROLE.MANAGER);
const isChildRole = computed(() => {
  return (
      selectedRole.value === ROLE.SALES ||
      selectedRole.value === ROLE.FINANCE ||
      selectedRole.value === ROLE.MARKET
  );
});

const needManagerTeams = computed(() => {
  return isManagerRole.value;
});

const needChildTeam = computed(() => {
  return isChildRole.value;
});

function normalizeTeamName(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s || null;
}

function normalizeTeamNames(v) {
  const arr = Array.isArray(v) ? v : [];
  const cleaned = [...new Set(arr.map((x) => String(x || "").trim()).filter(Boolean))];
  return cleaned.sort();
}

function getMyTeams() {
  const u = store.user || {};
  const arr = [
    ...(Array.isArray(u.team_names) ? u.team_names : []),
    ...(u.team_name ? [u.team_name] : []),
  ];
  return normalizeTeamNames(arr);
}

const childTeamOptions = computed(() => {
  if (!needChildTeam.value) return [];
  if (isManager.value) return getMyTeams();

  // super_admin 创建子账号时，当前后端真源并没有“归属经理/经理团队联动”契约
  // 因此零兼容收口：直接使用全量团队白名单
  if (isSuperAdmin.value) return [...TEAM_NAMES];

  return [];
});

const teamSelectDisabled = computed(() => {
  return childTeamOptions.value.length <= 1;
});

function autoPickSingleTeam() {
  const options = childTeamOptions.value || [];
  if (options.length === 1) {
    form.team_name = options[0];
  }
}

watch(
    () => form.role_name,
    () => {
      form.team_name = null;
      form.team_names = [];
      autoPickSingleTeam();
    }
);

watch(
    () => childTeamOptions.value.join("|"),
    () => {
      autoPickSingleTeam();
    }
);

const rules = computed(() => {
  const base = {};

  if (!isEdit.value) {
    base.username = [
      {required: true, message: "请输入用户名", trigger: "blur"},
      {min: 3, max: 32, message: "长度在 3-32 个字符", trigger: "blur"},
    ];
    base.password = [
      {required: true, message: "请输入密码", trigger: "blur"},
      {min: 6, message: "至少 6 位密码", trigger: "blur"},
    ];
    base.role_name = [{required: true, message: "请选择角色", trigger: "change"}];
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

  if (needManagerTeams.value) {
    base.team_names = [
      {required: true, type: "array", message: "请选择团队（可多选）", trigger: "change"},
    ];
  }

  if (needChildTeam.value && childTeamOptions.value.length > 0) {
    base.team_name = [{required: true, message: "请选择所属团队", trigger: "change"}];
  }

  return base;
});

function roleLabelOf(role) {
  const r = String(role || "").trim().toLowerCase();
  const item = roleOptions.value.find((x) => String(x.value || "").trim().toLowerCase() === r);

  if (item?.label) return item.label;
  if (r === ROLE.MANAGER) return "经理账号";
  if (r === ROLE.SALES) return "业务账号";
  if (r === ROLE.FINANCE) return "财务账号";
  if (r === ROLE.MARKET) return "市场账号";
  if (r === ROLE.SUPER_ADMIN) return "超级管理员";
  return "-";
}

const displayUsername = computed(() => {
  return String(origin.value.username || form.username || "").trim();
});

const displayRoleLabel = computed(() => {
  return roleLabelOf(origin.value.role_name || form.role_name);
});

const showRoleReadonly = computed(() => {
  return Boolean(displayRoleLabel.value && displayRoleLabel.value !== "-");
});

function applyEditUser(u) {
  const user = u && typeof u === "object" ? u : null;
  if (!user) return;

  const roleNameFromUser = String(user.role_name || "").trim().toLowerCase();

  form.username = String(user.username || "").trim();
  form.password = "";
  form.role_name = roleNameFromUser;
  form.team_name = normalizeTeamName(user.team_name);
  form.team_names = normalizeTeamNames(user.team_names);

  origin.value = {
    id: user.id ?? null,
    username: String(user.username || "").trim(),
    role_name: roleNameFromUser,
  };

  autoPickSingleTeam();
}

async function submit() {
  if (!formRef.value) return;

  try {
    loading.value = true;
    await formRef.value.validate();

    if (!isEdit.value) {
      if (!roleOptions.value.length) {
        ElMessage.error("当前账号无可创建的角色类型");
        return;
      }

      const payload = {
        username: form.username,
        password: form.password,
        role_name: form.role_name,
      };

      if (needManagerTeams.value) {
        payload.team_names = normalizeTeamNames(form.team_names);
        if (payload.team_names.length > 0) {
          payload.team_name = payload.team_names[0];
        }
      } else if (needChildTeam.value) {
        payload.team_name = normalizeTeamName(form.team_name);
      }

      await createUser(payload);

      ElMessage.success("创建成功");
      emit("success");

      form.username = "";
      form.password = "";
      form.role_name = "";
      form.team_name = null;
      form.team_names = [];
      formRef.value?.clearValidate?.();
      return;
    }

    const uid = Number(origin.value?.id);
    if (!Number.isFinite(uid) || uid <= 0) {
      ElMessage.error("缺少 user.id，无法保存");
      return;
    }

    const payload = {};

    const pwd = String(form.password || "").trim();
    if (pwd) {
      payload.password = pwd;
    }

    if (needManagerTeams.value) {
      payload.team_names = normalizeTeamNames(form.team_names);
      payload.team_name = payload.team_names.length ? payload.team_names[0] : null;
    } else if (needChildTeam.value) {
      payload.team_name = normalizeTeamName(form.team_name);
      payload.team_names = [];
    }

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
  autoPickSingleTeam();

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
    {deep: true}
);
</script>

<style scoped>
.form-actions {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}
</style>
