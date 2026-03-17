<template>
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <h2>子账号管理</h2>

      <div style="display:flex;gap:12px;align-items:center;">
        <el-tooltip v-if="!canCreate" content="无权限" placement="top">
          <span>
            <el-button type="primary" disabled>创建子账号</el-button>
          </span>
        </el-tooltip>

        <el-button v-else type="primary" @click="openCreateDialog">
          创建子账号
        </el-button>
      </div>
    </div>

    <OrderSearchBar
      v-model="filters"
      variant="users"
      :loading="loading"
      :role-name="roleName"
      :user-role-options="userRoleOptions"
      @search="search"
      @reset="resetFilters"
      style="margin-top: 15px;"
    />

    <div class="table-scroll" style="margin-top: 15px;">
      <el-table
        :data="list"
        stripe
        v-loading="loading"
        row-key="id"
        :fit="true"
      >
        <el-table-column prop="team_name" label="团队" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ formatTeams(row) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="username" label="账号" min-width="180" show-overflow-tooltip />

        <el-table-column prop="real_name" label="真实姓名" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row?.real_name || "-" }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="role_name" label="角色" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ formatRoleName(row?.role_name) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" min-width="120">
          <template #default="{ row }">
            <el-tag :type="Number(row?.status) === 1 ? 'success' : 'info'">
              {{ Number(row?.status) === 1 ? "启用" : "禁用" }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          v-if="showOnlineColumn"
          prop="is_online"
          label="是否在线"
          min-width="120"
        >
          <template #default="{ row }">
            <el-tag :type="row?.is_online ? 'success' : 'info'">
              {{ row?.is_online ? "在线" : "离线" }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="updated_at" label="更新时间" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ formatDateTime(row?.updated_at) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="220" align="center">
          <template #default="{ row }">
            <el-tooltip v-if="!canEditRow(row)" content="无权限" placement="top">
              <span>
                <el-button size="small" disabled>编辑</el-button>
              </span>
            </el-tooltip>
            <el-button v-else size="small" @click="openEditDialog(row)">编辑</el-button>

            <el-tooltip v-if="!canDeleteRow(row)" content="无权限" placement="top">
              <span>
                <el-button size="small" type="danger" disabled>删除</el-button>
              </span>
            </el-tooltip>
            <el-button
              v-else
              size="small"
              type="danger"
              :disabled="isSelf(row)"
              @click="onDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-empty v-if="!loading && !list.length" description="暂无子账号" style="margin-top: 20px" />

    <el-dialog
      v-model="createDialogVisible"
      title="创建子账号"
      width="420px"
      destroy-on-close
      @closed="onCreateDialogClosed"
    >
      <CreateUser
        mode="create"
        :allowed-role-names="creatableRoleNames"
        @success="onCreateSuccess"
      />
    </el-dialog>

    <el-dialog
      v-model="editDialogVisible"
      title="编辑账号"
      width="420px"
      destroy-on-close
      @closed="onEditDialogClosed"
    >
      <CreateUser
        mode="edit"
        :initial-user="editingUser"
        :allowed-role-names="creatableRoleNames"
        @success="onEditSuccess"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import OrderSearchBar from "../../components/OrderSearchBar.vue";
import CreateUser from "./CreateUser.vue";
import { deleteUser, listUsers } from "../../api/users";
import { useSessionStore } from "../../store/session";
import { ROLE } from "../../constants";

const store = useSessionStore();

const roleName = computed(() => String(store.roleName || "").trim().toLowerCase());
const showOnlineColumn = computed(() => roleName.value === ROLE.SUPER_ADMIN);

const list = ref([]);
const loading = ref(false);
const listMeta = ref({
  capabilities: {
    user_create: false,
    user_list_view: false,
  },
  scopes: {
    user_creatable_role_names: [],
  },
});

const createDialogVisible = ref(false);
const editDialogVisible = ref(false);
const editingUser = ref(null);

const filters = ref({
  keyword: "",
  role: null,
});

const ROLE_LABEL_MAP = {
  [ROLE.SUPER_ADMIN]: "超级管理员",
  [ROLE.MANAGER]: "经理",
  [ROLE.SALES]: "业务",
  [ROLE.FINANCE]: "财务",
  [ROLE.MARKET]: "市场",
};

const ALL_ROLE_OPTIONS = [
  { label: "经理", value: ROLE.MANAGER },
  { label: "业务", value: ROLE.SALES },
  { label: "财务", value: ROLE.FINANCE },
  { label: "市场", value: ROLE.MARKET },
];

const creatableRoleNames = computed(() => {
  const raw = listMeta.value?.scopes?.user_creatable_role_names;
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean))];
});

const userRoleOptions = computed(() => {
  const allowed = new Set(creatableRoleNames.value);
  if (!allowed.size) return [];
  return ALL_ROLE_OPTIONS.filter((item) => allowed.has(String(item.value || "").trim().toLowerCase()));
});

const canCreate = computed(() => {
  return !!listMeta.value?.capabilities?.user_create;
});

let refreshTimer = null;
const AUTO_REFRESH_MS = 2 * 60 * 1000;

function formatTeams(row) {
  const teamNames = Array.isArray(row?.team_names) ? row.team_names : [];
  const cleaned = [...new Set(teamNames.map((item) => String(item || "").trim()).filter(Boolean))];
  if (cleaned.length) return cleaned.join("、");
  const single = String(row?.team_name || "").trim();
  return single || "-";
}

