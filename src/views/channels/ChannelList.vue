<!-- src/views/channels/ChannelList.vue -->
<template>
  <div class="page">
    <div class="page-header">
      <h2>渠道管理</h2>

      <div class="header-actions">
        <el-tooltip
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
            {{ showDeleted ? '隐藏已删除' : '显示已删除' }}
          </el-button>
        </el-tooltip>

        <el-tooltip
          v-if="!hasPageCapability('channel.create')"
          content="当前账号无新增渠道权限"
          placement="top"
        >
          <span>
            <el-button type="primary" size="small" disabled>新增渠道</el-button>
          </span>
        </el-tooltip>

        <el-button v-else type="primary" size="small" @click="openCreateDialog">
          新增渠道
        </el-button>
      </div>
    </div>

    <el-card shadow="never" class="toolbar-card" :body-style="{ padding: '12px 14px' }">
      <div class="toolbar-row">
        <div class="toolbar-label">搜索条件</div>

        <div class="toolbar-content">
          <div class="toolbar-fields">
            <el-input
              v-model="filters.channel_code"
              size="small"
              clearable
              placeholder="渠道代码（模糊）"
              class="toolbar-input"
              :disabled="loading"
              @keyup.enter="applyFilter"
              @clear="applyFilter"
            />
            <el-input
              v-model="filters.channel_name"
              size="small"
              clearable
              placeholder="渠道名称（模糊）"
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
              v-model="filters.created_by_name"
              size="small"
              clearable
              placeholder="创建人（模糊）"
              class="toolbar-input"
              :disabled="loading"
              @keyup.enter="applyFilter"
              @clear="applyFilter"
            />
          </div>

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
        <el-table-column prop="channel_code" label="渠道代码" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="code-cell">
              <span class="code-text">{{ row.channel_code || '-' }}</span>
              <el-tag v-if="isRowDeleted(row)" size="small" type="info" class="deleted-tag">已删除</el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="channel_name" label="渠道名称" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.channel_name || '-' }}
          </template>
        </el-table-column>

        <el-table-column prop="region" label="归属地" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.region || '-' }}
          </template>
        </el-table-column>

        <el-table-column label="联系方式" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatContacts(row.contacts) || '-' }}
          </template>
        </el-table-column>

        <el-table-column prop="created_by_name" label="创建人" width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.created_by_name || '-' }}
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="创建时间" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.created_at || '-' }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="160" fixed="right" class-name="col-actions">
          <template #default="{ row }">
            <template v-if="isRowDeleted(row)">
              <el-tooltip content="该渠道已删除" placement="top">
                <span><el-button type="primary" size="small" link disabled>编辑</el-button></span>
              </el-tooltip>
              <el-tooltip content="该渠道已删除" placement="top">
                <span><el-button type="danger" size="small" link disabled>删除</el-button></span>
              </el-tooltip>
            </template>

            <template v-else>
              <el-tooltip
                v-if="!hasRowCapability(row, 'channel.update')"
                content="当前账号无编辑该渠道权限"
                placement="top"
              >
                <span><el-button type="primary" size="small" link disabled>编辑</el-button></span>
              </el-tooltip>
              <el-button v-else type="primary" size="small" link @click="openEditDialog(row)">
                编辑
              </el-button>

              <el-tooltip
                v-if="!hasRowCapability(row, 'channel.delete')"
                content="当前账号无删除该渠道权限"
                placement="top"
              >
                <span><el-button type="danger" size="small" link disabled>删除</el-button></span>
              </el-tooltip>
              <el-button v-else type="danger" size="small" link @click="openDeleteDialog(row)">
                删除
              </el-button>
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
        <el-form-item label="渠道代码" prop="channel_code">
          <el-input v-model="form.channel_code" clearable />
        </el-form-item>

        <el-form-item label="渠道名称" prop="channel_name">
          <el-input v-model="form.channel_name" clearable />
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
                <el-select v-model="c.type" class="contacts-type" placeholder="类型" @change="onContactTypeChange(idx)">
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
          <el-icon class="cd-icon">
            <WarningFilled />
          </el-icon>
        </div>

        <div class="cd-body">
          <div class="cd-title">确认删除渠道：<span class="cd-code">{{ deleteTargetDisplay }}</span>？</div>
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
import { computed, nextTick, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Hide, View, WarningFilled } from '@element-plus/icons-vue';
import {
  createChannelGroup,
  deleteChannelGroup,
  listChannelGroups,
  updateChannelGroup,
} from '../../api/customerChannel';

