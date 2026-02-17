<!-- src/views/orders/OrderCreate.vue -->
<template>
  <div class="order-detail">
    <div class="detail-header">
      <h2>手动创建订单</h2>

      <div class="header-actions">
        <!-- ✅ 上传模式：与导入/详情页统一同一 key -->
        <div class="upload-mode">
          <span class="upload-mode-label">上传模式</span>
          <el-select v-model="uploadMode" size="small" style="width: 150px" @change="persistUploadMode">
            <el-option label="智能（推荐）" value="smart" />
            <el-option label="直传（更快）" value="direct" />
            <el-option label="稳定（兼容VPN）" value="stable" />
          </el-select>
        </div>

        <el-button size="small" @click="goBack">返回</el-button>

        <!-- ✅ 客户/渠道必选：未选直接禁用，点击保存也会 Toast 阻断 -->
        <el-button
          size="small"
          type="primary"
          :loading="saving"
          :disabled="uploadingCount > 0 || !canSubmitCreate"
          @click="save"
        >
          保存
        </el-button>
      </div>
    </div>

    <div class="page-body">
      <!-- 上传中的明显提示条（复刻导入页） -->
      <el-alert
        v-if="uploadingCount > 0"
        class="upload-alert"
        type="warning"
        :closable="false"
        show-icon
        title="正在上传"
        :description="`正在上传 ${uploadingCount} 个文件…（全部上传完成后才能保存）`"
      />

      <!-- ① 渠道、客户（宽度对齐字段区，不延伸到图片区） -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <div class="section-header">
            <div class="section-title">渠道、客户</div>
          </div>
        </template>

        <div class="meta-narrow">
          <div class="kv-grid kv-grid-2">
            <div class="kv-item">
              <div class="kv-label">渠道</div>
              <div class="kv-value">
                <el-select
                  v-model="editMeta.channel_group_id"
                  filterable
                  clearable
                  placeholder="请选择渠道（必选）"
                  class="fv fv-select"
                  :loading="channelLoading"
                  :disabled="channelLoading"
                >
                  <el-option
                    v-for="op in channelOptions"
                    :key="String(op.id)"
                    :label="formatGroupLabel(op)"
                    :value="op.id"
                  />
                </el-select>
              </div>
            </div>

            <div class="kv-item">
              <div class="kv-label">客户</div>
              <div class="kv-value">
                <el-select
                  v-model="editMeta.customer_group_id"
                  filterable
                  clearable
                  placeholder="请选择客户（必选）"
                  class="fv fv-select"
                  :loading="customerLoading"
                  :disabled="customerLoading"
                >
                  <el-option
                    v-for="op in customerOptions"
                    :key="String(op.id)"
                    :label="formatGroupLabel(op)"
                    :value="op.id"
                  />
                </el-select>
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- ✅ ①.5 订单信息（order_info） -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <div class="section-header">
            <div class="section-title">订单信息</div>
          </div>
        </template>

        <!-- Row1：保险到期日｜车主电话 -->
        <div class="info-block">
          <div class="kv-grid kv-grid-2 info-grid">
            <div class="kv-item">
              <div class="kv-label">保险到期日</div>
              <div class="kv-value">
                <InfoValue v-model="editOrderInfo.insurance_expire_date" type="date" :editable="true" />
              </div>
            </div>

            <div class="kv-item">
              <div class="kv-label">车主电话</div>
              <div class="kv-value">
                <InfoValue v-model="editOrderInfo.owner_phone" type="text" :editable="true" />
              </div>
            </div>
          </div>

          <!-- Row1：商业/交强/车船税/非车（4个一行，仅正数） -->
          <div class="kv-grid kv-grid-4 info-grid info-grid-compact">
            <div class="kv-item">
              <div class="kv-label">商业金额</div>
              <div class="kv-value">
                <InfoValue v-model="editOrderInfo.commercial_amount" type="money" :editable="true" :min="0" />
              </div>
            </div>

            <div class="kv-item">
              <div class="kv-label">交强金额</div>
              <div class="kv-value">
                <InfoValue v-model="editOrderInfo.compulsory_amount" type="money" :editable="true" :min="0" />
              </div>
            </div>

            <div class="kv-item">
              <div class="kv-label">车船税金额</div>
              <div class="kv-value">
                <InfoValue v-model="editOrderInfo.vehicle_tax_amount" type="money" :editable="true" :min="0" />
              </div>
            </div>

            <div class="kv-item">
              <div class="kv-label">非车金额</div>
              <div class="kv-value">
                <InfoValue v-model="editOrderInfo.non_vehicle_amount" type="money" :editable="true" :min="0" />
              </div>
            </div>
          </div>

          <!-- 保费金额=四项和（只读） -->
          <div class="kv-grid kv-grid-2 info-grid">
            <div class="kv-item">
              <div class="kv-label">保费金额</div>
              <div class="kv-value">
                <InfoValue v-model="editOrderInfo.premium_total" type="money" :editable="false" />
              </div>
            </div>
          </div>
        </div>

        <!-- Row2：渠道点位（4个百分比+出单奖励金额，允许负数）；渠道合计只读 -->
        <div class="split-title">渠道</div>
        <div class="kv-grid kv-grid-5 info-grid info-grid-compact">
          <div class="kv-item">
            <div class="kv-label">商业点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.channel_commercial_point" type="point" :editable="true" />
            </div>
          </div>
          <div class="kv-item">
            <div class="kv-label">交强点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.channel_compulsory_point" type="point" :editable="true" />
            </div>
          </div>
          <div class="kv-item">
            <div class="kv-label">车船税点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.channel_vehicle_tax_point" type="point" :editable="true" />
            </div>
          </div>
          <div class="kv-item">
            <div class="kv-label">非车点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.channel_non_vehicle_point" type="point" :editable="true" />
            </div>
          </div>
          <div class="kv-item">
            <div class="kv-label">出单奖励</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.channel_reward" type="money" :editable="true" />
            </div>
          </div>
        </div>

        <div class="kv-grid kv-grid-2 info-grid">
          <div class="kv-item">
            <div class="kv-label">渠道合计</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.channel_total" type="money" :editable="false" />
            </div>
          </div>
        </div>

        <!-- Row3：客户点位（逻辑同渠道，允许负数）；客户合计只读 -->
        <div class="split-title">客户</div>
        <div class="kv-grid kv-grid-5 info-grid info-grid-compact">
          <div class="kv-item">
            <div class="kv-label">商业点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.customer_commercial_point" type="point" :editable="true" />
            </div>
          </div>
          <div class="kv-item">
            <div class="kv-label">交强点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.customer_compulsory_point" type="point" :editable="true" />
            </div>
          </div>
          <div class="kv-item">
            <div class="kv-label">车船税点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.customer_vehicle_tax_point" type="point" :editable="true" />
            </div>
          </div>
          <div class="kv-item">
            <div class="kv-label">非车点位%</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.customer_non_vehicle_point" type="point" :editable="true" />
            </div>
          </div>
          <div class="kv-item">
            <div class="kv-label">出单奖励</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.customer_reward" type="money" :editable="true" />
            </div>
          </div>
        </div>

        <div class="kv-grid kv-grid-2 info-grid">
          <div class="kv-item">
            <div class="kv-label">客户合计</div>
            <div class="kv-value">
              <InfoValue v-model="editOrderInfo.customer_total" type="money" :editable="false" />
            </div>
          </div>
        </div>

        <!-- Row4：利润=渠道合计-客户合计（只读） -->
        <div class="kv-grid kv-grid-2 info-grid">
          <div class="kv-item">
            <div class="kv-label">利润</div>
            <div class="kv-value">
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
          <!-- 字段区 -->
          <div class="left">
            <!-- 默认字段 -->
            <div v-if="!certExpanded" class="kv-grid kv-grid-2">
              <div class="kv-item">
                <div class="kv-label">车辆型号</div>
                <div class="kv-value">
                  <FieldValue v-model="editData.vehicle_model" :field="meta('vehicle_model')" :editable="true" />
                </div>
              </div>

              <div class="kv-item">
                <div class="kv-label">车辆识别代号/车架号</div>
                <div class="kv-value">
                  <FieldValue v-model="editData.vin" :field="meta('vin')" :editable="true" />
                </div>
              </div>

              <div class="kv-item">
                <div class="kv-label">发动机号</div>
                <div class="kv-value">
                  <FieldValue v-model="editData.engine_no" :field="meta('engine_no')" :editable="true" />
                </div>
              </div>

              <div class="kv-item">
                <div class="kv-label">额定载客(人 )</div>
                <div class="kv-value">
                  <FieldValue
                    v-model="editData.approved_passenger_count"
                    :field="meta('approved_passenger_count')"
                    :editable="true"
                  />
                </div>
              </div>
            </div>

            <!-- ✅ 合格证全字段：统一复用 VehicleCertTable -->
            <div v-else>
              <VehicleCertTable :data="editData" :readonly="false" />
            </div>
          </div>

          <!-- 图片区（右侧：合格证） -->
          <div class="right">
            <SlotUploadCard slot-key="vehicle_cert" label="合格证" :multiple="false" />
          </div>
        </div>
      </el-card>

      <!-- ③ 身份证 -->
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
          <!-- 正面 -->
          <div class="sub-block">
            <div class="sub-title">身份证正面</div>
            <div class="two-col">
              <div class="left">
                <div v-if="!idExpanded" class="kv-grid kv-grid-2">
                  <div class="kv-item">
                    <div class="kv-label">姓名</div>
                    <div class="kv-value">
                      <FieldValue v-model="editData.id_name" :field="meta('id_name')" :editable="true" />
                    </div>
                  </div>

                  <div class="kv-item">
                    <div class="kv-label">公民身份号码</div>
                    <div class="kv-value">
                      <FieldValue v-model="editData.id_number" :field="meta('id_number')" :editable="true" />
                    </div>
                  </div>
                </div>

                <div v-else class="kv-grid kv-grid-2">
                  <template v-for="f in idFrontFields" :key="f.key">
                    <div class="kv-item">
                      <div class="kv-label">{{ labelOf(f) }}</div>
                      <div class="kv-value">
                        <FieldValue v-model="editData[f.key]" :field="f" :editable="true" />
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <div class="right">
                <SlotUploadCard slot-key="idcard_front" label="身份证正面" :multiple="false" />
              </div>
            </div>
          </div>

          <!-- 背面 -->
          <div class="sub-block">
            <div class="sub-title">身份证背面</div>
            <div class="two-col">
              <div class="left">
                <div v-if="idExpanded" class="kv-grid kv-grid-2">
                  <template v-for="f in idBackFields" :key="f.key">
                    <div class="kv-item">
                      <div class="kv-label">{{ labelOf(f) }}</div>
                      <div class="kv-value">
                        <FieldValue v-model="editData[f.key]" :field="f" :editable="true" />
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <div class="right">
                <SlotUploadCard slot-key="idcard_back" label="身份证背面" :multiple="false" />
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- ④ 行驶证 -->
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
          <!-- 行驶证 -->
          <div class="sub-block">
            <div class="sub-title">行驶证</div>
            <div class="two-col">
              <div class="left">
                <!-- ✅ 默认字段：与 OrderDetail.vue 对齐（动态 key 映射 + 条件渲染） -->
                <div v-if="!dlExpanded" class="kv-grid kv-grid-2">
                  <div v-if="dlKey('plate')" class="kv-item">
                    <div class="kv-label">号牌号码</div>
                    <div class="kv-value">
                      <FieldValue v-model="editData[dlKey('plate')]" :field="meta(dlKey('plate'))" :editable="true" />
                    </div>
                  </div>

                  <div v-if="dlKey('owner')" class="kv-item">
                    <div class="kv-label">所有人</div>
                    <div class="kv-value">
                      <FieldValue v-model="editData[dlKey('owner')]" :field="meta(dlKey('owner'))" :editable="true" />
                    </div>
                  </div>

                  <div v-if="dlKey('use_nature')" class="kv-item">
                    <div class="kv-label">使用性质</div>
                    <div class="kv-value">
                      <FieldValue
                        v-model="editData[dlKey('use_nature')]"
                        :field="meta(dlKey('use_nature'))"
                        :editable="true"
                      />
                    </div>
                  </div>

                  <div v-if="dlKey('brand_model')" class="kv-item">
                    <div class="kv-label">品牌型号</div>
                    <div class="kv-value">
                      <FieldValue
                        v-model="editData[dlKey('brand_model')]"
                        :field="meta(dlKey('brand_model'))"
                        :editable="true"
                      />
                    </div>
                  </div>

                  <div v-if="dlKey('vin')" class="kv-item">
                    <div class="kv-label">车辆识别代码</div>
                    <div class="kv-value">
                      <FieldValue v-model="editData[dlKey('vin')]" :field="meta(dlKey('vin'))" :editable="true" />
                    </div>
                  </div>

                  <div v-if="dlKey('engine')" class="kv-item">
                    <div class="kv-label">发动机号码</div>
                    <div class="kv-value">
                      <FieldValue v-model="editData[dlKey('engine')]" :field="meta(dlKey('engine'))" :editable="true" />
                    </div>
                  </div>

                  <div v-if="dlKey('register_date')" class="kv-item">
                    <div class="kv-label">注册日期</div>
                    <div class="kv-value">
                      <FieldValue
                        v-model="editData[dlKey('register_date')]"
                        :field="meta(dlKey('register_date'))"
                        :editable="true"
                      />
                    </div>
                  </div>
                </div>

                <!-- 全字段 -->
                <div v-else class="kv-grid kv-grid-2">
                  <template v-for="f in dlMainFields" :key="f.key">
                    <div class="kv-item">
                      <div class="kv-label">{{ labelOf(f) }}</div>
                      <div class="kv-value">
                        <FieldValue v-model="editData[f.key]" :field="f" :editable="true" />
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <div class="right">
                <SlotUploadCard slot-key="driving_license_main" label="行驶证主页" :multiple="false" />
              </div>
            </div>
          </div>

          <!-- 行驶证副件 -->
          <div class="sub-block">
            <div class="sub-title">行驶证副件</div>
            <div class="two-col">
              <div class="left">
                <!-- ✅ 默认字段：与 OrderDetail.vue 对齐（核定载人数） -->
                <div v-if="!dlExpanded" class="kv-grid kv-grid-2">
                  <div v-if="dlAttachPassengerKey" class="kv-item">
                    <div class="kv-label">核定载人数</div>
                    <div class="kv-value">
                      <FieldValue
                        v-model="editData[dlAttachPassengerKey]"
                        :field="meta(dlAttachPassengerKey)"
                        :editable="true"
                      />
                    </div>
                  </div>
                </div>

                <!-- 全字段 -->
                <div v-else class="kv-grid kv-grid-2">
                  <template v-for="f in dlAttachFields" :key="f.key">
                    <div class="kv-item">
                      <div class="kv-label">{{ labelOf(f) }}</div>
                      <div class="kv-value">
                        <FieldValue v-model="editData[f.key]" :field="f" :editable="true" />
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <div class="right">
                <SlotUploadCard slot-key="driving_license_sub" label="行驶证副页" :multiple="false" />
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- ⑤ 相关图片（多张） -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <div class="section-header">
            <div class="section-title">相关图片(多张)</div>

            <div class="section-actions">
              <el-button size="small" @click="clearSlot('related')" :disabled="saving || uploadingCount > 0">
                清空图片
              </el-button>
            </div>
          </div>
        </template>

        <div class="slot-card">
          <div class="slot-head">
            <div class="slot-name">相关图片(多张)</div>
            <div class="slot-tip">
              <el-tag size="small" type="info" effect="plain">可多张</el-tag>
            </div>
          </div>

          <el-upload
            drag
            :auto-upload="false"
            :multiple="true"
            :limit="20"
            :file-list="slotFiles.related"
            :on-change="(file) => onFileChange('related', file)"
            :on-remove="(file) => onFileRemove('related', file)"
            accept="image/*"
            class="upload-box upload-multi"
          >
            <div class="upload-empty">
              <div class="empty-center">
                <div class="empty-title">拖拽图片到此处</div>
                <div class="empty-sub">或点击选择文件（可多张）</div>
              </div>
            </div>
          </el-upload>

          <div v-if="(slotFiles.related || []).length" class="preview-wall">
            <div v-for="f in slotFiles.related" :key="f.uid" class="preview-item">
              <el-image
                v-if="f.url"
                :src="f.url"
                :preview-src-list="previewUrls('related')"
                fit="cover"
                class="preview-img"
              />
              <div v-else class="preview-img preview-empty"></div>

              <div class="preview-meta">
                <div class="preview-name" :title="f.name">{{ f.name }}</div>

                <div class="preview-status">
                  <el-tag v-if="uploadState[f.uid]?.status === 'uploading'" size="small" type="warning">上传中</el-tag>
                  <el-tag v-else-if="uploadState[f.uid]?.status === 'done'" size="small" type="success">已就绪</el-tag>
                  <el-tag v-else-if="uploadState[f.uid]?.status === 'error'" size="small" type="danger">失败</el-tag>
                  <el-tag v-else size="small" type="info" effect="plain">待上传</el-tag>
                </div>
              </div>
            </div>
          </div>

          <div class="slot-foot">
            <span v-if="slotUploadedCount('related') > 0">已就绪：{{ slotUploadedCount('related') }} 张</span>
            <span v-else class="muted">未上传</span>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onBeforeUnmount, onMounted, reactive, ref, resolveComponent, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox, ElNotification } from "element-plus";
