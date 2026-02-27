<!-- src/views/orders/OrderDetail.vue -->
<template>
  <div class="order-detail">
    <div class="detail-header">
      <h2>订单详情</h2>

      <div class="header-actions">
        <el-button size="small" @click="goBack">返回</el-button>

        <!-- ✅ 财务视图：只允许编辑备用图 related -->
        <template v-if="canFinanceOps && order">
          <el-button
            v-if="!financeEditMode"
            size="small"
            type="primary"
            plain
            :disabled="loading || saving || slotUploading.related"
            @click="toggleFinanceEdit"
          >
            编辑
          </el-button>

          <template v-else>
            <el-button size="small" plain :disabled="loading || saving || slotUploading.related" @click="cancelFinanceEdit">
              退出编辑
            </el-button>
            <el-button size="small" type="primary" :disabled="loading || saving || slotUploading.related" @click="saveFinanceEdit">
              完成编辑
            </el-button>
          </template>
        </template>

        <!-- ✅ 非财务视图：订单侧操作 -->
        <template v-else>
          <el-button v-if="canReopen" size="small" type="warning" plain :loading="saving" @click="reopenToUnfinishedConfirm">
            退回未完成
          </el-button>

          <el-button v-if="canEditPermission && !editMode" size="small" type="primary" plain :disabled="loading || saving" @click="toggleEdit">
            编辑
          </el-button>

          <el-button v-if="canEditPermission && editMode" size="small" plain :disabled="loading || saving" @click="toggleEdit">
            取消编辑
          </el-button>

          <el-button v-if="canEdit" size="small" type="primary" :loading="saving" @click="save">保存</el-button>
        </template>
      </div>
    </div>

    <div v-loading="loading" class="page-body">
      <!-- 0. 基础信息（来自 base） -->
      <el-card shadow="never" class="section-card meta-card">
        <template #header>
          <div class="section-header">
            <div class="section-title">基础信息</div>
          </div>
        </template>

        <div class="kv-grid kv-grid-2">
          <div class="kv-item">
            <div class="kv-label">订单ID</div>
            <div class="kv-value">
              <span class="plain-value">{{ order?.id ?? "-" }}</span>
            </div>
          </div>

          <div class="kv-item">
            <div class="kv-label">完成状态</div>
            <div class="kv-value">
              <span class="plain-value">{{ order?.is_finished === true ? "已完成" : "未完成" }}</span>
            </div>
          </div>

          <div class="kv-item">
            <div class="kv-label">业务员</div>
            <div class="kv-value">
              <span class="plain-value" :title="order?.salesperson_name || '-'">{{ order?.salesperson_name || "-" }}</span>
            </div>
          </div>

          <div class="kv-item">
            <div class="kv-label">所属经理</div>
            <div class="kv-value">
              <span class="plain-value" :title="order?.manager_name || '-'">{{ order?.manager_name || "-" }}</span>
            </div>
          </div>

          <div class="kv-item">
            <div class="kv-label">所属团队</div>
            <div class="kv-value">
              <span class="plain-value" :title="teamDisplay || '-'">{{ teamDisplay || "-" }}</span>
            </div>
          </div>

          <div class="kv-item">
            <div class="kv-label">回款/返点</div>
            <div class="kv-value">
              <span class="plain-value">
                回款：{{ order?.is_paid === true ? "是" : "否" }}，返点：{{ order?.is_rebate === true ? "是" : "否" }}
              </span>
            </div>
          </div>

          <div class="kv-item">
            <div class="kv-label">创建时间</div>
            <div class="kv-value">
              <span class="plain-value">{{ fmtYmdSafe(order?.created_at) }}</span>
            </div>
          </div>

          <div class="kv-item">
            <div class="kv-label">更新时间</div>
            <div class="kv-value">
              <span class="plain-value">{{ fmtYmdSafe(order?.updated_at) }}</span>
            </div>
          </div>
        </div>
      </el-card>

      <!-- ① 渠道、客户 -->
      <el-card shadow="never" class="section-card meta-card">
        <template #header>
          <div class="section-header">
            <div class="section-title">渠道、客户</div>
          </div>
        </template>

        <div class="kv-grid kv-grid-2">
          <div class="kv-item">
            <div class="kv-label">渠道</div>
            <div class="kv-value">
              <template v-if="canEdit">
                <el-select
                  v-model="editMeta.channel_group_id"
                  filterable
                  clearable
                  placeholder="请选择渠道"
                  class="fv fv-select"
                  :loading="channelLoading"
                  :disabled="channelLoading"
                >
                  <el-option
                    v-for="op in channelSelectOptions"
                    :key="String(op.id)"
                    :label="op.group_name || String(op.id)"
                    :value="op.id"
                    :disabled="!!op._ghost"
                  />
                </el-select>
              </template>
              <template v-else>
                <span class="plain-value" :title="order?.channel_group_name || '-'">
                  {{ order?.channel_group_name || "-" }}
                </span>
              </template>
            </div>
          </div>

          <div class="kv-item">
            <div class="kv-label">客户</div>
            <div class="kv-value">
              <template v-if="canEdit">
                <el-select
                  v-model="editMeta.customer_group_id"
                  filterable
                  clearable
                  placeholder="请选择客户"
                  class="fv fv-select"
                  :loading="customerLoading"
                  :disabled="customerLoading"
                >
                  <el-option
                    v-for="op in customerSelectOptions"
                    :key="String(op.id)"
                    :label="op.group_name || String(op.id)"
                    :value="op.id"
                    :disabled="!!op._ghost"
                  />
                </el-select>
              </template>
              <template v-else>
                <span class="plain-value" :title="order?.customer_group_name || '-'">
                  {{ order?.customer_group_name || "-" }}
                </span>
              </template>
            </div>
          </div>
        </div>
      </el-card>

      <!-- ⑤ 备用图 -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <div class="section-header">
            <div class="section-title">备用图</div>
          </div>
        </template>

        <div v-if="canEditRelated" class="image-actions image-actions-wide">
          <el-upload
            drag
            :auto-upload="false"
            :multiple="true"
            :show-file-list="false"
            accept="image/*"
            :disabled="slotUploading.related"
            :on-change="(file) => onAppendRelated(file)"
            class="related-dragger"
          >
            <div class="drag-inner">
              <div class="drag-title">拖拽图片到这里</div>
              <div class="drag-sub">或点击选择（支持多张）</div>
            </div>
          </el-upload>

          <el-button
            size="small"
            type="danger"
            plain
            :disabled="slotUploading.related || !imagesBySlot.related.length"
            :loading="slotUploading.related"
            @click="clearRelatedAll"
          >
            清空
          </el-button>
        </div>

        <div v-if="canEditRelated || imagesBySlot.related.length" class="image-wall image-wall-wide">
          <div v-for="(url, idx) in imagesBySlot.related" :key="url + ':' + idx" class="thumb-wrap">
            <el-image :src="url" :preview-src-list="imagesBySlot.related" :initial-index="idx" fit="cover" class="thumb" />
            <button v-if="canEditRelated" type="button" class="thumb-remove" title="删除这张" @click="removeRelatedByIndex(idx)">
              ×
            </button>
          </div>

          <div v-if="canEditRelated && !imagesBySlot.related.length" class="thumb-empty" />
        </div>
      </el-card>

      <!-- ✅ 订单信息（来自 sections.order_info.fields） -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <div class="section-header">
            <div class="section-title">订单信息</div>
          </div>
        </template>

        <div class="info-block">
          <div class="kv-grid kv-grid-2 info-grid">
            <div class="kv-item">
              <div class="kv-label">保险到期日</div>
              <div class="kv-value">
                <InfoValue v-model="editOrderInfo.insurance_expire_date" type="date" :editable="canEdit" />
              </div>
            </div>

            <div class="kv-item">
              <div class="kv-label">车主电话</div>
              <div class="kv-value" ref="ownerPhoneValueRef">
                <InfoValue v-model="editOrderInfo.owner_phone" type="text" :editable="canEdit" />
              </div>
            </div>
          </div>

          <div class="kv-grid kv-grid-2 info-grid">
            <div class="kv-item kv-item-remark">
              <div class="kv-label">订单备注</div>
              <div class="kv-value">
                <InfoValue v-model="editOrderInfo.remark" type="text" :editable="canEdit" />
              </div>
            </div>
          </div>

          <div class="kv-grid kv-grid-4 info-grid info-grid-compact">
            <div class="kv-item">
              <div class="kv-label">商业金额</div>
              <div class="kv-value">
                <InfoValue v-model="editOrderInfo.commercial_amount" type="money" :editable="canEdit" :min="0" />
              </div>
            </div>

            <div class="kv-item">
              <div class="kv-label">交强金额</div>
              <div class="kv-value">
                <InfoValue v-model="editOrderInfo.compulsory_amount" type="money" :editable="canEdit" :min="0" />
              </div>
            </div>

            <div class="kv-item">
              <div class="kv-label">车船税金额</div>
              <div class="kv-value">
                <InfoValue v-model="editOrderInfo.vehicle_tax_amount" type="money" :editable="canEdit" :min="0" />
              </div>
            </div>

            <div class="kv-item">
              <div class="kv-label">非车金额</div>
              <div class="kv-value">
                <InfoValue v-model="editOrderInfo.non_vehicle_amount" type="money" :editable="canEdit" :min="0" />
              </div>
            </div>
          </div>

          <div class="kv-grid kv-grid-2 info-grid">
            <div class="kv-item">
              <div class="kv-label">保费金额</div>
              <div class="kv-value value-red">
                <InfoValue v-model="editOrderInfo.premium_total" type="money" :editable="false" />
              </div>
            </div>
          </div>
        </div>

        <div class="split-title">渠道</div>
        <div class="kv-grid kv-grid-6 info-grid info-grid-compact">
          <div class="kv-item">
            <div class="kv-label">商业点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.channel_commercial_point" type="point" :editable="canEdit" />
            </div>
          </div>

          <div class="kv-item">
            <div class="kv-label">商业后补%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.channel_commercial_supplement_point" type="point" :editable="canEdit" />
            </div>
          </div>

          <div class="kv-item">
            <div class="kv-label">交强点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.channel_compulsory_point" type="point" :editable="canEdit" />
            </div>
          </div>
          <div class="kv-item">
            <div class="kv-label">车船税点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.channel_vehicle_tax_point" type="point" :editable="canEdit" />
            </div>
          </div>
          <div class="kv-item">
            <div class="kv-label">非车点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.channel_non_vehicle_point" type="point" :editable="canEdit" />
            </div>
          </div>
          <div class="kv-item">
            <div class="kv-label">渠道奖励</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.channel_reward" type="money" :editable="canEdit" />
            </div>
          </div>
        </div>

        <div class="kv-grid kv-grid-2 info-grid">
          <div class="kv-item">
            <div class="kv-label">渠道应收</div>
            <div class="kv-value value-red">
              <InfoValue v-model="editOrderInfo.channel_total" type="money" :editable="false" />
            </div>
          </div>
        </div>

        <div class="split-title">客户</div>
        <div class="kv-grid kv-grid-6 info-grid info-grid-compact">
          <div class="kv-item">
            <div class="kv-label">商业点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.customer_commercial_point" type="point" :editable="canEdit" />
            </div>
          </div>

          <div class="kv-item">
            <div class="kv-label">商业后补%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.customer_commercial_supplement_point" type="point" :editable="canEdit" />
            </div>
          </div>

          <div class="kv-item">
            <div class="kv-label">交强点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.customer_compulsory_point" type="point" :editable="canEdit" />
            </div>
          </div>
          <div class="kv-item">
            <div class="kv-label">车船税点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.customer_vehicle_tax_point" type="point" :editable="canEdit" />
            </div>
          </div>
          <div class="kv-item">
            <div class="kv-label">非车点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.customer_non_vehicle_point" type="point" :editable="canEdit" />
            </div>
          </div>
          <div class="kv-item">
            <div class="kv-label">客户奖励</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.customer_reward" type="money" :editable="canEdit" />
            </div>
          </div>
        </div>

        <div class="kv-grid kv-grid-2 info-grid">
          <div class="kv-item">
            <div class="kv-label">客户应付</div>
            <div class="kv-value value-red">
              <InfoValue v-model="editOrderInfo.customer_total" type="money" :editable="false" />
            </div>
          </div>
        </div>

        <div class="kv-grid kv-grid-2 info-grid">
          <div class="kv-item">
            <div class="kv-label">利润</div>
            <div class="kv-value value-red">
              <InfoValue v-model="editOrderInfo.profit" type="money" :editable="false" />
            </div>
          </div>
        </div>
      </el-card>

      <!-- ② 车辆合格证（来自 slots.vehicle_cert.fields） -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <div class="section-header">
            <div class="section-title">车辆合格证</div>

            <el-button class="icon-btn" circle size="small" @click="certExpanded = !certExpanded">
              <el-icon>
                <CaretTop v-if="certExpanded" />
                <CaretBottom v-else />
              </el-icon>
            </el-button>
          </div>
        </template>

        <div class="two-col">
          <div class="left">
            <div v-if="!certExpanded" class="kv-grid kv-grid-2">
              <div class="kv-item">
                <div class="kv-label">车辆型号</div>
                <div class="kv-value">
                  <FieldValue v-model="editData.vehicle_model" :field="meta('vehicle_model')" :editable="canEdit" />
                </div>
              </div>

              <div class="kv-item">
                <div class="kv-label">车架号</div>
                <div class="kv-value">
                  <FieldValue v-model="editData.vin" :field="meta('vin')" :editable="canEdit" />
                </div>
              </div>

              <div class="kv-item">
                <div class="kv-label">发动机号</div>
                <div class="kv-value">
                  <FieldValue v-model="editData.engine_no" :field="meta('engine_no')" :editable="canEdit" />
                </div>
              </div>

              <div class="kv-item">
                <div class="kv-label">初登日期</div>
                <div class="kv-value">
                  <FieldValue v-model="editData.first_register_date" :field="meta('first_register_date')" :editable="canEdit" />
                </div>
              </div>
            </div>

            <div v-else>
              <VehicleCertTable :data="editData" :readonly="!canEdit" />
            </div>
          </div>

          <div class="right">
            <div v-if="canEdit" class="image-actions">
              <el-upload
                :auto-upload="false"
                :multiple="false"
                :show-file-list="false"
                accept="image/*"
                :on-change="(file) => onReplaceSingleImage('vehicle_cert', file)"
              >
                <el-button size="small" type="primary" plain :loading="slotUploading.vehicle_cert">替换图片</el-button>
              </el-upload>

              <el-tooltip content="当前后端 finalize 协议不支持把单图槽清空为 0 张" placement="top">
                <span>
                  <el-button size="small" disabled>清空</el-button>
                </span>
              </el-tooltip>
            </div>

            <div class="image-wall">
              <div v-for="(url, idx) in imagesBySlot.vehicle_cert" :key="url + ':' + idx" class="thumb-wrap">
                <el-image :src="url" :preview-src-list="imagesBySlot.vehicle_cert" :initial-index="idx" fit="cover" class="thumb" />
              </div>
              <div v-if="!imagesBySlot.vehicle_cert.length" class="thumb-empty" />
            </div>
          </div>
        </div>
      </el-card>

      <!-- ③ 身份证正面/身份证背面（来自 slots.idcard_*.fields） -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <div class="section-header">
            <div class="section-title">身份证正面/身份证背面</div>

            <el-button class="icon-btn" circle size="small" @click="idExpanded = !idExpanded">
              <el-icon>
                <CaretTop v-if="idExpanded" />
                <CaretBottom v-else />
              </el-icon>
            </el-button>
          </div>
        </template>

        <div class="stack">
          <div class="sub-block">
            <div class="sub-title">身份证正面</div>
            <div class="two-col">
              <div class="left">
                <div v-if="!idExpanded" class="kv-grid kv-grid-2">
                  <div class="kv-item">
                    <div class="kv-label">姓名</div>
                    <div class="kv-value" ref="idNameValueRef">
                      <FieldValue v-model="editData.id_name" :field="meta('id_name')" :editable="canEdit" />
                    </div>
                  </div>

                  <div class="kv-item">
                    <div class="kv-label">身份证号</div>
                    <div class="kv-value">
                      <FieldValue v-model="editData.id_number" :field="meta('id_number')" :editable="canEdit" />
                    </div>
                  </div>
                </div>

                <div v-else class="kv-grid kv-grid-2">
                  <template v-for="f in idFrontFields" :key="f.key">
                    <div class="kv-item">
                      <div class="kv-label">{{ labelOf(f) }}</div>
                      <div class="kv-value" :ref="bindIdNameValueRef(f)">
                        <FieldValue v-model="editData[f.key]" :field="f" :editable="canEdit" />
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <div class="right">
                <div v-if="canEdit" class="image-actions">
                  <el-upload
                    :auto-upload="false"
                    :multiple="false"
                    :show-file-list="false"
                    accept="image/*"
                    :on-change="(file) => onReplaceSingleImage('idcard_front', file)"
                  >
                    <el-button size="small" type="primary" plain :loading="slotUploading.idcard_front">替换图片</el-button>
                  </el-upload>
                </div>

                <div class="image-wall">
                  <div v-for="(url, idx) in imagesBySlot.idcard_front" :key="url + ':' + idx" class="thumb-wrap">
                    <el-image :src="url" :preview-src-list="imagesBySlot.idcard_front" :initial-index="idx" fit="cover" class="thumb" />
                  </div>
                  <div v-if="!imagesBySlot.idcard_front.length" class="thumb-empty" />
                </div>
              </div>
            </div>
          </div>

          <div class="sub-block">
            <div class="sub-title">身份证背面</div>
            <div class="two-col">
              <div class="left">
                <div v-if="idExpanded" class="kv-grid kv-grid-2">
                  <template v-for="f in idBackFields" :key="f.key">
                    <div class="kv-item">
                      <div class="kv-label">{{ labelOf(f) }}</div>
                      <div class="kv-value">
                        <FieldValue v-model="editData[f.key]" :field="f" :editable="canEdit" />
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <div class="right">
                <div v-if="canEdit" class="image-actions">
                  <el-upload
                    :auto-upload="false"
                    :multiple="false"
                    :show-file-list="false"
                    accept="image/*"
                    :on-change="(file) => onReplaceSingleImage('idcard_back', file)"
                  >
                    <el-button size="small" type="primary" plain :loading="slotUploading.idcard_back">替换图片</el-button>
                  </el-upload>
                </div>

                <div class="image-wall">
                  <div v-for="(url, idx) in imagesBySlot.idcard_back" :key="url + ':' + idx" class="thumb-wrap">
                    <el-image :src="url" :preview-src-list="imagesBySlot.idcard_back" :initial-index="idx" fit="cover" class="thumb" />
                  </div>
                  <div v-if="!imagesBySlot.idcard_back.length" class="thumb-empty" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- ④ 行驶证/行驶证副件（来自 slots.driving_license_*.fields） -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <div class="section-header">
            <div class="section-title">行驶证/行驶证副件</div>

            <el-button class="icon-btn" circle size="small" @click="dlExpanded = !dlExpanded">
              <el-icon>
                <CaretTop v-if="dlExpanded" />
                <CaretBottom v-else />
              </el-icon>
            </el-button>
          </div>
        </template>

        <div class="stack">
          <div class="sub-block">
            <div class="sub-title">行驶证主页</div>
            <div class="two-col">
              <div class="left">
                <div v-if="!dlExpanded" class="kv-grid kv-grid-2">
                  <div class="kv-item">
                    <div class="kv-label">车牌号</div>
                    <div class="kv-value">
                      <FieldValue v-model="editData.dl_plate_no" :field="meta('dl_plate_no')" :editable="canEdit" />
                    </div>
                  </div>

                  <div class="kv-item">
                    <div class="kv-label">车主</div>
                    <div class="kv-value" :ref="bindDlOwnerValueRef">
                      <FieldValue v-model="editData.dl_owner" :field="meta('dl_owner')" :editable="canEdit" />
                    </div>
                  </div>

                  <div class="kv-item">
                    <div class="kv-label">使用性质</div>
                    <div class="kv-value">
                      <FieldValue v-model="editData.dl_use_nature" :field="meta('dl_use_nature')" :editable="canEdit" />
                    </div>
                  </div>

                  <div class="kv-item">
                    <div class="kv-label">车型</div>
                    <div class="kv-value">
                      <FieldValue v-model="editData.dl_vehicle_model" :field="meta('dl_vehicle_model')" :editable="canEdit" />
                    </div>
                  </div>

                  <div class="kv-item">
                    <div class="kv-label">车架号</div>
                    <div class="kv-value">
                      <FieldValue v-model="editData.dl_vin" :field="meta('dl_vin')" :editable="canEdit" />
                    </div>
                  </div>

                  <div class="kv-item">
                    <div class="kv-label">发动机号</div>
                    <div class="kv-value">
                      <FieldValue v-model="editData.dl_engine_no" :field="meta('dl_engine_no')" :editable="canEdit" />
                    </div>
                  </div>

                  <div class="kv-item">
                    <div class="kv-label">注册日期</div>
                    <div class="kv-value">
                      <FieldValue v-model="editData.dl_register_date" :field="meta('dl_register_date')" :editable="canEdit" />
                    </div>
                  </div>

                  <div class="kv-item">
                    <div class="kv-label">发证日期</div>
                    <div class="kv-value">
                      <FieldValue v-model="editData.dl_issue_date" :field="meta('dl_issue_date')" :editable="canEdit" />
                    </div>
                  </div>
                </div>

                <div v-else class="kv-grid kv-grid-2">
                  <template v-for="f in dlMainFields" :key="f.key">
                    <div class="kv-item">
                      <div class="kv-label">{{ labelOf(f) }}</div>
                      <div class="kv-value" :ref="bindDlOwnerValueRefForField(f)">
                        <FieldValue v-model="editData[f.key]" :field="f" :editable="canEdit" />
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <div class="right">
                <div v-if="canEdit" class="image-actions">
                  <el-upload
                    :auto-upload="false"
                    :multiple="false"
                    :show-file-list="false"
                    accept="image/*"
                    :on-change="(file) => onReplaceSingleImage('driving_license_main', file)"
                  >
                    <el-button size="small" type="primary" plain :loading="slotUploading.driving_license_main">替换图片</el-button>
                  </el-upload>
                </div>

                <div class="image-wall">
                  <div v-for="(url, idx) in imagesBySlot.driving_license_main" :key="url + ':' + idx" class="thumb-wrap">
                    <el-image :src="url" :preview-src-list="imagesBySlot.driving_license_main" :initial-index="idx" fit="cover" class="thumb" />
                  </div>
                  <div v-if="!imagesBySlot.driving_license_main.length" class="thumb-empty" />
                </div>
              </div>
            </div>
          </div>

          <div class="sub-block">
            <div class="sub-title">行驶证副页</div>
            <div class="two-col">
              <div class="left">
                <div v-if="!dlExpanded" class="kv-grid kv-grid-2">
                  <div class="kv-item">
                    <div class="kv-label">核定载人数</div>
                    <div class="kv-value">
                      <FieldValue
                        v-model="editData.dl_approved_passenger_count"
                        :field="meta('dl_approved_passenger_count')"
                        :editable="canEdit"
                      />
                    </div>
                  </div>
                </div>

                <div v-else class="kv-grid kv-grid-2">
                  <template v-for="f in dlAttachFields" :key="f.key">
                    <div class="kv-item">
                      <div class="kv-label">{{ labelOf(f) }}</div>
                      <div class="kv-value">
                        <FieldValue v-model="editData[f.key]" :field="f" :editable="canEdit" />
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <div class="right">
                <div v-if="canEdit" class="image-actions">
                  <el-upload
                    :auto-upload="false"
                    :multiple="false"
                    :show-file-list="false"
                    accept="image/*"
                    :on-change="(file) => onReplaceSingleImage('driving_license_sub', file)"
                  >
                    <el-button size="small" type="primary" plain :loading="slotUploading.driving_license_sub">替换图片</el-button>
                  </el-upload>
                </div>

                <div class="image-wall">
                  <div v-for="(url, idx) in imagesBySlot.driving_license_sub" :key="url + ':' + idx" class="thumb-wrap">
                    <el-image :src="url" :preview-src-list="imagesBySlot.driving_license_sub" :initial-index="idx" fit="cover" class="thumb" />
                  </div>
                  <div v-if="!imagesBySlot.driving_license_sub.length" class="thumb-empty" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, nextTick, onMounted, reactive, ref, resolveComponent, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { CaretBottom, CaretTop } from "@element-plus/icons-vue";

