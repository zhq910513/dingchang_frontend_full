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
          @change="onRoleChange"
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
          <el-option v-for="team in TEAM_NAMES" :key="team" :label="team" :value="team" />
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
          <el-option v-for="team in TEAM_NAMES" :key="team" :label="team" :value="team" />
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
  mode: { type: String, default: "create" }, // create | edit
  initialUser: { type: Object, default: null },
  user: { type: Object, default: null },
  allowedRoleNames: { type: Array, default: () => [] },
});

const emit = defineEmits(["success"]);

const formRef = ref(null);
const loading = ref(false);
const store = useSessionStore();

const isEdit = computed(() => String(props.mode || "create").trim().toLowerCase() === "edit");
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

const ROLE_OPTION_MAP = {
  [ROLE.MANAGER]: { label: "经理账号", value: ROLE.MANAGER },
  [ROLE.SALES]: { label: "业务账号", value: ROLE.SALES },
  [ROLE.FINANCE]: { label: "财务账号", value: ROLE.FINANCE },
  [ROLE.MARKET]: { label: "市场账号", value: ROLE.MARKET },
  [ROLE.SUPER_ADMIN]: { label: "超级管理员", value: ROLE.SUPER_ADMIN },
};

function normalizeTeamName(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeTeamNames(value) {
  const rawList = Array.isArray(value) ? value : [];
  return [...new Set(rawList.map((item) => String(item || "").trim()).filter(Boolean))].sort();
}

function normalizeRoleNames(value) {
  const rawList = Array.isArray(value) ? value : [];
  return [...new Set(rawList.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean))];
}

function getMyTeams() {
  const currentUser = store.user || {};
  const allTeams = [
    ...(Array.isArray(currentUser.team_names) ? currentUser.team_names : []),
    ...(currentUser.team_name ? [currentUser.team_name] : []),
  ];
  return normalizeTeamNames(allTeams);
}

const allowedRoleNames = computed(() => normalizeRoleNames(props.allowedRoleNames));

const roleOptions = computed(() => {
  const allowed = new Set(allowedRoleNames.value);
  if (!allowed.size) return [];
  return allowed
    .map((role) => ROLE_OPTION_MAP[role])
    .filter(Boolean);
});

const selectedRole = computed(() => String(form.role_name || "").trim().toLowerCase());

const isManagerRole = computed(() => selectedRole.value === ROLE.MANAGER);
const isChildRole = computed(() => {
  return (
    selectedRole.value === ROLE.SALES
    || selectedRole.value === ROLE.FINANCE
    || selectedRole.value === ROLE.MARKET
  );
});

const needManagerTeams = computed(() => isManagerRole.value);
const needChildTeam = computed(() => isChildRole.value);

const childTeamOptions = computed(() => {
  if (!needChildTeam.value) return [];
  if (isManager.value) return getMyTeams();
  if (isSuperAdmin.value) return [...TEAM_NAMES];
  return [];
});

const teamSelectDisabled = computed(() => childTeamOptions.value.length <= 1);

function autoPickSingleTeam() {
  const options = childTeamOptions.value || [];
  if (options.length === 1) {
    form.team_name = options[0];
  }
}

function ensureChildTeamStillValid() {
  if (!needChildTeam.value) return;

  const currentTeam = normalizeTeamName(form.team_name);
  const options = childTeamOptions.value || [];

  if (!currentTeam) {
    autoPickSingleTeam();
    return;
  }

  if (!options.includes(currentTeam)) {
    form.team_name = options.length === 1 ? options[0] : null;
  }
}

function resetTeamFieldsByRole() {
  form.team_name = null;
  form.team_names = [];
  autoPickSingleTeam();
}

function onRoleChange() {
  resetTeamFieldsByRole();
}

watch(
  () => form.role_name,
  () => {
    resetTeamFieldsByRole();
  },
);

watch(
  () => childTeamOptions.value.join("|"),
  () => {
    ensureChildTeamStillValid();
  },
);

watch(
  () => roleOptions.value.map((item) => item.value).join("|"),
  () => {
    if (isEdit.value) return;
    const allowed = new Set(roleOptions.value.map((item) => String(item.value || "").trim().toLowerCase()));
    const currentRole = String(form.role_name || "").trim().toLowerCase();
    if (currentRole && !allowed.has(currentRole)) {
      form.role_name = "";
      resetTeamFieldsByRole();
    }
  },
);

const rules = computed(() => {
  const baseRules = {};

  if (!isEdit.value) {
    baseRules.username = [
      { required: true, message: "请输入用户名", trigger: "blur" },
      { min: 3, max: 32, message: "长度在 3-32 个字符", trigger: "blur" },
    ];
    baseRules.password = [
      { required: true, message: "请输入密码", trigger: "blur" },
      { min: 6, message: "至少 6 位密码", trigger: "blur" },
    ];
    baseRules.role_name = [
      { required: true, message: "请选择角色", trigger: "change" },
      {
        validator: (_rule, value, callback) => {
          const selected = String(value || "").trim().toLowerCase();
          const allowed = new Set(roleOptions.value.map((item) => String(item.value || "").trim().toLowerCase()));
          if (!selected) {
            callback(new Error("请选择角色"));
            return;
          }
          if (!allowed.has(selected)) {
            callback(new Error("当前账号无权限创建该角色"));
            return;
          }
          callback();
        },
        trigger: "change",
      },
    ];
  } else {
    baseRules.password = [
      {
        validator: (_rule, value, callback) => {
          const passwordValue = String(value ?? "").trim();
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
    baseRules.team_names = [
      { required: true, type: "array", message: "请选择团队（可多选）", trigger: "change" },
    ];
  }

  if (needChildTeam.value) {
    baseRules.team_name = [
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

  return baseRules;
});

function roleLabelOf(role) {
  const normalizedRole = String(role || "").trim().toLowerCase();
  const matchedOption = roleOptions.value.find(
    (item) => String(item.value || "").trim().toLowerCase() === normalizedRole,
  );

  if (matchedOption?.label) return matchedOption.label;
  if (ROLE_OPTION_MAP[normalizedRole]?.label) return ROLE_OPTION_MAP[normalizedRole].label;
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

function applyEditUser(userInput) {
  const userValue = userInput && typeof userInput === "object" ? userInput : null;
  if (!userValue) return;

  const roleNameFromUser = String(userValue.role_name || "").trim().toLowerCase();

  form.username = String(userValue.username || "").trim();
  form.password = "";
  form.role_name = roleNameFromUser;
  form.team_name = normalizeTeamName(userValue.team_name);
  form.team_names = normalizeTeamNames(userValue.team_names);

  origin.value = {
    id: userValue.id ?? null,
    username: String(userValue.username || "").trim(),
    role_name: roleNameFromUser,
  };

  ensureChildTeamStillValid();
}

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
        username: String(form.username || "").trim(),
        password: String(form.password || "").trim(),
        role_name: String(form.role_name || "").trim().toLowerCase(),
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

    const passwordValue = String(form.password || "").trim();
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
  autoPickSingleTeam();

  if (isEdit.value && effectiveUser.value) {
    applyEditUser(effectiveUser.value);
  }
});

watch(
  () => effectiveUser.value,
  (userValue) => {
    if (!isEdit.value) return;
    if (!userValue) return;
    applyEditUser(userValue);
  },
  { deep: true },
);
</script>

<style scoped>
.form-actions {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}
</style>