const loading = ref(false);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const rawItems = ref([]);
const pageMeta = ref({
  capabilities: {},
  scopes: {},
  pagination: {
    page: 1,
    page_size: 20,
  },
});

let _reqSeq = 0;

const showDeleted = ref(false);
const filters = ref({
  channel_code: '',
  channel_name: '',
  region: '',
  created_by_name: '',
});

function _trim(v) {
  const s = String(v ?? '').trim();
  return s ? s : '';
}

function _toBool(v) {
  return Boolean(v);
}

function hasPageCapability(capabilityKey) {
  return _toBool(pageMeta.value?.capabilities?.[capabilityKey]);
}

function hasRowCapability(row, capabilityKey) {
  return _toBool(row?.meta?.capabilities?.[capabilityKey]);
}

function isRowDeleted(row) {
  return Boolean(row?.is_deleted) || Boolean(row?.deleted_at);
}

function _typeLabel(contactType) {
  const normalizedType = String(contactType || '').trim().toLowerCase();
  if (normalizedType === 'mobile') return '手机号';
  if (normalizedType === 'tel') return '座机';
  return normalizedType || '';
}

function formatContacts(list) {
  if (!Array.isArray(list) || !list.length) return '';
  return list
    .map((contactItem) => {
      if (!contactItem) return '';
      const contactTypeLabel = _typeLabel(contactItem.type);
      const contactValue = contactItem.value ? String(contactItem.value) : '';
      return contactTypeLabel ? `${contactTypeLabel}:${contactValue}` : contactValue;
    })
    .filter(Boolean)
    .join('；');
}

function _applyListResponse(data) {
  const responseMeta = data?.meta ?? {};
  const responsePagination = responseMeta?.pagination ?? {};

  total.value = Number(data?.total || 0);
  rawItems.value = Array.isArray(data?.items) ? data.items : [];
  pageMeta.value = {
    capabilities: responseMeta?.capabilities ?? {},
    scopes: responseMeta?.scopes ?? {},
    pagination: {
      page: Number(responsePagination?.page || page.value || 1),
      page_size: Number(responsePagination?.page_size || pageSize.value || 20),
    },
  };

  page.value = pageMeta.value.pagination.page;
  pageSize.value = pageMeta.value.pagination.page_size;
}

