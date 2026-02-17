<!-- src/views/customers/CustomerList.vue -->
<template>
  <div class="page">
    <div class="page-header">
      <h2>客户管理</h2>

      <div class="header-actions">
        <el-tooltip
          v-if="canViewDeleted"
          :content="showDeleted ? '点击隐藏已删除' : '点击显示已删除'"
          placement="top"
        >
          <el-button
            size="small"
            class="toggle-btn"
            :class="{ 'toggle-btn--active': showDeleted }"
            :type="showDeleted ? 'info' : 'default'"
            :plain="true"
            :loading="loading"
            @click="toggleShowDeleted"
          >
            <el-icon class="btn-ico">
              <Hide v-if="showDeleted" />
              <View v-else />
            </el-icon>
            {{ showDeleted ? "隐藏已删除" : "显示已删除" }}
          </el-button>
        </el-tooltip>

        <el-tooltip v-if="!canModify" content="财务账号无新增权限" placement="top">
          <span>
            <el-button type="primary" size="small" disabled>新增客户</el-button>
          </span>
        </el-tooltip>

        <el-button v-else type="primary" size="small" @click="openCreateDialog">新增客户</el-button>
      </div>
    </div>

    <el-card shadow="never" class="toolbar-card" :body-style="{ padding: '10px 12px' }">
      <div class="toolbar-row">
        <div class="toolbar-label">搜索：</div>

        <div class="toolbar-content">
          <!-- 第一行：条件（可换行） -->
          <div class="toolbar-fields">
            <el-input
              v-model="filters.customer_code"
              size="small"
              clearable
              placeholder="客户代码（模糊）"
              class="toolbar-input"
              :disabled="loading"
              @keyup.enter="applyFilter"
              @clear="applyFilter"
            />
            <el-input
              v-model="filters.customer_name"
              size="small"
              clearable
              placeholder="客户名称（模糊）"
              class="toolbar-input"
              :disabled="loading"
              @keyup.enter="applyFilter"
              @clear="applyFilter"
            />
            <el-input
              v-model="filters.market"
              size="small"
              clearable
              placeholder="市场（模糊）"
              class="toolbar-input"
              :disabled="loading"
              @keyup.enter="applyFilter"
              @clear="applyFilter"
            />
            <el-input
              v-model="filters.region"
              size="small"
              clearable
              placeholder="归属地（模糊）"
              class="toolbar-input"
              :disabled="loading"
              @keyup.enter="applyFilter"
              @clear="applyFilter"
            />
            <el-input
              v-model="filters.created_by"
              size="small"
              clearable
              placeholder="创建人（模糊）"
              class="toolbar-input"
              :disabled="loading"
              @keyup.enter="applyFilter"
              @clear="applyFilter"
            />
          </div>

          <!-- 第二行：操作（统一右侧同一行） -->
          <div class="toolbar-actions">
            <el-button size="small" :disabled="loading" @click="resetFilter">重置</el-button>
            <el-button type="primary" size="small" :loading="loading" @click="applyFilter">搜索</el-button>
            <el-button size="small" @click="reload" :loading="loading">刷新</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <div class="table-scroll">
      <el-table :data="tableData" border stripe v-loading="loading" class="main-table">
        <el-table-column prop="customer_code" label="客户代码" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="code-cell">
              <span class="code-text">{{ row.customer_code || "-" }}</span>
              <el-tag v-if="isRowDeleted(row)" size="small" type="info" class="deleted-tag">已删除</el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="customer_name" label="客户名称" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.customer_name || row.group_name || "-" }}
          </template>
        </el-table-column>

        <el-table-column prop="market" label="市场" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.market || "-" }}
          </template>
        </el-table-column>

        <el-table-column prop="region" label="归属地" min-width="140" show-overflow-tooltip />

        <el-table-column label="联系方式" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatContacts(row.contacts) }}
          </template>
        </el-table-column>

        <el-table-column prop="created_by_name" label="创建人" width="120" show-overflow-tooltip />
        <el-table-column prop="created_at" label="创建时间" width="180" show-overflow-tooltip />

        <el-table-column label="操作" width="160" fixed="right" class-name="col-actions">
          <template #default="{ row }">
            <template v-if="isRowDeleted(row)">
              <el-tooltip content="该客户已删除" placement="top">
                <span><el-button type="primary" size="small" link disabled>编辑</el-button></span>
              </el-tooltip>
              <el-tooltip content="该客户已删除" placement="top">
                <span><el-button type="danger" size="small" link disabled>删除</el-button></span>
              </el-tooltip>
            </template>

            <template v-else>
              <el-tooltip v-if="!canEdit" content="仅经理/超级账号/市场账号可编辑" placement="top">
                <span><el-button type="primary" size="small" link disabled>编辑</el-button></span>
              </el-tooltip>
              <el-button v-else type="primary" size="small" link @click="openEditDialog(row)">编辑</el-button>

              <el-tooltip v-if="!canModify" content="财务账号无删除权限" placement="top">
                <span><el-button type="danger" size="small" link disabled>删除</el-button></span>
              </el-tooltip>
              <el-button v-else type="danger" size="small" link @click="openDeleteDialog(row)">删除</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="pagination-bar">
      <el-pagination
        background
        layout="prev, pager, next, jumper, sizes, total"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        @current-change="onPageChange"
        @size-change="onPageSizeChange"
      />
    </div>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px" destroy-on-close>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="90px">
        <el-form-item label="客户代码" prop="customer_code">
          <el-input v-model="form.customer_code" clearable />
        </el-form-item>

        <el-form-item label="客户名称" prop="customer_name">
          <el-input v-model="form.customer_name" clearable />
        </el-form-item>

        <el-form-item label="市场" prop="market">
          <el-input v-model="form.market" clearable />
        </el-form-item>

        <el-form-item label="归属地" prop="region">
          <el-input v-model="form.region" clearable />
        </el-form-item>

        <el-form-item label="联系方式" prop="contacts">
          <div class="contacts-wrap">
            <div class="contacts-toolbar">
              <el-button size="small" @click="addContact">添加联系方式</el-button>
              <div class="contacts-hint">仅支持：手机号 / 座机（可多条）</div>
            </div>

            <div v-if="!form.contacts.length" class="contacts-empty">未添加联系方式</div>

            <div v-else class="contacts-list">
              <div v-for="(c, idx) in form.contacts" :key="idx" class="contacts-row">
                <el-select
                  v-model="c.type"
                  class="contacts-type"
                  placeholder="类型"
                  @change="onContactTypeChange(idx)"
                >
                  <el-option label="手机号" value="mobile" />
                  <el-option label="座机" value="tel" />
                </el-select>

                <el-input
                  v-model="c.value"
                  class="contacts-value"
                  clearable
                  placeholder="手机号：11位；座机：010-88888888 / 400xxxxxxx"
                  @input="(val) => onContactValueInput(idx, val)"
                  @blur="() => validateContactsField()"
                />

                <el-button type="danger" size="small" link class="contacts-remove" @click="removeContact(idx)">
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog
      v-model="deleteDialogVisible"
      width="440px"
      destroy-on-close
      append-to-body
      :show-close="false"
      class="confirm-dialog"
      @closed="onDeleteDialogClosed"
    >
      <div class="cd">
        <div class="cd-icon-wrap">
          <el-icon class="cd-icon"><WarningFilled /></el-icon>
        </div>

        <div class="cd-body">
          <div class="cd-title">确认删除客户：<span class="cd-code">{{ deleteTargetDisplay }}</span>？</div>
          <div class="cd-desc">删除后会移入“已删除”，订单详情页下拉选项将不再展示。</div>
        </div>
      </div>

      <template #footer>
        <div class="cd-footer">
          <el-button @click="deleteDialogVisible = false" :disabled="deleting">取消</el-button>
          <el-button type="danger" :loading="deleting" @click="confirmDelete">确认删除</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import { ElMessage } from "element-plus";
