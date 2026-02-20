<!-- src/views/orders/OrderListBase.vue -->
<template>
  <div class="page">
    <div class="page-header">
      <h2>{{ title }}</h2>
    </div>

    <el-card shadow="never" class="toolbar-card" :body-style="{ padding: '10px 12px' }">
      <el-form :model="filters" class="filters-form" label-width="88px">
        <template v-if="isFinance">
          <!-- ✅ finance：仅保留 日期/渠道/客户/业务员/市场/车主/保险到期日/初登日期/是否回款/是否返点 + 团队 -->
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
                <el-select
                  v-model="filters.channel_group_id"
                  clearable
                  filterable
                  placeholder="选择渠道"
                  style="width: 100%"
                  :loading="groupsLoading"
                  :disabled="groupsLoading"
                >
                  <el-option v-for="g in channelGroups" :key="String(g.id)" :label="formatGroupLabel(g)" :value="g.id" />
                </el-select>
              </el-form-item>
            </el-col>

            <el-col :span="6">
              <el-form-item label="客户">
                <el-select
                  v-model="filters.customer_group_id"
                  clearable
                  filterable
                  placeholder="选择客户"
                  style="width: 100%"
                  :loading="groupsLoading"
                  :disabled="groupsLoading"
                >
                  <el-option v-for="g in customerGroups" :key="String(g.id)" :label="formatGroupLabel(g)" :value="g.id" />
                </el-select>
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
              <el-form-item label="市场">
                <el-input v-model="filters.market" clearable placeholder="市场（模糊）" @keyup.enter="search" />
              </el-form-item>
            </el-col>

            <!-- ✅ 团队筛选（财务）：统一只用 team_names（多选/单选都写入 team_names） -->
            <el-col :span="6">
              <el-form-item label="团队">
                <el-select
                  v-if="financeTeamMultiple"
                  v-model="filters.team_names"
                  multiple
                  collapse-tags
                  collapse-tags-tooltip
                  clearable
                  filterable
                  placeholder="选择团队（可多选）"
                  style="width: 100%"
                  :loading="teamsLoading"
                  :disabled="teamsLoading || !canChooseTeam"
                >
                  <el-option v-for="t in teamOptions" :key="t" :label="t" :value="t" />
                </el-select>

                <el-select
                  v-else
                  v-model="financeTeamSingle"
                  clearable
                  filterable
                  placeholder="选择团队"
                  style="width: 100%"
                  :loading="teamsLoading"
                  :disabled="teamsLoading || !canChooseTeam"
                >
                  <el-option v-for="t in teamOptions" :key="t" :label="t" :value="t" />
                </el-select>
              </el-form-item>
            </el-col>

            <el-col :span="12"></el-col>
          </el-row>

          <el-row :gutter="12">
            <el-col :span="6">
              <el-form-item label="车主">
                <el-input v-model="filters.owner_name" clearable placeholder="车主（模糊）" @keyup.enter="search" />
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
                  <el-option label="是" :value="true" />
                  <el-option label="否" :value="false" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="12">
            <el-col :span="6">
              <el-form-item label="是否返点">
                <el-select v-model="filters.is_rebate" clearable placeholder="全部" style="width: 100%">
                  <el-option label="是" :value="true" />
                  <el-option label="否" :value="false" />
                </el-select>
              </el-form-item>
            </el-col>

            <!-- ✅ 四个按钮靠右：搜索/重置/刷新/下载 -->
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
                <el-select
                  v-model="filters.channel_group_id"
                  clearable
                  filterable
                  placeholder="选择渠道"
                  style="width: 100%"
                  :loading="groupsLoading"
                  :disabled="groupsLoading"
                >
                  <el-option v-for="g in channelGroups" :key="String(g.id)" :label="formatGroupLabel(g)" :value="g.id" />
                </el-select>
              </el-form-item>
            </el-col>

            <el-col :span="6">
              <el-form-item label="客户">
                <el-select
                  v-model="filters.customer_group_id"
                  clearable
                  filterable
                  placeholder="选择客户"
                  style="width: 100%"
                  :loading="groupsLoading"
                  :disabled="groupsLoading"
                >
                  <el-option v-for="g in customerGroups" :key="String(g.id)" :label="formatGroupLabel(g)" :value="g.id" />
                </el-select>
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

          <!-- ✅ 团队筛选（订单）：只显示具体团队名；不提供“全部团队”选项 -->
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
                  <el-option v-for="t in teamOptions" :key="t" :label="t" :value="t" />
                </el-select>
              </el-form-item>
            </el-col>

            <el-col :span="18"></el-col>
          </el-row>

          <el-row :gutter="12">
            <el-col :span="6">
              <el-form-item label="车主">
                <el-input v-model="filters.owner_name" clearable placeholder="车主（模糊）" @keyup.enter="search" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="身份证号">
                <el-input v-model="filters.id_number" clearable placeholder="身份证号（模糊）" @keyup.enter="search" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="车牌">
                <el-input v-model="filters.plate_no" clearable placeholder="车牌（模糊）" @keyup.enter="search" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="发动机号">
                <el-input v-model="filters.engine_no" clearable placeholder="发动机号（模糊）" @keyup.enter="search" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="12">
            <el-col :span="6">
              <el-form-item label="车架号">
                <el-input v-model="filters.vin" clearable placeholder="车架号（模糊）" @keyup.enter="search" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="车型">
                <el-input v-model="filters.vehicle_model" clearable placeholder="车型（模糊）" @keyup.enter="search" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="备注">
                <el-input v-model="filters.remark" clearable placeholder="备注（模糊）" @keyup.enter="search" />
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
        v-loading="loading"
        :data="tableData"
        border
        stripe
        class="main-table"
        :row-class-name="tableRowClassName"
      >
        <el-table-column label="日期" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">
            {{ isSummaryRow(row) ? "汇总" : fmtYmdSafe(pickCreatedAt(row)) }}
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
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickFinished(row) ? "是" : "否" }}</template>
        </el-table-column>

        <el-table-column label="渠道" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickChannelName(row) }}</template>
        </el-table-column>

        <el-table-column label="客户" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickCustomerName(row) }}</template>
        </el-table-column>

        <el-table-column label="市场" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickMarket(row) }}</template>
        </el-table-column>

        <!-- ✅ 财务列表：市场后面增加“业务员” -->
        <el-table-column v-if="isFinance" label="业务员" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickSalespersonName(row) }}</template>
        </el-table-column>

        <el-table-column label="车主" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickOwner(row) }}</template>
        </el-table-column>

        <el-table-column label="车牌" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickPlate(row) }}</template>
        </el-table-column>

        <el-table-column label="保险到期日" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickInsuranceExpire(row) }}</template>
        </el-table-column>

        <el-table-column label="车架号" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickVin(row) }}</template>
        </el-table-column>

        <el-table-column label="发动机号" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickEngine(row) }}</template>
        </el-table-column>

        <el-table-column label="车型" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickVehicleModel(row) }}</template>
        </el-table-column>

        <el-table-column label="初登日期" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickFirstRegister(row) }}</template>
        </el-table-column>

        <el-table-column label="身份证号" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickIdNumber(row) }}</template>
        </el-table-column>

        <el-table-column label="电话" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickPhone(row) }}</template>
        </el-table-column>

        <el-table-column label="商业金额" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ pickMoney(row, "commercial_amount") }}</template>
        </el-table-column>

        <el-table-column label="交强金额" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ pickMoney(row, "compulsory_amount") }}</template>
        </el-table-column>

        <el-table-column label="车船税金额" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ pickMoney(row, "vehicle_tax_amount") }}</template>
        </el-table-column>

        <el-table-column label="非车金额" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ pickMoney(row, "noncar_amount") }}</template>
        </el-table-column>

        <el-table-column label="渠道商业点位" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickPoint(row, "channel_commercial_point") }}</template>
        </el-table-column>

        <!-- ✅ 仅订单模式展示“商业后补点位”两列（财务数据源通常无该字段） -->
        <el-table-column v-if="!isFinance" label="渠道商业后补点位" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ isSummaryRow(row) ? "" : pickPoint(row, "channel_commercial_supplement_point") }}
          </template>
        </el-table-column>

        <el-table-column label="渠道交强点位" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickPoint(row, "channel_compulsory_point") }}</template>
        </el-table-column>

        <el-table-column label="渠道车船税点位" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickPoint(row, "channel_vehicle_tax_point") }}</template>
        </el-table-column>

        <el-table-column label="渠道非车点位" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickPoint(row, "channel_noncar_point") }}</template>
        </el-table-column>

        <el-table-column v-if="isFinance" label="渠道奖励" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ pickRewardMoney(row, "channel_reward") }}</template>
        </el-table-column>

        <el-table-column label="客户商业点位" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickPoint(row, "customer_commercial_point") }}</template>
        </el-table-column>

        <!-- ✅ 仅订单模式展示“商业后补点位”两列（财务数据源通常无该字段） -->
        <el-table-column v-if="!isFinance" label="客户商业后补点位" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ isSummaryRow(row) ? "" : pickPoint(row, "customer_commercial_supplement_point") }}
          </template>
        </el-table-column>

        <el-table-column label="客户交强点位" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickPoint(row, "customer_compulsory_point") }}</template>
        </el-table-column>

        <el-table-column label="客户车船税点位" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickPoint(row, "customer_vehicle_tax_point") }}</template>
        </el-table-column>

        <el-table-column label="客户非车点位" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickPoint(row, "customer_noncar_point") }}</template>
        </el-table-column>

        <el-table-column v-if="isFinance" label="客户奖励" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ pickRewardMoney(row, "customer_reward") }}</template>
        </el-table-column>

        <el-table-column label="应收" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ pickReceivable(row) }}</template>
        </el-table-column>

        <el-table-column label="应付" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ pickPayable(row) }}</template>
        </el-table-column>

        <el-table-column label="利润" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ pickProfit(row) }}</template>
        </el-table-column>

        <el-table-column label="所属经理" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickManagerName(row) }}</template>
        </el-table-column>

        <el-table-column label="所属团队" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickTeamName(row) }}</template>
        </el-table-column>

        <!-- ✅ 订单备注（财务 & 订单：同一字段；汇总行为空） -->
        <el-table-column label="订单备注" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ isSummaryRow(row) ? "" : pickRemark(row) }}</template>
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
            <div class="switch-cell" v-if="!isSummaryRow(row)">
              <el-switch
                size="medium"
                inline-prompt
                inactive-text="否"
                active-text="是"
                :model-value="pickPaid(row)"
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
            <div class="switch-cell" v-if="!isSummaryRow(row)">
              <el-switch
                size="medium"
                inline-prompt
                inactive-text="否"
                active-text="是"
                :model-value="pickRebate(row)"
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
            <template v-if="isSummaryRow(row)">
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
                    <el-icon><MoreFilled /></el-icon>
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
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>

                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="detail">详情</el-dropdown-item>
                      <el-dropdown-item v-if="canMarkFinished(row)" command="markFinished" divided>标记完成</el-dropdown-item>
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
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { MoreFilled } from "@element-plus/icons-vue";

