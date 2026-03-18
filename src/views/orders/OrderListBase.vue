<template>
  <div class="page">
    <div class="page-header">
      <h2>{{ title }}</h2>
    </div>

    <el-card
        shadow="never"
        class="toolbar-card"
        :body-style="{ padding: '10px 12px' }"
    >
      <el-form :model="filters" class="filters-form" label-width="88px">
        <template v-if="isFinance">
          <el-row :gutter="12">
            <el-col :span="6">
              <el-form-item label="日期">
                <el-date-picker
                    v-model="filters.created_date"
                    type="daterange"
                    value-format="YYYY-MM-DD"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    style="width: 100%"
                    clearable
                />
              </el-form-item>
            </el-col>

            <el-col :span="6">
              <el-form-item label="渠道">
                <RemotePagedSelect
                    v-model="filters.channel_group_id"
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
                    v-model="filters.customer_group_id"
                    type="customers"
                    placeholder="选择客户"
                    select-class="w100"
                    :disabled="loading"
                />
              </el-form-item>
            </el-col>

            <el-col :span="6">
              <el-form-item label="市场">
                <el-input
                    v-model="filters.market"
                    clearable
                    placeholder="市场（模糊）"
                    @keyup.enter="search"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="12">
            <el-col :span="6">
              <el-form-item label="团队">
                <el-select
                    v-model="filters.team_name"
                    clearable
                    filterable
                    placeholder="选择团队"
                    style="width: 100%"
                    :loading="teamsLoading"
                    :disabled="teamsLoading || !canChooseTeam"
                >
                  <el-option v-for="t in teamOptions" :key="t" :label="t" :value="t"/>
                </el-select>
              </el-form-item>
            </el-col>

            <el-col :span="18"></el-col>
          </el-row>

          <el-row :gutter="12">
            <el-col :span="6">
              <el-form-item label="车主">
                <el-input
                    v-model="filters.owner_name"
                    clearable
                    placeholder="车主（模糊）"
                    @keyup.enter="search"
                />
              </el-form-item>
            </el-col>

            <el-col :span="6">
              <el-form-item label="保险到期日">
                <el-date-picker
                    v-model="filters.insurance_expire_date"
                    type="date"
                    value-format="YYYY-MM-DD"
                    placeholder="选择日期"
                    style="width: 100%"
                    clearable
                />
              </el-form-item>
            </el-col>

            <el-col :span="6">
              <el-form-item label="初登日期">
                <el-date-picker
                    v-model="filters.first_register_date"
                    type="daterange"
                    value-format="YYYY-MM-DD"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    style="width: 100%"
                    clearable
                />
              </el-form-item>
            </el-col>

            <el-col :span="6">
              <el-form-item label="是否回款">
                <el-select v-model="filters.is_paid" clearable placeholder="全部" style="width: 100%">
                  <el-option label="是" :value="true"/>
                  <el-option label="否" :value="false"/>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="12">
            <el-col :span="6">
              <el-form-item label="是否返点">
                <el-select v-model="filters.is_rebate" clearable placeholder="全部" style="width: 100%">
                  <el-option label="是" :value="true"/>
                  <el-option label="否" :value="false"/>
                </el-select>
              </el-form-item>
            </el-col>

            <el-col :span="18" class="finance-actions-col">
              <div class="finance-actions">
                <el-button native-type="button" type="primary" :loading="loading" @click="search">搜索</el-button>
                <el-button native-type="button" :loading="loading" @click="resetFilters">重置</el-button>
                <el-button native-type="button" :loading="loading" @click="loadList">刷新</el-button>

                <template v-if="canFinanceDownload">
                  <el-button
                      native-type="button"
                      :disabled="loading || downloading || (Number(total) || 0) <= 0"
                      :loading="downloading"
                      @click.stop.prevent="downloadFinanceExcel"
                  >
                    下载
                  </el-button>

                  <span v-if="selectedRows.length" class="selected-hint">已选 {{ selectedRows.length }}</span>
                </template>
              </div>
            </el-col>
          </el-row>
        </template>

        <template v-else>
          <el-row :gutter="12">
            <el-col :span="6">
              <el-form-item label="日期">
                <el-date-picker
                    v-model="filters.created_date"
                    type="daterange"
                    value-format="YYYY-MM-DD"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    style="width: 100%"
                    clearable
                />
              </el-form-item>
            </el-col>

            <el-col :span="6">
              <el-form-item label="渠道">
                <RemotePagedSelect
                    v-model="filters.channel_group_id"
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
                    v-model="filters.customer_group_id"
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
                    v-model="filters.salesperson_id"
                    clearable
                    filterable
                    placeholder="选择业务员"
                    style="width: 100%"
                    :loading="salesLoading"
                    :disabled="salesLoading"
                >
                  <el-option
                      v-for="u in filteredSalespersons"
                      :key="String(u.id)"
                      :label="u.real_name || u.username"
                      :value="u.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="12">
            <el-col :span="6">
              <el-form-item label="团队">
                <el-select
                    v-model="filters.team_name"
                    clearable
                    filterable
                    placeholder="选择团队"
                    style="width: 100%"
                    :loading="teamsLoading"
                    :disabled="teamsLoading || !canChooseTeam"
                >
                  <el-option v-for="t in teamOptions" :key="t" :label="t" :value="t"/>
                </el-select>
              </el-form-item>
            </el-col>

            <el-col :span="18"></el-col>
          </el-row>

          <el-row :gutter="12">
            <el-col :span="6">
              <el-form-item label="车主">
                <el-input
                    v-model="filters.owner_name"
                    clearable
                    placeholder="车主（模糊）"
                    @keyup.enter="search"
                />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="身份证号">
                <el-input
                    v-model="filters.id_number"
                    clearable
                    placeholder="身份证号（模糊）"
                    @keyup.enter="search"
                />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="车牌">
                <el-input
                    v-model="filters.plate_no"
                    clearable
                    placeholder="车牌（模糊）"
                    @keyup.enter="search"
                />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="发动机号">
                <el-input
                    v-model="filters.engine_no"
                    clearable
                    placeholder="发动机号（模糊）"
                    @keyup.enter="search"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="12">
            <el-col :span="6">
              <el-form-item label="车架号">
                <el-input
                    v-model="filters.vin"
                    clearable
                    placeholder="车架号（模糊）"
                    @keyup.enter="search"
                />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="车型">
                <el-input
                    v-model="filters.vehicle_model"
                    clearable
                    placeholder="车型（模糊）"
                    @keyup.enter="search"
                />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="备注">
                <el-input
                    v-model="filters.remark"
                    clearable
                    placeholder="备注（模糊）"
                    @keyup.enter="search"
                />
              </el-form-item>
            </el-col>

            <el-col :span="6" class="toolbar-actions">
              <el-button native-type="button" type="primary" :loading="loading" @click="search">搜索</el-button>
              <el-button native-type="button" :loading="loading" @click="resetFilters">重置</el-button>
              <el-button native-type="button" :loading="loading" @click="loadList">刷新</el-button>
            </el-col>
          </el-row>
        </template>
      </el-form>
    </el-card>

    <div class="table-scroll">
      <el-table
          ref="tableRef"
          v-loading="loading"
          :data="tableData"
          border
          stripe
          class="main-table"
          :row-class-name="tableRowClassName"
          @selection-change="onSelectionChange"
      >
        <el-table-column
            v-if="isFinance && canFinanceDownload"
            type="selection"
            width="44"
            fixed="left"
            align="center"
            header-align="center"
            :selectable="selectableRow"
        />

        <el-table-column label="日期" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row._is_summary ? "汇总" : row._view_created_at }}
          </template>
        </el-table-column>

        <el-table-column
            v-if="showFinishedColumn"
            label="完成状态"
            min-width="92"
            align="center"
            header-align="center"
            show-overflow-tooltip
        >
          <template #default="{ row }">{{ row._is_summary ? "" : row._view_finished_text }}</template>
        </el-table-column>

        <el-table-column label="渠道" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row._is_summary ? "" : row._view_channel_name }}</template>
        </el-table-column>

        <el-table-column label="客户" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row._is_summary ? "" : row._view_customer_name }}</template>
        </el-table-column>

        <el-table-column label="市场" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ row._is_summary ? "" : row._view_market }}</template>
        </el-table-column>

        <el-table-column v-if="isFinance" label="业务员" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row._is_summary ? "" : row._view_salesperson_name }}</template>
        </el-table-column>

        <el-table-column label="车主" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row._is_summary ? "" : row._view_owner }}</template>
        </el-table-column>

        <el-table-column label="车牌" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row._is_summary ? "" : row._view_plate }}</template>
        </el-table-column>

        <el-table-column label="保险到期日" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row._is_summary ? "" : row._view_insurance_expire }}</template>
        </el-table-column>

        <el-table-column label="车架号" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row._is_summary ? "" : row._view_vin }}</template>
        </el-table-column>

        <el-table-column label="发动机号" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ row._is_summary ? "" : row._view_engine }}</template>
        </el-table-column>

        <el-table-column label="车型" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row._is_summary ? "" : row._view_vehicle_model }}</template>
        </el-table-column>

        <el-table-column label="初登日期" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row._is_summary ? "" : row._view_first_register }}</template>
        </el-table-column>

        <el-table-column label="身份证号" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">{{ row._is_summary ? "" : row._view_id_number }}</template>
        </el-table-column>

        <el-table-column label="电话" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row._is_summary ? "" : row._view_phone }}</template>
        </el-table-column>

        <el-table-column label="商业金额" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ row._view_money_commercial_amount }}</template>
        </el-table-column>

        <el-table-column label="交强金额" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ row._view_money_compulsory_amount }}</template>
        </el-table-column>

        <el-table-column label="车船税金额" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row._view_money_vehicle_tax_amount }}</template>
        </el-table-column>

        <el-table-column label="非车金额" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ row._view_money_non_vehicle_amount }}</template>
        </el-table-column>

        <el-table-column label="渠道商业点位" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row._is_summary ? "" : row._view_point_channel_commercial_point }}</template>
        </el-table-column>

        <el-table-column label="渠道商业后补点位" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{
              row._is_summary ? "" : row._view_point_channel_commercial_supplement_point
            }}
          </template>
        </el-table-column>

        <el-table-column label="渠道交强点位" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row._is_summary ? "" : row._view_point_channel_compulsory_point }}</template>
        </el-table-column>

        <el-table-column label="渠道车船税点位" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row._is_summary ? "" : row._view_point_channel_vehicle_tax_point }}</template>
        </el-table-column>

        <el-table-column label="渠道非车点位" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row._is_summary ? "" : row._view_point_channel_non_vehicle_point }}</template>
        </el-table-column>

        <el-table-column v-if="isFinance" label="渠道奖励" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ row._view_reward_channel_reward }}</template>
        </el-table-column>

        <el-table-column label="客户商业点位" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row._is_summary ? "" : row._view_point_customer_commercial_point }}</template>
        </el-table-column>

        <el-table-column label="客户商业后补点位" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{
              row._is_summary ? "" : row._view_point_customer_commercial_supplement_point
            }}
          </template>
        </el-table-column>

        <el-table-column label="客户交强点位" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row._is_summary ? "" : row._view_point_customer_compulsory_point }}</template>
        </el-table-column>

        <el-table-column label="客户车船税点位" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{
              row._is_summary ? "" : row._view_point_customer_vehicle_tax_point
            }}
          </template>
        </el-table-column>

        <el-table-column label="客户非车点位" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{
              row._is_summary ? "" : row._view_point_customer_non_vehicle_point
            }}
          </template>
        </el-table-column>

        <el-table-column v-if="isFinance" label="客户奖励" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ row._view_reward_customer_reward }}</template>
        </el-table-column>

        <el-table-column label="应收" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ row._view_receivable }}</template>
        </el-table-column>

        <el-table-column label="应付" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ row._view_payable }}</template>
        </el-table-column>

        <el-table-column label="利润" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ row._view_profit }}</template>
        </el-table-column>

        <el-table-column label="所属经理" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row._is_summary ? "" : row._view_manager_name }}</template>
        </el-table-column>

        <el-table-column label="所属团队" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row._is_summary ? "" : row._view_team_name }}</template>
        </el-table-column>

        <el-table-column
            v-if="isFinance"
            label="是否回款"
            width="108"
            fixed="right"
            align="center"
            header-align="center"
            class-name="col-switch"
        >
          <template #default="{ row }">
            <div class="switch-cell" v-if="!row._is_summary">
              <el-switch
                  size="medium"
                  inline-prompt
                  inactive-text="否"
                  active-text="是"
                  :model-value="Boolean(row.is_paid)"
                  :loading="Boolean(row?._saving_paid)"
                  :disabled="!canFinanceEdit"
                  @change="(val) => onPaidSwitch(row, val)"
              />
            </div>
            <span v-else></span>
          </template>
        </el-table-column>

        <el-table-column
            v-if="isFinance"
            label="是否返点"
            width="108"
            fixed="right"
            align="center"
            header-align="center"
            class-name="col-switch"
        >
          <template #default="{ row }">
            <div class="switch-cell" v-if="!row._is_summary">
              <el-switch
                  size="medium"
                  inline-prompt
                  inactive-text="否"
                  active-text="是"
                  :model-value="Boolean(row.is_rebate)"
                  :loading="Boolean(row?._saving_rebate)"
                  :disabled="!canFinanceEdit"
                  @change="(val) => onRebateSwitch(row, val)"
              />
            </div>
            <span v-else></span>
          </template>
        </el-table-column>

        <el-table-column
            label="操作"
            :width="isFinance ? 110 : 130"
            fixed="right"
            align="center"
            header-align="center"
            class-name="col-actions"
        >
          <template #default="{ row }">
            <template v-if="row._is_summary">
              <span></span>
            </template>

            <template v-else-if="isFinance">
              <div class="actions">
                <el-button native-type="button" size="small" link @click.stop="goDetail(row.id)">详情</el-button>

                <el-dropdown
                    trigger="click"
                    :teleported="true"
                    placement="bottom-end"
                    popper-class="order-actions-popper"
                    @command="(cmd) => onFinanceAction(cmd, row)"
                >
                  <el-button native-type="button" size="small" circle @click.stop>
                    <el-icon>
                      <MoreFilled/>
                    </el-icon>
                  </el-button>

                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="detail">详情</el-dropdown-item>
                      <el-dropdown-item v-if="canFinanceEdit" command="return" divided>退回未完成</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>

            <template v-else>
              <div class="actions">
                <el-button native-type="button" size="small" link @click.stop="goDetail(row.id)">详情</el-button>

                <el-dropdown
                    trigger="click"
                    :teleported="true"
                    placement="bottom-end"
                    popper-class="order-actions-popper"
                    @command="(cmd) => onAction(cmd, row)"
                >
                  <el-button native-type="button" size="small" circle @click.stop>
                    <el-icon>
                      <MoreFilled/>
                    </el-icon>
                  </el-button>

                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="detail">详情</el-dropdown-item>
                      <el-dropdown-item v-if="canMarkFinished(row)" command="markFinished" divided>标记完成
                      </el-dropdown-item>
                      <el-dropdown-item v-if="canReopen(row)" command="reopen" divided>退回未完成</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="pagination-wrapper">
      <el-pagination
          background
          layout="total, prev, pager, next, sizes"
          :total="total"
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          @current-change="onPageChange"
          @size-change="onPageSizeChange"
      />
    </div>
  </div>