import { CaretBottom, CaretTop } from "@element-plus/icons-vue";

import VehicleCertTable from "./VehicleCertTable.vue";

import http from "../../api/http";
import { createOrderDraft, finalizeOrderUpload, uploadOrderImageProxy } from "../../api/orders";
import { useOrderFieldConfig } from "../../composables/useOrderFieldConfig";
import { formatDynamicValue } from "../../utils/fieldFormat";
import { uploadOrReuseByMd5 } from "../../utils/bosUpload";
import { preprocessImageForUpload } from "../../utils/imagePreprocess";

const router = useRouter();
const route = useRoute();

const saving = ref(false);

const certExpanded = ref(false);
const idExpanded = ref(false);
const dlExpanded = ref(false);

/** ====================== 上传模式（与导入/详情页统一） ====================== */
const UPLOAD_MODE_KEY = "order_import_upload_mode";
const uploadMode = ref("smart");

function loadUploadMode() {
  const v = localStorage.getItem(UPLOAD_MODE_KEY);
  if (v === "smart" || v === "direct" || v === "stable") uploadMode.value = v;
}

function persistUploadMode() {
  try {
    localStorage.setItem(UPLOAD_MODE_KEY, uploadMode.value);
  } catch {}
}

loadUploadMode();

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
    m.includes("hint=浏览器请求可能走了本机代理") ||
    m.includes("127.0.0.1:7890")
  );
}