import http from "../../api/http";

import { getChannelGroups, getCustomerGroups, listOrders, updateOrderStatus } from "../../api/orders";
import {
  exportFinanceOrders,
  getFinanceOrdersSummary,
  listFinanceChannelGroups,
  listFinanceCustomerGroups,
  listFinanceOrders,
  listFinanceSalespersons,
  returnFinanceOrder,
  updateFinanceOrderStatus,
} from "../../api/finance";
import { useSessionStore } from "../../store/session";
import { ROLE } from "../../constants";

const props = defineProps({
  title: { type: String, default: "订单列表" },
  mode: { type: String, default: "all" },
  source: { type: String, default: "orders" },
});

const router = useRouter();
const route = useRoute();
const session = useSessionStore();

const currentUserId = computed(() => {
  const n = Number(session?.user?.id ?? 0);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
});

/** ✅ 以路由为准：/finance* 即财务模式 */
const isFinance = computed(() => String(route?.path || "").startsWith("/finance"));

/** ✅ 订单侧展示完成状态；财务侧不展示 */
const showFinishedColumn = computed(() => !isFinance.value);

const roleName = computed(() => String(session.roleName || "").trim().toLowerCase());
const isSales = computed(() => roleName.value === ROLE.SALES);

/** ✅ 团队筛选可操作权限：超级/经理/财务/市场可选；业务员固定自己团队 */
const canChooseTeam = computed(() => {
  const rn = roleName.value;
  return rn === ROLE.SUPER_ADMIN || rn === ROLE.MANAGER || rn === ROLE.FINANCE || rn === ROLE.MARKET;
});

