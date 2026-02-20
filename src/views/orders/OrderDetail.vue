<!-- src/views/orders/OrderDetail.vue -->
<template>
  <div class="order-detail">
    <div class="detail-header">
      <h2>订单详情</h2>

      <div class="header-actions">
        <el-button size="small" @click="goBack">返回</el-button>

        <!-- ✅ 财务视图：只允许编辑备用图 related（顶部按钮与非财务统一：编辑/取消 + 保存） -->
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
              取消编辑
            </el-button>
            <el-button size="small" type="primary" :disabled="loading || saving || slotUploading.related" @click="saveFinanceEdit">
              保存
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

        <!-- ✅ 仅“可编辑备用图”时出现（非财务：canEdit；财务：financeEditMode） -->
        <div v-if="canEditRelated" class="image-actions image-actions-wide">
          <!-- ✅ 拖拽多图导入 -->
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

        <!-- ✅ 非编辑态且没图：不渲染图片墙（第二块不显示） -->
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

      <!-- ✅ ①.5 订单信息（order_info） -->
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

          <!-- ✅ 新增：订单备注（remark） -->
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

          <!-- ✅ 新增：商业后补（渠道） -->
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
            <div class="kv-label">出单奖励</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.channel_reward" type="money" :editable="canEdit" />
            </div>
          </div>
        </div>

        <div class="kv-grid kv-grid-2 info-grid">
          <div class="kv-item">
            <div class="kv-label">渠道合计</div>
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

          <!-- ✅ 新增：商业后补（客户） -->
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
            <div class="kv-label">出单奖励</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.customer_reward" type="money" :editable="canEdit" />
            </div>
          </div>
        </div>

        <div class="kv-grid kv-grid-2 info-grid">
          <div class="kv-item">
            <div class="kv-label">客户合计</div>
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

      <!-- ② 车辆合格证 -->
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
                <div class="kv-label">车辆识别代号/车架号</div>
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
                <div class="kv-label">额定载客(人 )</div>
                <div class="kv-value">
                  <FieldValue
                    v-model="editData.approved_passenger_count"
                    :field="meta('approved_passenger_count')"
                    :editable="canEdit"
                  />
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

      <!-- ③ 身份证正面/身份证背面 -->
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
                    <div class="kv-label">公民身份号码</div>
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

                  <el-tooltip content="当前后端 finalize 协议不支持把单图槽清空为 0 张" placement="top">
                    <span>
                      <el-button size="small" disabled>清空</el-button>
                    </span>
                  </el-tooltip>
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

                  <el-tooltip content="当前后端 finalize 协议不支持把单图槽清空为 0 张" placement="top">
                    <span>
                      <el-button size="small" disabled>清空</el-button>
                    </span>
                  </el-tooltip>
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

      <!-- ④ 行驶证/行驶证副件 -->
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
            <div class="sub-title">行驶证</div>
            <div class="two-col">
              <div class="left">
                <div v-if="!dlExpanded" class="kv-grid kv-grid-2">
                  <div v-if="dlKey('plate')" class="kv-item">
                    <div class="kv-label">号牌号码</div>
                    <div class="kv-value">
                      <FieldValue v-model="editData[dlKey('plate')]" :field="meta(dlKey('plate'))" :editable="canEdit" />
                    </div>
                  </div>

                  <div v-if="dlKey('owner')" class="kv-item">
                    <div class="kv-label">所有人</div>
                    <div class="kv-value" :ref="bindDlOwnerValueRef">
                      <FieldValue v-model="editData[dlKey('owner')]" :field="meta(dlKey('owner'))" :editable="canEdit" />
                    </div>
                  </div>

                  <div v-if="dlKey('use_nature')" class="kv-item">
                    <div class="kv-label">使用性质</div>
                    <div class="kv-value">
                      <FieldValue v-model="editData[dlKey('use_nature')]" :field="meta(dlKey('use_nature'))" :editable="canEdit" />
                    </div>
                  </div>

                  <div v-if="dlKey('brand_model')" class="kv-item">
                    <div class="kv-label">品牌型号</div>
                    <div class="kv-value">
                      <FieldValue v-model="editData[dlKey('brand_model')]" :field="meta(dlKey('brand_model'))" :editable="canEdit" />
                    </div>
                  </div>

                  <div v-if="dlKey('vin')" class="kv-item">
                    <div class="kv-label">车辆识别代码</div>
                    <div class="kv-value">
                      <FieldValue v-model="editData[dlKey('vin')]" :field="meta(dlKey('vin'))" :editable="canEdit" />
                    </div>
                  </div>

                  <div v-if="dlKey('engine')" class="kv-item">
                    <div class="kv-label">发动机号码</div>
                    <div class="kv-value">
                      <FieldValue v-model="editData[dlKey('engine')]" :field="meta(dlKey('engine'))" :editable="canEdit" />
                    </div>
                  </div>

                  <div v-if="dlKey('register_date')" class="kv-item">
                    <div class="kv-label">注册日期</div>
                    <div class="kv-value">
                      <FieldValue
                        v-model="editData[dlKey('register_date')]"
                        :field="meta(dlKey('register_date'))"
                        :editable="canEdit"
                      />
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

                  <el-tooltip content="当前后端 finalize 协议不支持把单图槽清空为 0 张" placement="top">
                    <span>
                      <el-button size="small" disabled>清空</el-button>
                    </span>
                  </el-tooltip>
                </div>

                <div class="image-wall">
                  <div v-for="(url, idx) in imagesBySlot.driving_license_main" :key="url + ':' + idx" class="thumb-wrap">
                    <el-image
                      :src="url"
                      :preview-src-list="imagesBySlot.driving_license_main"
                      :initial-index="idx"
                      fit="cover"
                      class="thumb"
                    />
                  </div>
                  <div v-if="!imagesBySlot.driving_license_main.length" class="thumb-empty" />
                </div>
              </div>
            </div>
          </div>

          <div class="sub-block">
            <div class="sub-title">行驶证副件</div>
            <div class="two-col">
              <div class="left">
                <div v-if="!dlExpanded" class="kv-grid kv-grid-2">
                  <div v-if="dlAttachPassengerKey" class="kv-item">
                    <div class="kv-label">核定载人数</div>
                    <div class="kv-value">
                      <FieldValue v-model="editData[dlAttachPassengerKey]" :field="meta(dlAttachPassengerKey)" :editable="canEdit" />
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

                  <el-tooltip content="当前后端 finalize 协议不支持把单图槽清空为 0 张" placement="top">
                    <span>
                      <el-button size="small" disabled>清空</el-button>
                    </span>
                  </el-tooltip>
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
import { getFinanceOrderDetail } from "../../api/finance";
import { useSessionStore } from "../../store/session";
import { useOrderFieldConfig } from "../../composables/useOrderFieldConfig";
import { formatDynamicValue } from "../../utils/fieldFormat";
import { uploadOrReuseByMd5 } from "../../utils/bosUpload";