import VehicleCertTable from "./VehicleCertTable.vue";

import http from "../../api/http";
import { finalizeOrderUpload, getOrder, updateOrder, updateOrderStatus, uploadOrderImageProxy } from "../../api/orders";
import { finalizeFinanceUpload, getFinanceOrderDetail, uploadFinanceBosProxy } from "../../api/finance";
import { useSessionStore } from "../../store/session";
import { useOrderFieldConfig } from "../../composables/useOrderFieldConfig";
import { formatDynamicValue } from "../../utils/fieldFormat";
import { uploadOrReuseByMd5 } from "../../utils/bosUpload";

const router = useRouter();
const route = useRoute();
const session = useSessionStore();

function toValidOrderId(v) {
  const n = typeof v === "string" ? Number(v.trim()) : Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    throw new Error("invalid order id");
  }
  return n;
}

let orderId = 0;
try {
  orderId = toValidOrderId(route.params.id);
} catch {
  ElMessage.error("订单ID无效");
  router.replace("/orders/all");
}

const isFinanceView = computed(() => {
  const q = String(route.query?.source || "");
  if (q === "finance") return true;

  const name = String(route.name || "");
  if (name === "finance-order-detail") return true;

  const path = String(route.path || "");
  return path.startsWith("/finance/");
});

const roleName = computed(() => String(session.roleName || "").trim().toLowerCase());
const isPrivileged = computed(() => roleName.value === "super_admin" || roleName.value === "manager");
const isSales = computed(() => roleName.value === "sales");