/** ✅ 财务编辑权限（市场账号只能看） */
const canFinanceEdit = computed(() => {
  if (!isFinance.value) return false;
  const rn = roleName.value;
  return rn === ROLE.FINANCE || rn === ROLE.SUPER_ADMIN || rn === ROLE.MANAGER;
});

/** ✅ 只有能访问财务页面的人才有下载权限（按角色兜底） */
const canFinanceDownload = computed(() => {
  if (!isFinance.value) return false;
  const rn = roleName.value;
  return rn === ROLE.FINANCE || rn === ROLE.SUPER_ADMIN || rn === ROLE.MANAGER;
});

/** ✅ 财务团队是否多选：经理/超管 */
const financeTeamMultiple = computed(() => {
  if (!isFinance.value) return false;
  const rn = roleName.value;
  return rn === ROLE.MANAGER || rn === ROLE.SUPER_ADMIN;
});

const loading = ref(false);
const downloading = ref(false);

const orders = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

const customerGroups = ref([]);
const channelGroups = ref([]);
const salespersons = ref([]);
const groupsLoading = ref(false);
const salesLoading = ref(false);

/** ✅ 团队下拉：来自后端 /orders/teams（只返回具体团队名） */
const teamOptions = ref([]);
const teamsLoading = ref(false);

/** ✅ 财务汇总（全量，非当前页） */
const financeSummary = ref(null);
const lastSummaryKey = ref("");

function isSummaryRow(row) {
  return Boolean(row?._is_summary);
}

function tableRowClassName({ row }) {
  return isSummaryRow(row) ? "row-summary" : "";
}

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
    salesperson_id: null,
    market: "",
    owner_name: "",
    insurance_expire_date: "",
    first_register_date: [],
    is_paid: null,
    is_rebate: null,
    team_names: [],
  };
}

const filters = ref(isFinance.value ? defaultFinanceFilters() : defaultOrdersFilters());

/** ✅ 财务团队单选：统一写入 filters.team_names（数组） */
const financeTeamSingle = computed({
  get() {
    const v = filters.value?.team_names;
    if (Array.isArray(v)) return v[0] || null;
    if (typeof v === "string") return v.trim() || null;
    return null;
  },
  set(val) {
    const s = String(val ?? "").trim();
    filters.value.team_names = s ? [s] : [];
  },
});

function dyn(row, key) {
  const dd = row?.dynamic_data;
  return dd && typeof dd === "object" ? dd[key] : undefined;
}

/** ✅ dynamic_data 兼容读取：支持多个候选键（用于 dl_* / 历史键名兼容） */
function dynAny(row, keys = []) {
  const dd = row?.dynamic_data;
  if (!dd || typeof dd !== "object") return undefined;

  for (const k of keys) {
    const v = dd[k];
    if (v !== null && v !== undefined && String(v).trim() !== "") {
      return v;
    }
  }
  return undefined;
}

function _trimStr(v) {
  return String(v ?? "").trim();
}

