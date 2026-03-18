<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="90px" autocomplete="off">
    <input type="text" style="display:none" autocomplete="off" />
    <input type="password" style="display:none" autocomplete="new-password" />

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
          clearable
          @change="handleRoleChange"
        >
          <el-option
            v-for="option in roleOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
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
          <el-option
            v-for="team in TEAM_NAMES"
            :key="team"
            :label="team"
            :value="team"
          />
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
          :disabled="childTeamOptions.length <= 1"
        >
          <el-option
            v-for="team in childTeamOptions"
            :key="team"
            :label="team"
            :value="team"
          />
        </el-select>

        <div v-if="isManager" style="margin-left: 8px; color: #999; font-size: 12px;">
          团队选项来自当前经理账号团队集合
        </div>
        <div
          v-if="needChildTeam && !childTeamOptions.length"
          style="margin-left: 8px; color: #f56c6c; font-size: 12px;"
        >
          当前账号没有可分配团队，无法创建该子账号
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

      <el-form-item label="重置密码(可选)" prop="password">
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
          <el-option
            v-for="team in TEAM_NAMES"
            :key="team"
            :label="team"
            :value="team"
          />
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
          :disabled="childTeamOptions.length <= 1"
        >
          <el-option
            v-for="team in childTeamOptions"
            :key="team"
            :label="team"
            :value="team"
          />
        </el-select>

        <div v-if="isManager" style="margin-left: 8px; color: #999; font-size: 12px;">
          团队选项来自当前经理账号团队集合
        </div>
        <div
          v-if="needChildTeam && !childTeamOptions.length"
          style="margin-left: 8px; color: #f56c6c; font-size: 12px;"
        >
          当前账号没有可分配团队，无法保存该子账号
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
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { createUser, updateUser } from "../../api/users";
import { useSessionStore } from "../../store/session";
import { ROLE, TEAM_NAMES } from "../../constants";

const props = defineProps({
  mode: { type: String, default: "create" },
  initialUser: { type: Object, default: null },
  user: { type: Object, default: null },
  allowedRoleNames: { type: Array, default: () => [] },
});

const emit = defineEmits(["success"]);

const formRef = ref(null);
const loading = ref(false);
const store = useSessionStore();

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

function normalizeString(value) {
  return String(value || "").trim();
}

function normalizeLowerString(value) {
  return normalizeString(value).toLowerCase();
}

function normalizeTeamName(value) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function normalizeTeamNames(value) {
  const rawList = Array.isArray(value) ? value : [];
  return [...new Set(rawList.map((item) => normalizeString(item)).filter(Boolean))].sort();
}

const isEdit = computed(() => normalizeLowerString(props.mode || "create") === "edit");
const effectiveUser = computed(() => props.initialUser || props.user || null);

const currentRoleName = computed(() => normalizeLowerString(store.roleName));
const isSuperAdmin = computed(() => currentRoleName.value === ROLE.SUPER_ADMIN);
const isManager = computed(() => currentRoleName.value === ROLE.MANAGER);

const ROLE_OPTION_MAP = {
  [ROLE.MANAGER]: { label: "经理账号", value: ROLE.MANAGER },
  [ROLE.SALES]: { label: "业务账号", value: ROLE.SALES },
  [ROLE.FINANCE]: { label: "财务账号", value: ROLE.FINANCE },
  [ROLE.MARKET]: { label: "市场账号", value: ROLE.MARKET },
  [ROLE.SUPER_ADMIN]: { label: "超级管理员", value: ROLE.SUPER_ADMIN },
};

const allowedRoleNamesNormalized = computed(() => {
  const rawList = Array.isArray(props.allowedRoleNames) ? props.allowedRoleNames : [];
  return [...new Set(rawList.map((item) => normalizeLowerString(item)).filter(Boolean))];
});

const roleOptions = computed(() => {
  return allowedRoleNamesNormalized.value
    .map((roleName) => ROLE_OPTION_MAP[roleName])
    .filter(Boolean);
});

const selectedRole = computed(() => normalizeLowerString(form.role_name));
const needManagerTeams = computed(() => selectedRole.value === ROLE.MANAGER);
const needChildTeam = computed(() => {
  return [ROLE.SALES, ROLE.FINANCE, ROLE.MARKET].includes(selectedRole.value);
});

function getMyTeams() {
  const currentUser = store.user || {};
  const allTeams = [
    ...(Array.isArray(currentUser.team_names) ? currentUser.team_names : []),
    ...(currentUser.team_name ? [currentUser.team_name] : []),
  ];
  return normalizeTeamNames(allTeams);
}

const childTeamOptions = computed(() => {
  if (!needChildTeam.value) return [];
  if (isManager.value) return getMyTeams();
  if (isSuperAdmin.value) return [...TEAM_NAMES];
  return [];
});

function applyCreateRoleDefaults() {
  if (needManagerTeams.value) {
    form.team_name = null;
    form.team_names = Array.isArray(form.team_names) ? form.team_names : [];
    return;
  }

  if (needChildTeam.value) {
    form.team_names = [];
    const options = childTeamOptions.value || [];
    if (options.length === 1) {
      form.team_name = options[0];
      return;
    }
    if (!options.includes(normalizeTeamName(form.team_name))) {
      form.team_name = null;
    }
    return;
  }

  form.team_name = null;
  form.team_names = [];
}

function handleRoleChange() {
  if (!isEdit.value) {
    form.team_name = null;
    form.team_names = [];
    applyCreateRoleDefaults();
  }
}

