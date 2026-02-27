<template>
  <div class="order-create">
    <div class="detail-header" v-if="!props.embedded">
      <h2>手动新建订单</h2>
      <div class="header-actions">
        <el-button size="small" @click="router.back()">返回</el-button>
      </div>
    </div>

    <!-- 上传模式（与导入页对齐） -->
    <el-card shadow="never" class="section-card">
      <div class="upload-mode-row">
        <div class="upload-mode">
          <span class="upload-mode-label">上传模式</span>
          <el-select v-model="uploadMode" size="small" style="width: 160px" @change="persistUploadMode">
            <el-option label="智能（推荐）" value="smart" />
            <el-option label="直传（更快）" value="direct" />
            <el-option label="稳定（兼容VPN）" value="stable" />
          </el-select>
        </div>

        <div class="upload-mode-tip">图片上传失败时，智能模式会提示切换到稳定模式</div>
      </div>
    </el-card>

    <!-- ① 基础信息 -->
    <el-card shadow="never" class="section-card meta-card">
      <template #header>
        <div class="section-header">
          <div class="section-title">基础信息</div>
        </div>
      </template>

      <el-form ref="metaFormRef" :model="meta" :rules="metaRules" label-width="80px">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="客户群" prop="customer_group_id">
              <el-select
                v-model="meta.customer_group_id"
                clearable
                filterable
                placeholder="必选"
                class="fv fv-select"
                style="width: 100%"
                :loading="groupsLoading"
                :disabled="groupsLoading"
              >
                <el-option
                  v-for="g in customerGroups"
                  :key="String(g.id)"
                  :label="customerGroupLabel(g)"
                  :value="g.id"
                />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="渠道群" prop="channel_group_id">
              <el-select
                v-model="meta.channel_group_id"
                clearable
                filterable
                placeholder="必选"
                class="fv fv-select"
                style="width: 100%"
                :loading="groupsLoading"
                :disabled="groupsLoading"
              >
                <el-option
                  v-for="g in channelGroups"
                  :key="String(g.id)"
                  :label="channelGroupLabel(g)"
                  :value="g.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
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
                <el-input v-model="formData.vehicle_model" placeholder="车辆型号" clearable class="fv fv-input" />
              </div>
            </div>

            <div class="kv-item">
              <div class="kv-label">车辆识别代码/车架号</div>
              <div class="kv-value">
                <el-input v-model="formData.vin" placeholder="车架号" clearable class="fv fv-input" />
              </div>
            </div>

            <div class="kv-item">
              <div class="kv-label">发动机号</div>
              <div class="kv-value">
                <el-input v-model="formData.engine_no" placeholder="发动机号" clearable class="fv fv-input" />
              </div>
            </div>

            <div class="kv-item">
              <div class="kv-label">额定载客(人)</div>
              <div class="kv-value">
                <el-input
                  v-model="formData.approved_passenger_count"
                  placeholder="额定载客(人)"
                  clearable
                  class="fv fv-input"
                />
              </div>
            </div>
          </div>

          <div v-else>
            <VehicleCertTable :data="formData" :readonly="false" />
          </div>
        </div>

        <div class="right">
          <div class="upload-title">
            <span>合格证图片</span>
            <span class="slot-sub" v-if="slotUploadedCount('vehicle_cert') > 0">
              （已就绪 {{ slotUploadedCount("vehicle_cert") }} 张 <span class="ready-dot" aria-hidden="true"></span>）
            </span>
          </div>

          <el-upload
            drag
            :auto-upload="false"
            :multiple="false"
            :limit="1"
            :show-file-list="false"
            :file-list="slotFiles.vehicle_cert"
            :disabled="isSingleSlotLocked('vehicle_cert') || submitting || uploadingCount > 0"
            :on-change="(file) => onFileChange('vehicle_cert', file)"
            :on-exceed="() => onExceedWarn('vehicle_cert')"
            accept="image/*"
            class="upload-box upload-one"
          >
            <template #default>
              <div v-if="firstFile('vehicle_cert')" class="one-wrap">
                <el-image
                  :src="firstFile('vehicle_cert')?.url"
                  :preview-src-list="previewUrls('vehicle_cert')"
                  fit="contain"
                  class="one-img"
                />
                <div class="one-mask">
                  <div class="one-mask-text">已上传，删除后可重新上传</div>
                </div>
              </div>

              <div v-else class="upload-empty">
                <div class="empty-center">
                  <div class="empty-title">拖拽图片到此处</div>
                  <div class="empty-sub">或点击选择文件</div>
                </div>
              </div>
            </template>
          </el-upload>

          <div v-if="slotUploadingCount('vehicle_cert') > 0" class="uploading-tip">
            正在上传：{{ slotUploadingCount("vehicle_cert") }} 个文件…（上传完成后才能提交）
          </div>

          <div class="slot-foot">
            <div class="slot-foot-left">
              <template v-if="slotUploadedCount('vehicle_cert') > 0">
                <span>已就绪：{{ slotUploadedCount("vehicle_cert") }} 张</span>
                <span class="ready-dot" aria-hidden="true"></span>
              </template>
              <span v-else class="muted">未上传</span>
            </div>
            <div class="slot-foot-right">
              <el-button
                v-if="(slotFiles.vehicle_cert || []).length"
                size="small"
                type="danger"
                link
                class="slot-remove"
                :disabled="submitting || uploadingCount > 0"
                @click="clearSlot('vehicle_cert')"
              >
                移除
              </el-button>
            </div>
          </div>
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
                    <el-input v-model="formData.id_name" placeholder="姓名" clearable class="fv fv-input" />
                  </div>
                </div>
                <div class="kv-item">
                  <div class="kv-label">公民身份号码</div>
                  <div class="kv-value">
                    <el-input v-model="formData.id_number" placeholder="身份证号" clearable class="fv fv-input" />
                  </div>
                </div>
              </div>

              <div v-else class="kv-grid kv-grid-2">
                <div class="kv-item">
                  <div class="kv-label">姓名</div>
                  <div class="kv-value">
                    <el-input v-model="formData.id_name" placeholder="姓名" clearable class="fv fv-input" />
                  </div>
                </div>
                <div class="kv-item">
                  <div class="kv-label">公民身份号码</div>
                  <div class="kv-value">
                    <el-input v-model="formData.id_number" placeholder="身份证号" clearable class="fv fv-input" />
                  </div>
                </div>
                <div class="kv-item">
                  <div class="kv-label">性别</div>
                  <div class="kv-value">
                    <el-input v-model="formData.id_gender" placeholder="性别" clearable class="fv fv-input" />
                  </div>
                </div>
                <div class="kv-item">
                  <div class="kv-label">民族</div>
                  <div class="kv-value">
                    <el-input v-model="formData.id_ethnicity" placeholder="民族" clearable class="fv fv-input" />
                  </div>
                </div>
                <div class="kv-item">
                  <div class="kv-label">出生日期</div>
                  <div class="kv-value">
                    <el-input v-model="formData.id_birth_date" placeholder="YYYY-MM-DD" clearable class="fv fv-input" />
                  </div>
                </div>
                <div class="kv-item">
                  <div class="kv-label">住址</div>
                  <div class="kv-value">
                    <el-input v-model="formData.id_address" placeholder="住址" clearable class="fv fv-input" />
                  </div>
                </div>
              </div>
            </div>

            <div class="right">
              <div class="upload-title">
                <span>身份证正面图片</span>
                <span class="slot-sub" v-if="slotUploadedCount('idcard_front') > 0">
                  （已就绪 {{ slotUploadedCount("idcard_front") }} 张 <span class="ready-dot" aria-hidden="true"></span>）
                </span>
              </div>

              <el-upload
                drag
                :auto-upload="false"
                :multiple="false"
                :limit="1"
                :show-file-list="false"
                :file-list="slotFiles.idcard_front"
                :disabled="isSingleSlotLocked('idcard_front') || submitting || uploadingCount > 0"
                :on-change="(file) => onFileChange('idcard_front', file)"
                :on-exceed="() => onExceedWarn('idcard_front')"
                accept="image/*"
                class="upload-box upload-one"
              >
                <template #default>
                  <div v-if="firstFile('idcard_front')" class="one-wrap">
                    <el-image
                      :src="firstFile('idcard_front')?.url"
                      :preview-src-list="previewUrls('idcard_front')"
                      fit="contain"
                      class="one-img"
                    />
                    <div class="one-mask">
                      <div class="one-mask-text">已上传，删除后可重新上传</div>
                    </div>
                  </div>

                  <div v-else class="upload-empty">
                    <div class="empty-center">
                      <div class="empty-title">拖拽图片到此处</div>
                      <div class="empty-sub">或点击选择文件</div>
                    </div>
                  </div>
                </template>
              </el-upload>

              <div v-if="slotUploadingCount('idcard_front') > 0" class="uploading-tip">
                正在上传：{{ slotUploadingCount("idcard_front") }} 个文件…（上传完成后才能提交）
              </div>

              <div class="slot-foot">
                <div class="slot-foot-left">
                  <template v-if="slotUploadedCount('idcard_front') > 0">
                    <span>已就绪：{{ slotUploadedCount("idcard_front") }} 张</span>
                    <span class="ready-dot" aria-hidden="true"></span>
                  </template>
                  <span v-else class="muted">未上传</span>
                </div>
                <div class="slot-foot-right">
                  <el-button
                    v-if="(slotFiles.idcard_front || []).length"
                    size="small"
                    type="danger"
                    link
                    class="slot-remove"
                    :disabled="submitting || uploadingCount > 0"
                    @click="clearSlot('idcard_front')"
                  >
                    移除
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 背面 -->
        <div class="sub-block">
          <div class="sub-title">身份证背面</div>

          <div class="two-col">
            <div class="left">
              <div v-if="idExpanded" class="kv-grid kv-grid-2">
                <div class="kv-item">
                  <div class="kv-label">签发机关</div>
                  <div class="kv-value">
                    <el-input v-model="formData.id_issuer" placeholder="签发机关" clearable class="fv fv-input" />
                  </div>
                </div>

                <div class="kv-item">
                  <div class="kv-label">有效期限</div>
                  <div class="kv-value">
                    <el-input
                      v-model="formData.id_validity"
                      placeholder="例如：2020-01-01~2040-01-01"
                      clearable
                      class="fv fv-input"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="right">
              <div class="upload-title">
                <span>身份证背面图片</span>
                <span class="slot-sub" v-if="slotUploadedCount('idcard_back') > 0">
                  （已就绪 {{ slotUploadedCount("idcard_back") }} 张 <span class="ready-dot" aria-hidden="true"></span>）
                </span>
              </div>

              <el-upload
                drag
                :auto-upload="false"
                :multiple="false"
                :limit="1"
                :show-file-list="false"
                :file-list="slotFiles.idcard_back"
                :disabled="isSingleSlotLocked('idcard_back') || submitting || uploadingCount > 0"
                :on-change="(file) => onFileChange('idcard_back', file)"
                :on-exceed="() => onExceedWarn('idcard_back')"
                accept="image/*"
                class="upload-box upload-one"
              >
                <template #default>
                  <div v-if="firstFile('idcard_back')" class="one-wrap">
                    <el-image
                      :src="firstFile('idcard_back')?.url"
                      :preview-src-list="previewUrls('idcard_back')"
                      fit="contain"
                      class="one-img"
                    />
                    <div class="one-mask">
                      <div class="one-mask-text">已上传，删除后可重新上传</div>
                    </div>
                  </div>

                  <div v-else class="upload-empty">
                    <div class="empty-center">
                      <div class="empty-title">拖拽图片到此处</div>
                      <div class="empty-sub">或点击选择文件</div>
                    </div>
                  </div>
                </template>
              </el-upload>

              <div v-if="slotUploadingCount('idcard_back') > 0" class="uploading-tip">
                正在上传：{{ slotUploadingCount("idcard_back") }} 个文件…（上传完成后才能提交）
              </div>

              <div class="slot-foot">
                <div class="slot-foot-left">
                  <template v-if="slotUploadedCount('idcard_back') > 0">
                    <span>已就绪：{{ slotUploadedCount("idcard_back") }} 张</span>
                    <span class="ready-dot" aria-hidden="true"></span>
                  </template>
                  <span v-else class="muted">未上传</span>
                </div>
                <div class="slot-foot-right">
                  <el-button
                    v-if="(slotFiles.idcard_back || []).length"
                    size="small"
                    type="danger"
                    link
                    class="slot-remove"
                    :disabled="submitting || uploadingCount > 0"
                    @click="clearSlot('idcard_back')"
                  >
                    移除
                  </el-button>
                </div>
              </div>
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
        <!-- 主页 -->
        <div class="sub-block">
          <div class="sub-title">行驶证主页</div>

          <div class="two-col">
            <div class="left">
              <div v-if="!dlExpanded" class="kv-grid kv-grid-2">
                <div class="kv-item">
                  <div class="kv-label">号牌号码</div>
                  <div class="kv-value">
                    <el-input v-model="formData.dl_plate_no" placeholder="车牌号" clearable class="fv fv-input" />
                  </div>
                </div>
              </div>

              <div v-else class="kv-grid kv-grid-2">
                <div class="kv-item">
                  <div class="kv-label">号牌号码</div>
                  <div class="kv-value">
                    <el-input v-model="formData.dl_plate_no" placeholder="车牌号" clearable class="fv fv-input" />
                  </div>
                </div>
                <div class="kv-item">
                  <div class="kv-label">车辆类型</div>
                  <div class="kv-value">
                    <el-input v-model="formData.dl_vehicle_type" placeholder="车辆类型" clearable class="fv fv-input" />
                  </div>
                </div>
                <div class="kv-item">
                  <div class="kv-label">所有人</div>
                  <div class="kv-value">
                    <el-input v-model="formData.dl_owner" placeholder="所有人" clearable class="fv fv-input" />
                  </div>
                </div>
                <div class="kv-item">
                  <div class="kv-label">使用性质</div>
                  <div class="kv-value">
                    <el-input v-model="formData.dl_use_nature" placeholder="使用性质" clearable class="fv fv-input" />
                  </div>
                </div>
                <div class="kv-item">
                  <div class="kv-label">品牌型号</div>
                  <div class="kv-value">
                    <el-input v-model="formData.dl_brand_model" placeholder="品牌型号" clearable class="fv fv-input" />
                  </div>
                </div>
              </div>
            </div>

            <div class="right">
              <div class="upload-title">
                <span>行驶证主页图片</span>
                <span class="slot-sub" v-if="slotUploadedCount('driving_license_main') > 0">
                  （已就绪 {{ slotUploadedCount("driving_license_main") }} 张 <span class="ready-dot" aria-hidden="true"></span>）
                </span>
              </div>

              <el-upload
                drag
                :auto-upload="false"
                :multiple="false"
                :limit="1"
                :show-file-list="false"
                :file-list="slotFiles.driving_license_main"
                :disabled="isSingleSlotLocked('driving_license_main') || submitting || uploadingCount > 0"
                :on-change="(file) => onFileChange('driving_license_main', file)"
                :on-exceed="() => onExceedWarn('driving_license_main')"
                accept="image/*"
                class="upload-box upload-one"
              >
                <template #default>
                  <div v-if="firstFile('driving_license_main')" class="one-wrap">
                    <el-image
                      :src="firstFile('driving_license_main')?.url"
                      :preview-src-list="previewUrls('driving_license_main')"
                      fit="contain"
                      class="one-img"
                    />
                    <div class="one-mask">
                      <div class="one-mask-text">已上传，删除后可重新上传</div>
                    </div>
                  </div>

                  <div v-else class="upload-empty">
                    <div class="empty-center">
                      <div class="empty-title">拖拽图片到此处</div>
                      <div class="empty-sub">或点击选择文件</div>
                    </div>
                  </div>
                </template>
              </el-upload>

              <div v-if="slotUploadingCount('driving_license_main') > 0" class="uploading-tip">
                正在上传：{{ slotUploadingCount("driving_license_main") }} 个文件…（上传完成后才能提交）
              </div>

              <div class="slot-foot">
                <div class="slot-foot-left">
                  <template v-if="slotUploadedCount('driving_license_main') > 0">
                    <span>已就绪：{{ slotUploadedCount("driving_license_main") }} 张</span>
                    <span class="ready-dot" aria-hidden="true"></span>
                  </template>
                  <span v-else class="muted">未上传</span>
                </div>
                <div class="slot-foot-right">
                  <el-button
                    v-if="(slotFiles.driving_license_main || []).length"
                    size="small"
                    type="danger"
                    link
                    class="slot-remove"
                    :disabled="submitting || uploadingCount > 0"
                    @click="clearSlot('driving_license_main')"
                  >
                    移除
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 副页 -->
        <div class="sub-block">
          <div class="sub-title">行驶证副页</div>

          <div class="two-col">
            <div class="left">
              <div v-if="dlExpanded" class="kv-grid kv-grid-2">
                <div class="kv-item">
                  <div class="kv-label">副页备注</div>
                  <div class="kv-value">
                    <el-input v-model="formData.dl_attach_note" placeholder="可选" clearable class="fv fv-input" />
                  </div>
                </div>
              </div>
            </div>

            <div class="right">
              <div class="upload-title">
                <span>行驶证副页图片</span>
                <span class="slot-sub" v-if="slotUploadedCount('driving_license_sub') > 0">
                  （已就绪 {{ slotUploadedCount("driving_license_sub") }} 张 <span class="ready-dot" aria-hidden="true"></span>）
                </span>
              </div>

              <el-upload
                drag
                :auto-upload="false"
                :multiple="false"
                :limit="1"
                :show-file-list="false"
                :file-list="slotFiles.driving_license_sub"
                :disabled="isSingleSlotLocked('driving_license_sub') || submitting || uploadingCount > 0"
                :on-change="(file) => onFileChange('driving_license_sub', file)"
                :on-exceed="() => onExceedWarn('driving_license_sub')"
                accept="image/*"
                class="upload-box upload-one"
              >
                <template #default>
                  <div v-if="firstFile('driving_license_sub')" class="one-wrap">
                    <el-image
                      :src="firstFile('driving_license_sub')?.url"
                      :preview-src-list="previewUrls('driving_license_sub')"
                      fit="contain"
                      class="one-img"
                    />
                    <div class="one-mask">
                      <div class="one-mask-text">已上传，删除后可重新上传</div>
                    </div>
                  </div>

                  <div v-else class="upload-empty">
                    <div class="empty-center">
                      <div class="empty-title">拖拽图片到此处</div>
                      <div class="empty-sub">或点击选择文件</div>
                    </div>
                  </div>
                </template>
              </el-upload>

              <div v-if="slotUploadingCount('driving_license_sub') > 0" class="uploading-tip">
                正在上传：{{ slotUploadingCount("driving_license_sub") }} 个文件…（上传完成后才能提交）
              </div>

              <div class="slot-foot">
                <div class="slot-foot-left">
                  <template v-if="slotUploadedCount('driving_license_sub') > 0">
                    <span>已就绪：{{ slotUploadedCount("driving_license_sub") }} 张</span>
                    <span class="ready-dot" aria-hidden="true"></span>
                  </template>
                  <span v-else class="muted">未上传</span>
                </div>
                <div class="slot-foot-right">
                  <el-button
                    v-if="(slotFiles.driving_license_sub || []).length"
                    size="small"
                    type="danger"
                    link
                    class="slot-remove"
                    :disabled="submitting || uploadingCount > 0"
                    @click="clearSlot('driving_license_sub')"
                  >
                    移除
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- ⑤ 相关图片（多张） -->
    <el-card shadow="never" class="section-card">
      <template #header>
        <div class="section-header">
          <div class="section-title">相关图片（可多张）</div>
        </div>
      </template>

      <div class="upload-title">
        <span>相关图片（可多张）</span>
        <span class="slot-sub" v-if="slotUploadedCount('related') > 0">
          （已就绪 {{ slotUploadedCount("related") }} 张 <span class="ready-dot" aria-hidden="true"></span>）
        </span>
      </div>

      <el-upload
        class="upload-card upload-wide"
        :file-list="slotFiles.related"
        list-type="picture-card"
        :limit="20"
        :multiple="true"
        :auto-upload="false"
        drag
        accept="image/*"
        :disabled="submitting || uploadingCount > 0"
        :on-change="(file, files) => onFileChangeMulti('related', file, files)"
        :on-remove="(file, files) => onFileRemoveMulti('related', file, files)"
      >
        <div class="upload-trigger">
          <el-icon class="upload-plus"><Plus /></el-icon>
          <div class="upload-text">拖拽图片到此处</div>
        </div>
      </el-upload>

      <div v-if="slotUploadingCount('related') > 0" class="uploading-tip">
        正在上传：{{ slotUploadingCount("related") }} 个文件…（上传完成后才能提交）
      </div>
    </el-card>

    <div class="footer-actions">
      <el-button @click="resetAll" :disabled="submitting || uploadingCount > 0">清空</el-button>
      <el-button type="primary" :loading="submitting" :disabled="uploadingCount > 0" @click="submit">提交</el-button>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox, ElNotification } from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import { CaretBottom, CaretTop } from "@element-plus/icons-vue";

