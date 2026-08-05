<template>
  <el-form :model="modelValue" class="order-search-bar" label-width="88px">
    <el-row :gutter="12">
      <el-col :span="6">
        <el-form-item label="账号/姓名">
          <el-input
            :model-value="modelValue.keyword"
            clearable
            placeholder="账号或真实姓名（模糊）"
            :disabled="loading"
            @update:model-value="updateField('keyword', $event)"
            @keyup.enter="emitSearch"
            @clear="emitSearch"
          />
        </el-form-item>
      </el-col>

      <el-col :span="6">
        <el-form-item label="角色">
          <el-select
            :model-value="modelValue.role"
            clearable
            filterable
            placeholder="全部角色"
            style="width: 100%"
            :disabled="loading"
            @update:model-value="updateField('role', $event)"
          >
            <el-option
              v-for="item in userRoleOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </el-col>

      <el-col :span="6">
        <el-form-item label="状态">
          <el-select
            :model-value="modelValue.status"
            clearable
            placeholder="全部状态"
            style="width: 100%"
            :disabled="loading"
            @update:model-value="updateField('status', $event)"
          >
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
      </el-col>

      <el-col v-if="showOnlineFilter" :span="6">
        <el-form-item label="是否在线">
          <el-select
            :model-value="modelValue.is_online"
            clearable
            placeholder="全部"
            style="width: 100%"
            :disabled="loading"
            @update:model-value="updateField('is_online', $event)"
          >
            <el-option label="在线" :value="true" />
            <el-option label="离线" :value="false" />
          </el-select>
        </el-form-item>
      </el-col>
    </el-row>

    <div class="search-actions">
      <el-button type="primary" :loading="loading" @click="emitSearch">搜索</el-button>
      <el-button :loading="loading" @click="emitReset">重置</el-button>
    </div>
  </el-form>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
  userRoleOptions: {
    type: Array,
    default: () => [],
  },
  showOnlineFilter: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'search', 'reset'])

function patchModel(patch) {
  emit('update:modelValue', {
    ...(props.modelValue || {}),
    ...patch,
  })
}

function updateField(fieldName, fieldValue) {
  patchModel({ [fieldName]: fieldValue })
}

function emitSearch() {
  emit('search')
}

function emitReset() {
  emit('reset')
}
</script>

<style scoped>
.order-search-bar {
  width: 100%;
}

.search-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