</template>

<script setup>
import {computed, onActivated, onMounted, ref, watch} from "vue";
import {useRoute, useRouter} from "vue-router";
import {ElMessage, ElMessageBox} from "element-plus";
import {MoreFilled} from "@element-plus/icons-vue";
import RemotePagedSelect from "@/components/common/RemotePagedSelect.vue";

import {getTeams, listOrders, listSalespersons, updateOrderStatus,} from "../../api/orders";
import {
  exportFinanceOrders,
  getFinanceOrdersSummary,
  returnFinanceOrder,
  updateFinanceOrderStatus,
} from "../../api/finance";
import {useSessionStore} from "../../store/session";
import {ROLE} from "../../constants";

const props = defineProps({
  title: {type: String, default: "订单列表"},
  mode: {type: String, default: "all"},
  pageMode: {type: String, default: "orders"},
});

const router = useRouter();
const route = useRoute();
const session = useSessionStore();

const isFinance = computed(() => props.pageMode === "finance");
const showFinishedColumn = computed(() => !isFinance.value);

const roleName = computed(() => String(session.roleName || "").trim().toLowerCase());
const isSales = computed(() => roleName.value === ROLE.SALES);

const canChooseTeam = computed(() => {
  const rn = roleName.value;
  return rn === ROLE.SUPER_ADMIN || rn === ROLE.MANAGER || rn === ROLE.FINANCE || rn === ROLE.MARKET;
});