import VehicleCertTable from "./VehicleCertTable.vue";

import http from "../../api/http";
import {
  getCustomerGroups,
  getChannelGroups,
  createOrderDraft,
  finalizeOrderUpload,
  uploadOrderImageProxy,
} from "../../api/orders";
import { uploadOrReuseByMd5 } from "../../utils/bosUpload";
import { preprocessImageForUpload } from "../../utils/imagePreprocess";

const props = defineProps({
  embedded: { type: Boolean, default: false },
});

const router = useRouter();
const submitting = ref(false);
const groupsLoading = ref(false);

/** 上传模式（与导入页一致） */
const UPLOAD_MODE_KEY = "order_create_upload_mode";
const uploadMode = ref("smart");

function loadUploadMode() {
  const v = localStorage.getItem(UPLOAD_MODE_KEY);
  if (v === "smart" || v === "direct" || v === "stable") uploadMode.value = v;
}
function persistUploadMode() {
  try {
    localStorage.setItem(UPLOAD_MODE_KEY, uploadMode.value);
  } catch {
    // ignore
  }
}

/** 基础信息必选 */
const metaFormRef = ref(null);
const meta = ref({
  customer_group_id: null,
  channel_group_id: null,
});
const metaRules = {
  customer_group_id: [{ required: true, message: "客户必选", trigger: "change" }],
  channel_group_id: [{ required: true, message: "渠道必选", trigger: "change" }],
};