function formatGroupLabel(g) {
  const code = _trimStr(g?.channel_code || g?.customer_code || g?.group_code || g?.code || "");
  const name = _trimStr(g?.channel_name || g?.customer_name || g?.group_name || g?.name || "");
  const id = g?.id != null ? String(g.id) : "";

  if (code && name) return `${code} - ${name}`;
  if (name) return name;
  if (code) return code;
  return id || "-";
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

/** ✅ 仅展示 YYYY-MM-DD：尽量走“字符串截断”，避免 Date 解析导致时区漂移 */
function fmtYmdSafe(anyVal) {
  if (anyVal === null || anyVal === undefined || anyVal === "") return "-";

  const raw = String(anyVal).trim();
  if (!raw) return "-";

  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;

  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m && m[1]) return m[1];

  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    if (Number.isFinite(n)) {
      const ms = raw.length === 10 ? n * 1000 : n;
      const d = new Date(ms);
      if (Number.isFinite(d.getTime())) {
        const parts = new Intl.DateTimeFormat("zh-CN", {
          timeZone: "Asia/Shanghai",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(d);

        const y = parts.find((p) => p.type === "year")?.value || "";
        const mo = parts.find((p) => p.type === "month")?.value || "";
        const da = parts.find((p) => p.type === "day")?.value || "";
        if (y && mo && da) return `${y}-${mo}-${da}`;
      }
    }
    return "-";
  }

  return "-";
}

function normalizeCompactYmd(val) {
  if (val === null || val === undefined || val === "") return "";
  const s = String(val).trim();
  if (!s) return "";

  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;

  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m && m[1]) return m[1];

  const ymd = fmtYmdSafe(s);
  return ymd === "-" ? "" : ymd;
}

function orderInfo(row) {
  const oi = row?.order_info;
  return oi && typeof oi === "object" ? oi : null;
}