import { WarningFilled, View, Hide } from "@element-plus/icons-vue";
import { listCustomerGroups, createCustomerGroup, updateCustomerGroup, deleteCustomerGroup } from "../../api/customerChannel";
import { useSessionStore } from "../../store/session";
import { ROLE } from "../../constants";

const sessionStore = useSessionStore();
const roleName = computed(() => String(sessionStore.roleName || "").trim().toLowerCase());

// ✅ 权限：除财务外都可新增/删除
const canModify = computed(() => roleName.value !== ROLE.FINANCE);

// ✅ 编辑权限：manager / super_admin / market
const canEdit = computed(
  () => roleName.value === ROLE.SUPER_ADMIN || roleName.value === ROLE.MANAGER || roleName.value === ROLE.MARKET
);

// ✅ 仅超级管理员可查看已删除
const canViewDeleted = computed(() => roleName.value === ROLE.SUPER_ADMIN);
const showDeleted = ref(false);

const loading = ref(false);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const rawItems = ref([]);

// ✅ 防并发乱序：仅最后一次请求可以落数据/收 loading
let _reqSeq = 0;

const filters = ref({
  customer_code: "",
  customer_name: "",
  market: "",
  region: "",
  created_by: "",
});

function isRowDeleted(row) {
  return Boolean(row?.is_deleted) || Boolean(row?.deleted_at);
}