const canFinanceEdit = computed(() => {
  if (!isFinance.value) return false;
  const rn = roleName.value;
  return rn === ROLE.FINANCE || rn === ROLE.SUPER_ADMIN || rn === ROLE.MANAGER;
});

const canFinanceDownload = computed(() => {
  if (!isFinance.value) return false;
  const rn = roleName.value;
  return rn === ROLE.FINANCE || rn === ROLE.SUPER_ADMIN || rn === ROLE.MANAGER;
});

const loading = ref(false);
const downloading = ref(false);

const orders = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

const salespersons = ref([]);
const salespersonMapRef = ref(new Map());
const salesLoading = ref(false);
const teamOptions = ref([]);
const teamsLoading = ref(false);

const teamsLoaded = ref(false);
const salesLoaded = ref(false);

const tableRef = ref(null);
const selectedRows = ref([]);

const financeSummary = ref(null);
const lastSummaryKey = ref("");
const lastListKey = ref("");

function defaultOrdersFilters() {
  return {
    owner_name: "",
    id_number: "",
    vin: "",
    engine_no: "",
    plate_no: "",
    vehicle_model: "",
    remark: "",
    customer_group_id: null,
    channel_group_id: null,
    salesperson_id: null,
    team_name: null,
    created_date: [],
  };
}