/** ✅ 本轮修复：智能模式的“切稳定模式”提示只弹一次，避免多文件失败时刷屏 */
let _stableSuggestShown = false;

async function suggestSwitchToStableOnce() {
  if (_stableSuggestShown) return false;
  _stableSuggestShown = true;

  try {
    await ElMessageBox.confirm(
      `上传被当前网络环境拦截（常见于 VPN/代理/公司网关）。\n\n建议切换到【稳定模式上传】继续，无需任何设置。`,
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
    persistUploadMode();
    return true;
  } catch {
    return false;
  }
}

/** ====================== 回退逻辑（带 from，支持 encode） ====================== */
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
  router.push({ path: "/orders/all" });
}

/** ====================== 渠道/客户 ====================== */
const channelOptions = ref([]);
const customerOptions = ref([]);
const channelLoading = ref(false);
const customerLoading = ref(false);

const editMeta = reactive({
  channel_group_id: null,
  customer_group_id: null,
});

// ✅ 客户/渠道必选（用于按钮禁用 + save 内阻断）
const canSubmitCreate = computed(() => {
  return Boolean(editMeta.customer_group_id) && Boolean(editMeta.channel_group_id) && uploadingCount.value === 0;
});

/**
 * ✅ 下拉展示：同时展示【代码】【名称】，并让 filterable 的模糊搜索同时命中两者
 * 兼容后端字段：group_code/code/... 以及 group_name/name/...
 */