async function loadList() {
  const seq = ++_reqSeq;
  loading.value = true;
  try {
    const params = {
      page: page.value,
      page_size: pageSize.value,
      include_deleted: showDeleted.value ? 1 : 0,
    };

    const channelCode = _trim(filters.value.channel_code);
    const channelName = _trim(filters.value.channel_name);
    const region = _trim(filters.value.region);
    const createdByName = _trim(filters.value.created_by_name);

    if (channelCode) params.channel_code = channelCode;
    if (channelName) params.channel_name = channelName;
    if (region) params.region = region;
    if (createdByName) params.created_by_name = createdByName;

    const resp = await listChannelGroups(params);
    if (seq !== _reqSeq) return;

    _applyListResponse(resp?.data || {});
  } catch (error) {
    if (seq !== _reqSeq) return;
    console.error(error);
    ElMessage.error(error?.response?.data?.detail || error?.message || '渠道列表加载失败');
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
  filters.value = {
    channel_code: '',
    channel_name: '',
    region: '',
    created_by_name: '',
  };
  page.value = 1;
  loadList();
}

const tableData = computed(() => rawItems.value || []);

function onPageChange(nextPage) {
  page.value = nextPage;
  loadList();
}

function onPageSizeChange(nextPageSize) {
  pageSize.value = nextPageSize;
  page.value = 1;
  loadList();
}

function toggleShowDeleted() {
  showDeleted.value = !showDeleted.value;
  page.value = 1;
  loadList();
}

const dialogVisible = ref(false);
const saving = ref(false);
const formRef = ref(null);

const dialogMode = ref('create');
const editId = ref(null);
const editRowCapabilities = ref({});
const dialogTitle = computed(() => (dialogMode.value === 'edit' ? '编辑渠道' : '新增渠道'));

function _newContact() {
  return { type: 'mobile', value: '' };
}

const form = ref({ channel_code: '', channel_name: '', region: '', contacts: [] });

const _MOBILE_RE = /^1[3-9]\d{9}$/;
const _LANDLINE_RE = /^(0\d{2,3}-?)?\d{7,8}(-\d{1,6})?$/;
const _400_800_RE = /^(400|800)\d{7}$/;

function _cleanContactValue(v) {
  const s = String(v ?? '').replace(/\s+/g, '');
  return s.replace(/[^0-9\-]/g, '');
}

function _validateOneContact(contactItem) {
  const contactType = String(contactItem?.type || '').trim().toLowerCase();
  const rawValue = _cleanContactValue(contactItem?.value || '');
  if (!rawValue) return '联系方式不能为空（不需要可删除该行）';

  if (contactType === 'mobile') {
    const digits = rawValue.replace(/-/g, '');
    if (!_MOBILE_RE.test(digits)) return '手机号格式不正确（需为 11 位大陆手机号）';
    return '';
  }

  if (contactType === 'tel') {
    const digits = rawValue.replace(/-/g, '');
    if (_400_800_RE.test(digits)) return '';
    if (!_LANDLINE_RE.test(rawValue)) {
      return '座机格式不正确（示例：010-88888888 / 0571-8888888 / 010-88888888-123 / 400xxxxxxx）';
    }
    return '';
  }

  return '联系方式类型仅支持：手机号/座机';
}

async function validateContactsField() {
  if (!formRef.value) return true;
  try {
    await formRef.value.validateField('contacts');
    return true;
  } catch {
    return false;
  }
}

function _normalizeContactsForSubmit() {
  const contactList = Array.isArray(form.value.contacts) ? form.value.contacts : [];
  const seen = new Set();
  const normalizedContacts = [];

  for (const contactItem of contactList) {
    const contactType = String(contactItem?.type || '').trim().toLowerCase() || 'mobile';
    const rawValue = _cleanContactValue(contactItem?.value || '');
    if (!rawValue) continue;

    if (contactType === 'mobile') {
      const digits = rawValue.replace(/-/g, '');
      const dedupeKey = `${contactType}:${digits}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      normalizedContacts.push({ type: contactType, value: digits });
      continue;
    }

    const dedupeKey = `${contactType}:${rawValue}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    normalizedContacts.push({ type: contactType, value: rawValue });
  }

  return normalizedContacts;
}

function _contactsToForm(list) {
  const contactList = Array.isArray(list) ? list : [];
  return contactList.map((contactItem) => ({
    type: String(contactItem?.type || 'mobile').trim().toLowerCase() === 'tel' ? 'tel' : 'mobile',
    value: _cleanContactValue(contactItem?.value || ''),
  }));
}

const rules = {
  channel_code: [{ required: true, message: '渠道代码必填', trigger: 'blur' }],
  channel_name: [{ required: true, message: '渠道名称必填', trigger: 'blur' }],
  contacts: [
    {
      trigger: ['change', 'blur'],
      validator: (_rule, _val, callback) => {
        const contactList = Array.isArray(form.value.contacts) ? form.value.contacts : [];
        for (let index = 0; index < contactList.length; index += 1) {
          const message = _validateOneContact(contactList[index]);
          if (message) return callback(new Error(`第 ${index + 1} 条联系方式：${message}`));
        }
        callback();
      },
    },
  ],
};

function openCreateDialog() {
  if (!hasPageCapability('channel.create')) {
    ElMessage.warning('当前账号无新增渠道权限');
    return;
  }
  dialogMode.value = 'create';
  editId.value = null;
  editRowCapabilities.value = {};
  form.value = { channel_code: '', channel_name: '', region: '', contacts: [] };
  dialogVisible.value = true;
}

function openEditDialog(row) {
  if (!hasRowCapability(row, 'channel.update')) {
    ElMessage.warning('当前账号无编辑该渠道权限');
    return;
  }
  if (!row?.id) return;

  dialogMode.value = 'edit';
  editId.value = row.id;
  editRowCapabilities.value = row?.meta?.capabilities ?? {};
  form.value = {
    channel_code: String(row.channel_code || ''),
    channel_name: String(row.channel_name || ''),
    region: String(row.region || ''),
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
  const contactList = form.value.contacts || [];
  const contactItem = contactList[idx];
  if (!contactItem) return;
  contactItem.type = String(contactItem.type || 'mobile').trim().toLowerCase();
  nextTick(() => validateContactsField());
}

function onContactValueInput(idx, val) {
  const contactList = form.value.contacts || [];
  const contactItem = contactList[idx];
  if (!contactItem) return;
  contactItem.value = _cleanContactValue(val);
}

async function submit() {
  if (dialogMode.value === 'create') {
    if (!hasPageCapability('channel.create')) {
      ElMessage.warning('当前账号无新增渠道权限');
      return;
    }
  } else {
    if (!Boolean(editRowCapabilities.value?.['channel.update'])) {
      ElMessage.warning('当前账号无编辑该渠道权限');
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

  saving.value = true;
  try {
    const payload = {
      channel_code: form.value.channel_code,
      channel_name: form.value.channel_name,
      region: form.value.region,
      contacts: _normalizeContactsForSubmit(),
    };

    if (dialogMode.value === 'edit') {
      await updateChannelGroup(editId.value, payload);
      ElMessage.success('编辑渠道成功');
    } else {
      await createChannelGroup(payload);
      ElMessage.success('新增渠道成功');
    }

    dialogVisible.value = false;
    page.value = 1;
    await loadList();
  } catch (error) {
    console.error(error);
    ElMessage.error(
      error?.response?.data?.detail ||
        error?.message ||
        (dialogMode.value === 'edit' ? '编辑渠道失败' : '新增渠道失败'),
    );
  } finally {
    saving.value = false;
  }
}

const deleteDialogVisible = ref(false);
const deleting = ref(false);
const deleteTarget = ref(null);

const deleteTargetDisplay = computed(() => {
  const channelCode = deleteTarget.value?.channel_code ? String(deleteTarget.value.channel_code) : '';
  const channelName = deleteTarget.value?.channel_name ? String(deleteTarget.value.channel_name) : '';
  if (channelCode && channelName) return `${channelCode} - ${channelName}`;
  return channelCode || channelName || '-';
});

function openDeleteDialog(row) {
  if (!hasRowCapability(row, 'channel.delete')) {
    ElMessage.warning('当前账号无删除该渠道权限');
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
  if (!hasRowCapability(deleteTarget.value, 'channel.delete')) {
    ElMessage.warning('当前账号无删除该渠道权限');
    return;
  }
  if (!deleteTarget.value?.id) return;

  deleting.value = true;
  try {
    await deleteChannelGroup(deleteTarget.value.id);
    ElMessage.success('删除成功');
    deleteDialogVisible.value = false;

    if (tableData.value.length <= 1 && page.value > 1) page.value -= 1;
    await loadList();
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.response?.data?.detail || error?.message || '删除失败');
  } finally {
    deleting.value = false;
  }
}

onMounted(() => loadList());
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

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

.btn-ico {
  margin-right: 6px;
}

.toolbar-card {
  margin-bottom: 10px;
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 12px;
  border: 1px solid rgba(60, 60, 60, 0.08);
  backdrop-filter: blur(6px);
}

.toolbar-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.toolbar-label {
  width: 72px;
  flex-shrink: 0;
  font-size: 12px;
  color: rgba(31, 42, 68, 0.72);
  line-height: 30px;
  font-weight: 700;
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
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.toolbar-input {
  width: 100%;
  min-width: 0;
}

.toolbar-input :deep(.el-input__wrapper) {
  border-radius: 10px;
  min-height: 32px;
}

.toolbar-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
}

.table-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.main-table {
  width: 100%;
}

.col-actions :deep(.cell) {
  text-align: center;
}

.pagination-bar {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

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

.deleted-tag {
  border-radius: 10px;
}

.contacts-wrap {
  width: 100%;
}

.contacts-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.contacts-hint {
  font-size: 12px;
  color: rgba(31, 42, 68, 0.65);
}

.contacts-empty {
  font-size: 12px;
  color: rgba(31, 42, 68, 0.55);
  padding: 6px 0;
}

.contacts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.contacts-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.contacts-type {
  width: 110px;
  flex-shrink: 0;
}

.contacts-value {
  flex: 1;
}

.contacts-remove {
  flex-shrink: 0;
}

.confirm-dialog :deep(.el-dialog__body) {
  padding: 22px 22px 10px;
}

.confirm-dialog :deep(.el-dialog__footer) {
  padding: 0 22px 18px;
}

.cd {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.cd-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(245, 108, 108, 0.12);
  color: #f56c6c;
  flex-shrink: 0;
}

.cd-icon {
  font-size: 22px;
}

.cd-body {
  flex: 1;
  min-width: 0;
}

.cd-title {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
  line-height: 1.5;
}

.cd-code {
  word-break: break-all;
}

.cd-desc {
  margin-top: 8px;
  color: #606266;
  line-height: 1.6;
  font-size: 13px;
}

.cd-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