const customerGroups = ref([]);
const channelGroups = ref([]);

/** 下拉展示：代码 + 名称 */
function _trim(v) {
  return String(v ?? "").trim();
}

function customerGroupLabel(g) {
  const code = _trim(g?.customer_code || g?.code || "");
  const name = _trim(g?.customer_name || g?.name || "");
  const groupName = _trim(g?.group_name || "");
  const id = g?.id != null ? String(g.id) : "";

  if (code && name) return `${code} - ${name}`;
  if (code && groupName) return `${code} - ${groupName}`;
  if (code) return code;
  if (name) return name;
  if (groupName) return groupName;
  return id || "-";
}

function channelGroupLabel(g) {
  const code = _trim(g?.channel_code || g?.code || "");
  const name = _trim(g?.channel_name || g?.name || "");
  const groupName = _trim(g?.group_name || "");
  const id = g?.id != null ? String(g.id) : "";

  if (code && name) return `${code} - ${name}`;
  if (code && groupName) return `${code} - ${groupName}`;
  if (code) return code;
  if (name) return name;
  if (groupName) return groupName;
  return id || "-";
}

/** 轻量表单字段（动态字段口径） */
const formData = ref({
  cert_no: "",
  cert_issue_date: "",

  manufacturer_name: "",
  vehicle_brand_name: "",
  vehicle_model: "",
  vin: "",
  body_color: "",

  chassis_model_id: "",
  chassis_cert_no: "",
  engine_model: "",
  engine_no: "",

  fuel_type: "",
  displacement_and_power: "",
  emission_standard: "",
  fuel_consumption: "",

  overall_dimensions: "",
  cargo_dimensions: "",

  leaf_spring_count: "",
  tire_count: "",
  tire_spec: "",
  wheel_track: "",

  wheel_base: "",
  axle_load_kg: "",
  axle_count: "",
  steering_type: "",
  curb_weight: "",
  gross_weight: "",

  rated_load: "",
  rated_traction_weight: "",
  load_utilization_factor: "",
  allowed_traction_weight: "",
  semi_trailer_weight: "",
  cab_passenger_count: "",
  approved_passenger_count: "",
  manufacture_date: "",
  cert_remark: "",

  id_name: "",
  id_number: "",
  id_gender: "",
  id_ethnicity: "",
  id_birth_date: "",
  id_address: "",
  id_issuer: "",
  id_validity: "",

  dl_plate_no: "",
  dl_vehicle_type: "",
  dl_owner: "",
  dl_use_nature: "",
  dl_brand_model: "",
  dl_attach_note: "",

  remark: "",
});