function _typeLabel(t) {
  const s = String(t || "").trim().toLowerCase();
  if (s === "mobile") return "手机号";
  if (s === "tel") return "座机";
  return s || "";
}

function formatContacts(list) {
  if (!Array.isArray(list) || !list.length) return "";
  return list
    .map((c) => {
      if (!c) return "";
      const t = _typeLabel(c.type);
      const v = c.value ? String(c.value) : "";
      return t ? `${t}:${v}` : v;
    })
    .filter(Boolean)
    .join("；");
}

function _trim(v) {
  const s = String(v ?? "").trim();
  return s ? s : "";
}

async function loadList() {
  const seq = ++_reqSeq;
  loading.value = true;
  try {
    const params = { page: page.value, page_size: pageSize.value };
    if (canViewDeleted.value && showDeleted.value) params.include_deleted = 1;

    const cc = _trim(filters.value.customer_code);
    const cn = _trim(filters.value.customer_name);
    const mk = _trim(filters.value.market);
    const rg = _trim(filters.value.region);
    const cb = _trim(filters.value.created_by);

    if (cc) params.customer_code = cc;
    if (cn) params.customer_name = cn;
    if (mk) params.market = mk;
    if (rg) params.region = rg;
    if (cb) params.created_by = cb;

    const resp = await listCustomerGroups(params);
    if (seq !== _reqSeq) return;

    const data = resp?.data || {};
    total.value = Number(data.total || 0);
    rawItems.value = Array.isArray(data.items) ? data.items : [];
  } catch (e) {
    if (seq !== _reqSeq) return;
    console.error(e);
    ElMessage.error(e?.response?.data?.detail || e?.message || "客户列表加载失败");
  } finally {
    if (seq === _reqSeq) loading.value = false;
  }
}

function reload() {
  loadList();
}

function applyFilter() {
  page.value = 1;
  loadList();
}

function resetFilter() {
  filters.value = { customer_code: "", customer_name: "", market: "", region: "", created_by: "" };
  page.value = 1;
  loadList();
}

const tableData = computed(() => rawItems.value || []);

function onPageChange(p) {
  page.value = p;
  loadList();
}

function onPageSizeChange(ps) {
  pageSize.value = ps;
  page.value = 1;
  loadList();
}

function toggleShowDeleted() {
  if (!canViewDeleted.value) return;
  showDeleted.value = !showDeleted.value;
  page.value = 1;
  loadList();
}

// ---- 新增/编辑（共用一个弹窗）----
const dialogVisible = ref(false);
const saving = ref(false);
const formRef = ref(null);

const dialogMode = ref("create"); // 'create' | 'edit'
const editId = ref(null);

const dialogTitle = computed(() => (dialogMode.value === "edit" ? "编辑客户" : "新增客户"));

function _newContact() {
  return { type: "mobile", value: "" };
}

const form = ref({ customer_code: "", customer_name: "", market: "", region: "", contacts: [] });

const _MOBILE_RE = /^1[3-9]\d{9}$/;
const _LANDLINE_RE = /^(0\d{2,3}-?)?\d{7,8}(-\d{1,6})?$/;
const _400_800_RE = /^(400|800)\d{7}$/;

function _cleanContactValue(v) {
  const s = String(v ?? "").replace(/\s+/g, "");
  return s.replace(/[^0-9\-]/g, "");
}

function _validateOneContact(c) {
  const t = String(c?.type || "").trim().toLowerCase();
  const raw = _cleanContactValue(c?.value || "");
  if (!raw) return "联系方式不能为空（不需要可删除该行）";

  if (t === "mobile") {
    const digits = raw.replace(/-/g, "");
    if (!_MOBILE_RE.test(digits)) return "手机号格式不正确（需为 11 位大陆手机号）";
    return "";
  }

  if (t === "tel") {
    const digits = raw.replace(/-/g, "");
    if (_400_800_RE.test(digits)) return "";
    if (!_LANDLINE_RE.test(raw)) return "座机格式不正确（示例：010-88888888 / 0571-8888888 / 010-88888888-123 / 400xxxxxxx）";
    return "";
  }

  return "联系方式类型仅支持：手机号/座机";
}