/** ✅ 财务视图操作权限：finance / manager / super_admin */
const canFinanceRoleOps = computed(() => {
  const rn = roleName.value;
  return rn === "finance" || rn === "manager" || rn === "super_admin";
});

/** ✅ 财务视图：只允许 related 编辑 */
const canFinanceOps = computed(() => isFinanceView.value && canFinanceRoleOps.value);

const order = ref(null);
const loading = ref(false);
const saving = ref(false);

const certExpanded = ref(false);
const idExpanded = ref(false);
const dlExpanded = ref(false);

const editMode = ref(false);

/** ✅ 财务：单独的编辑状态，仅用于“备用图 related” */
const financeEditMode = ref(false);
function toggleFinanceEdit() {
  if (!canFinanceOps.value) return;
  financeEditMode.value = !financeEditMode.value;
}
function cancelFinanceEdit() {
  if (!canFinanceOps.value) return;
  if (slotUploading.related) return;

  relatedPendingFiles.value = [];
  relatedRetryOnce.value = false;

  financeEditMode.value = false;
  ElMessage.success("已退出编辑");
}
async function saveFinanceEdit() {
  if (!canFinanceOps.value) return;
  if (slotUploading.related) return;

  financeEditMode.value = false;
  ElMessage.success("已完成编辑");
  await load({ preserveEditDraft: true });
}
watch(
  () => canFinanceOps.value,
  (v) => {
    if (!v) financeEditMode.value = false;
  },
  { immediate: true }
);

const channelOptions = ref([]);
const customerOptions = ref([]);
const channelLoading = ref(false);
const customerLoading = ref(false);

const editMeta = reactive({
  channel_group_id: null,
  customer_group_id: null,
});

/** ====================== ✅ refs：用于滚动居中 + 闪烁值格子 ====================== */
const idNameValueRef = ref(null);
const dlOwnerValueRef = ref(null);
const ownerPhoneValueRef = ref(null);