// 展开开关
const certExpanded = ref(false);
const idExpanded = ref(false);
const dlExpanded = ref(false);

const IMAGE_SLOTS = [
  { key: "vehicle_cert", label: "合格证", multiple: false },
  { key: "idcard_front", label: "身份证正面", multiple: false },
  { key: "idcard_back", label: "身份证反面", multiple: false },
  { key: "driving_license_main", label: "行驶证主页", multiple: false },
  { key: "driving_license_sub", label: "行驶证副页", multiple: false },
  { key: "related", label: "相关图片(多张)", multiple: true },
];

function isMultiSlot(slotKey) {
  return IMAGE_SLOTS.find((s) => s.key === slotKey)?.multiple === true;
}
function slotLabel(slotKey) {
  return IMAGE_SLOTS.find((s) => s.key === slotKey)?.label || slotKey;
}

function isSingleSlotLocked(slotKey) {
  if (isMultiSlot(slotKey)) return false;
  return (slotFiles.value[slotKey] || []).length >= 1;
}

function onExceedWarn(slotKey) {
  ElMessage.warning(`${slotLabel(slotKey)}：请先删除当前图片，再上传新图片`);
}

/** files/state */
const slotFiles = ref({
  vehicle_cert: [],
  idcard_front: [],
  idcard_back: [],
  driving_license_main: [],
  driving_license_sub: [],
  related: [],
});