function _normalizeContactsForSubmit() {
  const arr = Array.isArray(form.value.contacts) ? form.value.contacts : [];
  const seen = new Set();
  const out = [];
  for (const c of arr) {
    const t = String(c?.type || "").trim().toLowerCase() || "mobile";
    const raw = _cleanContactValue(c?.value || "");
    if (!raw) continue;

    if (t === "mobile") {
      const digits = raw.replace(/-/g, "");
      const key = `${t}:${digits}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ type: t, value: digits });
      continue;
    }

    const key = `${t}:${raw}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type: t, value: raw });
  }
  return out;
}

function _contactsToForm(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr.map((c) => ({
    type: String(c?.type || "mobile").trim().toLowerCase() === "tel" ? "tel" : "mobile",
    value: _cleanContactValue(c?.value || ""),
  }));
}

async function validateContactsField() {
  if (!formRef.value) return true;
  try {
    await formRef.value.validateField("contacts");
    return true;
  } catch {
    return false;
  }
}

const rules = {
  customer_code: [{ required: true, message: "客户代码必填", trigger: "blur" }],
  customer_name: [{ required: true, message: "客户名称必填", trigger: "blur" }],
  contacts: [
    {
      trigger: ["change", "blur"],
      validator: (_rule, _val, cb) => {
        const arr = Array.isArray(form.value.contacts) ? form.value.contacts : [];
        for (let i = 0; i < arr.length; i++) {
          const msg = _validateOneContact(arr[i]);
          if (msg) return cb(new Error(`第 ${i + 1} 条联系方式：${msg}`));
        }
        cb();
      },
    },
  ],
};

function openCreateDialog() {
  if (!canModify.value) {
    ElMessage.warning("财务账号无新增权限");
    return;
  }
  dialogMode.value = "create";
  editId.value = null;
  form.value = { customer_code: "", customer_name: "", market: "", region: "", contacts: [] };
  dialogVisible.value = true;
}

function openEditDialog(row) {
  if (!canEdit.value) {
    ElMessage.warning("仅经理/超级账号/市场账号可编辑");
    return;
  }
  if (!row?.id) return;

  dialogMode.value = "edit";
  editId.value = row.id;
  form.value = {
    customer_code: String(row.customer_code || ""),
    customer_name: String(row.customer_name || row.group_name || ""),
    market: String(row.market || ""),
    region: String(row.region || ""),
    contacts: _contactsToForm(row.contacts),
  };
  dialogVisible.value = true;
}

function addContact() {
  if (!Array.isArray(form.value.contacts)) form.value.contacts = [];
  form.value.contacts.push(_newContact());
  nextTick(() => validateContactsField());
}

function removeContact(idx) {
  if (!Array.isArray(form.value.contacts)) return;
  form.value.contacts.splice(idx, 1);
  nextTick(() => validateContactsField());
}

function onContactTypeChange(idx) {
  const arr = form.value.contacts || [];
  const c = arr[idx];
  if (!c) return;
  c.type = String(c.type || "mobile").trim().toLowerCase();
  nextTick(() => validateContactsField());
}

function onContactValueInput(idx, val) {
  const arr = form.value.contacts || [];
  const c = arr[idx];
  if (!c) return;
  c.value = _cleanContactValue(val);
}

async function submit() {
  if (dialogMode.value === "create") {
    if (!canModify.value) {
      ElMessage.warning("财务账号无新增权限");
      return;
    }
  } else {
    if (!canEdit.value) {
      ElMessage.warning("仅经理/超级账号/市场账号可编辑");
      return;
    }
    if (!editId.value) return;
  }

  if (!formRef.value) return;

  try {
    await formRef.value.validate();
  } catch {
    return;
  }

  const contactsPayload = _normalizeContactsForSubmit();

  saving.value = true;
  try {
    const payload = {
      customer_code: form.value.customer_code,
      customer_name: form.value.customer_name,
      market: _trim(form.value.market) || null,
      region: form.value.region,
      contacts: contactsPayload,
    };

    if (dialogMode.value === "edit") {
      await updateCustomerGroup(editId.value, payload);
      ElMessage.success("编辑客户成功");
    } else {
      await createCustomerGroup(payload);
      ElMessage.success("新增客户成功");
    }

    dialogVisible.value = false;
    page.value = 1;
    await loadList();
  } catch (e) {
    console.error(e);
    ElMessage.error(e?.response?.data?.detail || e?.message || (dialogMode.value === "edit" ? "编辑客户失败" : "新增客户失败"));
  } finally {
    saving.value = false;
  }
}

// ---- 删除确认弹框 ----
const deleteDialogVisible = ref(false);
const deleting = ref(false);
const deleteTarget = ref(null);