/** ✅ 业务员映射：订单列表用 */
const salespersonMap = computed(() => {
  const mp = new Map();
  const arr = Array.isArray(salespersons.value) ? salespersons.value : [];
  for (const u of arr) {
    const id = Number(u?.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    mp.set(id, u);
  }
  return mp;
});

function _getSalespersonByRow(row) {
  const sid = Number(row?.salesperson_id);
  if (!Number.isFinite(sid) || sid <= 0) return null;
  return salespersonMap.value.get(sid) || null;
}

function _joinTeams(v) {
  const arr = Array.isArray(v) ? v : v ? [v] : [];
  const cleaned = [...new Set(arr.map((x) => String(x || "").trim()).filter(Boolean))];
  return cleaned.length ? cleaned.join("、") : "";
}

/** ===================== ✅ 团队/业务员下拉（订单走 /orders/*；财务走 /finance/*） ===================== */

function normalizeItems(resp) {
  const data = resp?.data ?? resp ?? {};
  return Array.isArray(data?.items) ? data.items : [];
}

function normalizeTeamNames(resp) {
  const data = resp?.data ?? resp ?? {};
  const items = Array.isArray(data?.items) ? data.items : [];
  const out = [];
  for (const x of items) {
    const t = String(x?.team_name ?? "").trim();
    if (t) out.push(t);
  }
  return Array.from(new Set(out)).sort((a, b) => String(a).localeCompare(String(b), "zh-CN"));
}

async function apiGetTeams() {
  return http.get("/orders/teams");
}

async function apiListSalespersonsOrders(params = {}) {
  return http.get("/orders/salespersons", { params });
}

async function apiGetCustomerGroupsAny() {
  if (isFinance.value) return listFinanceCustomerGroups();
  return getCustomerGroups();
}

async function apiGetChannelGroupsAny() {
  if (isFinance.value) return listFinanceChannelGroups();
  return getChannelGroups();
}

async function loadSalespersonsForTeam(teamName) {
  salesLoading.value = true;
  try {
    if (isFinance.value) {
      const resp = await listFinanceSalespersons();
      salespersons.value = normalizeItems(resp);
      return;
    }

    const tf = String(teamName || "").trim();
    const resp = await apiListSalespersonsOrders(tf ? { team_name: tf } : {});
    salespersons.value = normalizeItems(resp);
  } catch (e) {
    console.error(e);
    salespersons.value = [];
  } finally {
    salesLoading.value = false;
  }
}

const filteredSalespersons = computed(() => {
  return Array.isArray(salespersons.value) ? salespersons.value : [];
});

/** ✅ 业务员角色：默认锁定自己（salesperson_id），团队默认取 /orders/teams 返回的唯一团队 */
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

function initTeamForSalesRoleIfPossible() {
  if (isFinance.value) return;
  if (!isSales.value) return;

  const uid = _currentUserId();
  if (uid) {
    filters.value.salesperson_id = uid;
  }

  if (!filters.value.team_name && Array.isArray(teamOptions.value) && teamOptions.value.length === 1) {
    filters.value.team_name = teamOptions.value[0];
  }
}

/** ✅ team 改变时：订单模式下，重新拉业务员下拉；并处理 salesperson_id 是否仍有效 */
watch(
  () => filters.value?.team_name,
  async (team) => {
    if (isFinance.value) return;

    const prevSid = filters.value?.salesperson_id;
    if (!isSales.value) {
      filters.value.salesperson_id = null;
    } else {
      const uid = _currentUserId();
      if (uid) filters.value.salesperson_id = uid;
    }

    await loadSalespersonsForTeam(team);

    if (!isSales.value && prevSid) {
      const ok = (Array.isArray(salespersons.value) ? salespersons.value : []).some(
        (u) => Number(u?.id) === Number(prevSid)
      );
      if (ok) filters.value.salesperson_id = prevSid;
    }
  }
);

async function loadGroupsAndSalespersonsIfNeeded() {
  groupsLoading.value = true;

  const tasks = [apiGetCustomerGroupsAny(), apiGetChannelGroupsAny(), apiGetTeams()];
  const results = await Promise.allSettled(tasks);

  const cg = results[0];
  customerGroups.value = cg?.status === "fulfilled" ? normalizeItems(cg.value) : [];
  if (cg?.status !== "fulfilled") console.error(cg?.reason);

  const ch = results[1];
  channelGroups.value = ch?.status === "fulfilled" ? normalizeItems(ch.value) : [];
  if (ch?.status !== "fulfilled") console.error(ch?.reason);

  const t = results[2];
  teamOptions.value = t?.status === "fulfilled" ? normalizeTeamNames(t.value) : [];
  if (t?.status !== "fulfilled") console.error(t?.reason);

  groupsLoading.value = false;

  initTeamForSalesRoleIfPossible();
  await loadSalespersonsForTeam(filters.value?.team_name);
}

async function loadSummaryIfNeeded() {
  if (!isFinance.value) return;

  const params = buildSummaryParams();
  const key = stableStringify(params);

  if (key && key === lastSummaryKey.value && financeSummary.value) return;

  try {
    const resp = await getFinanceOrdersSummary(params);
    const data = resp?.data ?? resp ?? {};
    financeSummary.value = data && typeof data === "object" ? data : null;
    lastSummaryKey.value = key || "";
  } catch (e) {
    console.error(e);
    financeSummary.value = null;
    lastSummaryKey.value = key || "";
  }
}

async function loadList() {
  loading.value = true;
  try {
    const resp = isFinance.value ? await listFinanceOrders(buildListParams()) : await listOrders(buildListParams());
    const data = resp?.data ?? resp ?? {};
    orders.value = Array.isArray(data?.items) ? data.items : [];
    total.value = Number(data?.total ?? 0);

    if (isFinance.value) {
      await loadSummaryIfNeeded();
    }
  } catch (e) {
    console.error(e);
    ElMessage.error(isFinance.value ? "加载财务列表失败" : "加载订单列表失败");
  } finally {
    loading.value = false;
  }
}

function search() {
  page.value = 1;
  financeSummary.value = null;
  lastSummaryKey.value = "";
  loadList();
}

function resetFilters() {
  filters.value = isFinance.value ? defaultFinanceFilters() : defaultOrdersFilters();

  initTeamForSalesRoleIfPossible();

  page.value = 1;
  financeSummary.value = null;
  lastSummaryKey.value = "";
  loadList();

  loadSalespersonsForTeam(filters.value?.team_name);
}

function onPageChange(p) {
  page.value = p;
  loadList();
}

function onPageSizeChange(size) {
  pageSize.value = size;
  page.value = 1;
  loadList();
}

function goDetail(id) {
  const from = route.fullPath;
  if (isFinance.value) router.push(`/finance/orders/${id}?from=${encodeURIComponent(from)}&source=finance`);
  else router.push(`/orders/${id}?from=${encodeURIComponent(from)}`);
}

function _isMyOrder(row) {
  const uid = currentUserId.value;
  if (!uid) return true;
  const sid = Number(row?.salesperson_id ?? 0);
  if (!Number.isFinite(sid) || sid <= 0) return true;
  return Math.trunc(sid) === uid;
}

function canMarkFinished(row) {
  if (isFinance.value) return false;
  if (!row || isSummaryRow(row)) return false;
  if (pickFinished(row)) return false;

  const rn = roleName.value;
  if (rn === ROLE.MARKET || rn === ROLE.FINANCE) return false;

  if (rn === ROLE.SALES) return _isMyOrder(row);
  return rn === ROLE.SUPER_ADMIN || rn === ROLE.MANAGER;
}

function canReopen(row) {
  if (isFinance.value) return false;
  if (!row || isSummaryRow(row)) return false;
  if (!pickFinished(row)) return false;

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

  try {
    await updateOrderStatus(row.id, { is_finished: next });
    ElMessage.success(next ? "已标记完成" : "已退回未完成");
    await loadList();
  } catch (e) {
    console.error(e);
    row.is_finished = prev;
    ElMessage.error("操作失败");
  } finally {
    row._saving_finished = false;
  }
}

async function onAction(cmd, row) {
  if (!row || isSummaryRow(row)) return;

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
  if (!isFinance.value || !row?.id) return;
  if (isSummaryRow(row)) return;
  if (!canFinanceEdit.value) {
    ElMessage.error("无权限操作");
    return;
  }

  if (pickPaid(row) || pickRebate(row)) {
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
    await loadList();
  } catch (e) {
    console.error(e);
    ElMessage.error("操作失败");
  }
}

async function onFinanceAction(cmd, row) {
  if (!row || isSummaryRow(row)) return;

  if (cmd === "detail") {
    goDetail(row.id);
    return;
  }
  if (cmd === "return") {
    await confirmReturnToUnfinished(row);
  }
}

async function onPaidSwitch(row, nextVal) {
  if (!isFinance.value || !row?.id) return;
  if (isSummaryRow(row)) return;
  if (!canFinanceEdit.value) return;

  const prev = pickPaid(row);
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
  setPaid(row, next);

  try {
    await updateFinanceOrderStatus(row.id, { is_paid: next });
    ElMessage.success("已更新回款状态");
  } catch (e) {
    console.error(e);
    setPaid(row, prev);
    ElMessage.error("操作失败");
  } finally {
    row._saving_paid = false;
  }
}

async function onRebateSwitch(row, nextVal) {
  if (!isFinance.value || !row?.id) return;
  if (isSummaryRow(row)) return;
  if (!canFinanceEdit.value) return;

  const prev = pickRebate(row);
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
  setRebate(row, next);

  try {
    await updateFinanceOrderStatus(row.id, { is_rebate: next });
    ElMessage.success("已更新返点状态");
  } catch (e) {
    console.error(e);
    setRebate(row, prev);
    ElMessage.error("操作失败");
  } finally {
    row._saving_rebate = false;
  }
}

/** ====================== 导出：调用后端 /finance/orders/export（永远按筛选条件导出） ====================== */

function _nowShanghaiFileStamp() {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year")?.value || "0000";
  const m = parts.find((p) => p.type === "month")?.value || "00";
  const d = parts.find((p) => p.type === "day")?.value || "00";
  return `${y}-${m}-${d}`;
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
    const params = buildSummaryParams();
    const resp = await exportFinanceOrders(params);

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
    const filename = _parseFilenameFromDisposition(disp) || `财务管理_订单_${_nowShanghaiFileStamp()}.xls`;

    const blob = resp.data instanceof Blob ? resp.data : new Blob([resp.data], { type: ct || "application/octet-stream" });
    _triggerDownloadBlob(blob, filename);

    ElMessage.success("已下载符合筛选条件数据");
  } catch (e) {
    console.error(e);
    ElMessage.error("下载失败");
  } finally {
    downloading.value = false;
  }
}