// uid -> meta
const uploadedMap = ref({});
const uploadingCount = ref(0);
// uid -> {status:'uploading'|'done'|'error'}
const uploadState = ref({});
// uid -> objectURL
const localPreviewUrlMap = ref({});

/** STS 缓存 */
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
    throw new Error("获取上传凭证失败：返回数据不完整");
  }
  cachedSts = data;
  bosHost.value = data.bosHost || "";
  cachedStsExpireAt = _parseExpireTs(data.expiration) || now + 10 * 60 * 1000;
  return cachedSts;
}

/** 单图槽 helpers */
function firstFile(slotKey) {
  const list = slotFiles.value[slotKey] || [];
  return list.length ? list[0] : null;
}

function previewUrls(slotKey) {
  const list = slotFiles.value[slotKey] || [];
  return list.map((f) => f.url).filter(Boolean);
}

function _ensureLocalPreview(file) {
  const raw = file?.raw;
  if (!raw) return;
  if (!file.url) {
    const u = URL.createObjectURL(raw);
    file.url = u;
    localPreviewUrlMap.value[file.uid] = u;
  }
}

function _replaceFileRawAndPreview(fileObj, newRaw) {
  if (!fileObj || !newRaw) return;
  const uid = fileObj.uid;

  const oldUrl = uid ? localPreviewUrlMap.value[uid] : fileObj.url;
  if (oldUrl) {
    try {
      URL.revokeObjectURL(oldUrl);
    } catch {
      // ignore
    }
    if (uid) delete localPreviewUrlMap.value[uid];
  }

  const u = URL.createObjectURL(newRaw);
  fileObj.raw = newRaw;
  fileObj.url = u;
  if (uid) localPreviewUrlMap.value[uid] = u;
}