function defaultFinanceFilters() {
  return {
    created_date: [],
    channel_group_id: null,
    customer_group_id: null,
    market: "",
    owner_name: "",
    insurance_expire_date: "",
    first_register_date: [],
    is_paid: null,
    is_rebate: null,
    team_name: null,
  };
}

const filters = ref(isFinance.value ? defaultFinanceFilters() : defaultOrdersFilters());

const pageContextKey = computed(() => `${props.pageMode || ""}|${props.mode || ""}|${route.path || ""}`);

const hasMountedOnce = ref(false);
const lastActivatedContextKey = ref("");
const manualSearching = ref(false);

let listRequestSeq = 0;
let summaryRequestSeq = 0;
let dropdownBootstrapSeq = 0;

function _trimStr(v) {
  return String(v ?? "").trim();
}

function _toDisplay(v, fallback = "-") {
  const s = _trimStr(v);
  return s || fallback;
}


function normalizeItems(resp) {
  const data = resp?.data ?? resp ?? {};
  return Array.isArray(data?.items) ? data.items : [];
}

function normalizeTeamNames(resp) {
  const data = resp?.data ?? resp ?? {};
  const items = Array.isArray(data?.items) ? data.items : [];
  const out = [];
  const seen = new Set();
  for (const x of items) {
    const t = String(x?.team_name ?? "").trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out.sort((a, b) => String(a).localeCompare(String(b), "zh-CN"));
}

function toNum(x) {
  if (x === null || x === undefined || x === "") return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function fmtMoney(x) {
  const n = toNum(x);
  if (n === null) return "-";
  return n.toFixed(2);
}

function fmtPoint(x) {
  const n = toNum(x);
  if (n === null) return "-";
  return String(x);
}

function normalizeCompactYmd(val) {
  if (val === null || val === undefined || val === "") return "";
  const s = String(val).trim();
  if (!s) return "";
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function _formatYmdInShanghai(dateObj) {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateObj);

  const y = parts.find((p) => p.type === "year")?.value || "";
  const m = parts.find((p) => p.type === "month")?.value || "";
  const da = parts.find((p) => p.type === "day")?.value || "";
  if (!y || !m || !da) return "-";
  return `${y}-${m}-${da}`;
}

function fmtYmdSafe(anyVal) {
  if (!anyVal) return "-";
  const raw = String(anyVal).trim();
  if (!raw) return "-";
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}\s+/.test(raw) && !raw.includes("T")) return raw.slice(0, 10);

  try {
    let toParse = raw;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(raw)) {
      toParse = `${raw}Z`;
    }
    const d = new Date(toParse);
    if (!Number.isFinite(d.getTime())) return "-";
    return _formatYmdInShanghai(d);
  } catch {
    return normalizeCompactYmd(anyVal) || "-";
  }
}

function _joinTeams(v) {
  const arr = Array.isArray(v) ? v : v ? [v] : [];
  if (!arr.length) return "";
  const seen = new Set();
  const cleaned = [];
  for (const item of arr) {
    const s = String(item || "").trim();
    if (s && !seen.has(s)) {
      seen.add(s);
      cleaned.push(s);
    }
  }
  return cleaned.length ? cleaned.join("、") : "";
}