const router = useRouter();
const route = useRoute();
const session = useSessionStore();

const orderId = Number(route.params.id);

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

/** ✅ 财务视图：只允许 related 编辑（而不是“按角色放开整单编辑”） */
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

  // ✅ 退出编辑时清空 pending 队列，避免“取消编辑”后还继续上传/回填
  relatedPendingFiles.value = [];
  relatedRetryOnce.value = false;

  financeEditMode.value = false;
  ElMessage.success("已退出编辑");
}
async function saveFinanceEdit() {
  if (!canFinanceOps.value) return;
  if (slotUploading.related) return;

  financeEditMode.value = false;
  ElMessage.success("已保存");
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
  const wantKey = dlKey("owner");
  if (!wantKey) return null;
  if (field?.key !== wantKey) return null;
  return (el) => {
    if (el) dlOwnerValueRef.value = el;
  };
}

function _closestKvItem(el) {
  if (!el) return null;
  return el.closest?.(".kv-item") || el;
}

/** ✅ 闪烁：更窄、更快 */
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

/** ====================== ✅ order_info：默认空，不默认 0.00 ====================== */
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

function _numOrNullZeroAsEmpty(v) {
  const n = _numOrNull(v);
  if (n === 0) return null;
  return n;
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

  editOrderInfo.commercial_amount = _numOrNullZeroAsEmpty(oi.commercial_amount);
  editOrderInfo.compulsory_amount = _numOrNullZeroAsEmpty(oi.compulsory_amount);
  editOrderInfo.vehicle_tax_amount = _numOrNullZeroAsEmpty(oi.vehicle_tax_amount);
  editOrderInfo.non_vehicle_amount = _numOrNullZeroAsEmpty(oi.non_vehicle_amount);

  editOrderInfo.premium_total = _numOrNullZeroAsEmpty(oi.premium_total);

  editOrderInfo.channel_commercial_point = _numOrNullZeroAsEmpty(oi.channel_commercial_point);
  editOrderInfo.channel_commercial_supplement_point = _numOrNullZeroAsEmpty(oi.channel_commercial_supplement_point);
  editOrderInfo.channel_compulsory_point = _numOrNullZeroAsEmpty(oi.channel_compulsory_point);
  editOrderInfo.channel_vehicle_tax_point = _numOrNullZeroAsEmpty(oi.channel_vehicle_tax_point);
  editOrderInfo.channel_non_vehicle_point = _numOrNullZeroAsEmpty(oi.channel_non_vehicle_point);

  editOrderInfo.channel_reward = _numOrNullZeroAsEmpty(oi.channel_reward);
  editOrderInfo.channel_total = _numOrNullZeroAsEmpty(oi.channel_total);

  editOrderInfo.customer_commercial_point = _numOrNullZeroAsEmpty(oi.customer_commercial_point);
  editOrderInfo.customer_commercial_supplement_point = _numOrNullZeroAsEmpty(oi.customer_commercial_supplement_point);
  editOrderInfo.customer_compulsory_point = _numOrNullZeroAsEmpty(oi.customer_compulsory_point);
  editOrderInfo.customer_vehicle_tax_point = _numOrNullZeroAsEmpty(oi.customer_vehicle_tax_point);
  editOrderInfo.customer_non_vehicle_point = _numOrNullZeroAsEmpty(oi.customer_non_vehicle_point);

  editOrderInfo.customer_reward = _numOrNullZeroAsEmpty(oi.customer_reward);
  editOrderInfo.customer_total = _numOrNullZeroAsEmpty(oi.customer_total);

  editOrderInfo.profit = _numOrNullZeroAsEmpty(oi.profit);

  recalcOrderInfoDerived();
}

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
    premium_total: _numOrNull(editOrderInfo.premium_total),

    channel_commercial_point: _numOrNull(editOrderInfo.channel_commercial_point),
    channel_commercial_supplement_point: _numOrNull(editOrderInfo.channel_commercial_supplement_point),
    channel_compulsory_point: _numOrNull(editOrderInfo.channel_compulsory_point),
    channel_vehicle_tax_point: _numOrNull(editOrderInfo.channel_vehicle_tax_point),
    channel_non_vehicle_point: _numOrNull(editOrderInfo.channel_non_vehicle_point),
    channel_reward: _numOrNull(editOrderInfo.channel_reward),
    channel_total: _numOrNull(editOrderInfo.channel_total),

    customer_commercial_point: _numOrNull(editOrderInfo.customer_commercial_point),
    customer_commercial_supplement_point: _numOrNull(editOrderInfo.customer_commercial_supplement_point),
    customer_compulsory_point: _numOrNull(editOrderInfo.customer_compulsory_point),
    customer_vehicle_tax_point: _numOrNull(editOrderInfo.customer_vehicle_tax_point),
    customer_non_vehicle_point: _numOrNull(editOrderInfo.customer_non_vehicle_point),
    customer_reward: _numOrNull(editOrderInfo.customer_reward),
    customer_total: _numOrNull(editOrderInfo.customer_total),

    profit: _numOrNull(editOrderInfo.profit),
  };
}