function _revokeLocalPreviewByUid(uid) {
  const u = localPreviewUrlMap.value[uid];
  if (!u) return;
  try {
    URL.revokeObjectURL(u);
  } catch {
    // ignore
  }
  delete localPreviewUrlMap.value[uid];
}

function clearSlot(slotKey) {
  const list = slotFiles.value[slotKey] || [];
  for (const f of list) {
    const uid = f?.uid;
    if (!uid) continue;
    if (uploadedMap.value[uid]) delete uploadedMap.value[uid];
    if (uploadState.value[uid]) delete uploadState.value[uid];
    _revokeLocalPreviewByUid(uid);
  }
  slotFiles.value[slotKey] = [];
}

/** 错误处理 */
function hasChinese(s) {
  return /[\u4e00-\u9fa5]/.test(String(s || ""));
}
function _rawErrMsg(e) {
  const m = e?.response?.data?.detail || e?.response?.data?.message || e?.message || "";
  return String(m || "");
}
function normalizeErrMsg(e, fallback = "操作失败，请稍后重试") {
  const detail = e?.response?.data?.detail;
  const msg = _rawErrMsg(e);
  const status = e?.response?.status;
  const code = String(e?.code || "");

  if (typeof detail === "string" && detail && hasChinese(detail)) return detail;
  if (msg && hasChinese(msg)) return msg;

  const low = msg.toLowerCase();
  if (low.includes("network error") || low.includes("failed to fetch")) return "网络异常，请检查网络连接";
  if (low.includes("timeout") || code.includes("ECONNABORTED")) return "请求超时，请稍后重试";
  if (low.includes("cors")) return "跨域受限或网络拦截，请切换网络后重试";

  if (status === 401) return "登录状态已失效，请重新登录";
  if (status === 403) return "无权限执行该操作";
  if (status >= 500) return "服务器异常，请稍后重试";
  return fallback;
}
function isLikelyNetworkBlocked(err) {
  const m = _rawErrMsg(err).toLowerCase();
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
      `上传可能被当前网络环境拦截（常见于 VPN/代理/公司网关）。\n\n建议切换到【稳定模式上传】继续，无需任何设置。`,
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

/** Upload handlers（单图槽） */
function onFileChange(slotKey, file) {
  clearSlot(slotKey);
  _ensureLocalPreview(file);
  slotFiles.value[slotKey] = [file];

  startUpload(slotKey, file).catch((e) => {
    console.error(e);
    ElNotification({
      title: "上传失败",
      message: normalizeErrMsg(e, "上传失败，请稍后重试"),
      type: "error",
      duration: 4500,
    });
  });
}

/** Upload handlers（多图槽 related） */
function onFileChangeMulti(slotKey, file, files) {
  slotFiles.value[slotKey] = Array.isArray(files) ? files : [];
  _ensureLocalPreview(file);

  startUpload(slotKey, file).catch((e) => {
    console.error(e);
    ElNotification({
      title: "上传失败",
      message: normalizeErrMsg(e, "上传失败，请稍后重试"),
      type: "error",
      duration: 4500,
    });
  });
}

function onFileRemoveMulti(slotKey, file, files) {
  slotFiles.value[slotKey] = Array.isArray(files) ? files : [];
  const uid = file?.uid;
  if (uid && uploadedMap.value[uid]) delete uploadedMap.value[uid];
  if (uid && uploadState.value[uid]) delete uploadState.value[uid];
  if (uid) _revokeLocalPreviewByUid(uid);
}

async function startUpload(slotKey, file) {
  const raw0 = file?.raw;
  if (!raw0) return;
  if (uploadedMap.value[file.uid]) return;

  uploadingCount.value += 1;
  uploadState.value[file.uid] = { status: "uploading" };

  try {
    // 预处理（与导入页一致）
    let raw = raw0;
    try {
      const pre = await preprocessImageForUpload({ file: raw0, slotKey });
      if (pre?.file) {
        raw = pre.file;
        _replaceFileRawAndPreview(file, raw);
      }
    } catch {
      raw = raw0;
    }

    // 稳定模式：后端代传
    if (uploadMode.value === "stable") {
      const resp = await uploadOrderImageProxy({ slot_key: slotKey, file: raw });
      const meta = resp?.data || {};
      uploadedMap.value[file.uid] = {
        slot_key: slotKey,
        md5: meta?.md5,
        storage_key: meta?.storage_key,
        etag: meta?.etag || "",
        size: meta?.size || raw.size || 0,
        content_type: meta?.content_type || raw.type || "application/octet-stream",
        original_name: meta?.original_name || raw.name || "file",
        preview_url: meta?.preview_url || "",
      };
      if (meta?.preview_url) file.url = meta.preview_url;
      uploadState.value[file.uid] = { status: "done" };
      return;
    }

    // 智能/直传：BOS直传
    const sts = await ensureSts();
    if (!bosHost.value) throw new Error("bosHost missing");

    const meta0 = await uploadOrReuseByMd5({
      bosHost: bosHost.value,
      slotKey,
      file: raw,
      sts,
    });

    if (meta0?.preview_url) {
      file.url = meta0.preview_url;
    }

    uploadedMap.value[file.uid] = {
      slot_key: slotKey,
      ...meta0,
      size: meta0?.size || raw.size || 0,
      content_type: meta0?.content_type || raw.type || "application/octet-stream",
      original_name: meta0?.original_name || raw.name || "file",
    };

    uploadState.value[file.uid] = { status: "done" };
  } catch (e) {
    if (uploadMode.value === "smart" && isLikelyNetworkBlocked(e)) {
      const switched = await suggestSwitchToStableOnce();
      if (switched) {
        try {
          const rawRetry = file?.raw || raw0;
          const resp = await uploadOrderImageProxy({ slot_key: slotKey, file: rawRetry });
          const meta = resp?.data || {};

          uploadedMap.value[file.uid] = {
            slot_key: slotKey,
            md5: meta?.md5,
            storage_key: meta?.storage_key,
            etag: meta?.etag || "",
            size: meta?.size || rawRetry.size || 0,
            content_type: meta?.content_type || rawRetry.type || "application/octet-stream",
            original_name: meta?.original_name || rawRetry.name || "file",
            preview_url: meta?.preview_url || "",
          };
          if (meta?.preview_url) file.url = meta.preview_url;

          uploadState.value[file.uid] = { status: "done" };
          return;
        } catch (e2) {
          uploadState.value[file.uid] = { status: "error" };
          throw e2;
        }
      }
    }

    uploadState.value[file.uid] = { status: "error" };
    throw e;
  } finally {
    uploadingCount.value -= 1;
  }
}

function slotUploadedCount(slotKey) {
  const list = slotFiles.value[slotKey] || [];
  let cnt = 0;
  for (const f of list) {
    if (uploadedMap.value[f.uid]) cnt += 1;
  }
  return cnt;
}

function slotUploadingCount(slotKey) {
  const list = slotFiles.value[slotKey] || [];
  let cnt = 0;
  for (const f of list) {
    if (uploadState.value[f.uid]?.status === "uploading") cnt += 1;
  }
  return cnt;
}

function resetAll() {
  meta.value = { customer_group_id: null, channel_group_id: null };
  for (const k of Object.keys(formData.value)) formData.value[k] = "";

  certExpanded.value = false;
  idExpanded.value = false;
  dlExpanded.value = false;

  for (const s of IMAGE_SLOTS) clearSlot(s.key);

  uploadedMap.value = {};
  uploadState.value = {};
}

function buildDynamicData() {
  const base = { ...formData.value };

  // 只保留有值字段（不把 group_id 塞进 dynamic_data，避免口径混淆）
  for (const [k, v] of Object.entries(base)) {
    if (v === "" || v === null || v === undefined) delete base[k];
  }
  return base;
}

function collectFinalizeImages() {
  const out = [];
  for (const slot of IMAGE_SLOTS) {
    const list = slotFiles.value[slot.key] || [];
    for (const f of list) {
      const m = uploadedMap.value[f.uid];
      if (!m) continue;
      out.push({
        slot_key: m.slot_key,
        storage_key: m.storage_key,
        md5: m.md5,
        size: m.size || 0,
        content_type: m.content_type ?? undefined,
        etag: m.etag ?? undefined,
        original_name: m.original_name ?? undefined,
      });
    }
  }
  return out;
}

/** 统一提交：全部走 draft -> finalize（无图也走同口径） */
async function submit() {
  try {
    await metaFormRef.value?.validate?.();
  } catch {
    ElMessage.warning("客户群、渠道群为必选项，请先选择");
    return;
  }

  if (uploadingCount.value > 0) {
    ElMessage.warning("还有文件在上传中，请稍后再提交");
    return;
  }

  submitting.value = true;
  try {
    const dynamicData = buildDynamicData();
    const images = collectFinalizeImages();

    const draftResp = await createOrderDraft({
      module: "order",
      dynamic_data: dynamicData || {},
      customer_group_id: meta.value.customer_group_id ?? undefined,
      channel_group_id: meta.value.channel_group_id ?? undefined,
    });

    const draft = draftResp?.data?.data ?? draftResp?.data ?? draftResp;
    const orderId = draft?.order_id;
    if (!orderId) throw new Error("draft failed: missing order_id");

    await finalizeOrderUpload({
      order_id: orderId,
      images, // 可为空数组（无图也统一 finalize）
      dynamic_data: dynamicData || {},
      customer_group_id: meta.value.customer_group_id ?? undefined,
      channel_group_id: meta.value.channel_group_id ?? undefined,
    });

    if (images.length > 0) {
      ElNotification({
        title: "创建成功",
        message: "订单已创建并提交识别任务，稍后可在订单详情查看回填结果。",
        type: "success",
        duration: 3500,
      });
    } else {
      ElMessage.success("订单创建成功");
    }

    router.push({ path: `/orders/${orderId}` });
  } catch (e) {
    console.error(e);
    ElMessage.error(`提交失败：${normalizeErrMsg(e, "提交失败，请稍后重试")}`);
  } finally {
    submitting.value = false;
  }
}

async function loadGroups() {
  groupsLoading.value = true;
  try {
    const [cg, ch] = await Promise.all([getCustomerGroups(), getChannelGroups()]);
    customerGroups.value = cg?.data?.items || cg?.data || [];
    channelGroups.value = ch?.data?.items || ch?.data || [];
  } catch (e) {
    console.error(e);
    ElMessage.error("加载客户/渠道分组失败");
  } finally {
    groupsLoading.value = false;
  }
}

onMounted(() => {
  loadUploadMode();
  loadGroups();
});

onBeforeUnmount(() => {
  for (const uid of Object.keys(localPreviewUrlMap.value)) {
    _revokeLocalPreviewByUid(uid);
  }
});
</script>

<style scoped>
.order-create {
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
}

.section-card {
  border-radius: 12px;
  border: 1px solid rgba(60, 60, 60, 0.08);
  margin-bottom: 12px;
}

.upload-mode-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 36px;
}