function formatRoleName(role) {
  const normalizedRole = String(role || "").trim().toLowerCase();
  if (!normalizedRole) return "-";
  return ROLE_LABEL_MAP[normalizedRole] || normalizedRole;
}

function formatDateTime(value) {
  if (!value) return "-";
  const dateValue = value instanceof Date ? value : new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(dateValue.getTime())) return String(value);

  const yyyy = dateValue.getFullYear();
  const mm = String(dateValue.getMonth() + 1).padStart(2, "0");
  const dd = String(dateValue.getDate()).padStart(2, "0");
  const hh = String(dateValue.getHours()).padStart(2, "0");
  const mi = String(dateValue.getMinutes()).padStart(2, "0");
  const ss = String(dateValue.getSeconds()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function isSelf(row) {
  const myId = Number(store.user?.id || 0);
  const rowId = Number(row?.id || 0);
  if (!myId || !rowId) return false;
  return myId === rowId;
}

function normalizeListPayload(resp) {
  const root = resp?.data ?? resp ?? {};
  const items = Array.isArray(root?.items)
    ? root.items
    : Array.isArray(root?.list)
      ? root.list
      : Array.isArray(root?.rows)
        ? root.rows
        : Array.isArray(root)
          ? root
          : [];

  const metaRoot = root?.meta && typeof root.meta === "object" ? root.meta : {};
  const capabilitiesRoot =
    metaRoot?.capabilities && typeof metaRoot.capabilities === "object"
      ? metaRoot.capabilities
      : {};
  const scopesRoot =
    metaRoot?.scopes && typeof metaRoot.scopes === "object"
      ? metaRoot.scopes
      : {};

  const normalizedMeta = {
    capabilities: {
      user_create: !!capabilitiesRoot.user_create,
      user_list_view: !!capabilitiesRoot.user_list_view,
    },
    scopes: {
      user_creatable_role_names: Array.isArray(scopesRoot.user_creatable_role_names)
        ? [...new Set(
            scopesRoot.user_creatable_role_names
              .map((item) => String(item || "").trim().toLowerCase())
              .filter(Boolean),
          )]
        : [],
    },
  };

  return {
    items,
    meta: normalizedMeta,
  };
}

function buildParams() {
  const params = {};

  const keyword = String(filters.value?.keyword || "").trim();
  if (keyword) params.keyword = keyword;

  const role = String(filters.value?.role || "").trim().toLowerCase();
  if (role) params.role = role;

  return params;
}

function canEditRow(row) {
  return !!row?.meta?.capabilities?.user_update;
}

function canDeleteRow(row) {
  return !!row?.meta?.capabilities?.user_delete;
}

async function load() {
  loading.value = true;
  try {
    const resp = await listUsers(buildParams());
    const payload = normalizeListPayload(resp);
    list.value = payload.items;
    listMeta.value = payload.meta;
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.response?.data?.detail || "加载账号失败");
  } finally {
    loading.value = false;
  }
}

async function search() {
  await load();
}

async function resetFilters() {
  filters.value = {
    keyword: "",
    role: null,
  };
  await load();
}

function openCreateDialog() {
  if (!canCreate.value) {
    ElMessage.error("无权限");
    return;
  }
  createDialogVisible.value = true;
}

function openEditDialog(row) {
  if (!canEditRow(row)) {
    ElMessage.error("无权限");
    return;
  }
  if (!row?.id) return;
  editingUser.value = { ...(row || {}) };
  editDialogVisible.value = true;
}

async function onCreateSuccess() {
  createDialogVisible.value = false;
  await load();
}

async function onEditSuccess() {
  editDialogVisible.value = false;
  editingUser.value = null;
  await load();
}

function onCreateDialogClosed() {
  createDialogVisible.value = false;
}

function onEditDialogClosed() {
  editDialogVisible.value = false;
  editingUser.value = null;
}

async function onDelete(row) {
  if (!canDeleteRow(row)) {
    ElMessage.error("无权限");
    return;
  }

  const id = Number(row?.id);
  if (!id) return;

  if (isSelf(row)) {
    ElMessage.warning("不能删除当前登录账号");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确认删除账号：${row?.real_name || row?.username || id}？删除后无法恢复`,
      "删除确认",
      {
        type: "warning",
        confirmButtonText: "删除",
        cancelButtonText: "取消",
      },
    );

    await deleteUser(id);
    ElMessage.success("删除成功");
    await load();
  } catch (error) {
    if (error === "cancel" || error === "close") return;
    console.error(error);
    ElMessage.error(error?.response?.data?.detail || error?.message || "删除失败");
  }
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function startAutoRefresh() {
  stopAutoRefresh();

  if (!showOnlineColumn.value) return;

  refreshTimer = setInterval(() => {
    if (document.hidden) return;
    load();
  }, AUTO_REFRESH_MS);
}

function handleVisibilityChange() {
  if (document.hidden) return;
  if (showOnlineColumn.value) {
    load();
  }
}

onMounted(() => {
  load();
  startAutoRefresh();
  document.addEventListener("visibilitychange", handleVisibilityChange);
});

onBeforeUnmount(() => {
  stopAutoRefresh();
  document.removeEventListener("visibilitychange", handleVisibilityChange);
});
</script>

<style scoped>
</style>