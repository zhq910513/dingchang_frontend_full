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

    <div class="table-scroll" style="margin-top: 15px;">
      <el-table
        :data="list"
        stripe
        v-loading="loading"
        row-key="id"
        :fit="true"
      >
      <!-- ✅ 团队名：优先展示 team_names（多团队），否则回退 team_name -->
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

      <el-table-column prop="role_name" label="角色" min-width="160" show-overflow-tooltip />

      <el-table-column label="在线状态" min-width="140">
        <template #default="{ row }">
          <el-tag :type="row.is_online ? 'success' : 'info'">
            {{ row.is_online ? "在线" : "离线" }}
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

    <el-empty v-if="!loading && !list.length" description="暂无子账号" style="margin-top: 20px" />

    <!-- 创建 -->
    <el-dialog v-model="createDialogVisible" title="创建子账号" width="420px" destroy-on-close>
      <CreateUser mode="create" @success="onCreateSuccess" />
    </el-dialog>

    <!-- 编辑（复用 CreateUser） -->
    <el-dialog v-model="editDialogVisible" title="编辑账号" width="420px" destroy-on-close>
      <CreateUser mode="edit" :initial-user="editingUser" @success="onEditSuccess" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import CreateUser from "./CreateUser.vue";
import { listChildren, deleteUser } from "../../api/users";
import { useSessionStore } from "../../store/session";
import { ROLE } from "../../constants";

const store = useSessionStore();

const roleName = computed(() => String(store.roleName || "").trim().toLowerCase());

/** ✅ 账号管理权限：经理/超管 */
const canCreate = computed(() => roleName.value === ROLE.SUPER_ADMIN || roleName.value === ROLE.MANAGER);
const canEdit = computed(() => roleName.value === ROLE.SUPER_ADMIN || roleName.value === ROLE.MANAGER);
const canDelete = computed(() => roleName.value === ROLE.SUPER_ADMIN || roleName.value === ROLE.MANAGER);

const list = ref([]);
const loading = ref(false);

const createDialogVisible = ref(false);
const editDialogVisible = ref(false);
const editingUser = ref(null);

function formatTeams(row) {
  const arr = Array.isArray(row?.team_names) ? row.team_names : [];
  const cleaned = [...new Set(arr.map((x) => String(x || "").trim()).filter(Boolean))];
  if (cleaned.length) return cleaned.join("、");
  const single = String(row?.team_name || "").trim();
  return single || "-";
}

/** ✅ 防误删：不能删自己（兼容 id/user_id 两种） */
function isSelf(row) {
  const myId = Number(store.userId || store.user?.id || store.id || 0);
  const rid = Number(row?.id || row?.user_id || 0);
  if (!myId || !rid) return false;
  return myId === rid;
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
  editingUser.value = { ...(row || {}) };
  editDialogVisible.value = true;
}

function normalizeList(resp) {
  const v = resp?.data ?? resp ?? {};
  if (Array.isArray(v)) return v;
  const items = v?.items ?? v?.data?.items ?? v?.data;
  return Array.isArray(items) ? items : [];
}

async function load() {
  loading.value = true;
  try {
    const resp = await listChildren();
    list.value = normalizeList(resp);
  } catch (e) {
    console.error(e);
    ElMessage.error(e?.response?.data?.detail || "加载账号失败");
  } finally {
    loading.value = false;
  }
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
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" }
    );

    await deleteUser(id);
    ElMessage.success("删除成功");
    await load();
  } catch (e) {
    // 取消不提示
    if (e === "cancel" || e === "close") return;

    console.error(e);
    ElMessage.error(e?.response?.data?.detail || e?.message || "删除失败");
  }
}

onMounted(() => {
  load();
});
</script>

<style scoped>
</style>