function bindIdNameValueRef(field) {
  if (field?.key !== "id_name") return null;
  return (el) => {
    if (el) idNameValueRef.value = el;
  };
}

function bindDlOwnerValueRef(el) {
  if (el) dlOwnerValueRef.value = el;
}

function bindDlOwnerValueRefForField(field) {
  if (field?.key !== "dl_owner") return null;
  return (el) => {
    if (el) dlOwnerValueRef.value = el;
  };
}

function _closestKvItem(el) {
  if (!el) return null;
  return el.closest?.(".kv-item") || el;
}

const FLASH_DURATION_MS = 3500;

function _restartFlashOnEl(el) {
  if (!el) return;
  el.classList.remove("flash-value");
  void el.offsetWidth;
  el.classList.add("flash-value");
  window.setTimeout(() => {
    el.classList.remove("flash-value");
  }, FLASH_DURATION_MS);
}

async function _waitScrollStable({ stableMs = 260, eps = 1.5, timeoutMs = 2000 } = {}) {
  const start = Date.now();
  let lastY = window.scrollY;
  let stableFor = 0;

  return await new Promise((resolve) => {
    function tick() {
      const y = window.scrollY;
      const dy = Math.abs(y - lastY);

      if (dy <= eps) stableFor += 16;
      else stableFor = 0;

      lastY = y;

      if (stableFor >= stableMs) return resolve(true);
      if (Date.now() - start >= timeoutMs) return resolve(false);

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  });
}

async function _scrollCenterAndFlashThenConfirm({
  targetEl,
  flashEls = [],
  title = "提示",
  message = "",
  confirmText = "继续",
  cancelText = "取消",
} = {}) {
  const el = _closestKvItem(targetEl) || targetEl;
  if (el?.scrollIntoView) {
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  }

  await _waitScrollStable({ stableMs: 260, eps: 1.5, timeoutMs: 2200 });

  const uniq = Array.from(new Set([...(flashEls || []).filter(Boolean)]));
  for (const fe of uniq) _restartFlashOnEl(fe);

  await new Promise((r) => window.setTimeout(r, 120));

  try {
    const msgNode =
      typeof message === "string" ? h("div", { style: "white-space: pre-line; line-height: 1.7;" }, message) : message;

    await ElMessageBox.confirm(msgNode, title, {
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      type: "warning",
      center: true,
    });
    return true;
  } catch {
    return false;
  }
}

/** ====================== ✅ 关键：把新结构 {base, sections} 归一化 ====================== */
function _toObjFields(fields) {
  const out = {};
  for (const it of Array.isArray(fields) ? fields : []) {
    const k = String(it?.key || "").trim();
    if (!k) continue;
    out[k] = it?.value ?? null;
  }
  return out;
}

function normalizeDetailPayload(payload) {
  const raw = payload && typeof payload === "object" ? payload : {};
  const base = raw?.base && typeof raw.base === "object" ? raw.base : {};
  const sections = raw?.sections && typeof raw.sections === "object" ? raw.sections : {};

  const out = {
    id: raw?.id ?? base?.id ?? null,
    ...base,
    dynamic_data: {},
    order_info: {},
    images: [],
    _sections_raw: sections,
  };

  // order_info：从 sections.order_info.fields 拉成对象
  const oiSec = sections?.order_info && typeof sections.order_info === "object" ? sections.order_info : null;
  if (oiSec) out.order_info = _toObjFields(oiSec.fields);

  // slots：每个 slot 的 fields 汇总进 dynamic_data；images 打平成旧结构 images[]
  const slots = sections?.slots && typeof sections.slots === "object" ? sections.slots : {};
  const dyn = {};
  const images = [];

  for (const [slotKey, slotObj] of Object.entries(slots || {})) {
    if (!slotObj || typeof slotObj !== "object") continue;

    // fields -> dynamic_data
    const ff = Array.isArray(slotObj.fields) ? slotObj.fields : [];
    for (const f of ff) {
      const k = String(f?.key || "").trim();
      if (!k) continue;
      dyn[k] = f?.value ?? null;
    }

    // images -> order.images[]
    const imgs = Array.isArray(slotObj.images) ? slotObj.images : [];
    for (const im of imgs) {
      const url = String(im?.image_url || im?.image_file?.url || "").trim();
      if (!url) continue;

      images.push({
        id: im?.id ?? null,
        order_id: out.id,
        slot_key: slotKey,
        storage_key: im?.storage_key || im?.image_file?.storage_key || "",
        image_url: url,
        image_file_id: im?.image_file_id ?? im?.image_file?.id ?? null,
        image_file: im?.image_file ?? null,
        created_at: im?.created_at ?? null,
      });
    }
  }

  out.dynamic_data = dyn;
  out.images = images;

  return out;
}

/** ====================== ✅ order_info（保持 0 也显示） ====================== */
const editOrderInfo = reactive({
  insurance_expire_date: "",
  owner_phone: "",
  remark: "",

  commercial_amount: null,
  compulsory_amount: null,
  vehicle_tax_amount: null,
  non_vehicle_amount: null,
  premium_total: null,

  channel_commercial_point: null,
  channel_commercial_supplement_point: null,
  channel_compulsory_point: null,
  channel_vehicle_tax_point: null,
  channel_non_vehicle_point: null,
  channel_reward: null,
  channel_total: null,

  customer_commercial_point: null,
  customer_commercial_supplement_point: null,
  customer_compulsory_point: null,
  customer_vehicle_tax_point: null,
  customer_non_vehicle_point: null,
  customer_reward: null,
  customer_total: null,

  profit: null,
});

function _numOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function _numOrZero(v) {
  const n = _numOrNull(v);
  return n === null ? 0 : n;
}

function _trimOrEmpty(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function _dateOrEmpty(v) {
  if (!v) return "";
  const s = String(v).trim();
  if (!s) return "";
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function _fillOrderInfoFromOrder(o) {
  const oi = o && typeof o === "object" && o.order_info && typeof o.order_info === "object" ? o.order_info : {};

  editOrderInfo.insurance_expire_date = _dateOrEmpty(oi.insurance_expire_date);
  editOrderInfo.owner_phone = _trimOrEmpty(oi.owner_phone);
  editOrderInfo.remark = _trimOrEmpty(oi.remark);

  editOrderInfo.commercial_amount = _numOrNull(oi.commercial_amount);
  editOrderInfo.compulsory_amount = _numOrNull(oi.compulsory_amount);
  editOrderInfo.vehicle_tax_amount = _numOrNull(oi.vehicle_tax_amount);
  editOrderInfo.non_vehicle_amount = _numOrNull(oi.non_vehicle_amount);

  editOrderInfo.premium_total = _numOrNull(oi.premium_total);

  editOrderInfo.channel_commercial_point = _numOrNull(oi.channel_commercial_point);
  editOrderInfo.channel_commercial_supplement_point = _numOrNull(oi.channel_commercial_supplement_point);
  editOrderInfo.channel_compulsory_point = _numOrNull(oi.channel_compulsory_point);
  editOrderInfo.channel_vehicle_tax_point = _numOrNull(oi.channel_vehicle_tax_point);
  editOrderInfo.channel_non_vehicle_point = _numOrNull(oi.channel_non_vehicle_point);
  editOrderInfo.channel_reward = _numOrNull(oi.channel_reward);
  editOrderInfo.channel_total = _numOrNull(oi.channel_total);

  editOrderInfo.customer_commercial_point = _numOrNull(oi.customer_commercial_point);
  editOrderInfo.customer_commercial_supplement_point = _numOrNull(oi.customer_commercial_supplement_point);
  editOrderInfo.customer_compulsory_point = _numOrNull(oi.customer_compulsory_point);
  editOrderInfo.customer_vehicle_tax_point = _numOrNull(oi.customer_vehicle_tax_point);
  editOrderInfo.customer_non_vehicle_point = _numOrNull(oi.customer_non_vehicle_point);
  editOrderInfo.customer_reward = _numOrNull(oi.customer_reward);
  editOrderInfo.customer_total = _numOrNull(oi.customer_total);

  editOrderInfo.profit = _numOrNull(oi.profit);

  recalcOrderInfoDerived();
}

/**
 * ✅ 只上传“输入字段”
 */
function _sanitizeOrderInfoPayload() {
  const phone = String(editOrderInfo.owner_phone || "").trim();
  const remark = String(editOrderInfo.remark || "").trim();

  return {
    insurance_expire_date: editOrderInfo.insurance_expire_date ? String(editOrderInfo.insurance_expire_date) : "",
    owner_phone: phone,
    remark,

    commercial_amount: _numOrNull(editOrderInfo.commercial_amount),
    compulsory_amount: _numOrNull(editOrderInfo.compulsory_amount),
    vehicle_tax_amount: _numOrNull(editOrderInfo.vehicle_tax_amount),
    non_vehicle_amount: _numOrNull(editOrderInfo.non_vehicle_amount),

    channel_commercial_point: _numOrNull(editOrderInfo.channel_commercial_point),
    channel_commercial_supplement_point: _numOrNull(editOrderInfo.channel_commercial_supplement_point),
    channel_compulsory_point: _numOrNull(editOrderInfo.channel_compulsory_point),
    channel_vehicle_tax_point: _numOrNull(editOrderInfo.channel_vehicle_tax_point),
    channel_non_vehicle_point: _numOrNull(editOrderInfo.channel_non_vehicle_point),
    channel_reward: _numOrNull(editOrderInfo.channel_reward),

    customer_commercial_point: _numOrNull(editOrderInfo.customer_commercial_point),
    customer_commercial_supplement_point: _numOrNull(editOrderInfo.customer_commercial_supplement_point),
    customer_compulsory_point: _numOrNull(editOrderInfo.customer_compulsory_point),
    customer_vehicle_tax_point: _numOrNull(editOrderInfo.customer_vehicle_tax_point),
    customer_non_vehicle_point: _numOrNull(editOrderInfo.customer_non_vehicle_point),
    customer_reward: _numOrNull(editOrderInfo.customer_reward),
  };
}

function recalcOrderInfoDerived() {
  const commercial = _numOrNull(editOrderInfo.commercial_amount);
  const compulsory = _numOrNull(editOrderInfo.compulsory_amount);
  const vehicleTax = _numOrNull(editOrderInfo.vehicle_tax_amount);
  const nonVehicle = _numOrNull(editOrderInfo.non_vehicle_amount);

  const hasAnyMoney = [commercial, compulsory, vehicleTax, nonVehicle].some((x) => typeof x === "number");
  const premiumTotal = _numOrZero(commercial) + _numOrZero(compulsory) + _numOrZero(vehicleTax) + _numOrZero(nonVehicle);
  editOrderInfo.premium_total = hasAnyMoney ? premiumTotal : null;

  const chCommercialPoint = _numOrNull(editOrderInfo.channel_commercial_point);
  const chCommercialSupplementPoint = _numOrNull(editOrderInfo.channel_commercial_supplement_point);
  const chCompulsoryPoint = _numOrNull(editOrderInfo.channel_compulsory_point);
  const chVehicleTaxPoint = _numOrNull(editOrderInfo.channel_vehicle_tax_point);
  const chNonVehiclePoint = _numOrNull(editOrderInfo.channel_non_vehicle_point);
  const chReward = _numOrNull(editOrderInfo.channel_reward);

  const cuCommercialPoint = _numOrNull(editOrderInfo.customer_commercial_point);
  const cuCommercialSupplementPoint = _numOrNull(editOrderInfo.customer_commercial_supplement_point);
  const cuCompulsoryPoint = _numOrNull(editOrderInfo.customer_compulsory_point);
  const cuVehicleTaxPoint = _numOrNull(editOrderInfo.customer_vehicle_tax_point);
  const cuNonVehiclePoint = _numOrNull(editOrderInfo.customer_non_vehicle_point);
  const cuReward = _numOrNull(editOrderInfo.customer_reward);

  const channelTotal =
    _numOrZero(commercial) * (_numOrZero(chCommercialPoint) / 100) +
    _numOrZero(commercial) * (_numOrZero(chCommercialSupplementPoint) / 100) +
    _numOrZero(compulsory) * (_numOrZero(chCompulsoryPoint) / 100) +
    _numOrZero(vehicleTax) * (_numOrZero(chVehicleTaxPoint) / 100) +
    _numOrZero(nonVehicle) * (_numOrZero(chNonVehiclePoint) / 100) +
    _numOrZero(chReward);

  const customerTotal =
    _numOrZero(commercial) * (_numOrZero(cuCommercialPoint) / 100) +
    _numOrZero(commercial) * (_numOrZero(cuCommercialSupplementPoint) / 100) +
    _numOrZero(compulsory) * (_numOrZero(cuCompulsoryPoint) / 100) +
    _numOrZero(vehicleTax) * (_numOrZero(cuVehicleTaxPoint) / 100) +
    _numOrZero(nonVehicle) * (_numOrZero(cuNonVehiclePoint) / 100) +
    _numOrZero(cuReward);

  editOrderInfo.channel_total = hasAnyMoney ? channelTotal : null;
  editOrderInfo.customer_total = hasAnyMoney ? customerTotal : null;

  if (editOrderInfo.channel_total === null || editOrderInfo.customer_total === null) {
    editOrderInfo.profit = null;
  } else {
    editOrderInfo.profit = _numOrZero(editOrderInfo.channel_total) - _numOrZero(editOrderInfo.customer_total);
  }
}

watch(
  () => [
    editOrderInfo.commercial_amount,
    editOrderInfo.compulsory_amount,
    editOrderInfo.vehicle_tax_amount,
    editOrderInfo.non_vehicle_amount,

    editOrderInfo.channel_commercial_point,
    editOrderInfo.channel_commercial_supplement_point,
    editOrderInfo.channel_compulsory_point,
    editOrderInfo.channel_vehicle_tax_point,
    editOrderInfo.channel_non_vehicle_point,
    editOrderInfo.channel_reward,

    editOrderInfo.customer_commercial_point,
    editOrderInfo.customer_commercial_supplement_point,
    editOrderInfo.customer_compulsory_point,
    editOrderInfo.customer_vehicle_tax_point,
    editOrderInfo.customer_non_vehicle_point,
    editOrderInfo.customer_reward,
  ],
  () => recalcOrderInfoDerived()
);

/** ====================== 下拉兜底（原逻辑） ====================== */
const channelSelectOptions = computed(() => {
  const base = Array.isArray(channelOptions.value) ? channelOptions.value : [];
  const selectedId = editMeta.channel_group_id;
  if (selectedId === null || selectedId === undefined || selectedId === "") return base;

  const sid = Number(selectedId);
  const exists = base.some((x) => Number(x?.id) === sid);
  if (exists) return base;

  const name = order.value?.channel_group_name || `ID:${selectedId}`;
  return [{ id: selectedId, group_name: `${name}（已删除）`, _ghost: true }, ...base];
});

const customerSelectOptions = computed(() => {
  const base = Array.isArray(customerOptions.value) ? customerOptions.value : [];
  const selectedId = editMeta.customer_group_id;
  if (selectedId === null || selectedId === undefined || selectedId === "") return base;

  const sid = Number(selectedId);
  const exists = base.some((x) => Number(x?.id) === sid);
  if (exists) return base;

  const name = order.value?.customer_group_name || `ID:${selectedId}`;
  return [{ id: selectedId, group_name: `${name}（已删除）`, _ghost: true }, ...base];
});

/** ====================== 字段配置（原逻辑） ====================== */
const { allFields, loadConfig } = useOrderFieldConfig();

const fieldByKey = computed(() => {
  const m = new Map();
  for (const f of allFields.value || []) m.set(f.key, f);
  return m;
});

function meta(key) {
  const k = String(key || "").trim();
  return fieldByKey.value.get(k) || { key: k, label: k, type: "text", options: [] };
}

function labelOf(field) {
  if (field?.key === "id_number") return "身份证号";
  return field?.label || field?.key || "";
}

function normalizeCompactYmd(val) {
  if (val === null || val === undefined || val === "") return val;
  const s = String(val);
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return val;
}

function formatForView(val, field) {
  if (val === null || val === undefined || val === "") return "-";
  const f = field || { type: "text", options: [] };
  const v = f.type === "date" ? normalizeCompactYmd(val) : val;
  const out = formatDynamicValue(v, f);
  return out === "" ? "-" : out;
}

/** ====================== 编辑数据（dynamic_data） ====================== */
const editData = reactive({});

/** ✅ 财务视图禁止整单编辑 */
const canEditPermission = computed(() => {
  if (!order.value) return false;
  if (isFinanceView.value) return false;

  if (order.value.is_finished === true) return isPrivileged.value;
  if (isPrivileged.value) return true;
  return isSales.value && order.value.is_finished === false;
});

const canEdit = computed(() => canEditPermission.value && editMode.value);

/** ✅ 仅备用图可编辑：非财务用 canEdit；财务用 financeEditMode */
const canEditRelated = computed(() => {
  if (canEdit.value) return true;
  return canFinanceOps.value && financeEditMode.value;
});

const canReopen = computed(() => {
  if (!order.value) return false;
  if (order.value.is_finished !== true) return false;
  return isPrivileged.value;
});

/** ====================== 图片按 slot 分组（来自 sections.slots.*.images，已归一化到 order.images） ====================== */
function normalizeSlotKey(slot) {
  const s = String(slot || "").trim();
  if (!s) return "";
  return s;
}

function _createEmptySlots() {
  return {
    vehicle_cert: [],
    idcard_front: [],
    idcard_back: [],
    driving_license_main: [],
    driving_license_sub: [],
    related: [],
  };
}

function _dedupeSlotUrls(slots) {
  const out = _createEmptySlots();
  for (const [k, arr] of Object.entries(slots || {})) {
    const seen = new Set();
    const list = [];
    for (const u of Array.isArray(arr) ? arr : []) {
      const s = String(u || "").trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      list.push(s);
    }
    out[k] = list;
  }
  return out;
}

const imagesBySlot = computed(() => {
  const slots = _createEmptySlots();

  for (const it of order.value?.images || []) {
    const slotKey = normalizeSlotKey(it?.slot_key);
    const url = String(it?.image_url || "").trim();
    if (!slotKey || !url) continue;
    if (!slots[slotKey]) slots[slotKey] = [];
    slots[slotKey].push(url);
  }

  return _dedupeSlotUrls(slots);
});

const imageItemsBySlot = computed(() => {
  const slots = _createEmptySlots();

  for (const it of order.value?.images || []) {
    const slotKey = normalizeSlotKey(it?.slot_key);
    if (!slotKey) continue;
    if (!slots[slotKey]) slots[slotKey] = [];
    slots[slotKey].push(it);
  }

  return slots;
});

/** ====================== 身份证字段（按你新接口 slots.idcard_front fields key） ====================== */
const ID_FRONT_KEYS = Object.freeze(["id_name", "id_number", "id_address", "id_nation", "id_gender", "id_birth"]);
const ID_BACK_KEYS = Object.freeze(["id_issue_authority", "id_valid_from", "id_valid_to", "id_valid_period"]);
const idFrontFields = computed(() => ID_FRONT_KEYS.map((k) => meta(k)));
const idBackFields = computed(() => ID_BACK_KEYS.map((k) => meta(k)));

/** ====================== 行驶证字段（按 slots.driving_license_* fields key） ====================== */
const DL_MAIN_FIXED_KEYS = Object.freeze([
  "dl_owner",
  "dl_plate_no",
  "dl_vin",
  "dl_engine_no",
  "dl_vehicle_model",
  "dl_register_date",
  "dl_issue_date",
  "dl_use_nature",
  "dl_id_number",
]);

const DL_ATTACH_FIXED_KEYS = Object.freeze(["dl_approved_passenger_count"]);

function _fieldExistsOrHasValue(key) {
  if (!key) return false;
  if (fieldByKey.value.has(key)) return true;
  const v = editData?.[key];
  return !(v === undefined || v === null || v === "");
}

function _uniqueFieldsByKey(arr) {
  const out = [];
  const seen = new Set();
  for (const f of Array.isArray(arr) ? arr : []) {
    const k = String(f?.key || "");
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(f);
  }
  return out;
}

const dlMainFields = computed(() => {
  const arr = DL_MAIN_FIXED_KEYS.filter((k) => _fieldExistsOrHasValue(k)).map((k) => meta(k));
  return _uniqueFieldsByKey(arr);
});

const dlAttachFields = computed(() => {
  const arr = DL_ATTACH_FIXED_KEYS.filter((k) => _fieldExistsOrHasValue(k)).map((k) => meta(k));
  return _uniqueFieldsByKey(arr);
});

/** ====================== 返回/团队显示 ====================== */
function goBack() {
  const from = route.query?.from;

  if (typeof from === "string" && from) {
    let decoded = from;
    try {
      decoded = decodeURIComponent(from);
    } catch {
      decoded = from;
    }

    if (decoded.startsWith("/")) {
      router.push(decoded);
      return;
    }
  }

  if (window.history.length > 1) {
    router.back();
    return;
  }

  router.push({ path: isFinanceView.value ? "/finance" : "/orders/all" });
}

function _joinTeams(v) {
  const arr = Array.isArray(v) ? v : [];
  const cleaned = [...new Set(arr.map((x) => String(x || "").trim()).filter(Boolean))];
  return cleaned.length ? cleaned.join("、") : "";
}

const teamDisplay = computed(() => {
  const teams = _joinTeams(order.value?.team_names);
  if (teams) return teams;
  return String(order.value?.team_name ?? "").trim() || "";
});

function fmtYmdSafe(anyVal) {
  if (anyVal === null || anyVal === undefined || anyVal === "") return "-";
  const raw = String(anyVal).trim();
  if (!raw) return "-";

  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m && m[1]) return m[1];

  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;

  return "-";
}

function fillEditDataFromOrder(o) {
  const dyn = o?.dynamic_data || {};
  for (const k of Object.keys(editData)) delete editData[k];
  for (const [k, v] of Object.entries(dyn)) editData[k] = v ?? "";

  editMeta.customer_group_id = o?.customer_group_id ?? null;
  editMeta.channel_group_id = o?.channel_group_id ?? null;

  _fillOrderInfoFromOrder(o);
}

function toggleEdit() {
  if (!canEditPermission.value) return;

  if (editMode.value) {
    editMode.value = false;
    if (order.value) fillEditDataFromOrder(order.value);
    return;
  }

  editMode.value = true;

  if (!channelOptions.value.length || !customerOptions.value.length) {
    loadGroupOptions();
  }
}

async function loadGroupOptions() {
  channelLoading.value = true;
  customerLoading.value = true;
  try {
    const [c1, c2] = await Promise.all([http.get("/orders/channel-groups"), http.get("/orders/customer-groups")]);
    channelOptions.value = Array.isArray(c1?.data?.items) ? c1.data.items : [];
    customerOptions.value = Array.isArray(c2?.data?.items) ? c2.data.items : [];
  } catch (e) {
    console.error(e);
    ElMessage.error("加载渠道/客户选项失败");
  } finally {
    channelLoading.value = false;
    customerLoading.value = false;
  }
}

function shouldUseFinanceDetailApi() {
  return canFinanceOps.value;
}

async function load({ preserveEditDraft = false } = {}) {
  if (!orderId) return;

  loading.value = true;
  try {
    const resp = shouldUseFinanceDetailApi() ? await getFinanceOrderDetail(orderId) : await getOrder(orderId);
    // ✅ 新结构：{id, base, sections}
    const normalized = normalizeDetailPayload(resp?.data ?? resp ?? {});
    order.value = normalized;

    if (!preserveEditDraft) {
      editMode.value = false;
      fillEditDataFromOrder(order.value);
    } else {
      if (!editMode.value) _fillOrderInfoFromOrder(order.value);
    }
  } catch (e) {
    console.error(e);
    ElMessage.error("加载订单详情失败");
  } finally {
    loading.value = false;
  }
}

/** ====================== ✅ 校验：电话 + 姓名不一致（保持原逻辑） ====================== */
function _normalizePhone(s) {
  return String(s || "").replace(/\s+/g, "").replace(/-/g, "");
}

function _isValidChinaMobile(phoneRaw) {
  const p = _normalizePhone(phoneRaw);
  if (!p) return true;
  return /^(?:\+?86)?1[3-9]\d{9}$/.test(p);
}

function _getIdName() {
  return String(editData?.id_name || "").trim();
}

function _getDlOwnerName() {
  return String(editData?.dl_owner || "").trim();
}

async function _validateBeforeSave() {
  if (canEdit.value) {
    const phone = String(editOrderInfo.owner_phone || "").trim();
    if (phone && !_isValidChinaMobile(phone)) {
      await nextTick();
      await _scrollCenterAndFlashThenConfirm({
        targetEl: ownerPhoneValueRef.value,
        flashEls: [ownerPhoneValueRef.value],
        title: "电话格式不正确",
        message: "车主电话默认按手机号校验，请检查后再保存。",
        confirmText: "我知道了",
        cancelText: "取消",
      });
      return false;
    }
  }

  const idName = _getIdName();
  const dlOwner = _getDlOwnerName();
  if (idName && dlOwner && idName !== dlOwner) {
    await nextTick();
    const confirmed = await _scrollCenterAndFlashThenConfirm({
      targetEl: idNameValueRef.value || dlOwnerValueRef.value,
      flashEls: [idNameValueRef.value, dlOwnerValueRef.value].filter(Boolean),
      title: "姓名不一致",
      message: `检测到证件姓名不一致：\n身份证姓名【${idName}】\n行驶证车主【${dlOwner}】\n是否仍要继续保存？`,
      confirmText: "继续保存",
      cancelText: "取消保存",
    });

    if (!confirmed) return false;
  }

  return true;
}

async function save() {
  if (!order.value) return;
  if (!canEdit.value) return;

  const ok = await _validateBeforeSave();
  if (!ok) return;

  saving.value = true;
  try {
    const dyn = { ...(order.value.dynamic_data || {}), ...editData };

    await updateOrder(orderId, {
      dynamic_data: dyn,
      customer_group_id: editMeta.customer_group_id,
      channel_group_id: editMeta.channel_group_id,
      order_info: _sanitizeOrderInfoPayload(),
    });

    ElMessage.success("保存成功");
    await load();
  } catch (e) {
    console.error(e);
    ElMessage.error("保存失败");
  } finally {
    saving.value = false;
  }
}

async function reopenToUnfinishedConfirm() {
  try {
    await ElMessageBox.confirm("确认将该订单【退回未完成】？", "确认操作", {
      confirmButtonText: "确认退回",
      cancelButtonText: "取消",
      type: "warning",
      center: true,
    });
  } catch {
    return;
  }
  await reopenToUnfinished();
}

async function reopenToUnfinished() {
  if (!order.value) return;
  saving.value = true;
  try {
    await updateOrderStatus(orderId, { is_finished: false });
    ElMessage.success("已退回未完成");
    await load();
  } catch (e) {
    console.error(e);
    ElMessage.error("操作失败");
  } finally {
    saving.value = false;
  }
}

/** ====================== 图片编辑：BOS + finalize（原逻辑保留） ====================== */
const UPLOAD_MODE_KEY = "order_import_upload_mode";
const uploadMode = ref("smart");

function loadUploadMode() {
  const v = localStorage.getItem(UPLOAD_MODE_KEY);
  if (v === "smart" || v === "direct" || v === "stable") uploadMode.value = v;
}
loadUploadMode();

const slotUploading = reactive({
  vehicle_cert: false,
  idcard_front: false,
  idcard_back: false,
  driving_license_main: false,
  driving_license_sub: false,
  related: false,
});

const relatedPendingFiles = ref([]);
const relatedRetryOnce = ref(false);

const bosHost = ref("");
let cachedSts = null;
let cachedStsExpireAt = 0;

function _parseExpireTs(expiration) {
  try {
    return Date.parse(expiration);
  } catch {
    return 0;
  }
}

async function ensureSts() {
  const now = Date.now();
  if (cachedSts && cachedStsExpireAt && now + 120_000 < cachedStsExpireAt) return cachedSts;

  const resp = await http.get("/orders/bos-sts");
  const data = resp?.data;
  if (!data?.accessKeyId || !data?.secretAccessKey || !data?.sessionToken) {
    throw new Error("bos-sts response invalid");
  }
  cachedSts = data;
  bosHost.value = data.bosHost || "";
  cachedStsExpireAt = _parseExpireTs(data.expiration) || now + 10 * 60 * 1000;
  return cachedSts;
}

function _errMsg(e) {
  const m = e?.message || e?.response?.data?.detail || e?.response?.data?.message || "";
  return String(m || "");
}

function isLikelyNetworkBlocked(err) {
  const m = _errMsg(err).toLowerCase();
  return m.includes("failed to fetch") || m.includes("network error") || m.includes("cors") || m.includes("代理") || m.includes("vpn");
}

async function suggestSwitchToStableOnce(err) {
  try {
    await ElMessageBox.confirm(
      `上传看起来被当前网络环境拦截（常见于 VPN/代理/公司网关）。\n\n是否切换到【稳定模式上传】继续？`,
      "上传失败（网络拦截）",
      {
        confirmButtonText: "切换为稳定模式",
        cancelButtonText: "继续直传重试",
        type: "warning",
        center: true,
        distinguishCancelAndClose: true,
      }
    );
    uploadMode.value = "stable";
    try {
      localStorage.setItem(UPLOAD_MODE_KEY, "stable");
    } catch {}
    return true;
  } catch {
    return false;
  }
}

function _getStorageKeyFromUrl(url) {
  try {
    const u = new URL(String(url));
    return (u.pathname || "").replace(/^\/+/, "");
  } catch {
    return "";
  }
}

function _extractStorageKeyFromImageItem(it) {
  const sk = (it?.storage_key || it?.image_file?.storage_key || "").trim().replace(/^\/+/, "");
  if (sk) return sk;
  const url = (it?.image_url || it?.url || "").trim();
  if (url) return _getStorageKeyFromUrl(url);
  return "";
}

function _md5FromStorageKey(storageKey) {
  const s = String(storageKey || "");
  const m = s.match(/([a-f0-9]{32})\.[a-z0-9]+$/i);
  return m ? String(m[1]).toLowerCase() : "";
}

function _finalizeItemFromExistingImage(it, slotKey) {
  const storage_key = _extractStorageKeyFromImageItem(it);
  if (!storage_key) return null;
  const md5 = _md5FromStorageKey(storage_key) || "";
  return { slot_key: slotKey, storage_key, md5, size: 0 };
}

async function _uploadOne(slotKey, rawFile) {
  if (canFinanceOps.value) {
    const resp = await uploadFinanceBosProxy({ order_id: orderId, slot_key: slotKey, file: rawFile });
    const meta = resp?.data;
    return {
      slot_key: slotKey,
      storage_key: meta?.storage_key,
      md5: meta?.md5 || "",
      size: meta?.size || rawFile?.size || 0,
      content_type: meta?.content_type || rawFile?.type || "application/octet-stream",
      etag: meta?.etag || "",
      original_name: meta?.original_name || rawFile?.name || "file",
      url: meta?.url || "",
    };
  }

  if (uploadMode.value === "stable") {
    const resp = await uploadOrderImageProxy({ slot_key: slotKey, file: rawFile });
    const meta = resp?.data;
    return {
      slot_key: slotKey,
      storage_key: meta?.storage_key,
      md5: meta?.md5 || "",
      size: meta?.size || rawFile?.size || 0,
      content_type: meta?.content_type || rawFile?.type || "application/octet-stream",
      etag: meta?.etag || "",
      original_name: meta?.original_name || rawFile?.name || "file",
      url: meta?.url || "",
    };
  }

  const sts = await ensureSts();
  if (!bosHost.value) throw new Error("bosHost missing");

  const meta = await uploadOrReuseByMd5({
    bosHost: bosHost.value,
    slotKey,
    file: rawFile,
    sts,
  });

  return {
    slot_key: slotKey,
    storage_key: meta?.storage_key,
    md5: meta?.md5 || "",
    size: meta?.size || rawFile?.size || 0,
    content_type: meta?.content_type || rawFile?.type || "application/octet-stream",
    etag: meta?.etag || "",
    original_name: meta?.original_name || rawFile?.name || "file",
    url: meta?.url || "",
  };
}

async function _finalizeSlot(slotKey, items, { clear = false } = {}) {
  const clear_slots = clear ? [slotKey] : [];

  if (canFinanceOps.value) {
    await finalizeFinanceUpload({
      order_id: orderId,
      images: items,
      clear_slots,
    });
  } else {
    await finalizeOrderUpload({
      order_id: orderId,
      images: items,
      clear_slots,
    });
  }

  await load({ preserveEditDraft: true });
  ElMessage.success("图片已更新（如涉及证件将触发 OCR 任务）");
}

async function onReplaceSingleImage(slotKey, uploadFile) {
  if (!canEdit.value) return;
  const raw = uploadFile?.raw;
  if (!raw) return;

  slotUploading[slotKey] = true;
  try {
    const meta = await _uploadOne(slotKey, raw);
    if (!meta?.storage_key) throw new Error("upload meta invalid");
    await _finalizeSlot(slotKey, [meta]);
  } catch (e) {
    if (!canFinanceOps.value && uploadMode.value === "smart" && isLikelyNetworkBlocked(e)) {
      const switched = await suggestSwitchToStableOnce(e);
      if (switched) {
        const meta = await _uploadOne(slotKey, raw);
        if (!meta?.storage_key) throw new Error("upload meta invalid");
        await _finalizeSlot(slotKey, [meta]);
        return;
      }
    }
    console.error(e);
    ElMessage.error(_errMsg(e) || "上传失败");
  } finally {
    slotUploading[slotKey] = false;
  }
}

async function onAppendRelated(uploadFile) {
  if (!canEditRelated.value) return;
  const raw = uploadFile?.raw;
  if (!raw) return;

  relatedPendingFiles.value.push(raw);
  if (slotUploading.related) return;
  await _drainRelatedQueue();
}

async function _drainRelatedQueue() {
  if (slotUploading.related) return;

  const files = relatedPendingFiles.value.splice(0);
  if (!files.length) return;

  slotUploading.related = true;

  try {
    const existing = (imageItemsBySlot.value.related || [])
      .map((it) => _finalizeItemFromExistingImage(it, "related"))
      .filter(Boolean);

    const metas = [];
    for (const f of files) {
      const meta = await _uploadOne("related", f);
      if (!meta?.storage_key) throw new Error("upload meta invalid");
      metas.push(meta);
    }

    await _finalizeSlot("related", [...existing, ...metas]);
    relatedRetryOnce.value = false;
  } catch (e) {
    console.error(e);
    ElMessage.error(_errMsg(e) || "上传失败");
  } finally {
    slotUploading.related = false;
    if (relatedPendingFiles.value.length) void _drainRelatedQueue();
  }
}

async function removeRelatedByIndex(idx) {
  if (!canEditRelated.value) return;

  const list = (imageItemsBySlot.value.related || []).slice();
  if (idx < 0 || idx >= list.length) return;

  slotUploading.related = true;
  try {
    const remaining = list
      .filter((_, i) => i !== idx)
      .map((it) => _finalizeItemFromExistingImage(it, "related"))
      .filter(Boolean);

    if (!remaining.length) {
      await _finalizeSlot("related", [], { clear: true });
      return;
    }

    await _finalizeSlot("related", remaining);
  } catch (e) {
    console.error(e);
    ElMessage.error(_errMsg(e) || "删除失败");
  } finally {
    slotUploading.related = false;
  }
}

async function clearRelatedAll() {
  if (!canEditRelated.value) return;
  if (!imagesBySlot.value.related.length) return;

  try {
    await ElMessageBox.confirm("确认清空【备用图】所有图片？", "确认清空", {
      confirmButtonText: "确认清空",
      cancelButtonText: "取消",
      type: "warning",
      center: true,
    });
  } catch {
    return;
  }

  relatedPendingFiles.value = [];
  relatedRetryOnce.value = false;

  slotUploading.related = true;
  try {
    await _finalizeSlot("related", [], { clear: true });
  } catch (e) {
    console.error(e);
    ElMessage.error(_errMsg(e) || "清空失败");
  } finally {
    slotUploading.related = false;
  }
}

onMounted(async () => {
  if (!orderId) return;

  await loadConfig("order");
  await load();

  if (canEditPermission.value) {
    await loadGroupOptions();
  }
});

/** ——内置组件：不使用 JSX—— */
const FieldValue = defineComponent({
  name: "FieldValue",
  props: {
    modelValue: { type: [String, Number, Date], default: "" },
    field: { type: Object, required: true },
    editable: { type: Boolean, default: false },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const ElInput = resolveComponent("el-input");
    const ElSelect = resolveComponent("el-select");
    const ElOption = resolveComponent("el-option");
    const ElDatePicker = resolveComponent("el-date-picker");

    const onUpdate = (v) => emit("update:modelValue", v);

    return () => {
      const f = props.field || { type: "text", options: [] };
      const raw = props.modelValue ?? "";
      const view = formatForView(raw, f);

      if (!props.editable) {
        return h("span", { class: "plain-value", title: view }, view);
      }

      if (f.type === "date") {
        const v = normalizeCompactYmd(raw) ?? "";
        return h(ElDatePicker, {
          modelValue: v,
          "onUpdate:modelValue": onUpdate,
          type: "date",
          clearable: true,
          format: "YYYY-MM-DD",
          valueFormat: "YYYY-MM-DD",
          class: "fv fv-date",
        });
      }

      if (f.type === "select") {
        const opts = Array.isArray(f.options) ? f.options : [];
        return h(
          ElSelect,
          {
            modelValue: raw,
            "onUpdate:modelValue": onUpdate,
            filterable: true,
            clearable: true,
            class: "fv fv-select",
          },
          () =>
            opts.map((op) => {
              const label = op && typeof op === "object" ? op.label : String(op);
              const value = op && typeof op === "object" ? op.value : op;
              return h(ElOption, { key: String(value), label, value });
            })
        );
      }

      return h(ElInput, {
        modelValue: raw,
        "onUpdate:modelValue": onUpdate,
        clearable: true,
        class: "fv fv-input",
      });
    };
  },
});

const InfoValue = defineComponent({
  name: "InfoValue",
  props: {
    modelValue: { type: [String, Number, null], default: "" },
    type: { type: String, default: "text" }, // text|date|money|point
    editable: { type: Boolean, default: false },
    min: { type: Number, default: undefined },
    max: { type: Number, default: undefined },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const ElInput = resolveComponent("el-input");
    const ElDatePicker = resolveComponent("el-date-picker");

    const inputStr = ref("");
    const focused = ref(false);

    function _toStr(v) {
      if (v === null || v === undefined || v === "") return "";
      return String(v);
    }

    function syncFromProps() {
      if (focused.value) return;
      inputStr.value = _toStr(props.modelValue);
    }

    watch(
      () => props.modelValue,
      () => syncFromProps(),
      { immediate: true }
    );

    function clamp(n) {
      let x = n;
      if (typeof props.min === "number") x = Math.max(props.min, x);
      if (typeof props.max === "number") x = Math.min(props.max, x);
      return x;
    }

    function commitEmpty() {
      inputStr.value = "";
      emit("update:modelValue", null);
    }

    function normalizeAndCommit() {
      focused.value = false;

      const raw = String(inputStr.value || "").trim();
      if (!raw) {
        commitEmpty();
        return;
      }

      const n0 = Number(raw);
      if (!Number.isFinite(n0)) {
        commitEmpty();
        return;
      }

      let n = clamp(n0);

      if (props.type === "money") {
        n = Math.round(n * 100) / 100;
        emit("update:modelValue", n);
        inputStr.value = n.toFixed(2);
        return;
      }

      emit("update:modelValue", n);
      inputStr.value = String(n);
    }

    function fmt(v) {
      if (v === null || v === undefined || v === "") return "-";
      const n = Number(v);
      if (props.type === "money") {
        if (!Number.isFinite(n)) return "-";
        return n.toFixed(2);
      }
      if (props.type === "point") {
        if (!Number.isFinite(n)) return "-";
        return String(n);
      }
      if (props.type === "date") {
        const s = _dateOrEmpty(v);
        return s || "-";
      }
      return String(v);
    }

    return () => {
      const raw = props.modelValue ?? "";

      if (!props.editable) {
        const view = fmt(raw);
        return h("span", { class: "plain-value", title: view }, view);
      }

      if (props.type === "date") {
        const v = _dateOrEmpty(raw);
        return h(ElDatePicker, {
          modelValue: v,
          "onUpdate:modelValue": (v2) => emit("update:modelValue", v2),
          type: "date",
          clearable: true,
          format: "YYYY-MM-DD",
          valueFormat: "YYYY-MM-DD",
          class: "fv fv-date",
        });
      }

      if (props.type === "money" || props.type === "point") {
        return h(ElInput, {
          modelValue: inputStr.value,
          "onUpdate:modelValue": (v) => {
            inputStr.value = String(v ?? "");
          },
          clearable: true,
          class: "fv fv-input",
          inputmode: "decimal",
          onFocus: () => {
            focused.value = true;
          },
          onBlur: () => normalizeAndCommit(),
          onClear: () => commitEmpty(),
        });
      }

      return h(ElInput, {
        modelValue: raw,
        "onUpdate:modelValue": (v) => emit("update:modelValue", v),
        clearable: true,
        class: "fv fv-input",
      });
    };
  },
});

watch(
  () => canEditPermission.value,
  (v) => {
    if (v && (!channelOptions.value.length || !customerOptions.value.length)) {
      loadGroupOptions();
    }
  }
);
</script>

<style scoped>
/* 原样保留你的样式（不改） */
.order-detail {
  width: 100%;
  --preview-w: 320px;
  --preview-gap: 14px;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.page-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-card {
  border-radius: 12px;
  border: 1px solid rgba(60, 60, 60, 0.08);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-weight: 800;
  color: rgba(31, 42, 68, 0.92);
  letter-spacing: 0.2px;
}

.icon-btn {
  border: 1px solid rgba(60, 60, 60, 0.12);
}

.two-col {
  display: grid;
  grid-template-columns: 1fr var(--preview-w);
  gap: var(--preview-gap);
  align-items: start;
}

.left {
  min-width: 0;
}

.right {
  border-left: 1px solid rgba(60, 60, 60, 0.08);
  padding-left: 14px;
  min-width: 0;
}

.meta-card .kv-grid {
  max-width: calc(100% - var(--preview-w) - var(--preview-gap));
}

.kv-grid {
  display: grid;
  gap: 10px 14px;
}

.kv-grid-2 {
  grid-template-columns: 1fr 1fr;
}

.kv-grid-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.kv-grid-5 {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.kv-grid-6 {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.kv-item {
  display: grid;
  grid-template-columns: 116px 1fr;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid rgba(60, 60, 60, 0.08);
  border-radius: 10px;
  background: rgba(245, 246, 248, 0.92);
}

.kv-label {
  font-size: 12px;
  color: rgba(31, 42, 68, 0.56);
  font-weight: 700;
  letter-spacing: 0.1px;
}

.kv-value {
  min-width: 0;
  font-size: 13px;
  color: rgba(31, 42, 68, 0.94);
  font-weight: 650;
}

.value-red {
  color: rgba(235, 35, 35, 0.92);
  font-weight: 800;
}

.plain-value {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.split-title {
  margin-top: 12px;
  margin-bottom: 8px;
  font-weight: 800;
  color: rgba(31, 42, 68, 0.9);
}

.info-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-grid .kv-item {
  grid-template-columns: 108px 1fr;
}

.info-grid-compact .kv-item {
  grid-template-columns: 84px 1fr;
  padding: 8px 10px;
}

.kv-item-remark {
  grid-template-columns: 84px 1fr;
}

.flash-value {
  border-radius: 10px;
  animation: _flashGlow 1.6s ease-in-out 2;
}

@keyframes _flashGlow {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 45, 45, 0);
    outline: 0 solid rgba(255, 45, 45, 0);
  }
  18% {
    box-shadow: 0 0 0 8px rgba(255, 45, 45, 0.18);
    outline: 2px solid rgba(255, 45, 45, 0.78);
  }
  35% {
    box-shadow: 0 0 0 10px rgba(255, 45, 45, 0.28);
    outline: 2px solid rgba(255, 45, 45, 0.78);
  }
  55% {
    box-shadow: 0 0 0 6px rgba(255, 45, 45, 0.14);
    outline: 2px solid rgba(255, 45, 45, 0.72);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 45, 45, 0);
    outline: 0 solid rgba(255, 45, 45, 0);
  }
}

.image-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.image-actions-wide {
  padding-bottom: 6px;
}

.image-wall {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.image-wall-wide {
  grid-template-columns: repeat(4, 1fr);
}

.thumb-wrap {
  position: relative;
  min-width: 0;
}

.thumb {
  width: 100%;
  height: 120px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(60, 60, 60, 0.1);
}

.thumb-remove {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.75);
  background: rgba(0, 0, 0, 0.45);
  color: rgba(255, 255, 255, 0.92);
  cursor: pointer;
  line-height: 20px;
  text-align: center;
  padding: 0;
}

.thumb-empty {
  grid-column: 1 / -1;
  height: 120px;
  border-radius: 10px;
  border: 1px dashed rgba(60, 60, 60, 0.16);
  background: rgba(255, 255, 255, 0.35);
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sub-block {
  border: 1px solid rgba(60, 60, 60, 0.08);
  border-radius: 12px;
  padding: 12px;
  background: rgba(245, 246, 248, 0.6);
}

.sub-title {
  font-weight: 800;
  color: rgba(31, 42, 68, 0.92);
  margin-bottom: 10px;
}

.fv :deep(.el-input__wrapper) {
  border-radius: 10px;
}

.fv {
  width: 100%;
}

.related-dragger {
  flex: 1;
  min-width: 260px;
}
.related-dragger :deep(.el-upload-dragger) {
  border-radius: 12px;
  padding: 14px 16px;
}
.drag-inner {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: center;
}
.drag-title {
  font-weight: 800;
  color: rgba(31, 42, 68, 0.92);
}
.drag-sub {
  font-size: 12px;
  color: rgba(31, 42, 68, 0.56);
  font-weight: 650;
}
</style>