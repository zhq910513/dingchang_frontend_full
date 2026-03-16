<!-- src/views/orders/OrderDetail.vue -->
<template>
  <div class="order-detail">
    <div class="detail-header">
      <h2>订单详情</h2>

      <div class="header-actions">
        <el-button size="small" @click="goBack">返回</el-button>

        <template v-if="canFinanceOps && !canEditPermission && order">
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
            <el-button
              size="small"
              plain
              :disabled="loading || saving || slotUploading.related"
              @click="cancelFinanceEdit"
            >
              取消编辑
            </el-button>
            <el-button
              size="small"
              type="primary"
              :disabled="loading || saving || slotUploading.related"
              @click="saveFinanceEdit"
            >
              保存
            </el-button>
          </template>
        </template>

        <template v-else>
          <el-button
            v-if="canReopen"
            size="small"
            type="warning"
            plain
            :loading="saving"
            @click="reopenToUnfinishedConfirm"
          >
            退回未完成
          </el-button>

          <el-button
            v-if="canEditPermission && !editMode"
            size="small"
            type="primary"
            plain
            :disabled="loading || saving"
            @click="toggleEdit"
          >
            编辑
          </el-button>

          <el-button
            v-if="canEditPermission && editMode"
            size="small"
            plain
            :disabled="loading || saving"
            @click="toggleEdit"
          >
            取消编辑
          </el-button>

          <el-button
            v-if="canEdit"
            size="small"
            type="primary"
            :loading="saving"
            @click="save"
          >
            保存
          </el-button>
        </template>
      </div>
    </div>

    <div v-loading="loading" class="page-body">
      <!-- 渠道、客户 -->
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
              <template v-if="canEditMeta">
                <el-select
                  v-model="editMeta.channel_group_id"
                  filterable
                  clearable
                  class="fv fv-select"
                  placeholder="请选择渠道"
                >
                  <el-option
                    v-for="item in channelGroupOptions"
                    :key="item.id"
                    :label="channelGroupLabel(item)"
                    :value="item.id"
                  />
                </el-select>
              </template>
              <template v-else>
                <span class="plain-value" :title="resolvedChannelName || '-'">
                  {{ resolvedChannelName || "-" }}
                </span>
              </template>
            </div>
          </div>

          <div class="kv-item">
            <div class="kv-label">客户</div>
            <div class="kv-value">
              <template v-if="canEditMeta">
                <el-select
                  v-model="editMeta.customer_group_id"
                  filterable
                  clearable
                  class="fv fv-select"
                  placeholder="请选择客户"
                >
                  <el-option
                    v-for="item in customerGroupOptions"
                    :key="item.id"
                    :label="customerGroupLabel(item)"
                    :value="item.id"
                  />
                </el-select>
              </template>
              <template v-else>
                <span class="plain-value" :title="resolvedCustomerName || '-'">
                  {{ resolvedCustomerName || "-" }}
                </span>
              </template>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 备用图 -->
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
            <el-image
              :src="url"
              :preview-src-list="imagesBySlot.related"
              :initial-index="idx"
              fit="cover"
              class="thumb"
            />
            <button
              v-if="canEditRelated"
              type="button"
              class="thumb-remove"
              title="删除这张"
              @click="removeRelatedByIndex(idx)"
            >
              ×
            </button>
          </div>

          <div v-if="canEditRelated && !imagesBySlot.related.length" class="thumb-empty"/>
        </div>
      </el-card>

      <!-- 订单信息 -->
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
                <InfoValue v-model="editOrderInfo.insurance_expire_date" type="date" :editable="canEdit"/>
              </div>
            </div>

            <div class="kv-item">
              <div class="kv-label">车主电话</div>
              <div class="kv-value" ref="ownerPhoneValueRef">
                <InfoValue v-model="editOrderInfo.owner_phone" type="text" :editable="canEdit"/>
              </div>
            </div>
          </div>

          <div class="kv-grid kv-grid-2 info-grid">
            <div class="kv-item kv-item-remark">
              <div class="kv-label">订单备注</div>
              <div class="kv-value">
                <InfoValue v-model="editOrderInfo.remark" type="text" :editable="canEdit"/>
              </div>
            </div>
          </div>

          <div class="kv-grid kv-grid-4 info-grid info-grid-compact">
            <div class="kv-item">
              <div class="kv-label">商业金额</div>
              <div class="kv-value">
                <InfoValue v-model="editOrderInfo.commercial_amount" type="money" :editable="canEdit" :min="0"/>
              </div>
            </div>

            <div class="kv-item">
              <div class="kv-label">交强金额</div>
              <div class="kv-value">
                <InfoValue v-model="editOrderInfo.compulsory_amount" type="money" :editable="canEdit" :min="0"/>
              </div>
            </div>

            <div class="kv-item">
              <div class="kv-label">车船税金额</div>
              <div class="kv-value">
                <InfoValue v-model="editOrderInfo.vehicle_tax_amount" type="money" :editable="canEdit" :min="0"/>
              </div>
            </div>

            <div class="kv-item">
              <div class="kv-label">非车金额</div>
              <div class="kv-value">
                <InfoValue v-model="editOrderInfo.non_vehicle_amount" type="money" :editable="canEdit" :min="0"/>
              </div>
            </div>
          </div>

          <div class="kv-grid kv-grid-2 info-grid">
            <div class="kv-item">
              <div class="kv-label">保费金额</div>
              <div class="kv-value value-red">
                <InfoValue v-model="editOrderInfo.premium_total" type="money" :editable="false"/>
              </div>
            </div>
          </div>
        </div>

        <div class="split-title">渠道</div>
        <div class="kv-grid kv-grid-6 info-grid info-grid-compact">
          <div class="kv-item">
            <div class="kv-label">商业点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.channel_commercial_point" type="point" :editable="canEdit"/>
            </div>
          </div>

          <div class="kv-item">
            <div class="kv-label">商业后补%</div>
            <div class="kv-value">
              <InfoValue
                v-model="editOrderInfo.channel_commercial_supplement_point"
                type="point"
                :editable="canEdit"
              />
            </div>
          </div>

          <div class="kv-item">
            <div class="kv-label">交强点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.channel_compulsory_point" type="point" :editable="canEdit"/>
            </div>
          </div>

          <div class="kv-item">
            <div class="kv-label">车船税点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.channel_vehicle_tax_point" type="point" :editable="canEdit"/>
            </div>
          </div>

          <div class="kv-item">
            <div class="kv-label">非车点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.channel_non_vehicle_point" type="point" :editable="canEdit"/>
            </div>
          </div>

          <div class="kv-item">
            <div class="kv-label">出单奖励</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.channel_reward" type="money" :editable="canEdit"/>
            </div>
          </div>
        </div>

        <div class="kv-grid kv-grid-2 info-grid">
          <div class="kv-item">
            <div class="kv-label">渠道合计</div>
            <div class="kv-value value-red">
              <InfoValue v-model="editOrderInfo.channel_total" type="money" :editable="false"/>
            </div>
          </div>
        </div>

        <div class="split-title">客户</div>
        <div class="kv-grid kv-grid-6 info-grid info-grid-compact">
          <div class="kv-item">
            <div class="kv-label">商业点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.customer_commercial_point" type="point" :editable="canEdit"/>
            </div>
          </div>

          <div class="kv-item">
            <div class="kv-label">商业后补%</div>
            <div class="kv-value">
              <InfoValue
                v-model="editOrderInfo.customer_commercial_supplement_point"
                type="point"
                :editable="canEdit"
              />
            </div>
          </div>

          <div class="kv-item">
            <div class="kv-label">交强点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.customer_compulsory_point" type="point" :editable="canEdit"/>
            </div>
          </div>

          <div class="kv-item">
            <div class="kv-label">车船税点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.customer_vehicle_tax_point" type="point" :editable="canEdit"/>
            </div>
          </div>

          <div class="kv-item">
            <div class="kv-label">非车点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.customer_non_vehicle_point" type="point" :editable="canEdit"/>
            </div>
          </div>

          <div class="kv-item">
            <div class="kv-label">出单奖励</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.customer_reward" type="money" :editable="canEdit"/>
            </div>
          </div>
        </div>

        <div class="kv-grid kv-grid-2 info-grid">
          <div class="kv-item">
            <div class="kv-label">客户合计</div>
            <div class="kv-value value-red">
              <InfoValue v-model="editOrderInfo.customer_total" type="money" :editable="false"/>
            </div>
          </div>
        </div>

        <div class="kv-grid kv-grid-2 info-grid">
          <div class="kv-item">
            <div class="kv-label">利润</div>
            <div class="kv-value value-red">
              <InfoValue v-model="editOrderInfo.profit" type="money" :editable="false"/>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 车辆合格证 -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <div class="section-header">
            <div class="section-title">车辆合格证</div>

            <el-button class="icon-btn" circle size="small" @click="certExpanded = !certExpanded">
              <el-icon>
                <CaretTop v-if="certExpanded"/>
                <CaretBottom v-else/>
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
                  <FieldValue v-model="editData.vehicle_model" :field="meta('vehicle_model')" :editable="canEdit"/>
                </div>
              </div>

              <div class="kv-item">
                <div class="kv-label">车辆识别代号/车架号</div>
                <div class="kv-value">
                  <FieldValue v-model="editData.vin" :field="meta('vin')" :editable="canEdit"/>
                </div>
              </div>

              <div class="kv-item">
                <div class="kv-label">发动机号</div>
                <div class="kv-value">
                  <FieldValue v-model="editData.engine_no" :field="meta('engine_no')" :editable="canEdit"/>
                </div>
              </div>

              <div class="kv-item">
                <div class="kv-label">额定载客(人)</div>
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
              <VehicleCertTable :data="editData" :readonly="!canEdit"/>
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
                <el-button size="small" type="primary" plain :loading="slotUploading.vehicle_cert">
                  替换图片
                </el-button>
              </el-upload>

              <el-tooltip content="当前后端 finalize 协议不支持把单图槽清空为 0 张" placement="top">
                <span>
                  <el-button size="small" disabled>清空</el-button>
                </span>
              </el-tooltip>
            </div>

            <div class="image-wall">
              <div v-for="(url, idx) in imagesBySlot.vehicle_cert" :key="url + ':' + idx" class="thumb-wrap">
                <el-image
                  :src="url"
                  :preview-src-list="imagesBySlot.vehicle_cert"
                  :initial-index="idx"
                  fit="cover"
                  class="thumb"
                />
              </div>
              <div v-if="!imagesBySlot.vehicle_cert.length" class="thumb-empty"/>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 身份证正面/身份证背面 -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <div class="section-header">
            <div class="section-title">身份证正面/身份证背面</div>

            <el-button class="icon-btn" circle size="small" @click="idExpanded = !idExpanded">
              <el-icon>
                <CaretTop v-if="idExpanded"/>
                <CaretBottom v-else/>
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
                  <template v-for="row in ID_FRONT_COLLAPSED_ROWS" :key="rowKey(row)">
                    <div class="kv-item">
                      <div class="kv-label">{{ row.label }}</div>
                      <div class="kv-value" :ref="bindIdNameValueRef(row)">
                        <template v-if="row.key">
                          <FieldValue
                            v-model="editData[row.key]"
                            :field="rowField(row)"
                            :editable="canEdit && !row.readonly"
                          />
                        </template>
                        <template v-else>
                          <span class="plain-value" :title="viewOfRow(row)">
                            {{ viewOfRow(row) }}
                          </span>
                        </template>
                      </div>
                    </div>
                  </template>
                </div>

                <div v-else class="kv-grid kv-grid-2">
                  <template v-for="row in ID_FRONT_EXPANDED_ROWS" :key="rowKey(row)">
                    <div class="kv-item">
                      <div class="kv-label">{{ row.label }}</div>
                      <div class="kv-value" :ref="bindIdNameValueRef(row)">
                        <template v-if="row.key">
                          <FieldValue
                            v-model="editData[row.key]"
                            :field="rowField(row)"
                            :editable="canEdit && !row.readonly"
                          />
                        </template>
                        <template v-else>
                          <span class="plain-value" :title="viewOfRow(row)">
                            {{ viewOfRow(row) }}
                          </span>
                        </template>
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
                    <el-button size="small" type="primary" plain :loading="slotUploading.idcard_front">
                      替换图片
                    </el-button>
                  </el-upload>

                  <el-tooltip content="当前后端 finalize 协议不支持把单图槽清空为 0 张" placement="top">
                    <span>
                      <el-button size="small" disabled>清空</el-button>
                    </span>
                  </el-tooltip>
                </div>

                <div class="image-wall">
                  <div v-for="(url, idx) in imagesBySlot.idcard_front" :key="url + ':' + idx" class="thumb-wrap">
                    <el-image
                      :src="url"
                      :preview-src-list="imagesBySlot.idcard_front"
                      :initial-index="idx"
                      fit="cover"
                      class="thumb"
                    />
                  </div>
                  <div v-if="!imagesBySlot.idcard_front.length" class="thumb-empty"/>
                </div>
              </div>
            </div>
          </div>

          <div class="sub-block">
            <div class="sub-title">身份证背面</div>
            <div class="two-col">
              <div class="left">
                <div v-if="idExpanded" class="kv-grid kv-grid-2">
                  <template v-for="row in ID_BACK_EXPANDED_ROWS" :key="rowKey(row)">
                    <div class="kv-item">
                      <div class="kv-label">{{ row.label }}</div>
                      <div class="kv-value">
                        <template v-if="row.key">
                          <FieldValue
                            v-model="editData[row.key]"
                            :field="rowField(row)"
                            :editable="canEdit && !row.readonly"
                          />
                        </template>
                        <template v-else>
                          <span class="plain-value" :title="viewOfRow(row)">
                            {{ viewOfRow(row) }}
                          </span>
                        </template>
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
                    <el-button size="small" type="primary" plain :loading="slotUploading.idcard_back">
                      替换图片
                    </el-button>
                  </el-upload>

                  <el-tooltip content="当前后端 finalize 协议不支持把单图槽清空为 0 张" placement="top">
                    <span>
                      <el-button size="small" disabled>清空</el-button>
                    </span>
                  </el-tooltip>
                </div>

                <div class="image-wall">
                  <div v-for="(url, idx) in imagesBySlot.idcard_back" :key="url + ':' + idx" class="thumb-wrap">
                    <el-image
                      :src="url"
                      :preview-src-list="imagesBySlot.idcard_back"
                      :initial-index="idx"
                      fit="cover"
                      class="thumb"
                    />
                  </div>
                  <div v-if="!imagesBySlot.idcard_back.length" class="thumb-empty"/>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 行驶证/行驶证副件 -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <div class="section-header">
            <div class="section-title">行驶证/行驶证副件</div>

            <el-button class="icon-btn" circle size="small" @click="dlExpanded = !dlExpanded">
              <el-icon>
                <CaretTop v-if="dlExpanded"/>
                <CaretBottom v-else/>
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
                  <template v-for="row in DL_MAIN_COLLAPSED_ROWS" :key="rowKey(row)">
                    <div class="kv-item">
                      <div class="kv-label">{{ row.label }}</div>
                      <div class="kv-value" :ref="bindDlOwnerValueRefForRow(row)">
                        <template v-if="row.key">
                          <FieldValue
                            v-model="editData[row.key]"
                            :field="rowField(row)"
                            :editable="canEdit && !row.readonly"
                          />
                        </template>
                        <template v-else>
                          <span class="plain-value" :title="viewOfRow(row)">
                            {{ viewOfRow(row) }}
                          </span>
                        </template>
                      </div>
                    </div>
                  </template>
                </div>

                <div v-else class="kv-grid kv-grid-2">
                  <template v-for="row in DL_MAIN_EXPANDED_ROWS" :key="rowKey(row)">
                    <div class="kv-item">
                      <div class="kv-label">{{ row.label }}</div>
                      <div class="kv-value" :ref="bindDlOwnerValueRefForRow(row)">
                        <template v-if="row.key">
                          <FieldValue
                            v-model="editData[row.key]"
                            :field="rowField(row)"
                            :editable="canEdit && !row.readonly"
                          />
                        </template>
                        <template v-else>
                          <span class="plain-value" :title="viewOfRow(row)">
                            {{ viewOfRow(row) }}
                          </span>
                        </template>
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
                    <el-button size="small" type="primary" plain :loading="slotUploading.driving_license_main">
                      替换图片
                    </el-button>
                  </el-upload>

                  <el-tooltip content="当前后端 finalize 协议不支持把单图槽清空为 0 张" placement="top">
                    <span>
                      <el-button size="small" disabled>清空</el-button>
                    </span>
                  </el-tooltip>
                </div>

                <div class="image-wall">
                  <div
                    v-for="(url, idx) in imagesBySlot.driving_license_main"
                    :key="url + ':' + idx"
                    class="thumb-wrap"
                  >
                    <el-image
                      :src="url"
                      :preview-src-list="imagesBySlot.driving_license_main"
                      :initial-index="idx"
                      fit="cover"
                      class="thumb"
                    />
                  </div>
                  <div v-if="!imagesBySlot.driving_license_main.length" class="thumb-empty"/>
                </div>
              </div>
            </div>
          </div>

          <div class="sub-block">
            <div class="sub-title">行驶证副件</div>
            <div class="two-col">
              <div class="left">
                <div v-if="!dlExpanded" class="kv-grid kv-grid-2">
                  <template v-for="row in DL_SUB_COLLAPSED_ROWS" :key="rowKey(row)">
                    <div class="kv-item">
                      <div class="kv-label">{{ row.label }}</div>
                      <div class="kv-value">
                        <template v-if="row.key">
                          <FieldValue
                            v-model="editData[row.key]"
                            :field="rowField(row)"
                            :editable="canEdit && !row.readonly"
                          />
                        </template>
                        <template v-else>
                          <span class="plain-value" :title="viewOfRow(row)">
                            {{ viewOfRow(row) }}
                          </span>
                        </template>
                      </div>
                    </div>
                  </template>
                </div>

                <div v-else class="kv-grid kv-grid-2">
                  <template v-for="row in DL_SUB_EXPANDED_ROWS" :key="rowKey(row)">
                    <div class="kv-item">
                      <div class="kv-label">{{ row.label }}</div>
                      <div class="kv-value">
                        <template v-if="row.key">
                          <FieldValue
                            v-model="editData[row.key]"
                            :field="rowField(row)"
                            :editable="canEdit && !row.readonly"
                          />
                        </template>
                        <template v-else>
                          <span class="plain-value" :title="viewOfRow(row)">
                            {{ viewOfRow(row) }}
                          </span>
                        </template>
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
                    <el-button size="small" type="primary" plain :loading="slotUploading.driving_license_sub">
                      替换图片
                    </el-button>
                  </el-upload>

                  <el-tooltip content="当前后端 finalize 协议不支持把单图槽清空为 0 张" placement="top">
                    <span>
                      <el-button size="small" disabled>清空</el-button>
                    </span>
                  </el-tooltip>
                </div>

                <div class="image-wall">
                  <div
                    v-for="(url, idx) in imagesBySlot.driving_license_sub"
                    :key="url + ':' + idx"
                    class="thumb-wrap"
                  >
                    <el-image
                      :src="url"
                      :preview-src-list="imagesBySlot.driving_license_sub"
                      :initial-index="idx"
                      fit="cover"
                      class="thumb"
                    />
                  </div>
                  <div v-if="!imagesBySlot.driving_license_sub.length" class="thumb-empty"/>
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
import {computed, defineComponent, h, nextTick, onMounted, reactive, ref, resolveComponent, watch} from "vue";
import {useRoute, useRouter} from "vue-router";
import {ElMessage, ElMessageBox} from "element-plus";
import {CaretBottom, CaretTop} from "@element-plus/icons-vue";

