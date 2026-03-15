<!-- src/views/users/UserList.vue -->
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

        <el-table-column prop="username" label="账号" min-width="180" show-overflow-tooltip/>

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

        <el-table-column label="操作" width="220" align="center">
          <template #default="{ row }">
            <el-tooltip v-if="!canEdit" content="无权限" placement="top">
              <span>
                <el-button size="small" disabled>编辑</el-button>
              </span>
            </el-tooltip>
            <el-button v-else size="small" @click="openEditDialog(row)">编辑</el-button>

            <el-tooltip v-if="!canDelete" content="无权限" placement="top">
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

    <el-empty v-if="!loading && !list.length" description="暂无子账号" style="margin-top: 20px"/>

    <el-dialog v-model="createDialogVisible" title="创建子账号" width="420px" destroy-on-close>
      <CreateUser mode="create" @success="onCreateSuccess"/>
    </el-dialog>

    <el-dialog v-model="editDialogVisible" title="编辑账号" width="420px" destroy-on-close>
      <CreateUser mode="edit" :initial-user="editingUser" @success="onEditSuccess"/>
    </el-dialog>
  </div>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, ref} from "vue";
import {ElMessage, ElMessageBox} from "element-plus";
import OrderSearchBar from "../../components/OrderSearchBar.vue";
import CreateUser from "./CreateUser.vue";
import {deleteUser, listUsers} from "../../api/users";
import {useSessionStore} from "../../store/session";
import {ROLE} from "../../constants";

const store = useSessionStore();

const roleName = computed(() => String(store.roleName || "").trim().toLowerCase());
const showOnlineColumn = computed(() => roleName.value === ROLE.SUPER_ADMIN);

const canCreate = computed(() => {
  return roleName.value === ROLE.SUPER_ADMIN || roleName.value === ROLE.MANAGER;
});

const canEdit = computed(() => {
  return roleName.value === ROLE.SUPER_ADMIN || roleName.value === ROLE.MANAGER;
});

const canDelete = computed(() => {
  return roleName.value === ROLE.SUPER_ADMIN || roleName.value === ROLE.MANAGER;
});

const list = ref([]);
const loading = ref(false);

const createDialogVisible = ref(false);
const editDialogVisible = ref(false);
const editingUser = ref(null);

const filters = ref({
  keyword: "",
  role: null,
});

const userRoleOptions = [
  {label: "经理", value: "manager"},
  {label: "业务", value: "sales"},
  {label: "财务", value: "finance"},
  {label: "市场", value: "market"},
];

let refreshTimer = null;
const AUTO_REFRESH_MS = 2 * 60 * 1000;

function formatTeams(row) {
  const arr = Array.isArray(row?.team_names) ? row.team_names : [];
  const cleaned = [...new Set(arr.map((x) => String(x || "").trim()).filter(Boolean))];
  if (cleaned.length) return cleaned.join("、");
  const single = String(row?.team_name || "").trim();
  return single || "-";
}

function formatRoleName(role) {
  const r = String(role || "").trim().toLowerCase();
  if (!r) return "-";
  if (r === ROLE.SUPER_ADMIN) return "超级管理员";
  if (r === ROLE.MANAGER) return "经理";
  if (r === ROLE.SALES) return "业务";
  if (r === ROLE.FINANCE) return "财务";
  if (r === ROLE.MARKET) return "市场";
  return r;
}

function isSelf(row) {
  const myId = Number(store.user?.id || 0);
  const rid = Number(row?.id || 0);
  if (!myId || !rid) return false;
  return myId === rid;
}

function normalizeList(resp) {
  const data = resp?.data ?? resp ?? {};
  return Array.isArray(data?.items) ? data.items : [];
}

function buildParams() {
  const p = {};

  const keyword = String(filters.value?.keyword || "").trim();
  if (keyword) p.keyword = keyword;

  const role = String(filters.value?.role || "").trim().toLowerCase();
  if (role) p.role = role;

  return p;
}

async function load() {
  loading.value = true;
  try {
    const resp = await listUsers(buildParams());
    list.value = normalizeList(resp);
  } catch (e) {
    console.error(e);
    ElMessage.error(e?.response?.data?.detail || "加载账号失败");
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
  if (!canEdit.value) {
    ElMessage.error("无权限");
    return;
  }
  if (!row?.id) return;
  editingUser.value = {...(row || {})};
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

async function onDelete(row) {
  if (!canDelete.value) {
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
        {type: "warning", confirmButtonText: "删除", cancelButtonText: "取消"}
    );

    await deleteUser(id);
    ElMessage.success("删除成功");
    await load();
  } catch (e) {
    if (e === "cancel" || e === "close") return;
    console.error(e);
    ElMessage.error(e?.response?.data?.detail || e?.message || "删除失败");
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