/** ===================== 字段读取（按当前后端真实返回） ===================== */

const FINANCE_MONEY_COL = {
  commercial_amount: "col_14_commercial_amount",
  compulsory_amount: "col_15_compulsory_amount",
  vehicle_tax_amount: "col_16_tax_amount",
  noncar_amount: "col_17_noncar_amount",
  receivable: "col_26_receivable",
  payable: "col_27_payable",
  profit: "col_28_profit",
};

const FINANCE_POINT_COL = {
  channel_commercial_point: "col_18_ch_commercial_point",
  channel_compulsory_point: "col_19_ch_compulsory_point",
  channel_vehicle_tax_point: "col_20_ch_tax_point",
  channel_noncar_point: "col_21_ch_noncar_point",
  customer_commercial_point: "col_22_cu_commercial_point",
  customer_compulsory_point: "col_23_cu_compulsory_point",
  customer_vehicle_tax_point: "col_24_cu_tax_point",
  customer_noncar_point: "col_25_cu_noncar_point",
};

const ORDER_INFO_MONEY_KEY = {
  commercial_amount: "commercial_amount",
  compulsory_amount: "compulsory_amount",
  vehicle_tax_amount: "vehicle_tax_amount",
  noncar_amount: "non_vehicle_amount",
};

const ORDER_INFO_POINT_KEY = {
  channel_commercial_point: "channel_commercial_point",
  channel_commercial_supplement_point: "channel_commercial_supplement_point",
  channel_compulsory_point: "channel_compulsory_point",
  channel_vehicle_tax_point: "channel_vehicle_tax_point",
  channel_noncar_point: "channel_non_vehicle_point",

  customer_commercial_point: "customer_commercial_point",
  customer_commercial_supplement_point: "customer_commercial_supplement_point",
  customer_compulsory_point: "customer_compulsory_point",
  customer_vehicle_tax_point: "customer_vehicle_tax_point",
  customer_noncar_point: "customer_non_vehicle_point",
};

function pickCreatedAt(row) {
  if (isFinance.value) return row?.col_01_date || row?.created_at || null;
  return row?.created_at || row?.updated_at || null;
}

function pickFinished(row) {
  return Boolean(row?.is_finished);
}

function pickChannelName(row) {
  return String(isFinance.value ? row?.col_02_channel || "" : row?.channel_group_name || "").trim() || "-";
}

function pickCustomerName(row) {
  return String(isFinance.value ? row?.col_03_customer || "" : row?.customer_group_name || "").trim() || "-";
}

function pickMarket(row) {
  const v = isFinance.value ? row?.col_04_market : row?.customer_group_market;
  return String(v ?? "").trim() || "-";
}

function pickSalespersonName(row) {
  const v = String(row?.salesperson_name ?? "").trim();
  if (v) return v;

  const sp = _getSalespersonByRow(row);
  if (sp) return String(sp.real_name || sp.username || "-");
  return "-";
}

/** ✅ 订单侧兼容 id_name / dl_owner / owner_name */
function pickOwner(row) {
  const v = isFinance.value ? row?.col_05_owner : dynAny(row, ["id_name", "dl_owner", "owner_name"]);
  return String(v ?? "").trim() || "-";
}

/** ✅ 订单侧兼容 plate_no / dl_plate_no */
function pickPlate(row) {
  const v = isFinance.value ? row?.col_06_plate_no : dynAny(row, ["plate_no", "dl_plate_no"]);
  return String(v ?? "").trim() || "-";
}

function pickInsuranceExpire(row) {
  const v = isFinance.value ? row?.col_07_insurance_expire_date : orderInfo(row)?.insurance_expire_date;
  return normalizeCompactYmd(v) || "-";
}

/** ✅ 订单侧兼容 vin / dl_vin */
function pickVin(row) {
  const v = isFinance.value ? row?.col_08_vin : dynAny(row, ["vin", "dl_vin"]);
  return String(v ?? "").trim() || "-";
}

/** ✅ 订单侧兼容 engine_no / dl_engine_no */
function pickEngine(row) {
  const v = isFinance.value ? row?.col_09_engine_no : dynAny(row, ["engine_no", "dl_engine_no"]);
  return String(v ?? "").trim() || "-";
}

/** ✅ 订单侧兼容 vehicle_model / dl_brand_model / brand_model */
function pickVehicleModel(row) {
  const v = isFinance.value ? row?.col_10_vehicle_model : dynAny(row, ["vehicle_model", "dl_brand_model", "brand_model"]);
  return String(v ?? "").trim() || "-";
}