import VehicleCertTable from "./VehicleCertTable.vue";

import http from "../../api/http";
import {
  finalizeOrderUpload,
  getOrder,
  updateOrder,
  updateOrderStatus,
  uploadOrderImageProxy,
} from "../../api/orders";
import {getFinanceOrderDetail} from "../../api/finance";
import {useSessionStore} from "../../store/session";
import {useOrderFieldConfig} from "../../composables/useOrderFieldConfig";
import {useCustomerChannelGroups} from "../../composables/useCustomerChannelGroups";
import {formatDynamicValue} from "../../utils/fieldFormat";
import {uploadOrReuseByMd5} from "../../utils/bosUpload";

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

const canFinanceRoleOps = computed(() => {
  const rn = roleName.value;
  return rn === "finance" || rn === "manager" || rn === "super_admin";
});

const canFinanceOps = computed(() => isFinanceView.value && canFinanceRoleOps.value);

const order = ref(null);
const loading = ref(false);
const saving = ref(false);

const certExpanded = ref(false);
const idExpanded = ref(false);
const dlExpanded = ref(false);

const editMode = ref(false);
const financeEditMode = ref(false);

const editMeta = reactive({
  customer_group_id: null,
  channel_group_id: null,
});

const {
  DEFAULT_PAGE_SIZE,
  getCustomerBucket,
  getChannelBucket,
  ensureCustomerGroupsLoaded,
  ensureChannelGroupsLoaded,
  loadMoreCustomerGroups,
  loadMoreChannelGroups,
  customerGroupLabel,
  channelGroupLabel,
} = useCustomerChannelGroups();