function _pickFirst(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== null && v !== undefined && String(v).trim() !== "") return v;
  }
  return "";
}

function formatGroupLabel(op) {
  const code = _pickFirst(op, ["channel_code", "customer_code", "group_code", "code", "groupCode", "group_code_str", "groupCodeStr"]);
  const name = _pickFirst(op, ["channel_name", "customer_name", "group_name", "name", "groupName"]);
  const id = op?.id !== null && op?.id !== undefined ? String(op.id) : "";

  if (code && name) return `${code} - ${name}`;
  if (name) return String(name);
  if (code) return String(code);
  return id || "-";
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

/** ====================== 字段配置（dynamic_data） ====================== */
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

// 仅在本页面做 YYYYMMDD → YYYY-MM-DD
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

const editData = reactive({});

// 展开字段集合（按 seed 的分组）
const dlMainGroup = computed(() => (groups.value || []).find((g) => g.group_key === "driving_license"));
const dlAttachGroup = computed(() => (groups.value || []).find((g) => g.group_key === "driving_attach"));

function groupFields(g) {
  if (!g) return [];
  const keys = (g.fields || []).map((x) => x.field_name).filter(Boolean);
  return keys.map((k) => meta(k));
}

const ID_FRONT_KEYS = Object.freeze(["id_name", "id_gender", "id_ethnicity", "id_birth_date", "id_address", "id_number"]);
const ID_BACK_KEYS = Object.freeze(["id_issuer", "id_validity"]);

const idFrontFields = computed(() => ID_FRONT_KEYS.map((k) => meta(k)));
const idBackFields = computed(() => ID_BACK_KEYS.map((k) => meta(k)));

const dlMainFields = computed(() => groupFields(dlMainGroup.value));
const dlAttachFields = computed(() => groupFields(dlAttachGroup.value));

/** ====================== ✅ 行驶证字段：与 OrderDetail.vue 对齐（默认展示 key 映射） ====================== */
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
      preferKeys: ["dl_engine_no", "engine_no"],
      keyIncludes: ["engine"],
      labelIncludes: ["发动机"],
    }),
    register_date: _pickKeyFromFields(fields, {
      preferKeys: ["dl_register_date", "register_date"],
      keyIncludes: ["register", "reg_date"],
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

/** ====================== ✅ 订单信息（order_info） ====================== */
function _numOrZero(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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

const editOrderInfo = reactive({
  insurance_expire_date: "",
  owner_phone: "",

  commercial_amount: 0,
  compulsory_amount: 0,
  vehicle_tax_amount: 0,
  non_vehicle_amount: 0,
  premium_total: 0,

  channel_commercial_point: 0,
  channel_compulsory_point: 0,
  channel_vehicle_tax_point: 0,
  channel_non_vehicle_point: 0,
  channel_reward: 0,
  channel_total: 0,

  customer_commercial_point: 0,
  customer_compulsory_point: 0,
  customer_vehicle_tax_point: 0,
  customer_non_vehicle_point: 0,
  customer_reward: 0,
  customer_total: 0,

  profit: 0,
});

// ✅ 前端派生计算：保费合计 / 渠道合计 / 客户合计 / 利润
function recalcOrderInfoDerived() {
  const commercial = Math.max(0, _numOrZero(editOrderInfo.commercial_amount));
  const compulsory = Math.max(0, _numOrZero(editOrderInfo.compulsory_amount));
  const vehicleTax = Math.max(0, _numOrZero(editOrderInfo.vehicle_tax_amount));
  const nonVehicle = Math.max(0, _numOrZero(editOrderInfo.non_vehicle_amount));

  editOrderInfo.commercial_amount = commercial;
  editOrderInfo.compulsory_amount = compulsory;
  editOrderInfo.vehicle_tax_amount = vehicleTax;
  editOrderInfo.non_vehicle_amount = nonVehicle;

  const premiumTotal = commercial + compulsory + vehicleTax + nonVehicle;

  const chCommercialPoint = _numOrZero(editOrderInfo.channel_commercial_point);
  const chCompulsoryPoint = _numOrZero(editOrderInfo.channel_compulsory_point);
  const chVehicleTaxPoint = _numOrZero(editOrderInfo.channel_vehicle_tax_point);
  const chNonVehiclePoint = _numOrZero(editOrderInfo.channel_non_vehicle_point);
  const chReward = _numOrZero(editOrderInfo.channel_reward);

  const cuCommercialPoint = _numOrZero(editOrderInfo.customer_commercial_point);
  const cuCompulsoryPoint = _numOrZero(editOrderInfo.customer_compulsory_point);
  const cuVehicleTaxPoint = _numOrZero(editOrderInfo.customer_vehicle_tax_point);
  const cuNonVehiclePoint = _numOrZero(editOrderInfo.customer_non_vehicle_point);
  const cuReward = _numOrZero(editOrderInfo.customer_reward);

  const channelTotal =
    commercial * (chCommercialPoint / 100) +
    compulsory * (chCompulsoryPoint / 100) +
    vehicleTax * (chVehicleTaxPoint / 100) +
    nonVehicle * (chNonVehiclePoint / 100) +
    chReward;

  const customerTotal =
    commercial * (cuCommercialPoint / 100) +
    compulsory * (cuCompulsoryPoint / 100) +
    vehicleTax * (cuVehicleTaxPoint / 100) +
    nonVehicle * (cuNonVehiclePoint / 100) +
    cuReward;

  editOrderInfo.premium_total = premiumTotal;
  editOrderInfo.channel_total = channelTotal;
  editOrderInfo.customer_total = customerTotal;
  editOrderInfo.profit = channelTotal - customerTotal;
}

watch(
  () => [
    editOrderInfo.commercial_amount,
    editOrderInfo.compulsory_amount,
    editOrderInfo.vehicle_tax_amount,
    editOrderInfo.non_vehicle_amount,

    editOrderInfo.channel_commercial_point,
    editOrderInfo.channel_compulsory_point,
    editOrderInfo.channel_vehicle_tax_point,
    editOrderInfo.channel_non_vehicle_point,
    editOrderInfo.channel_reward,

    editOrderInfo.customer_commercial_point,
    editOrderInfo.customer_compulsory_point,
    editOrderInfo.customer_vehicle_tax_point,
    editOrderInfo.customer_non_vehicle_point,
    editOrderInfo.customer_reward,
  ],
  () => recalcOrderInfoDerived()
);

function _sanitizeOrderInfoPayload() {
  return {
    insurance_expire_date: editOrderInfo.insurance_expire_date ? _dateOrEmpty(editOrderInfo.insurance_expire_date) : null,
    owner_phone: editOrderInfo.owner_phone ? _trimOrEmpty(editOrderInfo.owner_phone) : null,

    commercial_amount: _numOrZero(editOrderInfo.commercial_amount),
    compulsory_amount: _numOrZero(editOrderInfo.compulsory_amount),
    vehicle_tax_amount: _numOrZero(editOrderInfo.vehicle_tax_amount),
    non_vehicle_amount: _numOrZero(editOrderInfo.non_vehicle_amount),
    premium_total: _numOrZero(editOrderInfo.premium_total),

    channel_commercial_point: _numOrZero(editOrderInfo.channel_commercial_point),
    channel_compulsory_point: _numOrZero(editOrderInfo.channel_compulsory_point),
    channel_vehicle_tax_point: _numOrZero(editOrderInfo.channel_vehicle_tax_point),
    channel_non_vehicle_point: _numOrZero(editOrderInfo.channel_non_vehicle_point),
    channel_reward: _numOrZero(editOrderInfo.channel_reward),
    channel_total: _numOrZero(editOrderInfo.channel_total),

    customer_commercial_point: _numOrZero(editOrderInfo.customer_commercial_point),
    customer_compulsory_point: _numOrZero(editOrderInfo.customer_compulsory_point),
    customer_vehicle_tax_point: _numOrZero(editOrderInfo.customer_vehicle_tax_point),
    customer_non_vehicle_point: _numOrZero(editOrderInfo.customer_non_vehicle_point),
    customer_reward: _numOrZero(editOrderInfo.customer_reward),
    customer_total: _numOrZero(editOrderInfo.customer_total),

    profit: _numOrZero(editOrderInfo.profit),
  };
}

/** ====================== ✅ 卡槽上传 ====================== */
const IMAGE_SLOTS = [
  { key: "vehicle_cert", label: "合格证", multiple: false },
  { key: "idcard_front", label: "身份证正面", multiple: false },
  { key: "idcard_back", label: "身份证背面", multiple: false },
  { key: "driving_license_main", label: "行驶证主页", multiple: false },
  { key: "driving_license_sub", label: "行驶证副页", multiple: false },
  { key: "related", label: "相关图片(多张)", multiple: true },
];

const slotFiles = reactive(
  IMAGE_SLOTS.reduce((acc, s) => {
    acc[s.key] = [];
    return acc;
  }, {})
);

// uid -> uploaded meta（用于 finalize）
const uploadedMap = reactive({});
// uid -> {status:'uploading'|'done'|'error', msg?}
const uploadState = reactive({});
const uploadingCount = ref(0);

// 本地预览 URL 记录（用于 revoke）
const localPreviewUrlMap = reactive({});

/** ====================== STS 缓存（直传用） ====================== */
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
  if (!data?.accessKeyId || !data?.secretAccessKey || !data?.sessionToken) throw new Error("bos-sts response invalid");

  cachedSts = data;
  bosHost.value = data.bosHost || "";
  cachedStsExpireAt = _parseExpireTs(data.expiration) || now + 10 * 60 * 1000;
  return cachedSts;
}

function isMultipleSlot(slotKey) {
  const s = IMAGE_SLOTS.find((x) => x.key === slotKey);
  return !!s?.multiple;
}

function firstFile(slotKey) {
  const list = slotFiles[slotKey] || [];
  return list.length ? list[0] : null;
}

function _ensureLocalPreview(file) {
  const raw = file?.raw;
  if (!raw) return;
  if (!file.url) {
    const u = URL.createObjectURL(raw);
    file.url = u;
    localPreviewUrlMap[file.uid] = u;
  }
}

function _replaceFileRawAndPreview(fileObj, newRaw) {
  if (!fileObj || !newRaw) return;

  const uid = fileObj.uid;
  const oldUrl = uid ? localPreviewUrlMap[uid] : fileObj.url;
  if (oldUrl) {
    try {
      URL.revokeObjectURL(oldUrl);
    } catch {}
    if (uid) delete localPreviewUrlMap[uid];
  }

  const u = URL.createObjectURL(newRaw);
  fileObj.raw = newRaw;
  fileObj.url = u;
  if (uid) localPreviewUrlMap[uid] = u;
}

function clearSlot(slotKey) {
  const list = slotFiles[slotKey] || [];
  for (const f of list) {
    const uid = f?.uid;
    if (!uid) continue;

    if (uploadedMap[uid]) delete uploadedMap[uid];
    if (uploadState[uid]) delete uploadState[uid];

    const u = localPreviewUrlMap[uid];
    if (u) {
      try {
        URL.revokeObjectURL(u);
      } catch {}
      delete localPreviewUrlMap[uid];
    }
  }
  slotFiles[slotKey] = [];
}

function onFileChange(slotKey, file) {
  // 单图槽：替换旧图
  if (!isMultipleSlot(slotKey)) {
    clearSlot(slotKey);
    _ensureLocalPreview(file);
    slotFiles[slotKey] = [file];

    startUpload(slotKey, file).catch((e) => {
      console.error(e);
      ElNotification.error({
        title: "上传失败",
        message: _errMsg(e) || "unknown error",
        duration: 5000,
      });
    });
    return;
  }

  const list = slotFiles[slotKey] || [];
  if (!list.find((x) => x.uid === file.uid)) list.push(file);
  slotFiles[slotKey] = list;

  _ensureLocalPreview(file);

  startUpload(slotKey, file).catch((e) => {
    console.error(e);
    ElNotification.error({
      title: "上传失败",
      message: _errMsg(e) || "unknown error",
      duration: 5000,
    });
  });
}

function onFileRemove(slotKey, file) {
  const list = slotFiles[slotKey] || [];
  slotFiles[slotKey] = list.filter((x) => x.uid !== file.uid);

  const uid = file?.uid;
  if (uid && uploadedMap[uid]) delete uploadedMap[uid];
  if (uid && uploadState[uid]) delete uploadState[uid];

  const u = localPreviewUrlMap[uid];
  if (u) {
    try {
      URL.revokeObjectURL(u);
    } catch {}
    delete localPreviewUrlMap[uid];
  }
}

async function _preprocessForStable(slotKey, file, raw0) {
  let raw = raw0;
  try {
    const pre = await preprocessImageForUpload({ file: raw0, slotKey });
    if (pre?.file) {
      raw = pre.file;
      _replaceFileRawAndPreview(file, raw);

      if (pre?.note) {
        ElNotification({
          title: "已预处理",
          message: pre.note,
          type: "success",
          duration: 1600,
        });
      }
    }
  } catch {
    raw = raw0;
  }
  return raw;
}

async function startUpload(slotKey, file) {
  const raw0 = file?.raw;
  if (!raw0) return;

  if (uploadedMap[file.uid]) return;

  uploadingCount.value += 1;
  uploadState[file.uid] = { status: "uploading" };

  try {
    // ✅ 稳定模式：页面侧预处理（>2MB 触发）后走后端代传 BOS
    if (uploadMode.value === "stable") {
      const raw = await _preprocessForStable(slotKey, file, raw0);

      const resp = await uploadOrderImageProxy({ slot_key: slotKey, file: raw });
      const meta = resp?.data;

      uploadedMap[file.uid] = {
        slot_key: slotKey,
        md5: meta?.md5,
        storage_key: meta?.storage_key,
        etag: meta?.etag || "",
        size: meta?.size || raw.size || 0,
        content_type: meta?.content_type || raw.type || "application/octet-stream",
        original_name: meta?.original_name || raw.name || "file",
        preview_url: meta?.preview_url || "",
      };

      uploadState[file.uid] = { status: "done" };
      ElNotification.success({
        title: "上传完成",
        message: `${file.name} 已就绪`,
        duration: 2000,
      });
      return;
    }

    // ✅ 直传 / 智能：由 uploadOrReuseByMd5 内部统一做预处理（避免重复预处理）
    const sts = await ensureSts();
    if (!bosHost.value) throw new Error("bosHost missing");

    const meta = await uploadOrReuseByMd5({
      bosHost: bosHost.value,
      slotKey,
      file: raw0,
      sts,
    });

    if (meta?.preprocess_note) {
      ElNotification({
        title: "已预处理",
        message: meta.preprocess_note,
        type: "success",
        duration: 1600,
      });
    }

    uploadedMap[file.uid] = {
      slot_key: slotKey,
      ...meta,
      size: meta?.size || raw0.size || 0,
      content_type: meta?.content_type || raw0.type || "application/octet-stream",
      original_name: meta?.original_name || raw0.name || "file",
    };

    uploadState[file.uid] = { status: "done" };
    ElNotification.success({
      title: "上传完成",
      message: `${file.name} 已就绪`,
      duration: 2000,
    });
  } catch (e) {
    // ✅ 智能模式：网络拦截 -> 引导切稳定并自动重试一次（重试也做预处理）
    if (uploadMode.value === "smart" && isLikelyNetworkBlocked(e)) {
      const switched = await suggestSwitchToStableOnce();
      if (switched) {
        try {
          const rawRetry0 = file?.raw || raw0;
          const rawRetry = await _preprocessForStable(slotKey, file, rawRetry0);

          const resp = await uploadOrderImageProxy({ slot_key: slotKey, file: rawRetry });
          const meta = resp?.data;

          uploadedMap[file.uid] = {
            slot_key: slotKey,
            md5: meta?.md5,
            storage_key: meta?.storage_key,
            etag: meta?.etag || "",
            size: meta?.size || rawRetry.size || 0,
            content_type: meta?.content_type || rawRetry.type || "application/octet-stream",
            original_name: meta?.original_name || rawRetry.name || "file",
            preview_url: meta?.preview_url || "",
          };

          uploadState[file.uid] = { status: "done" };
          ElNotification.success({
            title: "上传完成（稳定模式）",
            message: `${file.name} 已就绪`,
            duration: 2200,
          });
          return;
        } catch (e2) {
          uploadState[file.uid] = { status: "error", msg: _errMsg(e2) || "upload failed" };
          throw e2;
        }
      }
    }

    uploadState[file.uid] = { status: "error", msg: _errMsg(e) || "upload failed" };
    throw e;
  } finally {
    uploadingCount.value -= 1;
  }
}

function slotUploadedCount(slotKey) {
  const list = slotFiles[slotKey] || [];
  let cnt = 0;
  for (const f of list) {
    if (uploadedMap[f.uid]) cnt += 1;
  }
  return cnt;
}

function previewUrls(slotKey) {
  const list = slotFiles[slotKey] || [];
  return list.map((f) => f.url).filter(Boolean);
}

function collectFinalizeImages() {
  const out = [];
  for (const slot of IMAGE_SLOTS) {
    const list = slotFiles[slot.key] || [];
    for (const f of list) {
      const meta = uploadedMap[f.uid];
      if (meta) out.push(meta);
    }
  }
  return out;
}

/** ====================== 保存（draft -> finalize） ====================== */
async function save() {
  if (!editMeta.customer_group_id || !editMeta.channel_group_id) {
    ElMessage.warning("客户和渠道为必选项，请先选择后再保存");
    return;
  }

  if (uploadingCount.value > 0) {
    ElMessage.warning("还有文件在上传中，请稍后再保存");
    return;
  }

  saving.value = true;
  try {
    const dyn = { ...editData };
    const orderInfo = _sanitizeOrderInfoPayload();

    const draftResp = await createOrderDraft({
      module: "order",
      dynamic_data: dyn,
      order_info: orderInfo,
      customer_group_id: editMeta.customer_group_id ?? undefined,
      channel_group_id: editMeta.channel_group_id ?? undefined,
    });

    const draft = draftResp?.data?.data ?? draftResp?.data ?? draftResp;
    const newOrderId = draft?.order_id;
    if (!newOrderId) throw new Error("draft missing order_id");

    const imgs = collectFinalizeImages();

    await finalizeOrderUpload({
      order_id: newOrderId,
      images: imgs,
      dynamic_data: dyn,
      order_info: orderInfo,
      customer_group_id: editMeta.customer_group_id ?? undefined,
      channel_group_id: editMeta.channel_group_id ?? undefined,
    });

    ElMessage.success("创建成功");
    router.push({ path: `/orders/${newOrderId}` });
  } catch (e) {
    console.error(e);
    ElMessage.error(_errMsg(e) || "保存失败");
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await loadConfig("order");
  await loadGroupOptions();
  recalcOrderInfoDerived();
});

onBeforeUnmount(() => {
  for (const uid of Object.keys(localPreviewUrlMap)) {
    try {
      URL.revokeObjectURL(localPreviewUrlMap[uid]);
    } catch {}
    delete localPreviewUrlMap[uid];
  }
});

/** ====================== 内置组件：FieldValue ====================== */
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

      return h(ElInput, { modelValue: raw, "onUpdate:modelValue": onUpdate, clearable: true, class: "fv fv-input" });
    };
  },
});