function recalcOrderInfoDerived() {
  const cRaw = _numOrNull(editOrderInfo.commercial_amount);
  const jRaw = _numOrNull(editOrderInfo.compulsory_amount);
  const tRaw = _numOrNull(editOrderInfo.vehicle_tax_amount);
  const nRaw = _numOrNull(editOrderInfo.non_vehicle_amount);

  const commercial = cRaw === null ? null : Math.max(0, cRaw);
  const compulsory = jRaw === null ? null : Math.max(0, jRaw);
  const vehicleTax = tRaw === null ? null : Math.max(0, tRaw);
  const nonVehicle = nRaw === null ? null : Math.max(0, nRaw);

  editOrderInfo.commercial_amount = commercial;
  editOrderInfo.compulsory_amount = compulsory;
  editOrderInfo.vehicle_tax_amount = vehicleTax;
  editOrderInfo.non_vehicle_amount = nonVehicle;

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

  const hasAnyChannelCfg = [
    chCommercialPoint,
    chCommercialSupplementPoint,
    chCompulsoryPoint,
    chVehicleTaxPoint,
    chNonVehiclePoint,
    chReward,
  ].some((x) => typeof x === "number");

  const hasAnyCustomerCfg = [
    cuCommercialPoint,
    cuCommercialSupplementPoint,
    cuCompulsoryPoint,
    cuVehicleTaxPoint,
    cuNonVehiclePoint,
    cuReward,
  ].some((x) => typeof x === "number");

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

  editOrderInfo.channel_total = hasAnyMoney || hasAnyChannelCfg ? channelTotal : null;
  editOrderInfo.customer_total = hasAnyMoney || hasAnyCustomerCfg ? customerTotal : null;

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
const { groups, allFields, loadConfig } = useOrderFieldConfig();

const fieldByKey = computed(() => {
  const m = new Map();
  for (const f of allFields.value || []) m.set(f.key, f);
  return m;
});

function meta(key) {
  return fieldByKey.value.get(key) || { key, label: key, type: "text", options: [] };
}

function labelOf(field) {
  if (field?.key === "id_number") return "公民身份号码";
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

/**
 * ✅ 关键收口：
 * - 只要是“财务视图”，就禁止整单编辑（无论 super_admin / manager / finance）
 * - 财务视图仅通过 canEditRelated 打开 related 备用图编辑
 */
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

/** ====================== 图片按 slot 分组（原逻辑） ====================== */
const imagesBySlot = computed(() => {
  const slots = {
    vehicle_cert: [],
    idcard_front: [],
    idcard_back: [],
    driving_license_main: [],
    driving_license_sub: [],
    related: [],
  };

  for (const it of order.value?.images || []) {
    if (!it?.slot_key) continue;
    const url = (it?.image_url || it?.url || "").trim();
    if (!url) continue;
    if (!slots[it.slot_key]) slots[it.slot_key] = [];
    slots[it.slot_key].push(url);
  }
  return slots;
});

const imageItemsBySlot = computed(() => {
  const slots = {
    vehicle_cert: [],
    idcard_front: [],
    idcard_back: [],
    driving_license_main: [],
    driving_license_sub: [],
    related: [],
  };
  for (const it of order.value?.images || []) {
    if (!it?.slot_key) continue;
    if (!slots[it.slot_key]) slots[it.slot_key] = [];
    slots[it.slot_key].push(it);
  }
  return slots;
});

/** ====================== 身份证字段 ====================== */
const ID_FRONT_KEYS = Object.freeze(["id_name", "id_gender", "id_ethnicity", "id_birth_date", "id_address", "id_number"]);
const ID_BACK_KEYS = Object.freeze(["id_issuer", "id_validity"]);
const idFrontFields = computed(() => ID_FRONT_KEYS.map((k) => meta(k)));
const idBackFields = computed(() => ID_BACK_KEYS.map((k) => meta(k)));

/** ====================== 行驶证字段：按 seed 分组 ====================== */
const dlMainGroup = computed(() => (groups.value || []).find((g) => g.group_key === "driving_license"));
const dlAttachGroup = computed(() => (groups.value || []).find((g) => g.group_key === "driving_attach"));

function groupFields(g) {
  if (!g) return [];
  const keys = (g.fields || []).map((x) => x.field_name).filter(Boolean);
  return keys.map((k) => meta(k));
}

/** ✅ 兜底：确保“行驶证主页”至少 7 个字段都有（避免 seed 组少字段导致只显示 5 个） */
const DL_MAIN_FALLBACK_KEYS = Object.freeze([
  "dl_plate_no",
  "dl_owner",
  "dl_use_nature",
  "dl_brand_model",
  "dl_vin",
  "dl_engine_no",
  "dl_register_date",
]);

function _uniqueFieldsByKey(arr) {
  const out = [];
  const seen = new Set();
  for (const f of Array.isArray(arr) ? arr : []) {
    const k = String(f?.key || "");
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(f);
  }
  return out;
}

function _mergeFieldsWithFallback(baseFields, fallbackKeys) {
  const base = Array.isArray(baseFields) ? baseFields : [];
  const set = new Set(base.map((x) => String(x?.key || "")).filter(Boolean));
  const extra = (Array.isArray(fallbackKeys) ? fallbackKeys : [])
    .filter((k) => k && !set.has(String(k)))
    .map((k) => meta(k));
  return _uniqueFieldsByKey([...base, ...extra]);
}

const dlMainFields = computed(() => _mergeFieldsWithFallback(groupFields(dlMainGroup.value), DL_MAIN_FALLBACK_KEYS));
const dlAttachFields = computed(() => groupFields(dlAttachGroup.value));

function _pickKeyFromFields(fields, { preferKeys = [], labelIncludes = [], keyIncludes = [] } = {}) {
  const arr = Array.isArray(fields) ? fields : [];
  for (const k of preferKeys) {
    const f = arr.find((x) => x?.key === k);
    if (f?.key) return f.key;
  }
  for (const inc of keyIncludes) {
    const f = arr.find((x) => String(x?.key || "").toLowerCase().includes(String(inc).toLowerCase()));
    if (f?.key) return f.key;
  }
  for (const inc of labelIncludes) {
    const f = arr.find((x) => String(x?.label || "").includes(String(inc)));
    if (f?.key) return f.key;
  }
  return null;
}

const dlDefaultKeyMap = computed(() => {
  const fields = dlMainFields.value || [];
  return {
    plate: _pickKeyFromFields(fields, { preferKeys: ["dl_plate_no"], keyIncludes: ["plate"], labelIncludes: ["号牌"] }),
    owner: _pickKeyFromFields(fields, { preferKeys: ["dl_owner"], keyIncludes: ["owner"], labelIncludes: ["所有人"] }),
    use_nature: _pickKeyFromFields(fields, {
      preferKeys: ["dl_use_nature"],
      keyIncludes: ["use_nature", "use"],
      labelIncludes: ["使用性质"],
    }),
    brand_model: _pickKeyFromFields(fields, {
      preferKeys: ["dl_brand_model"],
      keyIncludes: ["brand", "model"],
      labelIncludes: ["品牌型号", "品牌", "型号"],
    }),
    vin: _pickKeyFromFields(fields, { preferKeys: ["dl_vin", "vin"], keyIncludes: ["vin"], labelIncludes: ["识别", "车架"] }),
    engine: _pickKeyFromFields(fields, {
      preferKeys: ["dl_engine_no", "engine_no", "dl_engine", "engine"],
      keyIncludes: ["engine"],
      labelIncludes: ["发动机"],
    }),
    register_date: _pickKeyFromFields(fields, {
      preferKeys: ["dl_register_date", "register_date", "dl_reg_date", "dl_register_dt"],
      keyIncludes: ["register", "reg_date", "reg"],
      labelIncludes: ["注册日期"],
    }),
  };
});

function dlKey(name) {
  return dlDefaultKeyMap.value?.[name] || null;
}

const dlAttachPassengerKey = computed(() => {
  const fields = dlAttachFields.value || [];
  return _pickKeyFromFields(fields, {
    preferKeys: ["dl_approved_passenger_count", "approved_passenger_count", "dl_passenger_count"],
    keyIncludes: ["passenger", "approved"],
    labelIncludes: ["核定载", "载人数", "载客"],
  });
});

/** ====================== 返回（原逻辑） ====================== */
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
  // ✅ 只有在“财务视图 + 有财务操作权限”的角色，才走 finance detail API
  return canFinanceOps.value;
}

async function load({ preserveEditDraft = false } = {}) {
  loading.value = true;
  try {
    const resp = shouldUseFinanceDetailApi() ? await getFinanceOrderDetail(orderId) : await getOrder(orderId);
    order.value = resp.data;

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

/** ====================== ✅ 校验：电话 + 姓名不一致（先定位居中→稳定→闪烁→弹框） ====================== */
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
  const k = dlKey("owner");
  if (!k) return "";
  return String(editData?.[k] || "").trim();
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
      message: `检测到证件姓名不一致：\n身份证姓名【${idName}】\n行驶证所有人【${dlOwner}】\n是否仍要继续保存？`,
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
const uploadMode = ref("smart"); // smart/direct/stable

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

// ✅ related 多图队列：防止并发 finalize 覆盖（只剩最后一张）
const relatedPendingFiles = ref([]); // File[]
const relatedRetryOnce = ref(false);

// STS 缓存（直传用）
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
  return (
    m.includes("failed to fetch") ||
    m.includes("network error") ||
    m.includes("err_") ||
    m.includes("cors") ||
    m.includes("代理") ||
    m.includes("vpn") ||
    m.includes("127.0.0.1:7890")
  );
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
    const s = String(url || "");
    const i = s.indexOf("://");
    if (i >= 0) {
      const p = s.slice(i + 3);
      const j = p.indexOf("/");
      if (j >= 0) return p.slice(j + 1).replace(/^\/+/, "");
    }
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

/**
 * ✅ 财务视图编辑备用图：强制走“稳定模式（后端代传）”，避免 /orders/bos-sts 权限问题
 * ✅ 同时后端也应限制 finance/manager/super_admin 在 finance 入口仅允许 related
 */
async function _uploadOne(slotKey, rawFile) {
  if (canFinanceOps.value) {
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

  await finalizeOrderUpload({
    order_id: orderId,
    images: items,
    clear_slots,
  });

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
    if (uploadMode.value === "smart" && isLikelyNetworkBlocked(e)) {
      const switched = await suggestSwitchToStableOnce(e);
      if (switched) {
        try {
          const meta = await _uploadOne(slotKey, raw);
          if (!meta?.storage_key) throw new Error("upload meta invalid");
          await _finalizeSlot(slotKey, [meta]);
          return;
        } catch (e2) {
          console.error(e2);
          ElMessage.error(_errMsg(e2) || "上传失败");
          return;
        }
      }
    }

    console.error(e);
    ElMessage.error(_errMsg(e) || "上传失败");
  } finally {
    slotUploading[slotKey] = false;
  }
}

/**
 * ✅ related 多图追加：队列串行上传，最后一次 finalize，避免并发覆盖
 * - el-upload 多选会触发多次 on-change，这里统一入队
 */
async function onAppendRelated(uploadFile) {
  if (!canEditRelated.value) return;
  const raw = uploadFile?.raw;
  if (!raw) return;

  relatedPendingFiles.value.push(raw);

  // 已在处理就只入队，交给尾部继续跑
  if (slotUploading.related) return;

  await _drainRelatedQueue();
}

async function _drainRelatedQueue() {
  if (slotUploading.related) return;

  const files = relatedPendingFiles.value.splice(0);
  if (!files.length) return;

  slotUploading.related = true;

  try {
    // ✅ 先取一次“当前已存在”的 related（以 finalize 需要的引用为准）
    const existing = (imageItemsBySlot.value.related || [])
      .map((it) => _finalizeItemFromExistingImage(it, "related"))
      .filter(Boolean);

    const metas = [];
    for (const f of files) {
      const meta = await _uploadOne("related", f);
      if (!meta?.storage_key) throw new Error("upload meta invalid");
      metas.push(meta);
    }

    if (metas.length) {
      await _finalizeSlot("related", [...existing, ...metas]);
    }
    relatedRetryOnce.value = false;
  } catch (e) {
    // ✅ 非财务 + smart 网络拦截：提示切换稳定模式，并对“本批次文件”重试一次
    if (!canFinanceOps.value && uploadMode.value === "smart" && isLikelyNetworkBlocked(e) && !relatedRetryOnce.value) {
      const switched = await suggestSwitchToStableOnce(e);
      if (switched) {
        relatedRetryOnce.value = true;
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

          if (metas.length) {
            await _finalizeSlot("related", [...existing, ...metas]);
          }
          relatedRetryOnce.value = false;
        } catch (e2) {
          console.error(e2);
          ElMessage.error(_errMsg(e2) || "上传失败");
        }
        return;
      }
    }

    console.error(e);
    ElMessage.error(_errMsg(e) || "上传失败");
  } finally {
    slotUploading.related = false;

    // ✅ 如果处理期间又进队了新文件，继续处理下一批
    if (relatedPendingFiles.value.length) {
      // 不 await，避免阻塞 UI；但仍保证串行（因为 slotUploading.related 已释放）
      void _drainRelatedQueue();
    }
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

  // 清空时顺手把队列也清掉，避免用户刚选的图随后又被上传回去
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
  await loadConfig("order");

  if (canEditPermission.value) {
    await loadGroupOptions();
  }

  await load();
});

// ——内置组件：不使用 JSX——
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

// ✅ 订单信息字段控件（order_info）
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
      if ((props.type === "money" || props.type === "point") && Number(v) === 0) return "";
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
/* 原样保留 */
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

/* ✅ 新增：6 列（用于“商业点位 + 商业后补 + 其它 4 项”） */
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

/* ✅ 备注行更适配一点（可选增强） */
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

/* ✅ related 拖拽区 */
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