const customerKeyword = ref("");
const channelKeyword = ref("");

const customerBucket = computed(() => getCustomerBucket(customerKeyword.value, DEFAULT_PAGE_SIZE));
const channelBucket = computed(() => getChannelBucket(channelKeyword.value, DEFAULT_PAGE_SIZE));

const customerGroupOptions = computed(() => {
  return Array.isArray(customerBucket.value?.items) ? customerBucket.value.items : [];
});

const channelGroupOptions = computed(() => {
  return Array.isArray(channelBucket.value?.items) ? channelBucket.value.items : [];
});

function toggleFinanceEdit() {
  if (!canFinanceOps.value || canEditPermission.value) return;
  financeEditMode.value = !financeEditMode.value;
}

function cancelFinanceEdit() {
  if (!canFinanceOps.value || canEditPermission.value) return;
  if (slotUploading.related) return;
  relatedPendingFiles.value = [];
  relatedRetryOnce.value = false;
  financeEditMode.value = false;
  ElMessage.success("已退出编辑");
}

async function saveFinanceEdit() {
  if (!canFinanceOps.value || canEditPermission.value) return;
  if (slotUploading.related) return;
  financeEditMode.value = false;
  ElMessage.success("已保存");
  await load({preserveEditDraft: true});
}

watch(
  () => canFinanceOps.value,
  (v) => {
    if (!v) financeEditMode.value = false;
  },
  {immediate: true}
);