/** ====================== 内置组件：InfoValue（order_info） ====================== */
const InfoValue = defineComponent({
  name: "InfoValue",
  props: {
    modelValue: { type: [String, Number], default: "" },
    type: { type: String, default: "text" }, // text|date|money|point
    editable: { type: Boolean, default: false },
    min: { type: Number, default: undefined },
    max: { type: Number, default: undefined },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const ElInput = resolveComponent("el-input");
    const ElDatePicker = resolveComponent("el-date-picker");
    const ElInputNumber = resolveComponent("el-input-number");

    const onUpdate = (v) => emit("update:modelValue", v);

    function fmt(v) {
      if (v === null || v === undefined || v === "") return "-";
      const n = Number(v);
      if (props.type === "money") return Number.isFinite(n) ? n.toFixed(2) : "-";
      if (props.type === "point") return Number.isFinite(n) ? String(n) : "-";
      if (props.type === "date") return _dateOrEmpty(v) || "-";
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
          "onUpdate:modelValue": onUpdate,
          type: "date",
          clearable: true,
          format: "YYYY-MM-DD",
          valueFormat: "YYYY-MM-DD",
          class: "fv fv-date",
        });
      }

      if (props.type === "money" || props.type === "point") {
        const n = raw === "" || raw === null || raw === undefined ? undefined : Number(raw);
        return h(ElInputNumber, {
          modelValue: Number.isFinite(n) ? n : undefined,
          "onUpdate:modelValue": onUpdate,
          controls: false,
          precision: props.type === "money" ? 2 : undefined,
          step: props.type === "money" ? 1 : 0.1,
          min: typeof props.min === "number" ? props.min : undefined,
          max: typeof props.max === "number" ? props.max : undefined,
          class: "fv fv-number",
        });
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

/** ====================== 内置组件：SlotUploadCard（单图卡槽） ====================== */
const SlotUploadCard = defineComponent({
  name: "SlotUploadCard",
  props: {
    slotKey: { type: String, required: true },
    label: { type: String, default: "" },
    multiple: { type: Boolean, default: false },
  },
  setup(props) {
    const ElUpload = resolveComponent("el-upload");
    const ElImage = resolveComponent("el-image");
    const ElButton = resolveComponent("el-button");
    const ElTag = resolveComponent("el-tag");

    return () => {
      const slotKey = props.slotKey;
      const label = props.label || slotKey;
      const list = slotFiles[slotKey] || [];
      const one = firstFile(slotKey);

      return h("div", { class: "slot-card" }, [
        h("div", { class: "slot-head" }, [
          h("div", { class: "slot-name" }, label),
          h("div", { class: "slot-tip" }, [h(ElTag, { size: "small", type: "info", effect: "plain" }, () => "单张")]),
        ]),

        h(
          ElUpload,
          {
            drag: true,
            autoUpload: false,
            multiple: false,
            showFileList: false,
            fileList: list,
            accept: "image/*",
            class: "upload-box upload-one",
            onChange: (f) => onFileChange(slotKey, f),
            onRemove: (f) => onFileRemove(slotKey, f),
          },
          {
            default: () =>
              one
                ? h("div", { class: "one-wrap" }, [
                    h(ElImage, {
                      src: one?.url,
                      previewSrcList: previewUrls(slotKey),
                      fit: "contain",
                      class: "one-img",
                    }),
                    h("div", { class: "one-mask" }, [
                      h("div", { class: "one-mask-text" }, "拖拽或点击替换"),
                      h(
                        ElButton,
                        {
                          size: "small",
                          type: "danger",
                          plain: true,
                          class: "one-remove",
                          onClick: (ev) => {
                            ev?.stopPropagation?.();
                            clearSlot(slotKey);
                          },
                        },
                        () => "移除"
                      ),
                    ]),
                  ])
                : h("div", { class: "upload-empty" }, [
                    h("div", { class: "empty-center" }, [
                      h("div", { class: "empty-title" }, "拖拽图片到此处"),
                      h("div", { class: "empty-sub" }, "或点击选择文件"),
                    ]),
                  ]),
          }
        ),

        h("div", { class: "slot-foot" }, [
          slotUploadedCount(slotKey) > 0
            ? h("span", null, `已就绪：${slotUploadedCount(slotKey)} 张`)
            : h("span", { class: "muted" }, "未上传"),
        ]),
      ]);
    };
  },
});
</script>

<style scoped>
/* ====== 复刻详情页整体 ====== */
.order-detail {
  width: 100%;
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

.section-actions {
  display: flex;
  align-items: center;
  gap: 8px;
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
  grid-template-columns: 1fr 320px;
  gap: 14px;
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

/* ====== 渠道/客户不延伸到图片区 ====== */
.meta-narrow {
  max-width: calc(100% - 334px); /* 320 + 14 gap */
}

@media (max-width: 980px) {
  .meta-narrow {
    max-width: 100%;
  }
}

/* ====== 字段和值更区分 + 小格子更紧凑 ====== */
.kv-grid {
  display: grid;
  gap: 8px 12px;
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

.kv-item {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid rgba(60, 60, 60, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.6);
}

.kv-label {
  font-size: 12px;
  color: rgba(31, 42, 68, 0.6);
  font-weight: 700;
}

.kv-value {
  min-width: 0;
  font-size: 13px;
  color: rgba(31, 42, 68, 0.95);
  font-weight: 800;
}

.plain-value {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 订单信息 */
.info-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-grid .kv-item {
  grid-template-columns: 120px 1fr;
}

.info-grid-compact .kv-item {
  grid-template-columns: 92px 1fr;
  padding: 8px 10px;
}

.split-title {
  margin-top: 12px;
  margin-bottom: 8px;
  font-weight: 800;
  color: rgba(31, 42, 68, 0.9);
}

/* 身份证/行驶证内部块 */
.stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sub-block {
  border: 1px solid rgba(60, 60, 60, 0.08);
  border-radius: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.55);
}

.sub-title {
  font-weight: 800;
  color: rgba(31, 42, 68, 0.92);
  margin-bottom: 10px;
}

/* FieldValue / InfoValue 内部控件 */
.fv :deep(.el-input__wrapper) {
  border-radius: 10px;
}

.fv :deep(.el-input-number) {
  width: 100%;
}

.fv :deep(.el-input-number .el-input__wrapper) {
  border-radius: 10px;
}

.fv {
  width: 100%;
}

/* 上传中的提示条 */
.upload-alert {
  margin-bottom: 2px;
}

/* ✅ 上传模式控件 */
.upload-mode {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 6px;
}

.upload-mode-label {
  font-size: 12px;
  color: rgba(31, 42, 68, 0.72);
  font-weight: 600;
}

/* ✅ 卡槽样式 */
.slot-card {
  border: 1px solid rgba(60, 60, 60, 0.1);
  border-radius: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.55);
}

.slot-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.slot-name {
  font-weight: 700;
  color: rgba(31, 42, 68, 0.92);
}

.slot-foot {
  margin-top: 8px;
  font-size: 12px;
}

.muted {
  color: #999;
}

/* Upload box base */
.upload-box :deep(.el-upload-dragger) {
  border-radius: 12px;
  min-height: 170px;
}

/* 单图槽：空态提示强制居中 */
.upload-one :deep(.el-upload-dragger) {
  padding: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 多图槽：保留稍微舒展的 padding */
.upload-multi :deep(.el-upload-dragger) {
  padding: 12px;
}

/* 空态居中文案 */
.upload-empty {
  width: 100%;
  height: 170px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-center {
  text-align: center;
  line-height: 1.4;
}

.empty-title {
  font-size: 14px;
  font-weight: 700;
  color: rgba(31, 42, 68, 0.88);
}

.empty-sub {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(31, 42, 68, 0.55);
}

/* 单图槽：居中预览 */
.one-wrap {
  position: relative;
  width: 100%;
  height: 170px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.one-img {
  width: 100%;
  height: 100%;
}

.one-mask {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.2));
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 10px;
  pointer-events: none;
}

.one-mask-text {
  color: rgba(255, 255, 255, 0.92);
  font-size: 12px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.one-remove {
  pointer-events: auto;
}

/* 多图预览墙 */
.preview-wall {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.preview-item {
  border: 1px solid rgba(60, 60, 60, 0.1);
  border-radius: 10px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.75);
}

.preview-img {
  width: 100%;
  height: 110px;
  border-bottom: 1px solid rgba(60, 60, 60, 0.08);
}

.preview-empty {
  background: rgba(31, 42, 68, 0.03);
}

.preview-meta {
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.preview-name {
  font-size: 12px;
  color: rgba(31, 42, 68, 0.9);
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 响应式 */
@media (max-width: 980px) {
  .two-col {
    grid-template-columns: 1fr;
  }

  .right {
    border-left: none;
    padding-left: 0;
  }

  .preview-wall {
    grid-template-columns: 1fr;
  }

  .kv-grid-4 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .kv-grid-5 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