function _currentUserId() {
  const candidates = [
    session?.userId,
    session?.user_id,
    session?.id,
    session?.user?.id,
    session?.user?.user_id,
    session?.user?.uid,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function initSalesDefaultIfNeeded() {
  if (!isSales.value) return;
  const uid = _currentUserId();
  if (uid && !isFinance.value) {
    filters.value.salesperson_id = uid;
  }
}

function _rebuildSalespersonMap() {
  const mp = new Map();
  const arr = Array.isArray(salespersons.value) ? salespersons.value : [];
  for (const u of arr) {
    const id = Number(u?.id);
    if (Number.isFinite(id) && id > 0) {
      mp.set(id, u);
    }
  }
  salespersonMapRef.value = mp;
}

function _getSalespersonByRow(row) {
  const sid = Number(row?.salesperson_id);
  if (!Number.isFinite(sid) || sid <= 0) return null;
  return salespersonMapRef.value.get(sid) || null;
}

function _safeOrderInfo(row) {
  const oi = row?.order_info;
  return oi && typeof oi === "object" ? oi : EMPTY_OBJ;
}

function _safeDynamicData(row) {
  const dd = row?.dynamic_data;
  return dd && typeof dd === "object" ? dd : EMPTY_OBJ;
}

const EMPTY_OBJ = Object.freeze({});

function _decorateRow(row) {
  if (!row || typeof row !== "object") return row;

  const dd = _safeDynamicData(row);
  const oi = _safeOrderInfo(row);
  const sp = _getSalespersonByRow(row);

  const salespersonName = _trimStr(row?.salesperson_name) || _trimStr(sp?.real_name) || _trimStr(sp?.username) || "-";
  const managerName = _trimStr(row?.manager_name) || _trimStr(sp?.manager_name) || _trimStr(sp?.parent_name) || "-";

  const rowTeams = _joinTeams(row?.team_names);
  const spTeams = _joinTeams(sp?.team_names);
  const teamName = rowTeams || _trimStr(row?.team_name) || spTeams || _trimStr(sp?.team_name) || "-";

  row._view_created_at = fmtYmdSafe(row?.created_at);
  row._view_finished_text = Boolean(row?.is_finished) ? "是" : "否";
  row._view_channel_name = _toDisplay(row?.channel_group_name);
  row._view_customer_name = _toDisplay(row?.customer_group_name);
  row._view_market = _toDisplay(row?.customer_group_market);
  row._view_salesperson_name = salespersonName;
  row._view_owner = _toDisplay(dd?.owner_name);
  row._view_plate = _toDisplay(dd?.plate_no);
  row._view_insurance_expire = normalizeCompactYmd(oi?.insurance_expire_date) || "-";
  row._view_vin = _toDisplay(dd?.vin);
  row._view_engine = _toDisplay(dd?.engine_no);
  row._view_vehicle_model = _toDisplay(dd?.vehicle_model);
  row._view_first_register = normalizeCompactYmd(dd?.first_register_date) || "-";
  row._view_id_number = _toDisplay(dd?.id_number);
  row._view_phone = _toDisplay(oi?.owner_phone);
  row._view_manager_name = managerName;
  row._view_team_name = teamName;

  row._view_money_commercial_amount = fmtMoney(oi?.commercial_amount);
  row._view_money_compulsory_amount = fmtMoney(oi?.compulsory_amount);
  row._view_money_vehicle_tax_amount = fmtMoney(oi?.vehicle_tax_amount);
  row._view_money_non_vehicle_amount = fmtMoney(oi?.non_vehicle_amount);

  row._view_point_channel_commercial_point = fmtPoint(oi?.channel_commercial_point);
  row._view_point_channel_commercial_supplement_point = fmtPoint(oi?.channel_commercial_supplement_point);
  row._view_point_channel_compulsory_point = fmtPoint(oi?.channel_compulsory_point);
  row._view_point_channel_vehicle_tax_point = fmtPoint(oi?.channel_vehicle_tax_point);
  row._view_point_channel_non_vehicle_point = fmtPoint(oi?.channel_non_vehicle_point);

  row._view_reward_channel_reward = fmtMoney(oi?.channel_reward);

  row._view_point_customer_commercial_point = fmtPoint(oi?.customer_commercial_point);
  row._view_point_customer_commercial_supplement_point = fmtPoint(oi?.customer_commercial_supplement_point);
  row._view_point_customer_compulsory_point = fmtPoint(oi?.customer_compulsory_point);
  row._view_point_customer_vehicle_tax_point = fmtPoint(oi?.customer_vehicle_tax_point);
  row._view_point_customer_non_vehicle_point = fmtPoint(oi?.customer_non_vehicle_point);

  row._view_reward_customer_reward = fmtMoney(oi?.customer_reward);
  row._view_receivable = fmtMoney(oi?.channel_total);
  row._view_payable = fmtMoney(oi?.customer_total);
  row._view_profit = fmtMoney(oi?.profit);

  return row;
}

function _decorateRows(rows) {
  if (!Array.isArray(rows) || !rows.length) return [];
  const out = new Array(rows.length);
  for (let i = 0; i < rows.length; i += 1) {
    out[i] = _decorateRow(rows[i]);
  }
  return out;
}

function _asDateRange(v) {
  if (!Array.isArray(v)) return null;
  const s = _trimStr(v[0]);
  const e = _trimStr(v[1]);
  if (!s && !e) return null;
  return {start: s || "", end: e || ""};
}

function _applyRangeParams(p, baseKey, v) {
  const r0 = _asDateRange(v);
  if (!r0) return;

  let start = _trimStr(r0.start);
  let end = _trimStr(r0.end);
  if (start && !end) end = start;
  if (end && !start) start = end;
  if (!start || !end) return;

  p[`${baseKey}_start`] = start;
  p[`${baseKey}_end`] = end;
}

function buildFinanceFilterParams() {
  const p = {};
  const f = filters.value || EMPTY_OBJ;

  if (f.team_name) p.team_name = String(f.team_name).trim();
  if (f.customer_group_id) p.customer_group_id = f.customer_group_id;
  if (f.channel_group_id) p.channel_group_id = f.channel_group_id;

  _applyRangeParams(p, "created_date", f.created_date);

  const market = _trimStr(f.market);
  if (market) p.market = market;

  const owner = _trimStr(f.owner_name);
  if (owner) p.owner_name = owner;

  if (f.insurance_expire_date) p.insurance_expire_date = f.insurance_expire_date;
  _applyRangeParams(p, "first_register_date", f.first_register_date);

  if (f.is_paid === true || f.is_paid === false) p.is_paid = f.is_paid;
  if (f.is_rebate === true || f.is_rebate === false) p.is_rebate = f.is_rebate;

  return p;
}

function buildListParams() {
  const p = {page: page.value, page_size: pageSize.value};
  const f = filters.value || EMPTY_OBJ;

  if (f.team_name) p.team_name = String(f.team_name).trim();

  if (props.mode === "finished") p.is_finished = true;
  if (props.mode === "unfinished") p.is_finished = false;

  if (f.customer_group_id) p.customer_group_id = f.customer_group_id;
  if (f.channel_group_id) p.channel_group_id = f.channel_group_id;

  _applyRangeParams(p, "created_date", f.created_date);

  if (isFinance.value) {
    const fp = buildFinanceFilterParams();
    fp.page = p.page;
    fp.page_size = p.page_size;
    fp.is_finished = true;
    return fp;
  }

  if (f.owner_name) p.owner_name = f.owner_name;
  if (f.id_number) p.id_number = f.id_number;
  if (f.vin) p.vin = f.vin;
  if (f.engine_no) p.engine_no = f.engine_no;
  if (f.plate_no) p.plate_no = f.plate_no;
  if (f.vehicle_model) p.vehicle_model = f.vehicle_model;
  if (f.remark) p.remark = f.remark;
  if (f.salesperson_id) p.salesperson_id = f.salesperson_id;

  return p;
}

function buildSummaryParams() {
  if (isFinance.value) {
    return buildFinanceFilterParams();
  }
  const p = buildListParams();
  delete p.page;
  delete p.page_size;
  return p;
}

function stableStringify(obj) {
  const seen = new Set();
  const sort = (o) => {
    if (o === null || typeof o !== "object") return o;
    if (seen.has(o)) return null;
    seen.add(o);

    if (Array.isArray(o)) return o.map(sort);

    const keys = Object.keys(o).sort();
    const out = {};
    for (let i = 0; i < keys.length; i += 1) {
      const k = keys[i];
      out[k] = sort(o[k]);
    }
    return out;
  };

  try {
    return JSON.stringify(sort(obj));
  } catch {
    return "";
  }
}

function isSummaryRow(row) {
  return Boolean(row?._is_summary);
}

function selectableRow(row) {
  return !row?._is_summary;
}

function tableRowClassName({row}) {
  return row?._is_summary ? "row-summary" : "";
}

function onSelectionChange(list) {
  const arr = Array.isArray(list) ? list : [];
  selectedRows.value = arr.filter((r) => !r?._is_summary);
}

function _clearSelection() {
  selectedRows.value = [];
  try {
    tableRef.value?.clearSelection?.();
  } catch {
    // ignore
  }
}

function buildSummaryRow(sum) {
  const n = (v) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };

  const row = {
    id: -1,
    _is_summary: true,
    order_info: {
      commercial_amount: n(sum?.commercial_amount),
      compulsory_amount: n(sum?.compulsory_amount),
      vehicle_tax_amount: n(sum?.vehicle_tax_amount),
      non_vehicle_amount: n(sum?.non_vehicle_amount),
      channel_reward: n(sum?.channel_reward),
      customer_reward: n(sum?.customer_reward),
      channel_total: n(sum?.receivable),
      customer_total: n(sum?.payable),
      profit: n(sum?.profit),
    },
  };

  row._view_created_at = "汇总";
  row._view_money_commercial_amount = fmtMoney(row.order_info.commercial_amount);
  row._view_money_compulsory_amount = fmtMoney(row.order_info.compulsory_amount);
  row._view_money_vehicle_tax_amount = fmtMoney(row.order_info.vehicle_tax_amount);
  row._view_money_non_vehicle_amount = fmtMoney(row.order_info.non_vehicle_amount);
  row._view_reward_channel_reward = fmtMoney(row.order_info.channel_reward);
  row._view_reward_customer_reward = fmtMoney(row.order_info.customer_reward);
  row._view_receivable = fmtMoney(row.order_info.channel_total);
  row._view_payable = fmtMoney(row.order_info.customer_total);
  row._view_profit = fmtMoney(row.order_info.profit);

  return row;
}

const tableData = computed(() => {
  const base = Array.isArray(orders.value) ? orders.value : [];
  if (isFinance.value && financeSummary.value) {
    return [...base, buildSummaryRow(financeSummary.value)];
  }
  return base;
});

const filteredSalespersons = computed(() => {
  return Array.isArray(salespersons.value) ? salespersons.value : [];
});


async function loadTeamsOnly(force = false) {
  if (teamsLoaded.value && !force) return;
  teamsLoading.value = true;
  try {
    const resp = await getTeams();
    teamOptions.value = normalizeTeamNames(resp);
    teamsLoaded.value = true;
  } catch (e) {
    console.error(e);
    teamOptions.value = [];
  } finally {
    teamsLoading.value = false;
  }
}

async function loadSalespersonsForTeam(teamName, force = false) {
  if (isFinance.value) {
    salespersons.value = [];
    _rebuildSalespersonMap();
    salesLoaded.value = true;
    return;
  }

  if (salesLoaded.value && !force && _trimStr(teamName) === _trimStr(filters.value?.team_name)) {
    return;
  }

  salesLoading.value = true;
  try {
    const tf = String(teamName || "").trim();
    const resp = await listSalespersons(tf ? {status: 1, team_name: tf} : {status: 1});
    salespersons.value = normalizeItems(resp);
    _rebuildSalespersonMap();
    salesLoaded.value = true;
  } catch (e) {
    console.error(e);
    salespersons.value = [];
    _rebuildSalespersonMap();
  } finally {
    salesLoading.value = false;
  }
}

async function bootstrapDropdowns(force = false) {
  const seq = ++dropdownBootstrapSeq;

  const tasks = [loadTeamsOnly(force)];

  if (!isFinance.value) {
    tasks.push(loadSalespersonsForTeam(filters.value?.team_name, force));
  }

  await Promise.allSettled(tasks);

  if (seq !== dropdownBootstrapSeq) return;
}

watch(
    () => filters.value?.team_name,
    async (team) => {
      if (isFinance.value) return;
      if (!hasMountedOnce.value) return;

      const prevSid = filters.value?.salesperson_id;

      if (!isSales.value) {
        filters.value.salesperson_id = null;
      } else {
        const uid = _currentUserId();
        if (uid) filters.value.salesperson_id = uid;
      }

      await loadSalespersonsForTeam(team, true);

      if (!isSales.value && prevSid) {
        const ok = (Array.isArray(salespersons.value) ? salespersons.value : []).some(
            (u) => Number(u?.id) === Number(prevSid)
        );
        if (ok) filters.value.salesperson_id = prevSid;
      }
    }
);

watch(
    () => pageContextKey.value,
    async (next, prev) => {
      if (!next || next === prev || !hasMountedOnce.value) return;

      filters.value = isFinance.value ? defaultFinanceFilters() : defaultOrdersFilters();
      initSalesDefaultIfNeeded();

      page.value = 1;
      financeSummary.value = null;
      lastSummaryKey.value = "";
      lastListKey.value = "";
      _clearSelection();

      loadList(true);
      bootstrapDropdowns(true);

      lastActivatedContextKey.value = next;
    },
    {flush: "post"}
);

async function loadSummaryIfNeeded(force = false) {
  if (!isFinance.value) return;

  const params = buildSummaryParams();
  const key = stableStringify(params);

  if (!force && key && key === lastSummaryKey.value && financeSummary.value) return;

  const currentSeq = ++summaryRequestSeq;

  try {
    const resp = await getFinanceOrdersSummary(params);
    if (currentSeq !== summaryRequestSeq) return;

    const data = resp?.data ?? resp ?? {};
    financeSummary.value = data && typeof data === "object" ? data : null;
    lastSummaryKey.value = key || "";
  } catch (e) {
    if (currentSeq !== summaryRequestSeq) return;
    console.error(e);
    financeSummary.value = null;
    lastSummaryKey.value = key || "";
  }
}

async function loadList(force = false) {
  const currentSeq = ++listRequestSeq;
  const params = buildListParams();
  const key = stableStringify(params);

  if (!force && key && key === lastListKey.value) {
    if (isFinance.value) {
      loadSummaryIfNeeded(false);
    }
    return;
  }

  loading.value = true;
  try {
    const resp = await listOrders(params);
    if (currentSeq !== listRequestSeq) return;

    const data = resp?.data ?? resp ?? {};
    const items = Array.isArray(data?.items) ? data.items : [];
    orders.value = _decorateRows(items);
    total.value = Number(data?.total ?? 0);
    lastListKey.value = key || "";
    _clearSelection();

    if (isFinance.value) {
      loadSummaryIfNeeded(force);
    }
  } catch (e) {
    if (currentSeq !== listRequestSeq) return;
    console.error(e);
    ElMessage.error(isFinance.value ? "加载财务列表失败" : "加载订单列表失败");
  } finally {
    if (currentSeq === listRequestSeq) {
      loading.value = false;
    }
  }
}

async function search() {
  if (manualSearching.value) return;
  manualSearching.value = true;

  try {
    page.value = 1;
    financeSummary.value = null;
    lastSummaryKey.value = "";
    lastListKey.value = "";
    await loadList(true);
  } finally {
    manualSearching.value = false;
  }
}

async function resetFilters() {
  filters.value = isFinance.value ? defaultFinanceFilters() : defaultOrdersFilters();
  initSalesDefaultIfNeeded();

  page.value = 1;
  financeSummary.value = null;
  lastSummaryKey.value = "";
  lastListKey.value = "";

  await loadList(true);

  if (!isFinance.value) {
    loadSalespersonsForTeam(filters.value?.team_name, true);
  }
}

function onPageChange(p) {
  page.value = p;
  lastListKey.value = "";
  loadList(true);
}

function onPageSizeChange(size) {
  pageSize.value = size;
  page.value = 1;
  lastListKey.value = "";
  loadList(true);
}

function goDetail(id) {
  const from = route.fullPath;
  if (isFinance.value) {
    router.push(`/finance/orders/${id}?from=${encodeURIComponent(from)}&source=finance`);
  } else {
    router.push(`/orders/${id}?from=${encodeURIComponent(from)}`);
  }
}

function _isMyOrder(row) {
  const uid = _currentUserId();
  if (!uid) return true;
  const sid = Number(row?.salesperson_id ?? 0);
  if (!Number.isFinite(sid) || sid <= 0) return true;
  return Math.trunc(sid) === uid;
}

function canMarkFinished(row) {
  if (isFinance.value || !row || row._is_summary) return false;
  if (Boolean(row?.is_finished)) return false;

  const rn = roleName.value;
  if (rn === ROLE.MARKET || rn === ROLE.FINANCE) return false;
  if (rn === ROLE.SALES) return _isMyOrder(row);
  return rn === ROLE.SUPER_ADMIN || rn === ROLE.MANAGER;
}

function canReopen(row) {
  if (isFinance.value || !row || row._is_summary) return false;
  if (!Boolean(row?.is_finished)) return false;

  const rn = roleName.value;
  return rn === ROLE.SUPER_ADMIN || rn === ROLE.MANAGER;
}

async function _confirmUpdateFinished(row, nextFinished) {
  const next = Boolean(nextFinished);
  const title = next ? "确认标记完成" : "确认退回未完成";
  const msg = next ? "确认将该订单标记为【已完成】？" : "确认将该订单退回【未完成】？";

  try {
    await ElMessageBox.confirm(msg, title, {
      confirmButtonText: "确认",
      cancelButtonText: "取消",
      type: "warning",
      center: true,
    });
  } catch {
    return false;
  }
  return true;
}

async function _updateFinished(row, nextFinished) {
  if (!row?.id) return;
  const next = Boolean(nextFinished);
  const prev = Boolean(row?.is_finished);
  if (prev === next) return;

  const ok = await _confirmUpdateFinished(row, next);
  if (!ok) return;

  row._saving_finished = true;
  row.is_finished = next;
  row._view_finished_text = next ? "是" : "否";

  try {
    await updateOrderStatus(row.id, {is_finished: next});
    ElMessage.success(next ? "已标记完成" : "已退回未完成");
    await loadList(true);
  } catch (e) {
    console.error(e);
    row.is_finished = prev;
    row._view_finished_text = prev ? "是" : "否";
    ElMessage.error("操作失败");
  } finally {
    row._saving_finished = false;
  }
}

async function onAction(cmd, row) {
  if (!row || row._is_summary) return;

  if (cmd === "detail") {
    goDetail(row.id);
    return;
  }

  if (cmd === "markFinished") {
    if (!canMarkFinished(row)) {
      ElMessage.error("无权限操作");
      return;
    }
    await _updateFinished(row, true);
    return;
  }

  if (cmd === "reopen") {
    if (!canReopen(row)) {
      ElMessage.error("无权限操作");
      return;
    }
    await _updateFinished(row, false);
  }
}

async function _alertReturnBlocked() {
  try {
    await ElMessageBox.alert("退回前请先将【回款】和【返点】都调整为“否”。", "无法退回", {
      type: "warning",
      center: true,
      confirmButtonText: "我知道了",
    });
  } catch {
    // ignore
  }
}

async function confirmReturnToUnfinished(row) {
  if (!isFinance.value || !row?.id || row._is_summary) return;
  if (!canFinanceEdit.value) {
    ElMessage.error("无权限操作");
    return;
  }

  if (Boolean(row?.is_paid) || Boolean(row?.is_rebate)) {
    await _alertReturnBlocked();
    return;
  }

  try {
    await ElMessageBox.confirm("确认将该订单退回【未完成】？", "确认退回", {
      confirmButtonText: "确认退回",
      cancelButtonText: "取消",
      type: "warning",
      center: true,
    });
  } catch {
    return;
  }

  try {
    await returnFinanceOrder(row.id);
    ElMessage.success("已退回未完成");
    await loadList(true);
  } catch (e) {
    console.error(e);
    ElMessage.error("操作失败");
  }
}

async function onFinanceAction(cmd, row) {
  if (!row || row._is_summary) return;

  if (cmd === "detail") {
    goDetail(row.id);
    return;
  }
  if (cmd === "return") {
    await confirmReturnToUnfinished(row);
  }
}

async function onPaidSwitch(row, nextVal) {
  if (!isFinance.value || !row?.id || row._is_summary || !canFinanceEdit.value) return;

  const prev = Boolean(row?.is_paid);
  const next = Boolean(nextVal);
  if (prev === next) return;

  try {
    await ElMessageBox.confirm(`确认将该订单【回款】改为【${next ? "是" : "否"}】？`, "确认操作", {
      confirmButtonText: "确认",
      cancelButtonText: "取消",
      type: "warning",
      center: true,
    });
  } catch {
    return;
  }

  row._saving_paid = true;
  row.is_paid = next;

  try {
    await updateFinanceOrderStatus(row.id, {is_paid: next});
    ElMessage.success("已更新回款状态");
  } catch (e) {
    console.error(e);
    row.is_paid = prev;
    ElMessage.error("操作失败");
  } finally {
    row._saving_paid = false;
  }
}

async function onRebateSwitch(row, nextVal) {
  if (!isFinance.value || !row?.id || row._is_summary || !canFinanceEdit.value) return;

  const prev = Boolean(row?.is_rebate);
  const next = Boolean(nextVal);
  if (prev === next) return;

  try {
    await ElMessageBox.confirm(`确认将该订单【返点】改为【${next ? "是" : "否"}】？`, "确认操作", {
      confirmButtonText: "确认",
      cancelButtonText: "取消",
      type: "warning",
      center: true,
    });
  } catch {
    return;
  }

  row._saving_rebate = true;
  row.is_rebate = next;

  try {
    await updateFinanceOrderStatus(row.id, {is_rebate: next});
    ElMessage.success("已更新返点状态");
  } catch (e) {
    console.error(e);
    row.is_rebate = prev;
    ElMessage.error("操作失败");
  } finally {
    row._saving_rebate = false;
  }
}

function _parseFilenameFromDisposition(disposition) {
  const s = String(disposition || "");
  if (!s) return "";

  const m1 = s.match(/filename\*\s*=\s*([^;]+)/i);
  if (m1 && m1[1]) {
    const v = m1[1].trim();
    const idx = v.indexOf("''");
    if (idx >= 0) {
      const encoded = v.slice(idx + 2).trim();
      try {
        return decodeURIComponent(encoded);
      } catch {
        return encoded;
      }
    }
    return v.replace(/^["']|["']$/g, "");
  }

  const m2 = s.match(/filename\s*=\s*([^;]+)/i);
  if (m2 && m2[1]) {
    return m2[1].trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

function _triggerDownloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }, 1200);
}

async function downloadFinanceExcel() {
  if (!isFinance.value) return;
  if (!canFinanceDownload.value) {
    ElMessage.error("无权限下载");
    return;
  }
  if (downloading.value) return;

  downloading.value = true;

  try {
    const baseParams = buildSummaryParams();
    const ids = (Array.isArray(selectedRows.value) ? selectedRows.value : [])
        .filter((r) => !r?._is_summary)
        .map((r) => Number(r?.id))
        .filter((n) => Number.isFinite(n) && n > 0);

    const reqParams = {
      ...baseParams,
      ...(ids.length ? {ids} : {}),
    };

    const resp = await exportFinanceOrders(reqParams, {
      validateStatus: (status) => status >= 200 && status < 500,
    });

    const status = Number(resp?.status || 0);
    const headers = resp?.headers || {};
    const ct = String(headers["content-type"] || headers["Content-Type"] || "").toLowerCase();

    if (status >= 400) {
      try {
        const txt = await new Response(resp.data).text();
        let msg = "";
        try {
          const j = JSON.parse(txt);
          msg = String(j?.detail || j?.message || txt || "导出失败");
        } catch {
          msg = txt || "导出失败";
        }
        ElMessage.error(msg);
      } catch {
        ElMessage.error("导出失败");
      }
      return;
    }

    if (ct.includes("application/json")) {
      try {
        const txt = await new Response(resp.data).text();
        ElMessage.error(txt || "导出失败");
      } catch {
        ElMessage.error("导出失败");
      }
      return;
    }

    const disp = headers["content-disposition"] || headers["Content-Disposition"] || "";
    const filename = _parseFilenameFromDisposition(disp) || "财务管理_订单.xls";
    const blob = resp.data instanceof Blob
        ? resp.data
        : new Blob([resp.data], {type: ct || "application/octet-stream"});

    _triggerDownloadBlob(blob, filename);
    ElMessage.success(ids.length ? "已下载勾选数据" : "已下载全部符合条件数据");
  } catch (e) {
    console.error(e);
    ElMessage.error("下载失败");
  } finally {
    downloading.value = false;
  }
}

onMounted(async () => {
  initSalesDefaultIfNeeded();
  loadList(true);
  bootstrapDropdowns(true);
  hasMountedOnce.value = true;
  lastActivatedContextKey.value = pageContextKey.value;
});

onActivated(async () => {
  if (!hasMountedOnce.value) return;

  const currentKey = pageContextKey.value;
  if (currentKey !== lastActivatedContextKey.value) {
    lastActivatedContextKey.value = currentKey;
    return;
  }

  await loadList(true);
});
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.toolbar-card {
  margin-bottom: 10px;
  border-radius: 12px;
  border: 1px solid rgba(60, 60, 60, 0.08);
}

.filters-form :deep(.el-form-item) {
  margin-bottom: 10px;
}

.toolbar-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  align-items: center;
}

.finance-actions-col {
  width: 100%;
}

.finance-actions {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
}

.selected-hint {
  font-size: 12px;
  color: rgba(31, 42, 68, 0.7);
  font-weight: 650;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid rgba(60, 60, 60, 0.12);
  background: rgba(255, 255, 255, 0.65);
}

.main-table {
  width: 100%;
}

.main-table :deep(.el-table__cell) {
  padding-top: 6px;
  padding-bottom: 6px;
}

.main-table :deep(.el-table__cell .cell) {
  padding-left: 4px;
  padding-right: 4px;
}

.main-table :deep(.col-actions .cell) {
  padding-left: 8px;
  padding-right: 8px;
}

.main-table :deep(.col-switch .cell) {
  padding-left: 6px;
  padding-right: 6px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.col-actions :deep(.cell) {
  text-align: center;
}

.actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
}

.actions :deep(.el-button) {
  touch-action: manipulation;
}

:deep(.order-actions-popper) {
  z-index: 9999 !important;
}

.switch-cell {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 30px;
}

.main-table :deep(tr.row-summary td) {
  font-weight: 800;
}
</style>