const idNameValueRef = ref(null);
const dlOwnerValueRef = ref(null);
const ownerPhoneValueRef = ref(null);

function bindIdNameValueRef(row) {
  if (row?.key !== "id_name") return null;
  return (el) => {
    if (el) idNameValueRef.value = el;
  };
}

function bindDlOwnerValueRefForRow(row) {
  if (row?.key !== "owner_name") return null;
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

async function _waitScrollStable({stableMs = 260, eps = 1.5, timeoutMs = 2000} = {}) {
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
    el.scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"});
  }

  await _waitScrollStable({stableMs: 260, eps: 1.5, timeoutMs: 2200});

  const uniq = Array.from(new Set([...(flashEls || []).filter(Boolean)]));
  for (const fe of uniq) _restartFlashOnEl(fe);

  await new Promise((r) => window.setTimeout(r, 120));

  try {
    const msgNode =
      typeof message === "string"
        ? h("div", {style: "white-space: pre-line; line-height: 1.7;"}, message)
        : message;

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
  editOrderInfo.customer_commercial_supplement_point = _numOrNullZeroAsEmpty(
    oi.customer_commercial_supplement_point
  );
  editOrderInfo.customer_compulsory_point = _numOrNullZeroAsEmpty(oi.customer_compulsory_point);
  editOrderInfo.customer_vehicle_tax_point = _numOrNullZeroAsEmpty(oi.customer_vehicle_tax_point);
  editOrderInfo.customer_non_vehicle_point = _numOrNullZeroAsEmpty(oi.customer_non_vehicle_point);

  editOrderInfo.customer_reward = _numOrNullZeroAsEmpty(oi.customer_reward);
  editOrderInfo.customer_total = _numOrNullZeroAsEmpty(oi.customer_total);

  editOrderInfo.profit = _numOrNullZeroAsEmpty(oi.profit);

  recalcOrderInfoDerived();
}

function _fillMetaFromOrder(o) {
  editMeta.customer_group_id = o?.customer_group_id ?? null;
  editMeta.channel_group_id = o?.channel_group_id ?? null;
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

  const premiumTotal =
    _numOrZero(commercial) + _numOrZero(compulsory) + _numOrZero(vehicleTax) + _numOrZero(nonVehicle);
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

function findOptionById(list, id) {
  const target = Number(id);
  if (!Number.isFinite(target)) return null;
  const arr = Array.isArray(list) ? list : [];
  return arr.find((x) => Number(x?.id) === target) || null;
}

const resolvedChannelName = computed(() => {
  const matched = findOptionById(channelGroupOptions.value, order.value?.channel_group_id);
  if (matched) return channelGroupLabel(matched);

  const code = String(order.value?.channel_group_code || order.value?.channel_code || "").trim();
  const name = String(order.value?.channel_group_name || order.value?.channel_name || "").trim();

  if (code && name) return `${code} - ${name}`;
  return code || name || "";
});

const resolvedCustomerName = computed(() => {
  const matched = findOptionById(customerGroupOptions.value, order.value?.customer_group_id);
  if (matched) return customerGroupLabel(matched);

  const code = String(order.value?.customer_group_code || order.value?.customer_code || "").trim();
  const name = String(order.value?.customer_group_name || order.value?.customer_name || "").trim();

  if (code && name) return `${code} - ${name}`;
  return code || name || "";
});

const {allFields, loadConfig} = useOrderFieldConfig();

const fieldByKey = computed(() => {
  const m = new Map();
  for (const f of allFields.value || []) m.set(f.key, f);
  return m;
});

function meta(key) {
  if (!key) return {key: "", label: "", type: "text", options: []};
  return fieldByKey.value.get(key) || {key, label: key, type: "text", options: []};
}

const FIELD_LABEL_FALLBACK = Object.freeze({
  id_name: "姓名",
  id_gender: "性别",
  id_ethnicity: "民族",
  id_birth_date: "出生日期",
  id_address: "住址",
  id_number: "公民身份号码",
  id_issuer: "签发机关",
  id_validity: "有效期限",

  plate_no: "号牌号码",
  owner_name: "所有人",
  use_nature: "使用性质",
  vehicle_model: "车辆型号",
  vin: "车辆识别代号/车架号",
  engine_no: "发动机号",
  first_register_date: "注册日期",
  approved_passenger_count: "核定载人数",

  cert_no: "合格证编号",
  cert_issue_date: "发证日期",
  manufacturer_name: "车辆制造企业名称",
  vehicle_brand_name: "车辆品牌/车辆名称",
  body_color: "车身颜色",
  chassis_model_id: "底盘型号/底盘ID",
  chassis_cert_no: "底盘合格证编号",
  engine_model: "发动机型号",
  fuel_type: "燃料种类",
  displacement_and_power: "排量和功率(mL/kW)",
  emission_standard: "排放标准",
  fuel_consumption: "油耗",
  overall_dimensions: "外廓尺寸(mm)",
  cargo_dimensions: "货箱内部尺寸(mm)",
  leaf_spring_count: "钢板弹簧片数(片)",
  tire_count: "轮胎数",
  tire_spec: "轮胎规格",
  wheel_track: "轮距(前/后)(mm)",
  wheel_base: "轴距(mm)",
  axle_load_kg: "轴荷(kg)",
  axle_count: "轴数",
  steering_type: "转向形式",
  curb_weight: "整备质量(kg)",
  gross_weight: "总质量(kg)",
  rated_load: "额定载质量(kg)",
  rated_traction_weight: "额定牵引总质量(kg)",
  load_utilization_factor: "载质量利用系数",
  allowed_traction_weight: "准牵引总质量(kg)",
  semi_trailer_weight: "半挂车鞍座最大允许总质量(kg)",
  cab_passenger_count: "驾驶室准乘人数(人)",
  manufacture_date: "车辆制造日期",
  cert_remark: "备注",
});

function _looksLikeEnglishFieldLabel(label, key) {
  const l = String(label || "").trim();
  const k = String(key || "").trim();
  if (!l) return true;
  if (l === k) return true;
  if (/^[a-z0-9_]+$/i.test(l)) return true;
  return false;
}

function labelOf(field) {
  const key = String(field?.key || "").trim();
  const rawLabel = String(field?.label || "").trim();

  if (rawLabel && !_looksLikeEnglishFieldLabel(rawLabel, key)) {
    return rawLabel;
  }

  return FIELD_LABEL_FALLBACK[key] || rawLabel || key || "";
}

function normalizeCompactYmd(val) {
  if (val === null || val === undefined || val === "") return val;
  const s = String(val).trim();
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return val;
}

function formatForView(val, field) {
  if (val === null || val === undefined || val === "") return "-";
  const f = field || {type: "text", options: []};
  const v = f.type === "date" ? normalizeCompactYmd(val) : val;
  const out = formatDynamicValue(v, f);
  return out === "" ? "-" : out;
}

const editData = reactive({});

function _safeStr(v) {
  return String(v ?? "").trim();
}

function _getOcrWords(o, slotKey, wordLabel) {
  return _safeStr(o?.ocr_raw_json?.[slotKey]?.words_result?.[wordLabel]?.words);
}

function _buildDerivedDynamicDataFromOcr(o) {
  const issueDate = _dateOrEmpty(_getOcrWords(o, "idcard_back", "签发日期"));
  const expireDate = _dateOrEmpty(_getOcrWords(o, "idcard_back", "失效日期"));
  const validity = [issueDate, expireDate].filter(Boolean).join(" - ");

  return {
    id_name: _getOcrWords(o, "idcard_front", "姓名"),
    id_gender: _getOcrWords(o, "idcard_front", "性别"),
    id_ethnicity: _getOcrWords(o, "idcard_front", "民族"),
    id_birth_date: _dateOrEmpty(_getOcrWords(o, "idcard_front", "出生")),
    id_address: _getOcrWords(o, "idcard_front", "住址"),
    id_number: _getOcrWords(o, "idcard_front", "公民身份号码"),
    id_issuer: _getOcrWords(o, "idcard_back", "签发机关"),
    id_validity: validity,

    plate_no:
      _getOcrWords(o, "driving_license_main", "号牌号码") || _getOcrWords(o, "driving_license_sub", "号牌号码"),
    owner_name: _getOcrWords(o, "driving_license_main", "所有人"),
    use_nature: _getOcrWords(o, "driving_license_main", "使用性质"),
    vehicle_model: _getOcrWords(o, "driving_license_main", "品牌型号"),
    vin: _getOcrWords(o, "driving_license_main", "车辆识别代号"),
    engine_no: _getOcrWords(o, "driving_license_main", "发动机号码"),
    first_register_date: _dateOrEmpty(_getOcrWords(o, "driving_license_main", "注册日期")),
    approved_passenger_count: _getOcrWords(o, "driving_license_sub", "核定载人数"),
  };
}

function rowDyn(key, label, {type = "", ocrSlot = "", ocrLabel = "", readonly = false} = {}) {
  return {kind: "dynamic", key, label, type, ocrSlot, ocrLabel, readonly};
}

function rowOcr(ocrSlot, ocrLabel, label, {type = ""} = {}) {
  return {kind: "ocr", key: "", label, type, ocrSlot, ocrLabel, readonly: true};
}

const ID_FRONT_COLLAPSED_ROWS = Object.freeze([
  rowDyn("id_name", "姓名", {ocrSlot: "idcard_front", ocrLabel: "姓名"}),
  rowDyn("id_number", "公民身份号码", {ocrSlot: "idcard_front", ocrLabel: "公民身份号码"}),
]);

const ID_FRONT_EXPANDED_ROWS = Object.freeze([
  rowDyn("id_name", "姓名", {ocrSlot: "idcard_front", ocrLabel: "姓名"}),
  rowDyn("id_gender", "性别", {ocrSlot: "idcard_front", ocrLabel: "性别"}),
  rowDyn("id_ethnicity", "民族", {ocrSlot: "idcard_front", ocrLabel: "民族"}),
  rowDyn("id_birth_date", "出生日期", {type: "date", ocrSlot: "idcard_front", ocrLabel: "出生"}),
  rowDyn("id_address", "住址", {ocrSlot: "idcard_front", ocrLabel: "住址"}),
  rowDyn("id_number", "公民身份号码", {ocrSlot: "idcard_front", ocrLabel: "公民身份号码"}),
]);

const ID_BACK_EXPANDED_ROWS = Object.freeze([
  rowDyn("id_issuer", "签发机关", {ocrSlot: "idcard_back", ocrLabel: "签发机关"}),
  rowDyn("id_validity", "有效期限"),
]);

const DL_MAIN_COLLAPSED_ROWS = Object.freeze([
  rowDyn("plate_no", "号牌号码", {ocrSlot: "driving_license_main", ocrLabel: "号牌号码"}),
  rowDyn("owner_name", "所有人", {ocrSlot: "driving_license_main", ocrLabel: "所有人"}),
  rowDyn("use_nature", "使用性质", {ocrSlot: "driving_license_main", ocrLabel: "使用性质"}),
  rowDyn("vehicle_model", "车辆型号", {ocrSlot: "driving_license_main", ocrLabel: "品牌型号"}),
  rowDyn("vin", "车辆识别代号/车架号", {ocrSlot: "driving_license_main", ocrLabel: "车辆识别代号"}),
  rowDyn("engine_no", "发动机号", {ocrSlot: "driving_license_main", ocrLabel: "发动机号码"}),
  rowDyn("first_register_date", "注册日期", {
    type: "date",
    ocrSlot: "driving_license_main",
    ocrLabel: "注册日期",
  }),
]);

const DL_MAIN_EXPANDED_ROWS = Object.freeze([
  rowDyn("plate_no", "号牌号码", {ocrSlot: "driving_license_main", ocrLabel: "号牌号码"}),
  rowDyn("owner_name", "所有人", {ocrSlot: "driving_license_main", ocrLabel: "所有人"}),
  rowDyn("use_nature", "使用性质", {ocrSlot: "driving_license_main", ocrLabel: "使用性质"}),
  rowDyn("vehicle_model", "车辆型号", {ocrSlot: "driving_license_main", ocrLabel: "品牌型号"}),
  rowDyn("vin", "车辆识别代号/车架号", {ocrSlot: "driving_license_main", ocrLabel: "车辆识别代号"}),
  rowDyn("engine_no", "发动机号", {ocrSlot: "driving_license_main", ocrLabel: "发动机号码"}),
  rowDyn("first_register_date", "注册日期", {
    type: "date",
    ocrSlot: "driving_license_main",
    ocrLabel: "注册日期",
  }),
  rowOcr("driving_license_main", "车辆类型", "车辆类型"),
  rowOcr("driving_license_main", "发证日期", "发证日期", {type: "date"}),
  rowOcr("driving_license_main", "发证单位", "发证单位"),
  rowOcr("driving_license_main", "住址", "住址"),
]);

const DL_SUB_COLLAPSED_ROWS = Object.freeze([
  rowDyn("approved_passenger_count", "核定载人数", {
    ocrSlot: "driving_license_sub",
    ocrLabel: "核定载人数",
  }),
]);

const DL_SUB_EXPANDED_ROWS = Object.freeze([
  rowDyn("approved_passenger_count", "核定载人数", {
    ocrSlot: "driving_license_sub",
    ocrLabel: "核定载人数",
  }),
  rowOcr("driving_license_sub", "总质量", "总质量"),
  rowOcr("driving_license_sub", "整备质量", "整备质量"),
  rowOcr("driving_license_sub", "外廓尺寸", "外廓尺寸"),
  rowOcr("driving_license_sub", "燃油类型", "燃油类型"),
  rowOcr("driving_license_sub", "检验记录", "检验记录"),
  rowOcr("driving_license_sub", "档案编号", "档案编号"),
  rowOcr("driving_license_sub", "证芯编号", "证芯编号"),
  rowOcr("driving_license_sub", "核定载质量", "核定载质量"),
  rowOcr("driving_license_sub", "准牵引总质量", "准牵引总质量"),
  rowOcr("driving_license_sub", "备注", "备注"),
]);

function rowKey(row) {
  return row.key || `${row.ocrSlot}:${row.ocrLabel}`;
}

function rowField(row) {
  if (row?.key) {
    const base = meta(row.key);
    return {
      ...base,
      label: row.label || labelOf(base),
      type: row.type || base.type || "text",
    };
  }
  return {
    key: "",
    label: row?.label || "",
    type: row?.type || "text",
    options: [],
  };
}

function getRowValue(row) {
  if (!row) return "";

  if (row.key) {
    const v = editData[row.key];
    if (v !== null && v !== undefined && String(v).trim() !== "") {
      return row.type === "date" ? normalizeCompactYmd(v) : v;
    }
  }

  if (row.ocrSlot && row.ocrLabel) {
    const v = _getOcrWords(order.value, row.ocrSlot, row.ocrLabel);
    if (!v) return "";
    return row.type === "date" ? normalizeCompactYmd(v) : v;
  }

  return "";
}

function viewOfRow(row) {
  return formatForView(getRowValue(row), rowField(row));
}

const canEditPermission = computed(() => {
  if (!order.value) return false;

  if (isPrivileged.value) return true;

  if (isFinanceView.value) return false;

  return isSales.value && order.value.is_finished === false;
});

const canEdit = computed(() => canEditPermission.value && editMode.value);
const canEditMeta = computed(() => canEdit.value && order.value?.is_finished === false);

const canEditRelated = computed(() => {
  if (canEdit.value) return true;
  if (!canEditPermission.value && canFinanceOps.value && financeEditMode.value) return true;
  return false;
});

const canReopen = computed(() => {
  if (!order.value) return false;
  if (order.value.is_finished !== true) return false;
  return isPrivileged.value;
});

function buildSlotMaps(slotImages) {
  const slotKeys = [
    "vehicle_cert",
    "idcard_front",
    "idcard_back",
    "driving_license_main",
    "driving_license_sub",
    "related",
  ];

  const urls = {};
  const items = {};
  for (const k of slotKeys) {
    urls[k] = [];
    items[k] = [];
  }

  const nodes = Array.isArray(slotImages) ? slotImages : [];
  for (const node of nodes) {
    const slotKey = String(node?.slot_key || "").trim();
    if (!slotKey) continue;
    if (!urls[slotKey]) urls[slotKey] = [];
    if (!items[slotKey]) items[slotKey] = [];

    const arr = Array.isArray(node?.images) ? node.images : [];
    for (const img of arr) {
      const url = String(img?.url || "").trim();
      const item = {
        slot_key: slotKey,
        order_image_id: img?.order_image_id ?? null,
        image_file_id: img?.image_file_id ?? null,
        storage_key: String(img?.storage_key || "").trim(),
        md5: String(img?.md5 || img?.image_md5 || "").trim().toLowerCase(),
        etag: String(img?.etag || "").trim(),
        size: img?.size ?? null,
        content_type: String(img?.content_type || "").trim(),
        original_name: String(img?.original_name || "").trim(),
        url,
        created_at: img?.created_at ?? null,
        updated_at: img?.updated_at ?? null,
      };
      items[slotKey].push(item);
      if (url) urls[slotKey].push(url);
    }
  }

  return {urls, items};
}

const imagesBySlot = computed(() => buildSlotMaps(order.value?.slot_images).urls);
const imageItemsBySlot = computed(() => buildSlotMaps(order.value?.slot_images).items);

async function ensureMetaOptionsLoaded() {
  await Promise.all([
    ensureCustomerGroupsLoaded({keyword: customerKeyword.value, pageSize: DEFAULT_PAGE_SIZE}),
    ensureChannelGroupsLoaded({keyword: channelKeyword.value, pageSize: DEFAULT_PAGE_SIZE}),
  ]);
}

async function ensureCustomerOptionPresent(id) {
  const target = Number(id);
  if (!Number.isFinite(target) || target <= 0) return;

  let bucket = getCustomerBucket(customerKeyword.value, DEFAULT_PAGE_SIZE);
  if (!bucket.loaded) {
    await ensureCustomerGroupsLoaded({keyword: customerKeyword.value, pageSize: DEFAULT_PAGE_SIZE});
    bucket = getCustomerBucket(customerKeyword.value, DEFAULT_PAGE_SIZE);
  }

  while (!findOptionById(bucket.items, target) && bucket.hasMore) {
    await loadMoreCustomerGroups({keyword: customerKeyword.value, pageSize: DEFAULT_PAGE_SIZE});
    bucket = getCustomerBucket(customerKeyword.value, DEFAULT_PAGE_SIZE);
  }
}

async function ensureChannelOptionPresent(id) {
  const target = Number(id);
  if (!Number.isFinite(target) || target <= 0) return;

  let bucket = getChannelBucket(channelKeyword.value, DEFAULT_PAGE_SIZE);
  if (!bucket.loaded) {
    await ensureChannelGroupsLoaded({keyword: channelKeyword.value, pageSize: DEFAULT_PAGE_SIZE});
    bucket = getChannelBucket(channelKeyword.value, DEFAULT_PAGE_SIZE);
  }

  while (!findOptionById(bucket.items, target) && bucket.hasMore) {
    await loadMoreChannelGroups({keyword: channelKeyword.value, pageSize: DEFAULT_PAGE_SIZE});
    bucket = getChannelBucket(channelKeyword.value, DEFAULT_PAGE_SIZE);
  }
}

async function ensureCurrentMetaOptionsPresent() {
  await Promise.all([
    ensureCustomerOptionPresent(order.value?.customer_group_id ?? editMeta.customer_group_id),
    ensureChannelOptionPresent(order.value?.channel_group_id ?? editMeta.channel_group_id),
  ]);
}

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

  router.push({path: isFinanceView.value ? "/finance" : "/orders/all"});
}

function fillEditDataFromOrder(o) {
  const dyn = o?.dynamic_data || {};
  const derived = _buildDerivedDynamicDataFromOcr(o);
  const merged = {...derived, ...dyn};

  for (const k of Object.keys(editData)) delete editData[k];
  for (const [k, v] of Object.entries(merged)) editData[k] = v ?? "";

  _fillOrderInfoFromOrder(o);
  _fillMetaFromOrder(o);
}

async function toggleEdit() {
  if (!canEditPermission.value) return;

  if (editMode.value) {
    editMode.value = false;
    if (order.value) fillEditDataFromOrder(order.value);
    return;
  }

  financeEditMode.value = false;
  editMode.value = true;

  if (order.value?.is_finished === false) {
    try {
      await ensureMetaOptionsLoaded();
      await ensureCurrentMetaOptionsPresent();
    } catch (e) {
      console.error(e);
      ElMessage.error("加载客户/渠道选项失败");
      editMode.value = false;
      return;
    }
  }
}

function shouldUseFinanceDetailApi() {
  return isFinanceView.value;
}

async function load({preserveEditDraft = false} = {}) {
  loading.value = true;
  try {
    await ensureMetaOptionsLoaded();

    const resp = shouldUseFinanceDetailApi() ? await getFinanceOrderDetail(orderId) : await getOrder(orderId);
    order.value = resp.data;

    if (!preserveEditDraft) {
      editMode.value = false;
      financeEditMode.value = false;
      fillEditDataFromOrder(order.value);
    } else {
      if (!editMode.value) {
        fillEditDataFromOrder(order.value);
      } else {
        _fillOrderInfoFromOrder(order.value);
        if (!canEditMeta.value) _fillMetaFromOrder(order.value);
      }
    }

    await ensureCurrentMetaOptionsPresent();
  } catch (e) {
    console.error(e);
    ElMessage.error("加载订单详情失败");
  } finally {
    loading.value = false;
  }
}

function _normalizePhone(s) {
  return String(s || "")
    .replace(/\s+/g, "")
    .replace(/-/g, "");
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
  return String(editData?.owner_name || "").trim();
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

  if (canEditMeta.value) {
    if (!editMeta.channel_group_id) {
      ElMessage.warning("请选择渠道");
      return false;
    }
    if (!editMeta.customer_group_id) {
      ElMessage.warning("请选择客户");
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
    const dyn = {...(order.value.dynamic_data || {}), ...editData};

    await updateOrder(orderId, {
      dynamic_data: dyn,
      order_info: _sanitizeOrderInfoPayload(),
      customer_group_id: canEditMeta.value ? Number(editMeta.customer_group_id) : undefined,
      channel_group_id: canEditMeta.value ? Number(editMeta.channel_group_id) : undefined,
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
    await updateOrderStatus(orderId, {is_finished: false});
    ElMessage.success("已退回未完成");
    await load();
  } catch (e) {
    console.error(e);
    ElMessage.error("操作失败");
  } finally {
    saving.value = false;
  }
}

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

async function suggestSwitchToStableOnce() {
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

function _toPositiveIntOrNull(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function _finalizeItemFromExistingImage(it, slotKey) {
  const order_image_id = _toPositiveIntOrNull(it?.order_image_id);
  const image_file_id = _toPositiveIntOrNull(it?.image_file_id);
  const storage_key = String(it?.storage_key || "").trim().replace(/^\/+/, "");
  const md5 = String(it?.md5 || it?.image_md5 || "").trim().toLowerCase();

  if (!order_image_id && !image_file_id && !storage_key) {
    return null;
  }

  const item = {slot_key: slotKey};

  if (order_image_id) item.order_image_id = order_image_id;
  if (image_file_id) item.image_file_id = image_file_id;
  if (storage_key) item.storage_key = storage_key;
  if (md5) item.md5 = md5;

  const etag = String(it?.etag || "").trim();
  if (etag) item.etag = etag;

  if (it?.size != null && !Number.isNaN(Number(it.size))) {
    const n = Number(it.size);
    if (Number.isFinite(n)) item.size = Math.max(0, n);
  }

  const content_type = String(it?.content_type || "").trim();
  if (content_type) item.content_type = content_type;

  const original_name = String(it?.original_name || "").trim();
  if (original_name) item.original_name = original_name;

  const url = String(it?.url || "").trim();
  if (url) item.url = url;

  return item;
}

function _assertFinanceRelatedOrderReadyForUpload() {
  if (!(canFinanceOps.value && !canEditPermission.value)) return;

  if (!order.value) {
    throw new Error("订单不存在");
  }

  if (order.value.is_finished !== true) {
    throw new Error("财务仅可对【已完成】订单编辑备用图");
  }

  if (!order.value.customer_group_id) {
    throw new Error("订单缺少客户，无法保存备用图");
  }

  if (!order.value.channel_group_id) {
    throw new Error("订单缺少渠道，无法保存备用图");
  }
}

async function _uploadOne(slotKey, rawFile) {
  if (canFinanceOps.value && !canEditPermission.value) {
    _assertFinanceRelatedOrderReadyForUpload();

    const resp = await uploadOrderImageProxy({slot_key: slotKey, file: rawFile});
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
    const resp = await uploadOrderImageProxy({slot_key: slotKey, file: rawFile});
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

async function _finalizeSlot(slotKey, items, {clear = false} = {}) {
  if (canFinanceOps.value && !canEditPermission.value) {
    _assertFinanceRelatedOrderReadyForUpload();
    if (slotKey !== "related") {
      throw new Error("财务仅允许编辑备用图");
    }
  }

  await finalizeOrderUpload({
    order_id: orderId,
    images: items,
    clear_slots: clear ? [slotKey] : [],
  });

  await load({preserveEditDraft: true});
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
    if (!meta?.md5) throw new Error("upload md5 missing");

    await _finalizeSlot(slotKey, [meta]);
  } catch (e) {
    if (!(canFinanceOps.value && !canEditPermission.value) && uploadMode.value === "smart" && isLikelyNetworkBlocked(e)) {
      const switched = await suggestSwitchToStableOnce(e);
      if (switched) {
        try {
          const meta = await _uploadOne(slotKey, raw);
          if (!meta?.storage_key) throw new Error("upload meta invalid");
          if (!meta?.md5) throw new Error("upload md5 missing");
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
    const rawExisting = imageItemsBySlot.value.related || [];
    const existing = rawExisting
      .map((it) => _finalizeItemFromExistingImage(it, "related"))
      .filter(Boolean);

    if (rawExisting.length > 0 && existing.length === 0) {
      console.warn("[related] existing images exist but none can be preserved in finalize payload", {
        rawExisting,
      });
    }

    const metas = [];
    for (const f of files) {
      const meta = await _uploadOne("related", f);
      if (!meta?.storage_key) throw new Error("upload meta invalid");
      if (!meta?.md5) throw new Error("upload md5 missing");
      metas.push(meta);
    }

    if (metas.length || existing.length) {
      await _finalizeSlot("related", [...existing, ...metas]);
    }
    relatedRetryOnce.value = false;
  } catch (e) {
    if (!(canFinanceOps.value && !canEditPermission.value) && uploadMode.value === "smart" && isLikelyNetworkBlocked(e) && !relatedRetryOnce.value) {
      const switched = await suggestSwitchToStableOnce(e);
      if (switched) {
        relatedRetryOnce.value = true;
        try {
          const rawExisting = imageItemsBySlot.value.related || [];
          const existing = rawExisting
            .map((it) => _finalizeItemFromExistingImage(it, "related"))
            .filter(Boolean);

          const metas = [];
          for (const f of files) {
            const meta = await _uploadOne("related", f);
            if (!meta?.storage_key) throw new Error("upload meta invalid");
            if (!meta?.md5) throw new Error("upload md5 missing");
            metas.push(meta);
          }

          if (metas.length || existing.length) {
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

    if (relatedPendingFiles.value.length) {
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
      await _finalizeSlot("related", [], {clear: true});
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
    await _finalizeSlot("related", [], {clear: true});
  } catch (e) {
    console.error(e);
    ElMessage.error(_errMsg(e) || "清空失败");
  } finally {
    slotUploading.related = false;
  }
}

onMounted(async () => {
  await loadConfig("order");
  await load();
});

const FieldValue = defineComponent({
  name: "FieldValue",
  props: {
    modelValue: {type: [String, Number, Date], default: ""},
    field: {type: Object, required: true},
    editable: {type: Boolean, default: false},
  },
  emits: ["update:modelValue"],
  setup(props, {emit}) {
    const ElInput = resolveComponent("el-input");
    const ElSelect = resolveComponent("el-select");
    const ElOption = resolveComponent("el-option");
    const ElDatePicker = resolveComponent("el-date-picker");

    const onUpdate = (v) => emit("update:modelValue", v);

    return () => {
      const f = props.field || {type: "text", options: []};
      const raw = props.modelValue ?? "";
      const view = formatForView(raw, f);

      if (!props.editable) {
        return h("span", {class: "plain-value", title: view}, view);
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
              return h(ElOption, {key: String(value), label, value});
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
    modelValue: {type: [String, Number, null], default: ""},
    type: {type: String, default: "text"},
    editable: {type: Boolean, default: false},
    min: {type: Number, default: undefined},
    max: {type: Number, default: undefined},
  },
  emits: ["update:modelValue"],
  setup(props, {emit}) {
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
      {immediate: true}
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
        return h("span", {class: "plain-value", title: view}, view);
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
</script>

<style scoped>
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
