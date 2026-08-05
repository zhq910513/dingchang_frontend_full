<template>
  <el-form :model="modelValue" class="order-search-bar" label-width="88px">
    <el-row :gutter="12">
      <el-col :span="6">
        <el-form-item label="日期">
          <el-date-picker
            :model-value="modelValue.created_date"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 100%"
            clearable
            @update:model-value="updateField('created_date', $event)"
          />
        </el-form-item>
      </el-col>

      <el-col :span="6">
        <el-form-item label="渠道">
          <RemotePagedSelect
            v-model="channelGroupIdProxy"
            type="channels"
            placeholder="选择渠道"
            select-class="w100"
            :disabled="loading"
          />
        </el-form-item>
      </el-col>

      <el-col :span="6">
        <el-form-item label="客户">
          <RemotePagedSelect
            v-model="customerGroupIdProxy"
            type="customers"
            placeholder="选择客户"
            select-class="w100"
            :disabled="loading"
          />
        </el-form-item>
      </el-col>

      <el-col :span="6">
        <el-form-item label="业务员">
          <el-select
            v-model="salespersonIdProxy"
            clearable
            filterable
            placeholder="选择业务员"
            style="width: 100%"
            :loading="salespersonsLoading"
            :disabled="loading"
            @visible-change="handleSalespersonVisible"
          >
            <el-option
              v-for="item in salespersons"
              :key="String(item.id)"
              :label="item.real_name || item.username"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
      </el-col>
    </el-row>

    <el-row :gutter="12">
      <el-col :span="6">
        <el-form-item label="团队">
          <el-select
            :model-value="modelValue.team_name"
            clearable
            filterable
            placeholder="选择团队"
            style="width: 100%"
            :loading="teamsLoading"
            :disabled="loading || teamsLoading || !canChooseTeam"
            @update:model-value="handleTeamChange"
          >
            <el-option v-for="team in teams" :key="team" :label="team" :value="team" />
          </el-select>
        </el-form-item>
      </el-col>

      <el-col :span="6">
        <el-form-item label="车主">
          <el-input
            :model-value="modelValue.owner_name"
            clearable
            placeholder="车主（模糊）"
            @update:model-value="updateField('owner_name', $event)"
            @keyup.enter="emitSearch"
          />
        </el-form-item>
      </el-col>

      <el-col :span="6">
        <el-form-item label="车牌号">
          <el-input
            :model-value="modelValue.plate_no"
            clearable
            placeholder="车牌号（模糊）"
            @update:model-value="updateField('plate_no', $event)"
            @keyup.enter="emitSearch"
          />
        </el-form-item>
      </el-col>

      <el-col :span="6">
        <el-form-item label="VIN">
          <el-input
            :model-value="modelValue.vin"
            clearable
            placeholder="VIN（模糊）"
            @update:model-value="updateField('vin', $event)"
            @keyup.enter="emitSearch"
          />
        </el-form-item>
      </el-col>
    </el-row>

    <el-row :gutter="12">
      <el-col :span="6">
        <el-form-item label="发动机号">
          <el-input
            :model-value="modelValue.engine_no"
            clearable
            placeholder="发动机号（模糊）"
            @update:model-value="updateField('engine_no', $event)"
            @keyup.enter="emitSearch"
          />
        </el-form-item>
      </el-col>

      <el-col :span="6">
        <el-form-item label="车型">
          <el-input
            :model-value="modelValue.vehicle_model"
            clearable
            placeholder="车型（模糊）"
            @update:model-value="updateField('vehicle_model', $event)"
            @keyup.enter="emitSearch"
          />
        </el-form-item>
      </el-col>

      <el-col :span="6">
        <el-form-item label="身份证号">
          <el-input
            :model-value="modelValue.id_number"
            clearable
            placeholder="身份证号（模糊）"
            @update:model-value="updateField('id_number', $event)"
            @keyup.enter="emitSearch"
          />
        </el-form-item>
      </el-col>

      <el-col :span="6">
        <el-form-item label="初登日期">
          <el-date-picker
            :model-value="modelValue.first_register_date"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 100%"
            clearable
            @update:model-value="updateField('first_register_date', $event)"
          />
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
import { computed } from 'vue'
import RemotePagedSelect from './common/RemotePagedSelect.vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
  salespersons: {
    type: Array,
    default: () => [],
  },
  salespersonsLoading: {
    type: Boolean,
    default: false,
  },
  teams: {
    type: Array,
    default: () => [],
  },
  teamsLoading: {
    type: Boolean,
    default: false,
  },
  canChooseTeam: {
    type: Boolean,
    default: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'update:modelValue',
  'search',
  'reset',
  'team-change',
  'salesperson-visible',
])

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

function handleTeamChange(teamName) {
  patchModel({ team_name: teamName, salesperson_id: undefined })
  emit('team-change', teamName)
}

function handleSalespersonVisible(visible) {
  if (visible) {
    emit('salesperson-visible')
  }
}

const channelGroupIdProxy = computed({
  get: () => props.modelValue?.channel_group_id,
  set: (value) => updateField('channel_group_id', value),
})

const customerGroupIdProxy = computed({
  get: () => props.modelValue?.customer_group_id,
  set: (value) => updateField('customer_group_id', value),
})

const salespersonIdProxy = computed({
  get: () => props.modelValue?.salesperson_id,
  set: (value) => updateField('salesperson_id', value),
})
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