/** ✅ 订单侧兼容 first_register_date / dl_first_register_date */
function pickFirstRegister(row) {
  const v = isFinance.value ? row?.col_11_first_register_date : dynAny(row, ["first_register_date", "dl_first_register_date"]);
  return normalizeCompactYmd(v) || "-";
}

function pickIdNumber(row) {
  const v = isFinance.value ? row?.col_12_id_number : dyn(row, "id_number");
  return String(v ?? "").trim() || "-";
}

function pickPhone(row) {
  const v = isFinance.value ? row?.col_13_owner_phone : orderInfo(row)?.owner_phone;
  return String(v ?? "").trim() || "-";
}

/** ✅ 订单备注：财务侧优先 row.remark（FinanceOrderOut 顶层字段）；订单侧读 order_info.remark */
function pickRemark(row) {
  const v1 = String(row?.remark ?? "").trim();
  if (v1) return v1;

  const oi = orderInfo(row);
  const v2 = String(oi?.remark ?? "").trim();
  if (v2) return v2;

  const v3 = String(dyn(row, "remark") ?? "").trim();
  return v3 || "-";
}

function pickManagerName(row) {
  const v = String(row?.manager_name ?? "").trim();
  if (v) return v;

  const sp = _getSalespersonByRow(row);
  const v2 = String(sp?.manager_name ?? "").trim();
  return v2 || "-";
}

function pickTeamName(row) {
  const teamsRow = _joinTeams(row?.team_names);
  if (teamsRow) return teamsRow;

  const v = String(row?.team_name ?? "").trim();
  if (v) return v;

  const sp = _getSalespersonByRow(row);
  const teamsSp = _joinTeams(sp?.team_names);
  if (teamsSp) return teamsSp;

  const v2 = String(sp?.team_name ?? "").trim();
  return v2 || "-";
}

function pickPaid(row) {
  if (!isFinance.value) return Boolean(row?.is_paid);
  return Boolean(row?.col_29_is_paid);
}

function pickRebate(row) {
  if (!isFinance.value) return Boolean(row?.is_rebate);
  return Boolean(row?.col_30_is_rebate);
}

function setPaid(row, val) {
  if (!row || typeof row !== "object") return;
  if (isFinance.value) row.col_29_is_paid = Boolean(val);
  row.is_paid = Boolean(val);
}

function setRebate(row, val) {
  if (!row || typeof row !== "object") return;
  if (isFinance.value) row.col_30_is_rebate = Boolean(val);
  row.is_rebate = Boolean(val);
}

function _moneyRaw(row, logicalKey) {
  if (isFinance.value) return row?.[FINANCE_MONEY_COL[logicalKey] || logicalKey];
  const oi = orderInfo(row);
  const key = ORDER_INFO_MONEY_KEY[logicalKey] || logicalKey;
  return oi ? oi[key] : null;
}

function _pointRaw(row, logicalKey) {
  if (isFinance.value) return row?.[FINANCE_POINT_COL[logicalKey] || logicalKey];
  const oi = orderInfo(row);
  const key = ORDER_INFO_POINT_KEY[logicalKey] || logicalKey;
  return oi ? oi[key] : null;
}

function pickMoney(row, logicalKey) {
  return fmtMoney(_moneyRaw(row, logicalKey));
}

function pickPoint(row, logicalKey) {
  return fmtPoint(_pointRaw(row, logicalKey));
}

function _rewardRaw(row, key) {
  const k = String(key || "").trim();
  if (!k) return null;

  if (isFinance.value) {
    if (k === "channel_reward") return row?.col_31_channel_reward ?? null;
    if (k === "customer_reward") return row?.col_32_customer_reward ?? null;
    return null;
  }

  const oi = orderInfo(row);
  if (!oi) return null;
  return oi?.[k] ?? null;
}

function pickRewardMoney(row, key) {
  return fmtMoney(_rewardRaw(row, key));
}

function hasSupplementPoint(row) {
  if (isFinance.value) return false;
  const oi = orderInfo(row);
  if (!oi) return false;
  const ch = toNum(oi.channel_commercial_supplement_point) || 0;
  const cu = toNum(oi.customer_commercial_supplement_point) || 0;
  return Math.abs(ch) > 1e-9 || Math.abs(cu) > 1e-9;
}

function computeTotals(row) {
  const oi = orderInfo(row) || {};

  const cm = toNum(oi.commercial_amount) || 0;
  const jq = toNum(oi.compulsory_amount) || 0;
  const tax = toNum(oi.vehicle_tax_amount) || 0;
  const nc = toNum(oi.non_vehicle_amount) || 0;

  const ch_cm_p = toNum(oi.channel_commercial_point) || 0;
  const ch_cm_sup_p = toNum(oi.channel_commercial_supplement_point) || 0;
  const ch_jq_p = toNum(oi.channel_compulsory_point) || 0;
  const ch_tax_p = toNum(oi.channel_vehicle_tax_point) || 0;
  const ch_nc_p = toNum(oi.channel_non_vehicle_point) || 0;
  const ch_bonus = toNum(oi.channel_reward) || 0;

  const cu_cm_p = toNum(oi.customer_commercial_point) || 0;
  const cu_cm_sup_p = toNum(oi.customer_commercial_supplement_point) || 0;
  const cu_jq_p = toNum(oi.customer_compulsory_point) || 0;
  const cu_tax_p = toNum(oi.customer_vehicle_tax_point) || 0;
  const cu_nc_p = toNum(oi.customer_non_vehicle_point) || 0;
  const cu_bonus = toNum(oi.customer_reward) || 0;

  const channel_total =
    cm * (ch_cm_p / 100) +
    cm * (ch_cm_sup_p / 100) +
    jq * (ch_jq_p / 100) +
    tax * (ch_tax_p / 100) +
    nc * (ch_nc_p / 100) +
    ch_bonus;

  const customer_total =
    cm * (cu_cm_p / 100) +
    cm * (cu_cm_sup_p / 100) +
    jq * (cu_jq_p / 100) +
    tax * (cu_tax_p / 100) +
    nc * (cu_nc_p / 100) +
    cu_bonus;

  return { channel_total, customer_total, profit: channel_total - customer_total };
}