function applyEditUser(userValue) {
  const currentUser = userValue && typeof userValue === "object" ? userValue : null;
  if (!currentUser) return;

  form.username = normalizeString(currentUser.username);
  form.password = "";
  form.role_name = normalizeLowerString(currentUser.role_name);
  form.team_name = normalizeTeamName(currentUser.team_name);
  form.team_names = normalizeTeamNames(currentUser.team_names);

  origin.value = {
    id: currentUser.id ?? null,
    username: normalizeString(currentUser.username),
    role_name: normalizeLowerString(currentUser.role_name),
  };

  if (needChildTeam.value) {
    const options = childTeamOptions.value || [];
    if (options.length === 1) {
      form.team_name = options[0];
    } else if (!options.includes(normalizeTeamName(form.team_name))) {
      form.team_name = null;
    }
  }
}

watch(
  () => effectiveUser.value,
  (userValue) => {
    if (!isEdit.value || !userValue) return;
    applyEditUser(userValue);
  },
  { deep: true },
);

const rules = computed(() => {
  const result = {};

  if (!isEdit.value) {
    result.username = [
      { required: true, message: "请输入用户名", trigger: "blur" },
      { min: 3, max: 32, message: "长度在 3-32 个字符", trigger: "blur" },
    ];
    result.password = [
      { required: true, message: "请输入密码", trigger: "blur" },
      { min: 6, message: "至少 6 位密码", trigger: "blur" },
    ];
    result.role_name = [
      { required: true, message: "请选择角色", trigger: "change" },
      {
        validator: (_rule, value, callback) => {
          const selected = normalizeLowerString(value);
          if (!selected) {
            callback(new Error("请选择角色"));
            return;
          }
          if (!allowedRoleNamesNormalized.value.includes(selected)) {
            callback(new Error("当前账号无权限创建该角色"));
            return;
          }
          callback();
        },
        trigger: "change",
      },
    ];
  } else {
    result.password = [
      {
        validator: (_rule, value, callback) => {
          const passwordValue = normalizeString(value);
          if (!passwordValue) {
            callback();
            return;
          }
          if (passwordValue.length < 6) {
            callback(new Error("至少 6 位密码"));
            return;
          }
          callback();
        },
        trigger: "blur",
      },
    ];
  }

  if (needManagerTeams.value) {
    result.team_names = [
      { required: true, type: "array", message: "请选择团队（可多选）", trigger: "change" },
    ];
  }

  if (needChildTeam.value) {
    result.team_name = [
      {
        validator: (_rule, value, callback) => {
          const teamValue = normalizeTeamName(value);
          if (!teamValue) {
            callback(new Error("请选择所属团队"));
            return;
          }
          if (!childTeamOptions.value.length) {
            callback(new Error("当前账号没有可分配团队"));
            return;
          }
          if (!childTeamOptions.value.includes(teamValue)) {
            callback(new Error("所属团队不在可选范围内"));
            return;
          }
          callback();
        },
        trigger: "change",
      },
    ];
  }

  return result;
});

function roleLabelOf(role) {
  const normalizedRole = normalizeLowerString(role);
  return ROLE_OPTION_MAP[normalizedRole]?.label || "-";
}

const displayUsername = computed(() => normalizeString(origin.value.username || form.username));
const displayRoleLabel = computed(() => roleLabelOf(origin.value.role_name || form.role_name));
const showRoleReadonly = computed(() => Boolean(displayRoleLabel.value && displayRoleLabel.value !== "-"));

function clearFormAfterCreate() {
  form.username = "";
  form.password = "";
  form.role_name = "";
  form.team_name = null;
  form.team_names = [];
  formRef.value?.clearValidate?.();
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

      if (needChildTeam.value && !childTeamOptions.value.length) {
        ElMessage.error("当前账号没有可分配团队，无法创建该角色");
        return;
      }

      const payload = {
        username: normalizeString(form.username),
        password: normalizeString(form.password),
        role_name: normalizeLowerString(form.role_name),
      };

      if (needManagerTeams.value) {
        payload.team_names = normalizeTeamNames(form.team_names);
        payload.team_name = payload.team_names.length ? payload.team_names[0] : null;
      } else if (needChildTeam.value) {
        payload.team_name = normalizeTeamName(form.team_name);
      }

      await createUser(payload);
      ElMessage.success("创建成功");
      emit("success");
      clearFormAfterCreate();
      return;
    }

    const userId = Number(origin.value?.id);
    if (!Number.isFinite(userId) || userId <= 0) {
      ElMessage.error("缺少 user.id，无法保存");
      return;
    }

    if (needChildTeam.value && !childTeamOptions.value.length) {
      ElMessage.error("当前账号没有可分配团队，无法保存");
      return;
    }

    const payload = {};
    const passwordValue = normalizeString(form.password);
    if (passwordValue) {
      payload.password = passwordValue;
    }

    if (needManagerTeams.value) {
      payload.team_names = normalizeTeamNames(form.team_names);
      payload.team_name = payload.team_names.length ? payload.team_names[0] : null;
    } else if (needChildTeam.value) {
      payload.team_name = normalizeTeamName(form.team_name);
      payload.team_names = [];
    }

    await updateUser(userId, payload);
    ElMessage.success("保存成功");
    emit("success");
    form.password = "";
    formRef.value?.clearValidate?.();
  } catch (error) {
    console.error(error);
    const message = error?.response?.data?.detail || error?.message || (isEdit.value ? "保存失败" : "创建失败");
    ElMessage.error(message);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (isEdit.value && effectiveUser.value) {
    applyEditUser(effectiveUser.value);
  } else {
    applyCreateRoleDefaults();
  }
});
</script>

<style scoped>
.form-actions {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}
</style>