const deleteTargetDisplay = computed(() => {
  const code = deleteTarget.value?.customer_code ? String(deleteTarget.value.customer_code) : "";
  const name = deleteTarget.value?.customer_name ? String(deleteTarget.value.customer_name) : "";
  if (code && name) return `${code} - ${name}`;
  return code || name || "-";
});

function openDeleteDialog(row) {
  if (!canModify.value) {
    ElMessage.warning("财务账号无删除权限");
    return;
  }
  if (!row?.id) return;
  deleteTarget.value = row;
  deleteDialogVisible.value = true;
}

function onDeleteDialogClosed() {
  deleteTarget.value = null;
  deleting.value = false;
}

async function confirmDelete() {
  if (!canModify.value) {
    ElMessage.warning("财务账号无删除权限");
    return;
  }
  if (!deleteTarget.value?.id) return;

  deleting.value = true;
  try {
    await deleteCustomerGroup(deleteTarget.value.id);
    ElMessage.success("删除成功");
    deleteDialogVisible.value = false;

    if (tableData.value.length <= 1 && page.value > 1) page.value -= 1;
    await loadList();
  } catch (e) {
    console.error(e);
    ElMessage.error(e?.response?.data?.detail || e?.message || "删除失败");
  } finally {
    deleting.value = false;
  }
}

onMounted(() => loadList());
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100%; min-height: 0; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toggle-btn {
  border-radius: 10px;
  border: 1px solid rgba(60, 60, 60, 0.14);
}
.toggle-btn--active {
  border-color: rgba(64, 158, 255, 0.45);
  background: rgba(64, 158, 255, 0.06);
}
.btn-ico { margin-right: 6px; }

/* ✅ 搜索栏吸顶，避免被表格渲染后顶掉/覆盖 */
.toolbar-card {
  margin-bottom: 10px;
  position: sticky;
  top: 0;
  z-index: 20;
  background: #fff;
}

/* ✅ 专业布局：条件一行（可换行），按钮单独一行右对齐 */
.toolbar-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.toolbar-label {
  width: 60px;
  flex-shrink: 0;
  font-size: 13px;
  color: #666;
  line-height: 28px;
  padding-top: 2px;
}

.toolbar-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toolbar-fields {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar-input {
  width: 240px;
  max-width: 100%;
}

.toolbar-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
}

/* ✅ 表格滚动容器，避免撑爆布局 */
.table-scroll { flex: 1; min-height: 0; overflow: auto; }

.main-table { width: 100%; }
.col-actions :deep(.cell) { text-align: center; }
.pagination-bar { margin-top: 10px; display: flex; justify-content: flex-end; }

.code-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.code-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.deleted-tag { border-radius: 10px; }

.contacts-wrap { width: 100%; }
.contacts-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.contacts-hint { font-size: 12px; color: rgba(31, 42, 68, 0.65); }
.contacts-empty { font-size: 12px; color: rgba(31, 42, 68, 0.55); padding: 6px 0; }
.contacts-list { display: flex; flex-direction: column; gap: 8px; }
.contacts-row { display: flex; align-items: center; gap: 10px; }
.contacts-type { width: 110px; flex-shrink: 0; }
.contacts-value { flex: 1; min-width: 0; }
.contacts-remove { flex-shrink: 0; }

:deep(.confirm-dialog .el-dialog) {
  margin-top: 14vh;
  border-radius: 14px;
  overflow: hidden;
}
:deep(.confirm-dialog .el-dialog__header) { display: none; }
:deep(.confirm-dialog .el-dialog__body) { padding: 18px 18px 10px 18px; }
:deep(.confirm-dialog .el-dialog__footer) { padding: 10px 18px 16px 18px; }

.cd { display: flex; gap: 12px; align-items: flex-start; }
.cd-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(245, 108, 108, 0.10);
  border: 1px solid rgba(245, 108, 108, 0.18);
  flex-shrink: 0;
}
.cd-icon { font-size: 18px; }
.cd-body { min-width: 0; }
.cd-title {
  font-weight: 800;
  color: rgba(31, 42, 68, 0.92);
  line-height: 1.25;
  font-size: 14px;
}
.cd-code {
  display: inline-block;
  padding: 0 8px;
  margin: 0 2px;
  border-radius: 10px;
  font-weight: 800;
  background: rgba(31, 42, 68, 0.06);
  border: 1px solid rgba(31, 42, 68, 0.10);
}
.cd-desc {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(31, 42, 68, 0.66);
  line-height: 1.45;
}
.cd-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