.upload-mode {
  display: flex;
  align-items: center;
  gap: 8px;
}

.upload-mode-label {
  font-size: 12px;
  color: rgba(31, 42, 68, 0.72);
  font-weight: 700;
}

.upload-mode-tip {
  font-size: 12px;
  color: rgba(31, 42, 68, 0.5);
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

.kv-grid {
  display: grid;
  gap: 10px 14px;
}
.kv-grid-2 {
  grid-template-columns: 1fr 1fr;
}

.kv-item {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid rgba(60, 60, 60, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);
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

.fv {
  width: 100%;
}
.fv :deep(.el-input__wrapper) {
  border-radius: 10px;
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
  background: rgba(255, 255, 255, 0.6);
}

.sub-title {
  font-weight: 800;
  color: rgba(31, 42, 68, 0.92);
  margin-bottom: 10px;
}

.upload-title {
  font-size: 13px;
  color: rgba(31, 42, 68, 0.82);
  font-weight: 750;
  margin-bottom: 8px;
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.slot-sub {
  font-size: 12px;
  color: rgba(31, 42, 68, 0.48);
  font-weight: 650;
}

.muted {
  color: #999;
}

.ready-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #00e676;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.18);
  display: inline-block;
  vertical-align: -1px;
}

.upload-box :deep(.el-upload-dragger) {
  border-radius: 12px;
  min-height: 170px;
}

.upload-one :deep(.el-upload-dragger) {
  padding: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
}

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
  font-weight: 650;
}

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
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.22));
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  padding: 10px;
  pointer-events: none;
}

.one-mask-text {
  color: rgba(255, 255, 255, 0.92);
  font-size: 12px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.upload-card :deep(.el-upload--picture-card) {
  width: 100%;
}
.upload-trigger {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  gap: 6px;
}
.upload-plus {
  font-size: 22px;
  color: rgba(31, 42, 68, 0.65);
}
.upload-text {
  font-size: 12px;
  color: rgba(31, 42, 68, 0.55);
  font-weight: 650;
}

.upload-wide :deep(.el-upload--picture-card) {
  width: 120px;
}

.slot-foot {
  margin-top: 8px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.slot-foot-left {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.slot-foot-right {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
}

.uploading-tip {
  margin-top: 10px;
  font-size: 12px;
  color: #e6a23c;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}

@media (max-width: 980px) {
  .upload-mode-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .two-col {
    grid-template-columns: 1fr;
  }
  .right {
    border-left: none;
    padding-left: 0;
  }
  .kv-grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