function pickReceivable(row) {
  if (isFinance.value) return fmtMoney(_moneyRaw(row, "receivable"));
  const oi = orderInfo(row);
  if (!oi) return fmtMoney(0);
  if (hasSupplementPoint(row)) return fmtMoney(computeTotals(row).channel_total);
  return fmtMoney(oi.channel_total);
}

function pickPayable(row) {
  if (isFinance.value) return fmtMoney(_moneyRaw(row, "payable"));
  const oi = orderInfo(row);
  if (!oi) return fmtMoney(0);
  if (hasSupplementPoint(row)) return fmtMoney(computeTotals(row).customer_total);
  return fmtMoney(oi.customer_total);
}

function pickProfit(row) {
  if (isFinance.value) return fmtMoney(_moneyRaw(row, "profit"));
  const oi = orderInfo(row);
  if (!oi) return fmtMoney(0);
  if (hasSupplementPoint(row)) return fmtMoney(computeTotals(row).profit);
  return fmtMoney(oi.profit);
}

/** ====================== 查询参数 ====================== */
function _asDateRange(v) {
  if (!Array.isArray(v)) return null;
  const s = _trimStr(v[0]);
  const e = _trimStr(v[1]);
  if (!s && !e) return null;
  return { start: s || "", end: e || "" };
}

function _applyRangeParams(p, baseKey, v) {
  const r0 = _asDateRange(v);
  if (!r0) return;

  const r = { start: _trimStr(r0.start), end: _trimStr(r0.end) };
  if (r.start && !r.end) r.end = r.start;
  if (r.end && !r.start) r.start = r.end;
  if (!r.start || !r.end) return;

  p[`${baseKey}_start`] = r.start;
  p[`${baseKey}_end`] = r.end;
}

function buildListParams() {
  const p = { page: page.value, page_size: pageSize.value };
  const f = filters.value || {};

  if (isFinance.value) {
    // ✅ 财务团队：统一只发 team_names（数组）；即使单选也用数组承载
    const arr = Array.isArray(f.team_names)
      ? f.team_names.map((x) => String(x || "").trim()).filter(Boolean)
      : [];
    if (arr.length) p.team_names = arr;

    _applyRangeParams(p, "created_date", f.created_date);

    if (f.channel_group_id) p.channel_group_id = f.channel_group_id;
    if (f.customer_group_id) p.customer_group_id = f.customer_group_id;
    if (f.salesperson_id) p.salesperson_id = f.salesperson_id;

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

  if (f.team_name) p.team_name = String(f.team_name).trim();

  if (props.mode === "finished") p.is_finished = true;
  if (props.mode === "unfinished") p.is_finished = false;

  if (f.owner_name) p.owner_name = f.owner_name;
  if (f.id_number) p.id_number = f.id_number;
  if (f.vin) p.vin = f.vin;
  if (f.engine_no) p.engine_no = f.engine_no;
  if (f.plate_no) p.plate_no = f.plate_no;
  if (f.vehicle_model) p.vehicle_model = f.vehicle_model;
  if (f.remark) p.remark = f.remark;

  if (f.customer_group_id) p.customer_group_id = f.customer_group_id;
  if (f.channel_group_id) p.channel_group_id = f.channel_group_id;
  if (f.salesperson_id) p.salesperson_id = f.salesperson_id;

  _applyRangeParams(p, "created_date", f.created_date);

  return p;
}

function buildSummaryParams() {
  const p = { ...buildListParams() };
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
    return Object.keys(o)
      .sort()
      .reduce((acc, k) => {
        acc[k] = sort(o[k]);
        return acc;
      }, {});
  };

  try {
    return JSON.stringify(sort(obj));
  } catch {
    return "";
  }
}

function buildSummaryRow(sum) {
  const n = (v) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };

  return {
    id: -1,
    _is_summary: true,
    col_01_date: "汇总",
    col_14_commercial_amount: n(sum?.commercial_amount),
    col_15_compulsory_amount: n(sum?.compulsory_amount),
    col_16_tax_amount: n(sum?.vehicle_tax_amount),
    col_17_noncar_amount: n(sum?.noncar_amount),

    // ✅ 渠道/客户奖励（最新字段）
    col_31_channel_reward: n(sum?.col_31_channel_reward ?? sum?.channel_reward ?? 0),
    col_32_customer_reward: n(sum?.col_32_customer_reward ?? sum?.customer_reward ?? 0),

    // ✅ 汇总应收应付口径：与后端一致（应收=receivable，应付=payable）
    col_26_receivable: n(sum?.receivable),
    col_27_payable: n(sum?.payable),
    col_28_profit: n(sum?.profit),
  };
}

const tableData = computed(() => {
  const base = Array.isArray(orders.value) ? [...orders.value] : [];
  if (isFinance.value && financeSummary.value) base.push(buildSummaryRow(financeSummary.value));
  return base;
});

onMounted(async () => {
  await loadGroupsAndSalespersonsIfNeeded();
  await loadList();
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