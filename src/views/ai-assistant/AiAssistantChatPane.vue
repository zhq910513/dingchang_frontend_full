<!-- src/views/ai-assistant/AiAssistantWorkbench.vue -->
<template>
  <div
    class="ai-page"
    :class="{
      'page-drag-over': dragOver,
      'ai-pane-mode': paneMode,
      [`ai-pane-count-${paneCount}`]: paneMode,
    }"
    @dragenter.prevent.stop="handleDragEnter"
    @dragover.prevent.stop="handleDragOver"
    @dragleave.prevent.stop="handleDragLeave"
    @drop.prevent.stop="handleDrop"
  >
    <el-card v-if="!paneMode" shadow="never" class="head-card">
      <div class="head-row">
        <div class="head-main">
          <h2 class="page-title">欢迎进入报价流程</h2>
        </div>

        <div class="head-actions">
          <div class="manage-actions">
            <el-button v-if="canManageQuoteAccounts" size="small" type="primary" plain @click="openAccountDialog">平台账号管理</el-button>
            <el-button v-if="isSuperAdmin" size="small" plain @click="openDefaultConfigDialog">默认参数配置</el-button>
          </div>
          <el-popover placement="bottom-end" trigger="click" width="300" popper-class="quote-guide-popover">
            <template #reference>
              <el-button class="guide-trigger" size="small" circle title="操作指南">?</el-button>
            </template>
            <div class="guide-pop">
              <div class="guide-pop-title">操作指南</div>
              <div class="guide-pop-line">1. 可拖入资料图片；客户不方便给图片时，输入“手工”填写表单。</div>
              <div class="guide-pop-line">2. 后台会静默整理材料，等待报价指令。</div>
              <div class="guide-pop-line">3. 输入“平台名+报价”，例如：人保报价。</div>
              <div class="guide-pop-tip">图片不全时可输入“补资料”，系统会按当前缺项打开补充表单。</div>
            </div>
          </el-popover>
        </div>
      </div>

    </el-card>

    <el-card shadow="never" class="chat-card">
      <template #header>
        <div class="card-header">
          <div class="card-header-left">
            <span class="card-header-title">{{ paneLabel }}</span>
            <div class="card-header-meta">
              <span v-if="messagesSafe.length" class="card-header-count">{{ messagesSafe.length }} 条消息</span>
              <span v-if="messagesSafe.length && workbenchStatusText" class="card-header-dot">·</span>
              <span v-if="workbenchStatusText" class="card-header-state">{{ workbenchStatusText }}</span>
            </div>
          </div>
          <div class="header-actions">
            <el-button
              v-if="showHeaderNewSessionButton"
              size="small"
              text
              :disabled="multiOpenEnabled && !canAddPane"
              @click="handleNewSessionButtonClick"
            >
              {{ headerNewSessionLabel }}
            </el-button>
            <el-popover
              v-model:visible="historyPopoverVisible"
              placement="bottom-end"
              trigger="click"
              width="360"
              popper-class="assistant-history-popover"
              @show="handleHistoryPopoverShow"
            >
              <template #reference>
                <el-button size="small" text :loading="loadingSessionsSafe">{{ headerHistoryLabel }}</el-button>
              </template>
              <div class="history-panel">
                <div class="history-panel-head">
                  <strong>历史会话</strong>
                  <span>默认打开最近一次会话</span>
                </div>
                <div class="history-session-list" @scroll="handleHistorySessionsScroll">
                  <div v-if="loadingSessionsSafe && !sessionsSafe.length" class="history-session-loading">
                    <el-icon class="is-loading"><Loading /></el-icon>
                    <span>加载中</span>
                  </div>
                  <button
                    v-for="item in sessionsSafe"
                    :key="item.session_id"
                    type="button"
                    class="history-session-item"
                    :class="{ active: isCurrentHistorySession(item) }"
                    @click="handleSelectHistorySession(item)"
                  >
                    <span class="history-session-main">
                      <strong>{{ historySessionTitle(item) }}</strong>
                      <em>{{ historySessionPreview(item) }}</em>
                    </span>
                    <span class="history-session-side">
                      <i>{{ historySessionRelativeTime(item) }}</i>
                      <b>{{ historySessionClock(item) }}</b>
                    </span>
                  </button>
                  <div v-if="loadingMoreSessionsSafe" class="history-session-loading small">
                    <el-icon class="is-loading"><Loading /></el-icon>
                    <span>继续加载</span>
                  </div>
                  <div v-else-if="sessionsHasMoreSafe" class="history-session-more">下滑加载更多</div>
                  <div v-else-if="sessionsSafe.length" class="history-session-more">没有更多会话了</div>
                  <el-empty v-else description="暂无历史会话" :image-size="72" />
                </div>
              </div>
            </el-popover>
            <el-button size="small" text @click="reloadHistory" :loading="loadingHistorySafe">{{ headerRefreshLabel }}</el-button>
            <el-button
              v-if="showCloseButton"
              size="small"
              text
              type="danger"
              @click="emit('close-session-request')"
            >
              {{ headerCloseLabel }}
            </el-button>
          </div>
        </div>
      </template>

      <div
        ref="chatBodyRef"
        class="chat-body"
        :class="{ 'drag-over': dragOver }"
        :aria-busy="loadingInitSafe || loadingHistorySafe || loadingMoreHistorySafe || sendingSafe || uploadBusy"
        @scroll="handleChatScroll"
      >
        <div v-if="dragOver" class="drop-mask">
          <div class="drop-card">
            <div class="drop-title">释放图片</div>
            <div class="drop-sub">我会上传并自动识别材料类型</div>
          </div>
        </div>

        <div v-if="loadingInitSafe || loadingHistorySafe" class="empty-wrap">
          <el-skeleton :rows="6" animated />
        </div>

        <div v-else-if="!messagesSafe.length" class="empty-wrap">
          <el-empty :description="''" />
        </div>

        <div v-else class="msg-list" role="log" aria-live="polite" aria-relevant="additions text">
          <div v-if="historyHasMoreSafe" class="load-more-row">
            <el-button
              size="small"
              text
              :loading="loadingMoreHistorySafe"
              @click="handleLoadMoreHistoryClick"
            >
              查看更早消息
            </el-button>
          </div>

          <div
            v-for="m in messagesSafe"
            :key="m.id"
            class="msg-item"
            :class="[`msg-${m.role || 'system'}`]"
          >
            <div class="msg-avatar">{{ roleShort(m.role) }}</div>

            <div class="msg-content">
                <div class="msg-head">
                  <span class="msg-role">{{ roleLabel(m.role) }}</span>
                  <span class="msg-time">{{ formatTime(m.created_at) }}</span>
                </div>

              <div class="msg-bubble" :class="{ 'msg-bubble-quote': quoteResultCard(m) }">
                <div v-if="displayMessageContent(m)" class="msg-text">{{ displayMessageContent(m) }}</div>

                <div v-if="messageImages(m).length" class="msg-images">
                  <div
                    v-for="(img, idx) in messageImages(m)"
                    :key="`${m.id}_${idx}_${imageUrl(img)}`"
                    class="msg-image-wrap"
                    :class="{
                      recalled: imageRecalled(img),
                      'quote-result-image-wrap': isQuoteResultImage(img),
                      'quote-result-image-clickable': isQuoteResultImage(img),
                    }"
                    @click="isQuoteResultImage(img) && openQuoteImagePreview(m, img)"
                  >
                    <el-image
                      v-if="imageUrl(img)"
                      :src="imageUrl(img)"
                      :fit="isQuoteResultImage(img) ? 'contain' : 'cover'"
                      class="msg-image"
                      @load="handleMessageImageLoad"
                      :preview-src-list="isQuoteResultImage(img) ? [] : messageImages(m).map(imageUrl).filter(Boolean)"
                      :preview-teleported="!isQuoteResultImage(img)"
                    >
                      <template #placeholder>
                        <div class="image-loading" :class="{ 'quote-result-image-loading': isQuoteResultImage(img) }">
                          <el-icon class="is-loading"><Loading /></el-icon>
                        </div>
                      </template>
                      <template #error>
                        <div class="image-error">无法预览</div>
                      </template>
                    </el-image>
                    <div v-else class="image-loading" :class="{ 'quote-result-image-loading': isQuoteResultImage(img) }">
                      <el-icon class="is-loading"><Loading /></el-icon>
                    </div>
                    <div v-if="imageRecalled(img)" class="recalled-mask">已撤回</div>
                    <el-button
                      v-else-if="canRecallImage(m, img)"
                      size="small"
                      type="danger"
                      class="recall-btn"
                      @click.stop="handleRecallImage(m, img)"
                    >
                      撤回
                    </el-button>
                  </div>
                </div>

                <div v-if="shouldShowDataHint(m)" class="data-hint">
                  <el-alert
                    :title="sanitizeChatDisplayText(m.metadata.data.message)"
                    :type="resultStatusAlertType(m.metadata.data.result_status)"
                    :closable="false"
                    show-icon
                  />
                </div>

                <div v-if="shouldShowInlineQuoteCard(m)" class="quote-result-card">
                  <div class="quote-card-title">
                    <div class="quote-card-ribbon">
                      <span class="quote-card-step">3</span>
                      <span>{{ quoteResultCard(m).title || "报价结果" }}</span>
                    </div>
                    <label class="quote-tax-check">
                      <input
                        type="checkbox"
                        :checked="quoteResultCard(m).include_tax !== false"
                        tabindex="-1"
                        aria-disabled="true"
                        @click.prevent
                      />
                      <span>含税</span>
                    </label>
                  </div>
                  <div class="quote-card-head">
                    <span>险别名称</span>
                    <span>保额(元)</span>
                    <span>保费(元)</span>
                  </div>
                  <div class="quote-total-line">
                    <strong><i class="quote-badge quote-badge-total">总</i>总保费</strong>
                    <strong>{{ moneyText(quoteResultCard(m).total_premium) }}</strong>
                  </div>
                  <div class="quote-section-line">
                    <strong><i class="quote-badge quote-badge-bi">商</i>商业险</strong>
                    <strong>{{ moneyText(quoteResultCard(m).commercial_premium) }}</strong>
                  </div>
                  <div class="quote-coverage-table">
                    <div
                      v-for="item in quoteCoverageItems(m)"
                      :key="item.name"
                      class="quote-coverage-row"
                    >
                      <span>{{ quoteCoverageName(item.name) }}</span>
                      <span>{{ amountText(item.amount) }}</span>
                      <span>{{ moneyText(item.premium) }}</span>
                    </div>
                  </div>
                  <div class="quote-section-line">
                    <strong><i class="quote-badge quote-badge-ci">交</i>交强险 <em>增值税</em></strong>
                    <strong class="quote-down-premium">↓ {{ moneyText(quoteResultCard(m).compulsory_premium) }}</strong>
                  </div>
                  <div class="quote-section-line thin">
                    <span>车船税 <em>详情</em><b class="quote-blue-caret"></b></span>
                    <strong>{{ moneyText(quoteResultCard(m).vehicle_tax) }}</strong>
                  </div>
                  <div class="quote-section-line thin">
                    <span>{{ quoteJointSalesLabel(quoteResultCard(m)) }}</span>
                    <strong>{{ moneyText(quoteResultCard(m).joint_sales_premium) }}</strong>
                  </div>
                  <div v-if="quoteJointSalesAmountText(quoteResultCard(m))" class="quote-section-line thin muted">
                    <span>途家安顺保额</span>
                    <strong>{{ quoteJointSalesAmountText(quoteResultCard(m)) }}</strong>
                  </div>
                  <div class="quote-section-line thin">
                    <span>驾意险</span>
                    <strong>{{ moneyText(quoteResultCard(m).driver_accident_premium) }}</strong>
                  </div>
                  <div class="quote-link-line">承保条件改善</div>
                  <div class="quote-claim-line">
                    <span>理赔信息</span>
                    <span><i class="quote-badge quote-badge-bi">商</i>{{ quoteResultCard(m).claim_business_count ?? 0 }}</span>
                    <span><i class="quote-badge quote-badge-ci">交</i>{{ quoteResultCard(m).claim_compulsory_count ?? 0 }}</span>
                    <span class="quote-claim-query">理赔查询</span>
                  </div>
                  <div class="quote-risk-line">
                    <span>人保风险水平</span>
                    <strong>
                      <span class="quote-risk-score">{{ quoteResultCard(m).risk_score ?? "-" }} 分</span>
                      <span class="quote-risk-arrow">▲</span>
                    </strong>
                  </div>
                </div>

                <div v-if="shouldShowMessageActions(m)" class="action-wrap">
                  <div class="action-title">建议动作</div>
                  <div class="action-list">
                    <el-button
                      v-for="(a, idx) in m.metadata.actions"
                      :key="`${m.id}_${idx}`"
                      size="small"
                      @click="handleAction(a)"
                    >
                      {{ sanitizeChatDisplayText(a.label || a.type) }}
                    </el-button>
                  </div>
                </div>

                <div v-if="m.metadata?.error" class="err-wrap">
                  <el-alert
                    :title="sanitizeChatDisplayText(m.metadata.error.message || '处理失败')"
                    type="error"
                    :closable="false"
                    show-icon
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <transition name="scroll-fade">
          <button
            v-if="showScrollToBottom"
            type="button"
            class="scroll-bottom-btn"
            aria-label="回到底部"
            @click="forceStickToBottom"
          >
            回到底部
          </button>
        </transition>
      </div>

      <div class="chat-input-wrap">
        <div v-if="workbenchStatusText" class="workbench-status" :class="{ busy: workbenchBusy }" role="status" aria-live="polite">
          <span class="workbench-status-dot"></span>
          <span>{{ workbenchStatusText }}</span>
        </div>
        <el-input
          ref="inputRef"
          v-model="inputText"
          type="textarea"
          :rows="3"
          resize="none"
          placeholder="输入："
          @keydown.enter.exact.prevent="handleSend"
        />
        <div v-if="inputAssistHint" class="input-assist" :class="{ warning: inputAssistWarning }">
          {{ inputAssistHint }}
        </div>
        <div class="input-actions">
          <div class="btns">
            <input
              ref="fileInputRef"
              type="file"
              multiple
              accept="image/*"
              class="hidden-file"
              @change="handleFilePicked"
            />
            <el-button size="small" @click="pickFiles">上传图片</el-button>
            <el-button size="small" @click="inputText = ''" :disabled="sendingSafe || uploadBusy">清空</el-button>
            <el-button size="small" type="primary" :loading="sendButtonLoadingSafe" :disabled="sendButtonDisabledSafe" @click="handleSend">发送</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <el-dialog v-model="accountDialogVisible" title="平台账号管理" width="1040px" destroy-on-close class="account-dialog">
      <div class="account-toolbar">
        <el-select
          v-model="accountFilters.platform_code"
          clearable
          filterable
          placeholder="全部平台"
          style="width: 150px"
          @change="loadPlatformAccounts"
        >
          <el-option
            v-for="p in quotePlatforms"
            :key="p.platform_code"
            :label="p.platform_name"
            :value="p.platform_code"
          />
        </el-select>
        <el-input
          v-model="accountFilters.keyword"
          clearable
          placeholder="搜索账号/类型/归属人"
          style="width: 190px"
          @keyup.enter="loadPlatformAccounts"
          @clear="loadPlatformAccounts"
        />
        <div class="account-toolbar-spacer"></div>
        <el-button :loading="loadingAccounts" @click="loadPlatformAccounts">刷新</el-button>
        <el-button type="primary" @click="openAccountForm()">新增账号</el-button>
      </div>

      <el-table :data="platformAccounts" v-loading="loadingAccounts" border size="small" max-height="560" class="account-table">
        <el-table-column prop="platform_name" label="平台" width="86">
          <template #default="{ row }">{{ row.platform_name || row.platform_code || "-" }}</template>
        </el-table-column>
        <el-table-column prop="account_type_name" label="类型" width="104">
          <template #default="{ row }">{{ row.account_type_name || "通用" }}</template>
        </el-table-column>
        <el-table-column prop="account_username" label="账号" min-width="130" />
        <el-table-column label="登录状态" width="94" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="loginStatusTag(row.login_status)" effect="plain">
              {{ loginStatusText(row.login_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="启用/自动" width="108" align="center">
          <template #default="{ row }">
            <div class="account-inline-tags">
              <el-tag size="small" :type="row.enabled ? 'success' : 'info'" effect="plain">
                {{ row.enabled ? "启用" : "停用" }}
              </el-tag>
              <el-tag size="small" :type="row.auto_login ? 'success' : 'info'" effect="plain">
                {{ row.auto_login ? "自动" : "手动" }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="剩余额度" width="98">
          <template #default="{ row }">
            <el-tag size="small" :type="quotaRemainingTag(row)" effect="plain">
              {{ quotaRemainingText(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="巡检/错误" min-width="210">
          <template #default="{ row }">
            <span class="account-notice" :class="{ warning: !!inspectionNoticeText(row) }">
              {{ accountNoticeText(row) || "-" }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="92" align="center">
          <template #default="{ row }">
            <span class="account-muted">{{ compactDateTime(row.updated_at) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="92" align="center">
          <template #default="{ row }">
            <div class="account-actions">
              <el-button size="small" text @click="openAccountForm(row)">编辑</el-button>
              <el-button
                size="small"
                type="primary"
                text
                :loading="loginAccountId === row.id"
                :disabled="accountLoginButtonDisabled(row)"
                @click="handleAccountLogin(row)"
              >
                登录
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog
        v-model="accountFormVisible"
        :title="editingAccount?.id ? '编辑平台账号' : '新增平台账号'"
        width="560px"
        append-to-body
        destroy-on-close
      >
        <el-form label-position="top">
          <div v-if="loadingAccountForm" class="account-form-hint">正在补全密码和手机号，稍后自动显示</div>
          <el-form-item label="平台" required>
            <el-select
              v-model="accountForm.platform_code"
              filterable
              placeholder="请选择平台"
              style="width: 100%"
              @change="handleAccountPlatformChange"
            >
              <el-option
                v-for="p in quotePlatforms"
                :key="p.platform_code"
                :label="p.platform_name"
                :value="p.platform_code"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="账号类型标签">
            <el-select
              v-model="accountForm.account_type_name"
              clearable
              filterable
              placeholder="选填，用于同平台账号优先级"
              style="width: 100%"
            >
              <el-option
                v-for="t in fixedQuoteAccountTypeOptions"
                :key="t.value || 'generic'"
                :label="t.label"
                :value="t.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="账号" required>
            <el-input v-model="accountForm.account_username" maxlength="128" placeholder="请输入平台账号" />
          </el-form-item>
          <el-form-item label="密码" :required="!editingAccount?.id">
            <el-input
              v-model="accountForm.account_password"
              type="password"
              show-password
              maxlength="256"
              placeholder="请输入平台密码"
            />
          </el-form-item>
          <el-form-item label="绑定手机号">
            <el-input v-model="accountForm.login_phone" maxlength="11" :placeholder="loginPhonePlaceholder" />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input v-model="accountForm.email" maxlength="128" placeholder="选填" />
          </el-form-item>
          <el-form-item label="账号归属人">
            <el-input v-model="accountForm.account_owner_name" maxlength="64" placeholder="选填" />
          </el-form-item>
          <el-form-item label="查询额度">
            <div class="account-quota-row">
              <el-input
                v-model="accountForm.quota_limit"
                type="number"
                min="0"
                placeholder="不填则不限"
                style="width: 160px"
              />
              <el-radio-group v-model="accountForm.quota_period_type" size="small">
                <el-radio-button label="day">日</el-radio-button>
                <el-radio-button label="week">周</el-radio-button>
                <el-radio-button label="month">月</el-radio-button>
              </el-radio-group>
            </div>
          </el-form-item>
          <div class="account-switch-row">
            <el-switch v-model="accountForm.auto_login" active-text="允许自动登录" />
            <el-switch v-model="accountForm.enabled" active-text="启用账号" />
          </div>
        </el-form>
        <template #footer>
          <el-button @click="accountFormVisible = false">取消</el-button>
          <el-button type="primary" :loading="savingAccount" @click="submitAccountForm">保存</el-button>
        </template>
      </el-dialog>
    </el-dialog>

    <el-dialog v-model="defaultConfigDialogVisible" title="默认参数配置" width="980px" destroy-on-close>
      <div class="account-toolbar">
        <el-select
          v-model="defaultConfigFilters.platform_code"
          clearable
          filterable
          placeholder="全部平台"
          style="width: 180px"
          @change="handleDefaultConfigFilterPlatformChange"
        >
          <el-option
            v-for="p in quotePlatforms"
            :key="p.platform_code"
            :label="p.platform_name"
            :value="p.platform_code"
          />
        </el-select>
        <el-select
          v-model="defaultConfigFilters.account_type_name"
          clearable
          filterable
          placeholder="适用类型"
          style="width: 180px"
          @change="loadDefaultConfigs"
        >
          <el-option
            v-for="t in fixedQuoteAccountTypes"
            :key="t"
            :label="t"
            :value="t"
          />
        </el-select>
        <el-button :loading="loadingDefaultConfigs" @click="loadDefaultConfigs">刷新</el-button>
        <el-button type="primary" @click="openDefaultConfigForm()">新增配置</el-button>
      </div>

      <el-table :data="defaultConfigs" v-loading="loadingDefaultConfigs" border size="small" max-height="420">
        <el-table-column prop="platform_name" label="平台" min-width="100" />
        <el-table-column label="适用类型" min-width="110">
          <template #default="{ row }">{{ row.account_type_name || "通用" }}</template>
        </el-table-column>
        <el-table-column label="默认字段" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">{{ summarizeDefaultValues(row.default_values) }}</template>
        </el-table-column>
        <el-table-column label="启用" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.enabled ? 'success' : 'info'" effect="plain">
              {{ row.enabled ? "启用" : "停用" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" min-width="150" />
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <el-button size="small" text @click="openDefaultConfigForm(row)">编辑</el-button>
            <el-button size="small" type="danger" text @click="handleDeleteDefaultConfig(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog
        v-model="defaultConfigFormVisible"
        :title="editingDefaultConfig?.id ? '编辑默认参数' : '新增默认参数'"
        width="620px"
        append-to-body
        destroy-on-close
      >
        <el-form label-position="top">
          <el-form-item label="平台" required>
            <el-select
              v-model="defaultConfigForm.platform_code"
              filterable
              placeholder="请选择平台"
              style="width: 100%"
              @change="handleDefaultConfigPlatformChange"
            >
              <el-option
                v-for="p in quotePlatforms"
                :key="p.platform_code"
                :label="p.platform_name"
                :value="p.platform_code"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="适用类型" required>
            <el-select
              v-model="defaultConfigForm.account_type_name"
              filterable
              placeholder="请选择适用账号类型"
              style="width: 100%"
              @change="handleDefaultConfigAccountTypeChange"
            >
              <el-option
                v-for="t in fixedQuoteAccountTypes"
                :key="t"
                :label="t"
                :value="t"
              />
            </el-select>
          </el-form-item>
          <div class="default-field-head">
            <span>字段名需与平台原始表单字段一致</span>
            <div class="default-field-actions">
              <el-button size="small" plain @click="applyDefaultProductTemplate">投保产品字段模板</el-button>
              <el-button size="small" @click="addDefaultConfigField">添加字段</el-button>
            </div>
          </div>
          <div class="default-template-tip">
            人保真实报价会按账号类型读取投保产品字段。取值优先级：会话中临时调整 > 此处配置值 > 系统兜底默认值。
            数值字段只能填正数；途家安顺保费允许填 0。
          </div>
          <div class="default-field-list">
            <div v-for="(field, idx) in defaultConfigForm.fields" :key="idx" class="default-field-row">
              <el-input
                v-model="field.field_name"
                placeholder="字段名，例如 是否过户"
                maxlength="128"
                @change="normalizeDefaultConfigFieldValue(field)"
              />
              <el-select
                v-if="isBooleanDefaultConfigField(field.field_name)"
                v-model="field.field_value"
                placeholder="请选择"
              >
                <el-option label="勾选" value="勾选" />
                <el-option label="不勾选" value="不勾选" />
              </el-select>
              <el-input
                v-else
                v-model="field.field_value"
                placeholder="请输入默认值"
                maxlength="4096"
              />
              <el-button type="danger" text @click="removeDefaultConfigField(idx)">删除</el-button>
            </div>
          </div>
          <el-form-item label="状态">
            <el-switch v-model="defaultConfigForm.enabled" active-text="启用" inactive-text="停用" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="defaultConfigFormVisible = false">取消</el-button>
          <el-button type="primary" :loading="savingDefaultConfig" @click="submitDefaultConfigForm">保存</el-button>
        </template>
      </el-dialog>
    </el-dialog>

    <el-dialog
      v-model="quoteImagePreviewVisible"
      title="报价结果图预览"
      width="90vw"
      top="4vh"
      destroy-on-close
      class="quote-image-preview-dialog"
      @closed="closeQuoteImagePreview"
    >
      <div class="quote-image-preview-wrap">
        <div v-if="quoteImagePreviewTitle" class="quote-image-preview-title">{{ quoteImagePreviewTitle }}</div>
        <img
          v-if="quoteImagePreviewUrl"
          :src="quoteImagePreviewUrl"
          :alt="quoteImagePreviewTitle || '报价结果图'"
          class="quote-image-preview-img"
        />
      </div>
      <template #footer>
        <el-button @click="closeQuoteImagePreview">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="quoteMaterialFormVisible"
      :title="quoteMaterialFormTitle"
      width="680px"
      append-to-body
      destroy-on-close
      class="quote-material-form-dialog"
    >
      <div class="quote-material-form-intro">
        <span>{{ quoteMaterialFormDescription }}</span>
      </div>
      <div v-if="quoteMaterialMissingTexts.length" class="quote-material-missing">
        <span>当前缺少：</span>
        <el-tag
          v-for="item in quoteMaterialMissingTexts"
          :key="item"
          size="small"
          type="warning"
          effect="plain"
        >
          {{ item }}
        </el-tag>
      </div>
      <el-form label-position="top" class="quote-material-form">
        <el-form-item
          v-for="field in quoteMaterialFormFields"
          :key="field.key"
          :label="quoteMaterialFieldLabel(field)"
          :required="quoteMaterialFieldRequired(field)"
        >
          <el-select
            v-if="field.type === 'select'"
            v-model="quoteMaterialFormValues[field.key]"
            filterable
            placeholder="请选择"
            style="width: 100%"
          >
            <el-option
              v-for="opt in quoteMaterialFieldOptions(field)"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <el-date-picker
            v-else-if="field.type === 'date'"
            v-model="quoteMaterialFormValues[field.key]"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="请选择日期"
            style="width: 100%"
          />
          <el-input
            v-else
            v-model="quoteMaterialFormValues[field.key]"
            :placeholder="field.placeholder || `请输入${field.label || field.key}`"
            maxlength="128"
            clearable
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="quoteMaterialFormVisible = false">取消</el-button>
        <el-button type="primary" :loading="quoteMaterialFormSubmitting" @click="submitQuoteMaterialForm">
          提交资料
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ElMessage, ElMessageBox, ElNotification } from "element-plus";
import { Loading } from "@element-plus/icons-vue";
import {
  createAiPlatformAccount,
  createAiPlatformDefaultConfig,
  deleteAiPlatformDefaultConfig,
  getAiPlatformAccountHealth,
  getAiPlatformAccount,
  listAiPlatformAccounts,
  listAiPlatformAccountTypes,
  listAiPlatformDefaultConfigs,
  listAiQuotePlatforms,
  loginAiPlatformAccount,
  recallAiSessionImages,
  submitAiPlatformAccountLoginChallenge,
  updateAiPlatformAccount,
  updateAiPlatformDefaultConfig,
  uploadAiAssistantImage,
} from "../../api/aiAssistant";
import { ROLE } from "../../constants";
import { useSessionStore } from "../../store/session";
import { getApiErrorMessage } from "../../utils/errorMessage";
import { useAiAssistantSession } from "./composables/useAiAssistantSession";
import { sanitizeQuoteUserText } from "./utils/sensitiveRedaction";

const props = defineProps({
  paneMode: { type: Boolean, default: false },
  multiOpenEnabled: { type: Boolean, default: false },
  canAddPane: { type: Boolean, default: true },
  paneIndex: { type: Number, default: 1 },
  paneCount: { type: Number, default: 1 },
  showCloseButton: { type: Boolean, default: false },
});
const emit = defineEmits(["new-session-request", "toggle-multi-open", "close-session-request"]);

const chatBodyRef = ref(null);
const fileInputRef = ref(null);
const inputRef = ref(null);
const sessionStore = useSessionStore();
const inputText = ref("");
const pendingImageHint = ref("");
const dragOver = ref(false);
const dragDepth = ref(0);
const activeUploadBatchCount = ref(0);
const uploadBusy = computed(() => activeUploadBatchCount.value > 0);
const uploadingImages = ref([]);
const localPreviewUrls = ref(new Set());
const pendingQuoteAfterImage = ref(null);
let latestSuccessfulImageCollect = null;
let platformHealthPromptKey = "";
let platformHealthPromptAt = 0;
let platformHealthCheckedAt = 0;
let checkingPlatformAccountHealth = false;

const accountDialogVisible = ref(false);
const accountFormVisible = ref(false);
const savingAccount = ref(false);
const loadingAccounts = ref(false);
const loadingAccountForm = ref(false);
const accountFormSnapshot = ref({});
const quotePlatforms = ref([]);
const platformAccounts = ref([]);
const accountTypeOptions = ref([]);
const editingAccount = ref(null);
const loginAccountId = ref(null);
const accountFilters = ref({ platform_code: "", keyword: "" });
const accountForm = ref({
  platform_code: "",
  platform_name: "",
  account_type_name: "",
  account_username: "",
  account_password: "",
  login_phone: "",
  email: "",
  account_owner_name: "",
  auto_login: true,
  enabled: true,
  quota_limit: "",
  quota_period_type: "day",
  confirm_enabled_edit: false,
});
const defaultConfigDialogVisible = ref(false);
const defaultConfigFormVisible = ref(false);
const loadingDefaultConfigs = ref(false);
const savingDefaultConfig = ref(false);
const defaultConfigs = ref([]);
const defaultConfigTypeOptions = ref([]);
const editingDefaultConfig = ref(null);
const defaultConfigFilters = ref({ platform_code: "", account_type_name: "" });
const defaultConfigForm = ref({
  platform_code: "",
  platform_name: "",
  account_type_name: "",
  enabled: true,
  fields: [{ field_name: "", field_value: "" }],
});
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const QUOTE_IMAGE_UPLOAD_CONCURRENCY = 4;
const QUOTE_IMAGE_COMPRESS_MIN_BYTES = 2.5 * 1024 * 1024;
const QUOTE_IMAGE_COMPRESS_MAX_EDGE = 2600;
const QUOTE_IMAGE_COMPRESS_QUALITY = 0.9;
const QUOTE_FOLLOWUP_DELAY_MS = 3 * 60 * 1000;
const PLATFORM_HEALTH_PROMPT_INTERVAL_MS = 5 * 60 * 1000;
const PLATFORM_HEALTH_CHECK_INTERVAL_MS = 60 * 1000;
const ALLOWED_IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp", "bmp", "gif", "heic", "heif"]);
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/bmp",
  "image/gif",
  "image/heic",
  "image/heif",
]);
const INVALID_QUOTE_PLATFORM_HINTS = new Set(["重新", "再次", "再"]);
const fixedQuoteAccountTypes = ["油车-新", "油车-旧", "新能源车-新", "新能源车-旧"];
const fixedQuoteAccountTypeSet = new Set(fixedQuoteAccountTypes);
const ACCOUNT_TYPE_GENERIC_VALUE = "__generic__";
const fixedQuoteAccountTypeOptions = [
  { label: "通用", value: ACCOUNT_TYPE_GENERIC_VALUE },
  ...fixedQuoteAccountTypes.map((typeName) => ({ label: typeName, value: typeName })),
];
const defaultProductSeatCoverageByType = {
  "油车-新": "2",
  "油车-旧": "2",
  "新能源车-新": "5",
  "新能源车-旧": "1",
};
const booleanDefaultConfigFieldNames = new Set(["共享主险限额"]);
const zeroAllowedDefaultConfigFieldNames = new Set(["途家安顺保费"]);
const booleanDefaultConfigTrueTexts = new Set(["true", "1", "yes", "y", "是", "勾选", "选中", "启用", "开启"]);
const booleanDefaultConfigFalseTexts = new Set(["false", "0", "no", "n", "否", "不勾选", "未勾选", "停用", "关闭"]);

function defaultProductConfigTemplateForType(typeName) {
  const seatCoverage = defaultProductSeatCoverageByType[String(typeName || "").trim()] || "2";
  return [
    { field_name: "途家安顺保费", field_value: "398" },
    { field_name: "交强", field_value: "20" },
    { field_name: "机动车损失保险", field_value: "" },
    { field_name: "第三者责任险", field_value: "300" },
    { field_name: "车上人员责任险（司机）", field_value: seatCoverage },
    { field_name: "车上人员责任险（乘客）", field_value: seatCoverage },
    { field_name: "共享主险限额", field_value: "勾选" },
    { field_name: "医保外医疗费用责任险（第三者责任险）", field_value: "300" },
  ];
}

function formAccountTypeName(value) {
  const text = String(value ?? "").trim();
  return text ? text : ACCOUNT_TYPE_GENERIC_VALUE;
}

function storageAccountTypeName(value) {
  const text = String(value ?? "").trim();
  if (!text || text === ACCOUNT_TYPE_GENERIC_VALUE) return "";
  return text;
}

function isBooleanDefaultConfigField(fieldName) {
  const key = String(fieldName || "").trim();
  return booleanDefaultConfigFieldNames.has(key) || key.startsWith("是否");
}

function normalizeBooleanDefaultConfigValue(value) {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  if (booleanDefaultConfigTrueTexts.has(text) || booleanDefaultConfigTrueTexts.has(lower)) return true;
  if (booleanDefaultConfigFalseTexts.has(text) || booleanDefaultConfigFalseTexts.has(lower)) return false;
  return null;
}

function booleanDefaultConfigDisplayValue(value) {
  const normalized = normalizeBooleanDefaultConfigValue(value);
  if (normalized == null) return "";
  return normalized ? "勾选" : "不勾选";
}

function booleanDefaultConfigStorageValue(value) {
  const normalized = normalizeBooleanDefaultConfigValue(value);
  return normalized == null ? null : normalized;
}

function formatDefaultConfigValueForDisplay(fieldName, value) {
  if (!isBooleanDefaultConfigField(fieldName)) return value ?? "";
  const display = booleanDefaultConfigDisplayValue(value);
  return display || "";
}

function normalizeDefaultConfigFieldValue(field) {
  if (!field || !isBooleanDefaultConfigField(field.field_name)) return;
  const display = booleanDefaultConfigDisplayValue(field.field_value);
  field.field_value = display || "勾选";
}

function isPiccDefaultConfigPlatform() {
  const code = String(defaultConfigForm.value.platform_code || "").trim().toUpperCase();
  const name = String(defaultConfigForm.value.platform_name || "").trim();
  return code === "PICC" || name.includes("人保");
}

function productTemplateValueLooksUntouched(fieldName, fieldValue) {
  const key = String(fieldName || "").trim();
  const value = String(fieldValue ?? "").trim();
  if (!key || !value) return true;
  return fixedQuoteAccountTypes.some((typeName) => {
    const tpl = defaultProductConfigTemplateForType(typeName).find((item) => item.field_name === key);
    if (!tpl) return false;
    if (isBooleanDefaultConfigField(key)) {
      return normalizeBooleanDefaultConfigValue(tpl.field_value) === normalizeBooleanDefaultConfigValue(value);
    }
    return String(tpl.field_value ?? "").trim() === value;
  });
}

const quoteQuickPrompts = [
  { label: "查看材料状态", text: "查看当前材料状态" },
  { label: "人保报价", text: "人保报价" },
  { label: "查订单", text: "查订单" },
  { label: "图片说明", text: "这是身份证正面" },
];
const queryOnlyQuickPrompts = [
  { label: "查订单", text: "查订单" },
];

const sessionApi = useAiAssistantSession();
const loadingInit = sessionApi.loadingInit ?? ref(false);
const loadingSessions = sessionApi.loadingSessions ?? ref(false);
const loadingHistory = sessionApi.loadingHistory ?? ref(false);
const loadingMoreHistory = sessionApi.loadingMoreHistory ?? ref(false);
const loadingMoreSessions = sessionApi.loadingMoreSessions ?? ref(false);
const sending = sessionApi.sending ?? ref(false);
const sessions = sessionApi.sessions ?? ref([]);
const currentSessionId = sessionApi.currentSessionId ?? ref("");
const currentSessionTitle = sessionApi.currentSessionTitle ?? ref("新会话");
const messages = sessionApi.messages ?? ref([]);
const processHint = sessionApi.processHint ?? ref("");
const pendingDuplicateConfirm = sessionApi.pendingDuplicateConfirm ?? ref(null);
const sessionsHasMore = sessionApi.sessionsHasMore ?? ref(false);
const historyHasMore = sessionApi.historyHasMore ?? ref(false);
const quoteImagePreviewVisible = ref(false);
const quoteImagePreviewUrl = ref("");
const quoteImagePreviewTitle = ref("");
const quoteMaterialFormVisible = ref(false);
const quoteMaterialFormSubmitting = ref(false);
const quoteMaterialForm = ref(null);
const quoteMaterialFormValues = ref({});
const historyPopoverVisible = ref(false);
const paneMode = computed(() => !!props.paneMode);
const multiOpenEnabled = computed(() => !!props.multiOpenEnabled);
const canAddPane = computed(() => !!props.canAddPane);
const paneCount = computed(() => Math.min(3, Math.max(1, Number(props.paneCount) || 1)));
const paneLabel = computed(() => `会话${Math.max(1, Number(props.paneIndex || 1))}`);
const showHeaderNewSessionButton = computed(() => !multiOpenEnabled.value || canAddPane.value);
const headerNewSessionLabel = computed(() => (paneMode.value ? "新建" : "新会话"));
const headerHistoryLabel = computed(() => (paneMode.value ? "历史" : "历史会话"));
const headerRefreshLabel = computed(() => (paneMode.value ? "刷" : "刷新"));
const headerCloseLabel = computed(() => (paneCount.value > 2 ? "关" : "关闭"));
const quoteMaterialFormTitle = computed(() => String(quoteMaterialForm.value?.title || "填写报价资料"));
const quoteMaterialFormDescription = computed(() => String(quoteMaterialForm.value?.description || "请填写报价资料后提交。"));
const quoteMaterialFormFields = computed(() => (
  Array.isArray(quoteMaterialForm.value?.fields) ? quoteMaterialForm.value.fields : []
));
const quoteMaterialMissingTexts = computed(() => (
  Array.isArray(quoteMaterialForm.value?.missing_texts) ? quoteMaterialForm.value.missing_texts.filter(Boolean) : []
));

function resetQuoteMaterialForm() {
  quoteMaterialFormVisible.value = false;
  quoteMaterialFormSubmitting.value = false;
  quoteMaterialForm.value = null;
  quoteMaterialFormValues.value = {};
}

const ensureInit = sessionApi.ensureInit ?? (async () => {});
const refreshSessions = sessionApi.refreshSessions ?? (async () => {});
const loadMoreSessions = sessionApi.loadMoreSessions ?? (async () => false);
const syncCurrentSession = sessionApi.syncCurrentSession ?? (async () => {});
const loadHistory = sessionApi.loadHistory ?? (async () => {});
const loadMoreHistory = sessionApi.loadMoreHistory ?? (async () => false);
const switchSession = sessionApi.switchSession ?? (async () => {});
const createNewSessionLocal = sessionApi.createNewSessionLocal ?? (() => {});
const sendMessage = sessionApi.sendMessage ?? (async () => {});
const abortActiveRequests = sessionApi.abortActiveRequests ?? (() => {});
let quoteFollowupTimer = null;
let quoteActivitySeq = 0;
let imageLoadScrollFrame = 0;
let assistantSyncTimer = null;
let imageCollectChain = Promise.resolve();

const orderIdSafe = computed(() => {
  const arr = Array.isArray(messages.value) ? messages.value : [];
  for (let i = arr.length - 1; i >= 0; i--) {
    const m = arr[i];
    const oid = m?.metadata?.data?.entities?.order_id ?? m?.metadata?.entities?.order_id ?? null;
    const n = Number(oid);
    if (Number.isInteger(n) && n > 0) return n;
  }
  return null;
});

const currentSessionIdSafe = computed(() => String(currentSessionId.value || ""));
// 只在首次进入页时显示骨架屏，避免发送后刷新会话列表时整块聊天区闪动。
const loadingInitSafe = computed(() => !!loadingInit.value);

watch(
  () => currentSessionIdSafe.value,
  (next, prev) => {
    if (String(next || "") === String(prev || "")) return;
    resetQuoteMaterialForm();
    if (pendingQuoteAfterImage.value?.text && uploadBusy.value && !pendingQuoteAfterImage.value.session_id && !prev && next) {
      pendingQuoteAfterImage.value = {
        ...pendingQuoteAfterImage.value,
        session_id: String(next || ""),
      };
      return;
    }
    pendingQuoteAfterImage.value = null;
  }
);
const loadingSessionsSafe = computed(() => !!loadingSessions.value);
const loadingHistorySafe = computed(() => !!loadingHistory.value);
const loadingMoreHistorySafe = computed(() => !!loadingMoreHistory.value);
const loadingMoreSessionsSafe = computed(() => !!loadingMoreSessions.value);
const sendingSafe = computed(() => !!sending.value);
const sendButtonDisabledSafe = computed(() => {
  const text = String(inputText.value || "").trim();
  if (sendingSafe.value && !canSubmitWhileSending(text)) return true;
  if (!uploadBusy.value) return false;
  // Unknown text must reach the backend and receive a visible command-error
  // reply; strict quote commands are still queued by handleSend while images
  // are being collected.
  return !text;
});
const sendButtonLoadingSafe = computed(() => {
  const text = String(inputText.value || "").trim();
  return sendingSafe.value && !canSubmitWhileSending(text);
});
const sessionsSafe = computed(() => (Array.isArray(sessions.value) ? sessions.value : []));
const sessionsHasMoreSafe = computed(() => !!sessionsHasMore.value);
const historyHasMoreSafe = computed(() => !!historyHasMore.value);
const VISIBLE_ASSISTANT_RESULT_STATUSES = new Set([
  "need_more_info",
  "not_ready",
  "failed",
]);
const messagesSafe = computed(() => (Array.isArray(messages.value) ? messages.value.filter(shouldRenderChatMessage) : []));
const processHintSafe = computed(() => String(processHint.value || ""));
const isSuperAdmin = computed(() => String(sessionStore.roleName || "").trim() === ROLE.SUPER_ADMIN);
const canManageQuoteAccounts = computed(() => isSuperAdmin.value);
const canUseQuoteFlow = computed(() => !!String(sessionStore.roleName || "").trim());
const quickPrompts = computed(() => (canUseQuoteFlow.value ? quoteQuickPrompts : queryOnlyQuickPrompts));
const selectedQuotePlatform = computed(() => {
  return quotePlatforms.value.find((x) => x.platform_code === accountForm.value.platform_code) || null;
});
const selectedDefaultConfigPlatform = computed(() => {
  return quotePlatforms.value.find((x) => x.platform_code === defaultConfigForm.value.platform_code) || null;
});
const loginPhonePlaceholder = computed(() => {
  const mask = String(editingAccount.value?.login_phone_mask || "").trim();
  return mask ? `当前：${mask}，不填则保留` : "需要验证码的平台建议填写";
});
const inputQuoteInvalid = computed(() => {
  const t = String(inputText.value || "").trim();
  return !!t && looksLikeQuoteCommand(t) && !isStrictQuoteCommand(t);
});
const inputQuoteDenied = computed(() => {
  const t = String(inputText.value || "").trim();
  return !!t && looksLikeQuoteCommand(t) && !canUseQuoteFlow.value;
});
const inputSmsHint = computed(() => {
  const t = String(inputText.value || "").trim();
  if (!/^\d{4,8}$/.test(t)) return false;
  return messagesSafe.value.slice().reverse().some((m) => {
    const text = `${m?.content || ""}\n${m?.metadata?.data?.message || ""}`;
    return String(m?.role || "").toLowerCase() === "assistant" && /短信|验证码|校验码|code/i.test(text);
  });
});
const inputAssistWarning = computed(() => inputQuoteInvalid.value || inputQuoteDenied.value);
const inputAssistHint = computed(() => {
  if (inputQuoteDenied.value) return "当前账号只能查看助手信息，不能发起报价或维护报价平台账号。";
  if (inputQuoteInvalid.value) return "报价指令请使用“平台名+报价”，例如：太平洋报价；平台名和“报价”之间可以有空格。";
  if (inputSmsHint.value) return "将作为短信验证码提交，发送后会自动隐藏。";
  if (!String(inputText.value || "").trim() && pendingImageHint.value) return `已记住图片说明：${pendingImageHint.value}。拖入图片时会一起发送。`;
  return "";
});

watch(
  () => inputText.value,
  (next, prev) => {
    if (String(next || "") !== String(prev || "")) {
      markQuoteActivity();
    }
  }
);

watch(
  () => sessionStore.roleName,
  (next, prev) => {
    const role = String(next || "").trim();
    if (!role || role === String(prev || "").trim()) return;
    void checkPlatformAccountHealth({ force: true });
  }
);

function roleShort(role) {
  const r = String(role || "").toLowerCase();
  if (r === "user") return "我";
  if (r === "assistant") return "报";
  return "系";
}

function roleLabel(role) {
  const r = String(role || "").toLowerCase();
  if (r === "user") return "用户";
  if (r === "assistant") return "报价助手";
  return "系统";
}

function resultStatusAlertType(rs) {
  const s0 = String(rs || "").toLowerCase();
  if (s0 === "not_ready") return "warning";
  if (s0 === "need_more_info" || s0 === "empty") return "info";
  if (s0 === "invalid_command" || s0 === "failed") return "error";
  return "info";
}

function formatTime(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

function compactDateTime(v) {
  const text = formatTime(v);
  if (!text || text === "-") return "-";
  const match = text.match(/^\d{4}-(\d{2})-(\d{2})\s+(\d{2}:\d{2})$/);
  return match ? `${match[1]}-${match[2]} ${match[3]}` : text;
}

function sessionDate(item) {
  const raw = item?.updated_at || item?.created_at || "";
  const d = raw ? new Date(raw) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

function isSameLocalDay(a, b) {
  return (
    a instanceof Date &&
    b instanceof Date &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function historySessionClock(item) {
  const d = sessionDate(item);
  if (!d) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const now = new Date();
  if (isSameLocalDay(d, now)) return `今天 ${hh}:${mm}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameLocalDay(d, yesterday)) return `昨天 ${hh}:${mm}`;
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${month}-${day} ${hh}:${mm}`;
}

function historySessionRelativeTime(item) {
  const d = sessionDate(item);
  if (!d) return "";
  const diffMs = Date.now() - d.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "刚刚";
  const minute = Math.floor(diffMs / 60000);
  if (minute < 1) return "刚刚";
  if (minute < 60) return `${minute}分钟前`;
  const hour = Math.floor(minute / 60);
  if (hour < 24) return `${hour}小时前`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day}天前`;
  return compactDateTime(item?.updated_at || item?.created_at);
}

function historySessionTitle(item) {
  const title = String(item?.title || "").trim();
  if (title && title !== "新会话") return title.replace(/\s+/g, " ").slice(0, 80);
  const clock = historySessionClock(item);
  return clock ? `${clock} 的会话` : "新会话";
}

function historySessionPreview(item) {
  const preview = sanitizeChatDisplayText(item?.last_message_preview || "");
  if (preview) return preview;
  const count = Number(item?.message_count || 0);
  if (count > 0) return `${count} 条消息，可能包含图片资料`;
  return "空会话";
}

function isCurrentHistorySession(item) {
  return !!item?.session_id && String(item.session_id) === currentSessionIdSafe.value;
}

function shouldShowDataHint(message) {
  const data = message?.metadata?.data || {};
  const text = String(data.message || "").trim();
  if (!text) return false;
  const payload = data.payload && typeof data.payload === "object" ? data.payload : {};
  const autoNotice = payload.platform_auto_notice && typeof payload.platform_auto_notice === "object"
    ? payload.platform_auto_notice
    : null;
  if (autoNotice && ["insurance_date_adjust", "duplicate_quote_notice"].includes(String(autoNotice.type || "").toLowerCase())) {
    return false;
  }
  if (displayMessageContent(message)) return false;
  const status = String(data.result_status || "").toLowerCase();
  if (status === "success") return false;
  return VISIBLE_ASSISTANT_RESULT_STATUSES.has(status);
}

function sanitizeChatDisplayText(text) {
  return sanitizeQuoteUserText(text);
}

function stripDialogTitleFromWarning(message, title) {
  const raw = String(message || "").trim();
  const heading = String(title || "").trim();
  if (!raw || !heading) return raw;

  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const firstLine = String(lines[0] || "").replace(/\s+/g, "");
  const normalizedHeading = heading.replace(/\s+/g, "");
  if (!firstLine || firstLine !== normalizedHeading) return raw;

  return lines.slice(1).join("\n").replace(/^\n+/, "").trimStart();
}

function containsDuplicateInsuranceText(text) {
  return /重复投保/.test(String(text || ""));
}

function quoteApiErrorMessage(e, fallback) {
  return sanitizeChatDisplayText(getApiErrorMessage(e, fallback, { withRequest: false })) || fallback;
}

function quoteMaterialFormFromResult(result) {
  const response = result?.data && (Object.prototype.hasOwnProperty.call(result, "ok") || result?.data?.reply !== undefined)
    ? result.data
    : result;
  const data = response?.data && typeof response.data === "object" ? response.data : {};
  const payload = data.payload && typeof data.payload === "object" ? data.payload : {};
  const form = payload.quote_material_form || data.quote_material_form || response?.quote_material_form || null;
  return form && typeof form === "object" ? form : null;
}

function openQuoteMaterialForm(form) {
  const safeForm = form && typeof form === "object" ? form : null;
  if (!safeForm) return false;
  const fields = Array.isArray(safeForm.fields) ? safeForm.fields : [];
  quoteMaterialForm.value = {
    ...safeForm,
    fields,
  };
  const values = {};
  for (const field of fields) {
    const key = String(field?.key || "").trim();
    if (!key) continue;
    values[key] = String(field?.value ?? "");
  }
  if (!values.account_type_name && safeForm.account_type_name) {
    values.account_type_name = String(safeForm.account_type_name || "");
  }
  quoteMaterialFormValues.value = values;
  quoteMaterialFormVisible.value = true;
  nextTick(() => {
    const first = document.querySelector(".quote-material-form-dialog input, .quote-material-form-dialog textarea");
    if (first && typeof first.focus === "function") first.focus();
  });
  return true;
}

async function maybeOpenQuoteMaterialForm(result) {
  return openQuoteMaterialForm(quoteMaterialFormFromResult(result));
}

function quoteMaterialFieldOptions(field) {
  const options = Array.isArray(field?.options) ? field.options : [];
  return options
    .map((item) => ({
      label: String(item?.label ?? item?.value ?? "").trim(),
      value: String(item?.value ?? item?.label ?? "").trim(),
    }))
    .filter((item) => item.label && item.value);
}

function quoteMaterialSelectedAccountType() {
  return String(
    quoteMaterialFormValues.value.account_type_name ||
    quoteMaterialForm.value?.account_type_name ||
    ""
  ).trim();
}

function quoteMaterialFieldRequired(field) {
  if (!field || typeof field !== "object") return false;
  if (field.required === true) return true;
  const selectedType = quoteMaterialSelectedAccountType();
  const requiredFor = Array.isArray(field.required_for_account_types) ? field.required_for_account_types : [];
  return !!selectedType && requiredFor.map((x) => String(x || "").trim()).includes(selectedType);
}

function quoteMaterialFieldLabel(field) {
  const label = String(field?.label || field?.key || "").trim() || "资料字段";
  return quoteMaterialFieldRequired(field) ? label : `${label}（选填）`;
}

function quoteMaterialMissingRequiredLabels() {
  const missing = [];
  for (const field of quoteMaterialFormFields.value) {
    const key = String(field?.key || "").trim();
    if (!key || !quoteMaterialFieldRequired(field)) continue;
    const value = String(quoteMaterialFormValues.value[key] ?? "").trim();
    if (!value) missing.push(String(field?.label || key));
  }
  return missing;
}

function quoteMaterialSubmitLabel(field) {
  const key = String(field?.key || "").trim();
  const labelMap = {
    account_type_name: "报价类型",
    owner_name: "车主姓名",
    owner_phone: "车主手机号",
    id_number: "身份证号",
    plate_no: "号牌号码",
    engine_no: "发动机号",
    vin: "车架号",
    first_register_date: "初登日期",
    issue_date: "行驶证发证日期",
    commercial_start_date: "商业起保日期",
    compulsory_start_date: "交强起保日期",
    vehicle_model: "车型名称",
  };
  return labelMap[key] || String(field?.label || key).replace(/（选填）$/, "").trim();
}

function quoteMaterialSubmissionText() {
  const form = quoteMaterialForm.value || {};
  const prefix = String(form.submit_prefix || (form.mode === "manual" ? "手工资料" : "补充资料")).trim();
  const platformName = String(form.platform_name || "").trim();
  const platformCode = String(form.platform_code || "").trim();
  const lines = [prefix || "手工资料"];
  if (platformName || platformCode) lines.push(`平台：${platformName || platformCode}`);

  const fields = quoteMaterialFormFields.value;
  const emittedKeys = new Set();
  const accountType = quoteMaterialSelectedAccountType();
  if (accountType) {
    lines.push(`报价类型：${accountType}`);
    emittedKeys.add("account_type_name");
  }
  for (const field of fields) {
    const key = String(field?.key || "").trim();
    if (!key || emittedKeys.has(key)) continue;
    const value = String(quoteMaterialFormValues.value[key] ?? "").trim();
    if (!value) continue;
    const label = quoteMaterialSubmitLabel(field);
    lines.push(`${label}：${value}`);
    emittedKeys.add(key);
  }
  return lines.join("\n");
}

function quoteMaterialSubmissionValues() {
  const values = {};
  for (const field of quoteMaterialFormFields.value) {
    const key = String(field?.key || "").trim();
    if (!key) continue;
    const value = String(quoteMaterialFormValues.value[key] ?? "").trim();
    if (value) values[key] = value;
  }
  const accountType = quoteMaterialSelectedAccountType();
  if (accountType) values.account_type_name = accountType;
  return values;
}

async function submitQuoteMaterialForm() {
  const missing = quoteMaterialMissingRequiredLabels();
  if (missing.length) {
    ElMessage.warning(`请先补齐：${missing.slice(0, 5).join("、")}`);
    return;
  }
  const openedSessionId = String(quoteMaterialForm.value?.session_id || "").trim();
  if (openedSessionId && currentSessionIdSafe.value && openedSessionId !== currentSessionIdSafe.value) {
    ElMessage.warning("这份表单属于另一个会话，请在当前会话重新输入“手工”或“补资料”");
    resetQuoteMaterialForm();
    return;
  }
  const text = quoteMaterialSubmissionText();
  if (!text.trim()) {
    ElMessage.warning("请先填写资料");
    return;
  }
  quoteMaterialFormSubmitting.value = true;
  try {
    const mode = String(quoteMaterialForm.value?.mode || "").trim();
    const displayText = mode === "supplement" ? "已提交补充资料" : "已提交手工资料";
    const formValues = quoteMaterialSubmissionValues();
    const result = await sendMessage(text, {
      useStream: true,
      displayText,
      processHintText: "正在保存资料…",
      pageContext: {
        module: "quote_assistant_workbench",
        page: "AiAssistantWorkbench",
        order_id: orderIdSafe.value || undefined,
        quote_material_form_submit: true,
        quote_material_form_mode: mode || undefined,
        quote_material_form_session_id: quoteMaterialForm.value?.session_id || currentSessionIdSafe.value || undefined,
        quote_material_form_case_id: quoteMaterialForm.value?.quote_case_id || undefined,
        quote_material_form_values: formValues,
        display_user_content: displayText,
      },
    });
    if (result?.ok === false && !result?.aborted) {
      throw new Error(result?.message || "资料提交失败");
    }
    resetQuoteMaterialForm();
    await maybePromptDuplicateQuoteConfirm(result);
    scheduleQuoteFollowup(result);
  } catch (e) {
    ElNotification.error({
      title: "资料提交失败",
      message: quoteApiErrorMessage(e, "资料提交失败，请稍后重试"),
      duration: 4500,
    });
  } finally {
    quoteMaterialFormSubmitting.value = false;
  }
}

function duplicateQuotePromptInfoFromAiData(aiData, fallbackText = "", source = "message") {
  void aiData;
  void fallbackText;
  void source;
  // Platform quote prompts are now handled server-side: the raw prompt text is
  // written to chat when needed, then quote continues/adjusts automatically.
  // Keep this as an explicit no-op so stale history or delayed responses cannot
  // reopen old "continue quote / modify period" modals.
  return null;
}

function duplicateQuotePromptInfoFromMessage(message) {
  void message;
  return null;
}

async function promptDuplicateQuoteConfirmInfo(info, { force = false } = {}) {
  void info;
  void force;
  return false;
}

async function maybePromptDuplicateQuoteConfirm(result, options = {}) {
  void result;
  void options;
  return false;
}

function latestVisibleDuplicateQuotePromptInfo() {
  return null;
}

async function maybePromptLatestDuplicateQuoteConfirm() {
  if (sendingSafe.value || uploadBusy.value || loadingHistorySafe.value) return false;
  return promptDuplicateQuoteConfirmInfo(latestVisibleDuplicateQuotePromptInfo());
}

function displayMessageContent(message) {
  const role = String(message?.role || "").toLowerCase();
  const text = String(message?.content || "").trim();
  if (text) {
    if (role === "user" && messageImages(message).length) {
      if (
        /^图片已提交[。.]?$/.test(text) ||
        /^已上传\s*\d+\s*张图片/.test(text) ||
        /^已收到\s*\d+\s*张图片/.test(text) ||
        /^识别中[。.]?$/.test(text)
      ) {
        return "";
      }
    }
    return sanitizeChatDisplayText(text);
  }

  const metaText = String(message?.metadata?.data?.message || "").trim();
  if (!metaText) return "";
  if (role !== "assistant") return "";
  if (isSilentAssistantMessage(message)) return "";
  if (!isQuoteAssistantMessage(message)) return "";
  return sanitizeChatDisplayText(metaText);
}

function isSilentAssistantMessage(message) {
  const meta = message?.metadata || {};
  const data = meta.data || {};
  const intent = String(meta.intent || data.intent || "").toLowerCase();
  if (String(meta.silent || "").toLowerCase() === "true") return true;
  if (String(data.silent || "").toLowerCase() === "true") return true;
  if (String(meta.ui_visible || "").toLowerCase() === "false") return true;
  if (String(data.ui_visible || "").toLowerCase() === "false") return true;
  if (intent === "quote_config_override") return true;
  return intent === "quote_image_collect";
}

function messageResultStatus(message) {
  return String(message?.metadata?.data?.result_status || "").toLowerCase();
}

function isQuoteAssistantMessage(message) {
  const meta = message?.metadata || {};
  const data = meta.data || {};
  const payload = data.payload || meta.payload || {};
  const intent = String(meta.intent || data.intent || "").toLowerCase();
  if (intent.startsWith("quote")) return true;
  return !!(payload?.quote_case || payload?.quote_task || payload?.quote_result || payload?.quoteResult);
}

function shouldRenderChatMessage(message) {
  const role = String(message?.role || "").toLowerCase();
  if (role !== "assistant") {
    return !!displayMessageContent(message) || messageImages(message).length > 0;
  }

  const messageIntent = String(message?.metadata?.intent || message?.metadata?.data?.intent || "").toLowerCase();
  const resultStatus = messageResultStatus(message);
  if (quoteResultCard(message) || quoteResultImage(message)) return true;
  if (messageIntent === "fallback" || resultStatus === "invalid_command") {
    return !!displayMessageContent(message);
  }
  if (duplicateQuotePromptInfoFromMessage(message)) return false;
  if (message?.metadata?.error) return true;
  if (String(message?.metadata?.status || "").toLowerCase() === "error") return true;
  if (VISIBLE_ASSISTANT_RESULT_STATUSES.has(resultStatus)) return true;
  if (isSilentAssistantMessage(message)) return false;
  if (isQuoteAssistantMessage(message) && resultStatus === "success" && displayMessageContent(message)) return true;

  // 报价链路中的图片归位、材料状态、普通 success 只作为后台状态，不进入聊天气泡。
  if (isQuoteAssistantMessage(message)) return false;

  return !!displayMessageContent(message) || messageImages(message).length > 0;
}

function shouldShowMessageActions(message) {
  if (isQuoteAssistantMessage(message)) return false;
  return Array.isArray(message?.metadata?.actions) && message.metadata.actions.length > 0;
}

function imageUrl(img) {
  if (typeof img === "string") return img.trim();
  return String(img?.preview_url || img?.url || img?.image_url || "");
}

function normalizeImageIdentityPart(value) {
  return String(value || "")
    .trim()
    .replace(/^"+|"+$/g, "")
    .replace(/^'+|'+$/g, "");
}

function stableImageUrlForDisplay(img) {
  const url = typeof img === "string" ? img : img?.remote_url || img?.url || img?.preview_url || img?.image_url || "";
  return normalizeImageIdentityPart(url).split("#", 1)[0].split("?", 1)[0];
}

function imageUrlTail(url) {
  const raw = normalizeImageIdentityPart(url).split("#", 1)[0].split("?", 1)[0];
  if (!raw) return "";
  try {
    const parsed = new URL(raw, "http://local.invalid");
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.slice(-3).join("/");
  } catch {
    const parts = raw.split("/").filter(Boolean);
    return parts.slice(-3).join("/");
  }
}

function imageHashToken(value) {
  const raw = normalizeImageIdentityPart(value).split("#", 1)[0].split("?", 1)[0];
  if (!raw) return "";
  const tail = raw.split("/").filter(Boolean).pop() || raw;
  const stem = tail.replace(/\.[A-Za-z0-9]{2,8}$/, "");
  return /^[a-f0-9]{16,}$/i.test(stem) ? stem.toLowerCase() : "";
}

function imageDedupKeys(img) {
  const keys = new Set();
  const add = (prefix, value) => {
    const normalized = normalizeImageIdentityPart(value);
    if (normalized) keys.add(`${prefix}:${normalized}`);
  };
  if (typeof img === "string") {
    const url = img.trim();
    add("url", stableImageUrlForDisplay(url));
    add("url_tail", imageUrlTail(url));
    return keys;
  }
  if (!img || typeof img !== "object") return keys;
  if (img.placeholder_id) add("placeholder", img.placeholder_id);
  add("storage", img.storage_key || img.key);
  add("md5", img.md5);
  add("etag", img.etag);
  add("hash", imageHashToken(img.storage_key || img.key));
  add("hash", imageHashToken(img.md5));
  add("hash", imageHashToken(img.etag));
  add("id", img.image_id || img.file_id);
  const originalName = normalizeImageIdentityPart(img.original_name || img.name);
  const size = Number(img?.size || 0);
  if (originalName && size > 0) add("file", `${originalName}:${size}`);
  const url = stableImageUrlForDisplay(img);
  add("url", url);
  add("url_tail", imageUrlTail(url));
  add("hash", imageHashToken(url));
  return keys;
}

function imageDedupKey(img) {
  const keys = imageDedupKeys(img);
  return Array.from(keys)[0] || imageUrl(img) || String(img?.id || "");
}

function expectedMessageImageCount(message) {
  const meta = message?.metadata || {};
  const page = meta.page_context || {};
  const payload = meta.data?.payload || {};
  const nums = [
    meta.image_count,
    meta.images_count,
    meta.uploaded_image_count,
    page.image_count,
    page.images_count,
    page.uploaded_image_count,
    Array.isArray(page.uploaded_images) ? page.uploaded_images.length : null,
    Array.isArray(page.images) ? page.images.length : null,
    payload.image_count,
    payload.attached_count,
  ];
  const max = nums.reduce((acc, item) => {
    const n = Number(item);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return Math.max(0, Math.min(12, Math.trunc(max)));
}

function isQuoteResultImage(img) {
  return String(img?.kind || img?.type || "").toLowerCase() === "quote_result";
}

function loginStatusText(status) {
  const s0 = String(status || "").toLowerCase();
  const map = {
    not_logged_in: "未登录",
    logging_in: "登录中",
    needs_code: "待验证码",
    authenticated: "已登录",
    degraded: "保活异常",
    expired: "已过期",
    failed: "失败",
    disabled: "停用",
  };
  return map[s0] || status || "未知";
}

function loginStatusTag(status) {
  const s0 = String(status || "").toLowerCase();
  if (s0 === "authenticated") return "success";
  if (s0 === "needs_code" || s0 === "logging_in" || s0 === "degraded") return "warning";
  if (s0 === "failed" || s0 === "expired") return "danger";
  return "info";
}

function accountLoginButtonDisabled(row) {
  return !!row?.enabled && String(row?.login_status || "").toLowerCase() === "authenticated";
}

function inspectionNoticeText(row) {
  const loginStatus = String(row?.login_status || "").toLowerCase();
  if (loginStatus === "authenticated") {
    return "";
  }
  const notice = row?.inspection_notice && typeof row.inspection_notice === "object" ? row.inspection_notice : {};
  const msg = String(notice.message || "").trim();
  if (msg) return sanitizeChatDisplayText(msg);
  const task = row?.active_login_task && typeof row.active_login_task === "object" ? row.active_login_task : {};
  if (String(task.status || "").toLowerCase() === "needs_code") {
    return sanitizeChatDisplayText(task.challenge_prompt) || "巡检发现登录需要安全码";
  }
  return "";
}

function accountNoticeText(row) {
  const loginStatus = String(row?.login_status || "").toLowerCase();
  const sessionStatus = String(row?.session?.status || "").toLowerCase();
  if (["authenticated", "degraded"].includes(loginStatus) || ["authenticated", "valid", "degraded"].includes(sessionStatus)) {
    return "";
  }
  const inspection = inspectionNoticeText(row);
  if (inspection) return inspection;
  return sanitizeChatDisplayText(row?.last_error) || "";
}

function inspectionNoticeTag(row) {
  const notice = row?.inspection_notice && typeof row.inspection_notice === "object" ? row.inspection_notice : {};
  const level = String(notice.level || "").toLowerCase();
  const type = String(notice.type || "").toLowerCase();
  if (level === "danger" || type.includes("failed")) return "danger";
  if (level === "warning") return "warning";
  if (type.includes("challenge") || type.includes("manual") || type.includes("expired")) return "warning";
  return "info";
}

function loginPreservedSessionNotice(data = {}) {
  const account = data?.account && typeof data.account === "object" ? data.account : {};
  const notice = account?.inspection_notice && typeof account.inspection_notice === "object" ? account.inspection_notice : {};
  const payload = notice?.payload && typeof notice.payload === "object" ? notice.payload : {};
  const type = String(notice.type || "").toLowerCase();
  const accountStatus = String(account.login_status || "").toLowerCase();
  const sessionStatus = String(account?.session?.status || "").toLowerCase();
  const preserved = Boolean(payload.preserved_previous_session)
    || type === "login_preserved_session"
    || (accountStatus === "degraded" && sessionStatus === "degraded");
  if (!preserved) return "";
  return sanitizeChatDisplayText(notice.message || account.last_error) || "新登录未完成，已保留原有可用会话，可继续报价";
}

function quotaStatusText(status) {
  const s0 = String(status || "").toLowerCase();
  const map = {
    unknown: "未知",
    available: "可用",
    warning: "预警",
    full: "已满",
    reset: "已重置",
  };
  return map[s0] || status || "未知";
}

function quotaStatusTag(status) {
  const s0 = String(status || "").toLowerCase();
  if (s0 === "available" || s0 === "reset") return "success";
  if (s0 === "warning") return "warning";
  if (s0 === "full") return "danger";
  return "info";
}

function quotaPeriodLabel(period) {
  const map = { day: "日", week: "周", month: "月" };
  return map[String(period || "").toLowerCase()] || "日";
}

function quotaRemainingText(row) {
  if (row?.quota_configured) {
    const display = String(row?.quota_remaining_display || "").trim();
    if (display) return display;
    const n = Number(row?.quota_remaining_count);
    const remaining = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
    return `${remaining}/${quotaPeriodLabel(row?.quota_period_type)}`;
  }
  const usedValue =
    row?.platform_quote_usage?.today_used_count ??
    row?.quota_used_count ??
    row?.platform_quote_usage?.used_count ??
    0;
  const used = Number(usedValue);
  const total = Number.isFinite(used) ? Math.max(0, Math.trunc(used)) : 0;
  return `已查询${total}/日`;
}

function quotaRemainingTag(row) {
  if (!row?.quota_configured) return "info";
  const n = Number(row.quota_remaining_count);
  if (Number.isFinite(n) && n <= 0) return "danger";
  return quotaStatusTag(row?.quota_status || "available");
}

function imageStorageKey(img) {
  return String(img?.storage_key || "").trim();
}

function imageRecalled(img) {
  return !!img?.recalled;
}

function canRecallImage(message, img) {
  if (!canUseQuoteFlow.value) return false;
  if (String(message?.role || "").toLowerCase() !== "user") return false;
  if (!currentSessionIdSafe.value) return false;
  if (sendingSafe.value || uploadBusy.value) return false;
  if (imageRecalled(img)) return false;
  return !!imageStorageKey(img);
}

function messageImages(message) {
  const meta = message?.metadata || {};
  const resultImage = quoteResultImage(message);
  const candidates = [
    meta.images,
    meta.page_context?.images,
    meta.page_context?.uploaded_images,
    meta.data?.payload?.attached_images,
    resultImage ? [resultImage] : null,
  ];
  const out = [];
  const seen = new Set();
  for (const list of candidates) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const keys = imageDedupKeys(item);
      let duplicated = false;
      for (const key of keys) {
        if (seen.has(key)) {
          duplicated = true;
          break;
        }
      }
      if (duplicated) continue;
      if (keys.size) {
        for (const key of keys) seen.add(key);
      } else {
        const key = imageDedupKey(item);
        if (key && seen.has(key)) continue;
        if (key) seen.add(key);
      }
      out.push(item);
    }
  }
  const expected = expectedMessageImageCount(message);
  while (out.length < expected) {
    const idx = out.length;
    out.push({
      placeholder_id: `${message?.id || "message"}_${idx}`,
      placeholder: true,
      slot_key: "related",
    });
  }
  return out;
}

function quoteResultPayload(message) {
  const data = message?.metadata?.data && typeof message.metadata.data === "object"
    ? message.metadata.data
    : {};
  const payload = data?.payload || message?.metadata?.payload || {};
  const result =
    payload?.quote_result ||
    payload?.quoteResult ||
    data?.quote_result ||
    data?.quoteResult ||
    message?.metadata?.quote_result ||
    message?.metadata?.quoteResult ||
    {};
  return result && typeof result === "object" ? result : {};
}

function quoteResultImage(message) {
  const result = quoteResultPayload(message);
  const image = result?.result_image || result?.resultImage || {};
  if (typeof image === "string") {
    const url = image.trim();
    return url
      ? {
          kind: "quote_result",
          slot_key: "related",
          url,
          image_url: url,
          preview_url: url,
        }
      : null;
  }
  if (image && typeof image === "object" && imageUrl(image)) {
    if (String(image.provider || "").toLowerCase() === "legacy_local") {
      return null;
    }
    const url = imageUrl(image);
    return {
      ...image,
      kind: "quote_result",
      slot_key: "related",
      url,
      image_url: url,
      preview_url: url,
    };
  }
  return null;
}

function openQuoteImagePreview(message, img) {
  const url = imageUrl(img);
  if (!url) return;
  quoteImagePreviewUrl.value = url;
  quoteImagePreviewTitle.value = quoteResultCard(message).title || "报价结果图";
  quoteImagePreviewVisible.value = true;
}

function closeQuoteImagePreview() {
  quoteImagePreviewVisible.value = false;
  quoteImagePreviewUrl.value = "";
  quoteImagePreviewTitle.value = "";
}

function quoteResultCard(message) {
  const result = quoteResultPayload(message);
  const card = result?.result_card || result?.resultCard || {};
  if (card && typeof card === "object" && Object.keys(card).length) return card;
  if (result?.premium_total || result?.price_items?.length) {
    const priceItems = Array.isArray(result.price_items) ? result.price_items : [];
    const findAmount = (name) => priceItems.find((x) => String(x?.name || "").includes(name))?.amount || "";
    return {
      title: "报价结果",
      total_premium: result.premium_total,
      commercial_premium: findAmount("商业"),
      compulsory_premium: findAmount("交强"),
      vehicle_tax: findAmount("车船"),
      coverage_items: [],
    };
  }
  return null;
}

function isPiccProposalResult(message) {
  const result = quoteResultPayload(message);
  const card = result?.result_card || result?.resultCard || {};
  const style = String(card?.style || "").trim();
  const platformCode = String(result?.platform_code || result?.platformCode || card?.platform_code || "").trim().toUpperCase();
  const platformName = String(result?.platform_name || result?.platformName || card?.platform_name || "").trim();
  return style === "picc_proposal_table" || platformCode === "PICC" || ["人保", "中国人保", "PICC"].includes(platformName);
}

function shouldShowInlineQuoteCard(message) {
  const card = quoteResultCard(message);
  if (!card || quoteResultImage(message)) return false;
  return true;
}

function quoteCoverageItems(message) {
  const card = quoteResultCard(message);
  return Array.isArray(card?.coverage_items) ? card.coverage_items : [];
}

function quoteCoverageName(name) {
  const text = String(name || "").trim();
  const map = {
    "机动车车上人员责任保险（司机）": "车上人员责任险(司机)",
    "机动车车上人员责任保险（乘客）": "车上人员责任险(乘客)",
    "车上人员责任险（司机）": "车上人员责任险(司机)",
    "车上人员责任险（乘客）": "车上人员责任险(乘客)",
    "附加医保外医疗费用责任险（机动车第三者责任保险）": "医保外医疗费用责任险(三者)",
    "医保外医疗费用责任险（第三者责任险）": "医保外医疗费用责任险(三者)",
  };
  return map[text] || text;
}

function moneyText(value) {
  if (value === null || value === undefined || value === "") return "0.00";
  const n = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n)) return String(value);
  return n.toFixed(2);
}

function amountText(value) {
  if (value === null || value === undefined || value === "") return "-";
  const n = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n)) return String(value);
  if (Number.isInteger(n)) return String(n);
  return String(Number(n.toFixed(2)));
}

function quoteJointSalesLabel(card = {}) {
  const label = String(card?.joint_sales_label || "").trim();
  return label || "联合销售";
}

function quoteJointSalesAmountText(card = {}) {
  const value = card?.joint_sales_amount;
  if (value === null || value === undefined || value === "") return "";
  return amountText(value);
}

async function handleRecallImage(message, img) {
  markQuoteActivity();
  const storageKey = imageStorageKey(img);
  if (!storageKey || !currentSessionIdSafe.value) return;

  try {
    await ElMessageBox.confirm(
      "确认撤回这张图片？撤回后它不会继续参与后续报价，但历史消息会保留撤回痕迹。",
      "撤回图片",
      {
        type: "warning",
        confirmButtonText: "撤回",
        cancelButtonText: "取消",
      }
    );
  } catch {
    return;
  }

  try {
    await recallAiSessionImages(currentSessionIdSafe.value, {
      storage_keys: [storageKey],
    });
    ElMessage.success("图片已撤回，并已移出报价材料池");
    await reloadHistory();
  } catch (e) {
    ElNotification.error({
      title: "撤回失败",
      message: quoteApiErrorMessage(e, "图片撤回失败"),
      duration: 4500,
    });
  }
}

async function scrollToBottom() {
  await nextTick();
  const el = chatBodyRef.value;
  if (!el) return;
  if (!chatStickToBottom.value) return;
  try {
    el.scrollTop = el.scrollHeight;
  } catch {}
}

function forceStickToBottom() {
  chatStickToBottom.value = true;
  void scrollToBottom();
}

function handleMessageImageLoad() {
  if (preservingHistoryScroll.value) return;
  if (!chatStickToBottom.value) return;
  if (imageLoadScrollFrame) {
    cancelAnimationFrame(imageLoadScrollFrame);
  }
  imageLoadScrollFrame = requestAnimationFrame(() => {
    imageLoadScrollFrame = 0;
    void scrollToBottom();
  });
}

const preservingHistoryScroll = ref(false);
const chatStickToBottom = ref(true);
const CHAT_BOTTOM_STICKY_THRESHOLD = 96;
const workbenchBusy = computed(() => {
  return !!(
    sendingSafe.value ||
    uploadBusy.value ||
    String(processHintSafe.value || "").trim() ||
    String(pendingQuoteAfterImage.value?.text || "").trim()
  );
});
const workbenchStatusText = computed(() => {
  const processHintText = String(processHintSafe.value || "").trim();
  if (processHintText) return sanitizeChatDisplayText(processHintText);
  const queuedText = String(pendingQuoteAfterImage.value?.text || "").trim();
  if (queuedText && uploadBusy.value) return `图片处理中，已排队：${sanitizeChatDisplayText(queuedText)}`;
  if (queuedText) return `报价已排队：${sanitizeChatDisplayText(queuedText)}`;
  if (uploadBusy.value) return `图片处理中，当前上传 ${Math.max(1, uploadingImages.value.length)} 张`;
  if (sendingSafe.value) return "正在提交报价指令…";
  return "";
});
const showScrollToBottom = computed(() => {
  return !chatStickToBottom.value && !loadingHistorySafe.value && !loadingMoreHistorySafe.value && messagesSafe.value.length > 0;
});

watch(
  () => {
    const list = messagesSafe.value;
    const last = list[list.length - 1] || {};
    return `${list.length}:${last.id || ""}`;
  },
  async () => {
    if (preservingHistoryScroll.value) return;
    await scrollToBottom();
  },
  { flush: "post" }
);

watch(
  () => {
    const timeline = Array.isArray(messages.value) ? messages.value : [];
    const last = timeline[timeline.length - 1];
    return `${currentSessionIdSafe.value}:${last?.id || ""}:${last?.metadata?.data?.result_status || ""}`;
  },
  () => {
    void maybePromptLatestDuplicateQuoteConfirm();
  },
  { flush: "post" }
);

watch(
  () => loadingHistorySafe.value,
  (next, prev) => {
    if (prev && !next) {
      void maybePromptLatestDuplicateQuoteConfirm();
    }
  },
  { flush: "post" }
);

watch(
  () => pendingDuplicateConfirm.value,
  () => {
    void maybePromptLatestDuplicateQuoteConfirm();
  },
  { flush: "post" }
);

async function handleChatScroll() {
  const el = chatBodyRef.value;
  if (!el) return;
  if (!preservingHistoryScroll.value) {
    chatStickToBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight <= CHAT_BOTTOM_STICKY_THRESHOLD;
  }
  if (loadingHistorySafe.value || loadingMoreHistorySafe.value || !historyHasMoreSafe.value) return;
  if (el.scrollTop > 24) return;

  const oldHeight = el.scrollHeight;
  const oldTop = el.scrollTop;
  preservingHistoryScroll.value = true;
  try {
    const changed = await loadMoreHistory();
    await nextTick();
    if (changed && chatBodyRef.value) {
      chatBodyRef.value.scrollTop = Math.max(0, chatBodyRef.value.scrollHeight - oldHeight + oldTop);
    }
  } finally {
    preservingHistoryScroll.value = false;
  }
}

async function handleLoadMoreHistoryClick() {
  const el = chatBodyRef.value;
  const oldHeight = el?.scrollHeight || 0;
  preservingHistoryScroll.value = true;
  try {
    const changed = await loadMoreHistory();
    await nextTick();
    if (changed && chatBodyRef.value) {
      chatBodyRef.value.scrollTop = Math.max(0, chatBodyRef.value.scrollHeight - oldHeight + (el?.scrollTop || 0));
    }
  } finally {
    preservingHistoryScroll.value = false;
  }
}

async function handleHistoryPopoverShow() {
  await refreshSessions({ limit: 10, silent: sessionsSafe.value.length > 0 });
}

async function handleHistorySessionsScroll(event) {
  const el = event?.target;
  if (!el || loadingMoreSessionsSafe.value || !sessionsHasMoreSafe.value) return;
  if (el.scrollHeight - el.scrollTop - el.clientHeight > 48) return;
  await loadMoreSessions();
}

async function handleSelectHistorySession(item) {
  const sid = String(item?.session_id || "").trim();
  if (!sid) return;
  if (uploadBusy.value) {
    ElMessage.info("图片仍在上传或识别，请完成后再切换会话");
    return;
  }
  historyPopoverVisible.value = false;
  if (sid !== currentSessionIdSafe.value) {
    await switchSession(sid);
  }
  await maybePromptLatestDuplicateQuoteConfirm();
  forceStickToBottom();
}

async function syncAssistantConversation({ force = false } = {}) {
  if (!force && typeof document !== "undefined" && document.visibilityState === "hidden") return;
  if (sendingSafe.value || uploadBusy.value || loadingHistorySafe.value || loadingMoreHistorySafe.value) return;
  const shouldReloadHistory = force || chatStickToBottom.value;
  const syncResult = await syncCurrentSession({ reloadHistory: shouldReloadHistory, force });
  const historyReloaded = !!syncResult?.historyReloaded;
  if (shouldReloadHistory && historyReloaded) {
    await maybePromptLatestDuplicateQuoteConfirm();
  }
  if (shouldReloadHistory && historyReloaded) {
    await nextTick();
    forceStickToBottom();
  }
}

function handleAssistantVisibilityChange() {
  if (typeof document === "undefined" || document.visibilityState !== "visible") return;
  void syncAssistantConversation();
  void checkPlatformAccountHealth();
}

function handleAssistantWindowFocus() {
  void syncAssistantConversation();
  void checkPlatformAccountHealth();
}

function isStrictQuoteCommand(text) {
  const t = String(text || "").trim();
  if (!looksLikeQuoteCommand(t)) return true;
  if (looksLikeProfessionalPiccQuoteCommand(t)) return true;
  if (looksLikeShortQuoteCommand(t)) return true;
  const match = t.match(/^([\u4e00-\u9fa5A-Za-z0-9]{1,16})\s*(重新|再次|再)?报价$/) || t.match(/^([\u4e00-\u9fa5A-Za-z0-9]{1,16})\s*重报$/);
  if (!match) return false;
  return !INVALID_QUOTE_PLATFORM_HINTS.has(String(match[1] || "").trim());
}

function looksLikeQuoteCommand(text) {
  const t = String(text || "").trim();
  return t.includes("报价") || /重报$/.test(t) || looksLikeShortQuoteCommand(t) || looksLikeProfessionalPiccQuoteCommand(t);
}

function looksLikeQuoteMaterialFormCommand(text) {
  const compact = String(text || "").replace(/[\s,，。.;；:：]+/g, "");
  return [
    "手工",
    "手工录入",
    "手工填写",
    "手动",
    "手动录入",
    "手动填写",
    "人工",
    "人工录入",
    "人工填写",
    "补资料",
    "补充资料",
    "补全资料",
    "补材料",
    "补充材料",
    "补全材料",
    "缺什么",
    "缺少什么",
  ].includes(compact);
}

function looksLikeShortQuoteCommand(text) {
  const compact = String(text || "").replace(/\s+/g, "");
  return [
    "报",
    "报价",
    "开始报",
    "开始报价",
    "直接报",
    "直接报价",
    "现在报",
    "现在报价",
    "提交报价",
    "全保",
    "人保全保",
    "中国人保全保",
    "PICC全保",
    "全保报价",
    "人保全保报价",
    "中国人保全保报价",
    "PICC全保报价",
    "交三",
    "人保交三",
    "中国人保交三",
    "PICC交三",
    "交三报价",
    "人保交三报价",
    "中国人保交三报价",
    "PICC交三报价",
    "单商",
    "人保单商",
    "中国人保单商",
    "PICC单商",
    "单商报价",
    "人保单商报价",
    "中国人保单商报价",
    "PICC单商报价",
  ].includes(compact);
}

function looksLikeProfessionalPiccQuoteCommand(text) {
  const compact = String(text || "").replace(/\s+/g, "");
  return [
    "全保",
    "人保全保",
    "中国人保全保",
    "PICC全保",
    "全保报价",
    "人保全保报价",
    "中国人保全保报价",
    "PICC全保报价",
    "全保重报",
    "人保全保重报",
    "中国人保全保重报",
    "PICC全保重报",
    "交三",
    "人保交三",
    "中国人保交三",
    "PICC交三",
    "交三报价",
    "人保交三报价",
    "中国人保交三报价",
    "PICC交三报价",
    "交三重报",
    "人保交三重报",
    "中国人保交三重报",
    "PICC交三重报",
    "单商",
    "人保单商",
    "中国人保单商",
    "PICC单商",
    "单商报价",
    "人保单商报价",
    "中国人保单商报价",
    "PICC单商报价",
    "单商重报",
    "人保单商重报",
    "中国人保单商重报",
    "PICC单商重报",
  ].includes(compact);
}

function looksLikeDuplicateDialogCommand(text) {
  const compact = String(text || "").replace(/\s+/g, "");
  return [
    "继续报价",
    "确认继续报价",
    "继续重复报价",
    "确认重复报价",
    "中止重复报价",
    "停止重复报价",
    "取消重复报价",
    "不继续报价",
  ].includes(compact);
}

function looksLikeQuoteAdjustmentCommand(text) {
  const compact = String(text || "").replace(/\s+/g, "");
  if (!compact || compact.length > 80) return false;
  if (/^(非过户车|不是过户车|按过户车|过户车)$/.test(compact)) return true;
  if (/^(取消|非|不要|去掉|去除|关闭)?送修码/.test(compact)) return true;
  if (/^送修码[0-9A-Za-z-]{4,}/.test(compact)) return true;

  const amountWords = "(车损|车损险|机动车损失保险|三者|三者险|第三者|第三者责任险|医保外|医保外三者|司机|司机险|乘客|乘客险|司乘|司乘险|非车|途家安顺|途顺家安|交强|交强险)";
  if (new RegExp(`^(${amountWords})(保额|金额|额度|限额)?(改成|改为|改到|调整成|调整为|调整到|调成|调到|调至|设置为|设为|变成|变为|变到|调整|改|变|到|为)?\\d+(\\.\\d+)?(万|万元|元)?$`).test(compact)) {
    return true;
  }
  if (new RegExp(`^(去掉|不要|取消|不买|不投|不保|去除|删除|关闭|不需要)${amountWords}`).test(compact)) {
    return true;
  }
  if (new RegExp(`^${amountWords}(去掉|不要|取消|不买|不投|不保|去除|删除|关闭|不需要)$`).test(compact)) {
    return true;
  }
  return false;
}

function canSubmitWhileSending(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (looksLikeDuplicateDialogCommand(t)) return true;
  if (looksLikeQuoteAdjustmentCommand(t)) return true;
  if (looksLikeQuoteCommand(t)) return isStrictQuoteCommand(t);
  // Let unknown text reach the rule engine so it can return the visible
  // command-error reply without touching the in-flight quote task.
  return true;
}

function looksLikeImageContextHint(text) {
  const compact = String(text || "").replace(/\s+/g, "");
  if (!compact || compact.length > 36) return false;
  if (/[查找搜]|订单|车主|报价|状态|多少钱|保费/.test(compact)) return false;
  if (/(车牌|号牌|VIN|车架|车辆识别代号|发动机|车型|品牌型号|初登|注册日期|登记日期|手机号|手机|电话|身份证号|证件号|所有人)/i.test(compact)) {
    return false;
  }
  const slotWords = [
    "身份证正面",
    "身份证反面",
    "身份证人像面",
    "身份证国徽面",
    "行驶证正本",
    "行驶证主页",
    "行驶证副页",
    "行驶证副本",
    "车辆合格证",
    "合格证",
    "驾驶证",
  ];
  if (!slotWords.some((word) => compact.includes(word))) return false;
  return /^(这是|这个是|这张是|图片是|照片是|材料是)/.test(compact) || slotWords.includes(compact);
}

function clearQuoteFollowupTimer() {
  if (!quoteFollowupTimer) return;
  clearTimeout(quoteFollowupTimer);
  quoteFollowupTimer = null;
}

function markQuoteActivity() {
  quoteActivitySeq += 1;
}

function quoteFlowLooksCompleted(result) {
  const body = result?.data || {};
  const data = body?.data || {};
  const payload = data?.payload || {};
  const task = payload?.quote_task || {};
  return (
    String(body?.intent || "").toLowerCase() === "quote" &&
    String(data?.result_status || "").toLowerCase() === "success" &&
    String(task?.status || "").toLowerCase() === "success"
  );
}

function quoteFlowShouldScheduleFollowup(result = null) {
  void result;
  return false;
}

function scheduleQuoteFollowup(result = null) {
  if (!quoteFlowShouldScheduleFollowup(result)) {
    clearQuoteFollowupTimer();
    return;
  }
  clearQuoteFollowupTimer();
  const scheduledSeq = quoteActivitySeq;
  quoteFollowupTimer = setTimeout(async () => {
    quoteFollowupTimer = null;
    if (scheduledSeq !== quoteActivitySeq) return;
    if (sendingSafe.value || uploadBusy.value) {
      scheduleQuoteFollowup();
      return;
    }
    try {
      await sendMessage("查看当前材料状态", {
        useStream: true,
        silentErrors: true,
        appendUserMessage: false,
        processHintText: "正在检查当前报价材料状态...",
        pageContext: {
          module: "quote_assistant_workbench",
          page: "AiAssistantWorkbench",
          order_id: orderIdSafe.value || undefined,
          auto_followup: true,
          suppress_user_message: true,
        },
      });
    } catch {}
  }, QUOTE_FOLLOWUP_DELAY_MS);
}

function quoteCommandHandledByBackend(result) {
  const body = result?.data || {};
  const data = body?.data || {};
  const payload = data?.payload || body?.payload || {};
  const intent = String(body?.intent || data?.intent || "").toLowerCase();
  return (
    intent === "quote" ||
    !!payload?.auto_started_after_image_collect ||
    !!payload?.quote_task ||
    !!payload?.quote_result ||
    !!payload?.quoteResult
  );
}

function queueQuoteAfterImage(text) {
  const normalized = String(text || "").trim();
  if (!normalized) return false;
  pendingQuoteAfterImage.value = {
    text: normalized,
    queued_at: Date.now(),
    session_id: currentSessionIdSafe.value || "",
  };
  inputText.value = "";
  pendingImageHint.value = "";
  chatStickToBottom.value = true;
  ElMessage.info("图片仍在处理，报价命令已排队，完成后会自动继续");
  return true;
}

async function flushQueuedQuoteAfterImage(imageResult = null) {
  const queued = pendingQuoteAfterImage.value;
  if (!queued?.text) return null;
  const queuedSessionId = String(queued.session_id || "").trim();
  const activeSessionId = currentSessionIdSafe.value;
  if (queuedSessionId && activeSessionId && queuedSessionId !== activeSessionId) {
    pendingQuoteAfterImage.value = null;
    return null;
  }
  if (quoteCommandHandledByBackend(imageResult)) {
    pendingQuoteAfterImage.value = null;
    return imageResult;
  }

  const queuedText = queued.text;
  pendingQuoteAfterImage.value = null;
  chatStickToBottom.value = true;
  const result = await sendMessage(queuedText, {
    useStream: true,
    images: [],
    pageContext: {
      module: "quote_assistant_workbench",
      page: "AiAssistantWorkbench",
      order_id: orderIdSafe.value || undefined,
      auto_queued_after_image_collect: true,
    },
  });
  await maybePromptDuplicateQuoteConfirm(result);
  scheduleQuoteFollowup(result);
  return result;
}

async function handleSend() {
  markQuoteActivity();
  const text = String(inputText.value || "").trim();
  if (!text) {
    ElMessage.warning("请输入内容，或直接拖入图片");
    return;
  }
  if (inputQuoteDenied.value) {
    ElMessage.warning("当前账号只能查看助手信息，不能发起报价或上传报价材料");
    return;
  }
  if (looksLikeImageContextHint(text)) {
    if (!canUseQuoteFlow.value) {
      ElMessage.warning("当前账号只能查看助手信息，不能上传报价材料");
      return;
    }
    pendingImageHint.value = text;
    inputText.value = "";
    ElMessage.success("已记住图片说明，拖入图片时会一起发送");
    return;
  }
  if (uploadBusy.value) {
    if (looksLikeQuoteMaterialFormCommand(text)) {
      const compactFormCommand = text.replace(/[\s,，。.;；:：]+/g, "");
      if (compactFormCommand !== "手工" && !compactFormCommand.startsWith("手工") && !compactFormCommand.startsWith("手动") && !compactFormCommand.startsWith("人工")) {
        ElMessage.info("图片仍在上传或识别，请完成后再补资料");
        return;
      }
    } else if (looksLikeQuoteCommand(text) && isStrictQuoteCommand(text)) {
      queueQuoteAfterImage(text);
      return;
    }
  }
  const canInterruptSending = canSubmitWhileSending(text);
  if (sendingSafe.value && !canInterruptSending) {
    ElMessage.info("上一条消息仍在处理，请稍候");
    return;
  }

  inputText.value = "";
  pendingImageHint.value = "";
  chatStickToBottom.value = true;
  const isQuoteMaterialFormCommand = looksLikeQuoteMaterialFormCommand(text);
  const updatesQuoteFlow =
    looksLikeDuplicateDialogCommand(text) ||
    looksLikeQuoteAdjustmentCommand(text) ||
    (looksLikeQuoteCommand(text) && isStrictQuoteCommand(text));
  const result = await sendMessage(text, {
    useStream: !isQuoteMaterialFormCommand,
    images: [],
    showProcessHint: !isQuoteMaterialFormCommand,
    processHintText: isQuoteMaterialFormCommand
      ? undefined
      : updatesQuoteFlow
        ? "已收到新指令，正在按最新内容处理…"
        : "正在处理…",
    pageContext: {
      module: "quote_assistant_workbench",
      page: "AiAssistantWorkbench",
      order_id: orderIdSafe.value || undefined,
    },
  });
  if (await maybeOpenQuoteMaterialForm(result)) {
    return;
  }
  await maybePromptDuplicateQuoteConfirm(result);
  scheduleQuoteFollowup(result);
}

async function reloadHistory() {
  if (!currentSessionIdSafe.value) return;
  await loadHistory(currentSessionIdSafe.value);
  await maybePromptLatestDuplicateQuoteConfirm();
}

function handleNewSessionButtonClick() {
  if (multiOpenEnabled.value) {
    if (!canAddPane.value) {
      ElMessage.info("最多同时打开 3 个会话窗口");
      return;
    }
    emit("new-session-request", { paneIndex: Number(props.paneIndex || 1) });
    return;
  }
  createNewSessionLocalSafe();
}

async function createNewSessionLocalSafe() {
  try {
    if (uploadBusy.value) {
      ElMessage.info("图片仍在上传或识别，请完成后再新建会话");
      return;
    }
    inputText.value = "";
    pendingImageHint.value = "";
    pendingQuoteAfterImage.value = null;
    for (const url of localPreviewUrls.value) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
    localPreviewUrls.value.clear();
    const result = await createNewSessionLocal();
    if (result?.ok === false) return;
    forceStickToBottom();
    focusInput();
  } catch (e) {
    ElNotification.error({
      title: "新建会话失败",
      message: quoteApiErrorMessage(e, "新建会话失败"),
      duration: 4500,
    });
  }
}

async function handleAction(action) {
  const a = action || {};
  if (a.type === "open_account_manager") {
    openAccountDialog(a.extra?.platform_code || a.platform_code || "");
    return;
  }
  if (a.type === "open_default_config_manager") {
    defaultConfigFilters.value.platform_code = a.extra?.platform_code || a.platform_code || "";
    defaultConfigFilters.value.account_type_name = a.extra?.account_type_name || a.account_type_name || "";
    await openDefaultConfigDialog();
    return;
  }
  if (a.type === "suggest" && a.label) {
    applyQuickPrompt(a.label);
    return;
  }
  ElMessage.info("动作已识别（预留）");
}

function focusInput() {
  nextTick(() => {
    try {
      inputRef.value?.focus?.();
    } catch {}
  });
}

function applyQuickPrompt(text) {
  markQuoteActivity();
  inputText.value = String(text || "");
  focusInput();
}

function fileExt(file) {
  const name = String(file?.name || "").toLowerCase();
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx + 1) : "";
}

function isLikelyImageFile(file) {
  if (!file) return false;
  const type = String(file.type || "").toLowerCase();
  if (type && ALLOWED_IMAGE_TYPES.has(type)) return true;
  return ALLOWED_IMAGE_EXTS.has(fileExt(file));
}

function normalizeImageFiles(files) {
  const all = Array.from(files || []).filter(Boolean);
  const valid = [];
  let unsupported = 0;
  let oversized = 0;
  for (const file of all) {
    if (!isLikelyImageFile(file)) {
      unsupported += 1;
      continue;
    }
    if (Number(file.size || 0) > MAX_IMAGE_BYTES) {
      oversized += 1;
      continue;
    }
    valid.push(file);
  }
  if (unsupported || oversized) {
    const parts = [];
    if (unsupported) parts.push(`${unsupported} 个非支持图片`);
    if (oversized) parts.push(`${oversized} 个超过 20MB`);
    ElMessage.warning(`已跳过：${parts.join("、")}`);
  }
  return valid;
}

function filesFromEvent(evt) {
  const list = evt?.dataTransfer?.files || evt?.target?.files || [];
  return normalizeImageFiles(list);
}

function addLocalPreview(file) {
  const url = URL.createObjectURL(file);
  localPreviewUrls.value.add(url);
  return url;
}

function replaceImageExt(name, ext = "jpg") {
  const text = String(name || "image").trim() || "image";
  const idx = text.lastIndexOf(".");
  const stem = idx > 0 ? text.slice(0, idx) : text;
  return `${stem}.${ext}`;
}

function imageCanUseCanvasCompression(file) {
  const type = String(file?.type || "").toLowerCase();
  const ext = fileExt(file);
  if (type.includes("heic") || type.includes("heif") || ["heic", "heif", "gif"].includes(ext)) return false;
  return ["image/jpeg", "image/png", "image/webp", "image/bmp", ""].includes(type) || ["jpg", "jpeg", "png", "webp", "bmp"].includes(ext);
}

function shouldTryCompressQuoteImage(file) {
  if (!imageCanUseCanvasCompression(file)) return false;
  return Number(file?.size || 0) >= QUOTE_IMAGE_COMPRESS_MIN_BYTES;
}

function loadImageElementFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片解码失败"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function compressQuoteImageIfNeeded(file) {
  const originalSize = Number(file?.size || 0);
  const baseInfo = {
    file,
    compressed: false,
    original_size: originalSize,
    upload_size: originalSize,
  };
  if (!shouldTryCompressQuoteImage(file)) return baseInfo;

  try {
    const img = await loadImageElementFromFile(file);
    const sourceWidth = Number(img.naturalWidth || img.width || 0);
    const sourceHeight = Number(img.naturalHeight || img.height || 0);
    if (!sourceWidth || !sourceHeight) return baseInfo;

    const ratio = Math.min(1, QUOTE_IMAGE_COMPRESS_MAX_EDGE / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * ratio));
    const height = Math.max(1, Math.round(sourceHeight * ratio));
    const shouldResize = ratio < 1;
    if (!shouldResize && originalSize < QUOTE_IMAGE_COMPRESS_MIN_BYTES * 1.35) return baseInfo;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return baseInfo;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, "image/jpeg", QUOTE_IMAGE_COMPRESS_QUALITY);
    if (!blob || !blob.size || blob.size >= originalSize * 0.92) return baseInfo;

    const compressedFile = new File([blob], replaceImageExt(file.name, "jpg"), {
      type: "image/jpeg",
      lastModified: file.lastModified || Date.now(),
    });
    return {
      file: compressedFile,
      compressed: true,
      original_size: originalSize,
      upload_size: Number(compressedFile.size || blob.size || 0),
      original_type: file.type || "",
      original_name: file.name || "image",
      source_width: sourceWidth,
      source_height: sourceHeight,
      upload_width: width,
      upload_height: height,
    };
  } catch {
    return baseInfo;
  }
}

function normalizeUploadMeta(resp) {
  return resp?.data?.data ?? resp?.data ?? {};
}

async function mapWithConcurrency(items, limit, mapper) {
  const source = Array.isArray(items) ? items : [];
  const out = new Array(source.length);
  let cursor = 0;
  const workerCount = Math.max(1, Math.min(Number(limit || 1), source.length || 1));
  const workers = Array.from({ length: workerCount }, async () => {
    while (cursor < source.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await mapper(source[index], index);
    }
  });
  await Promise.all(workers);
  return out;
}

function enqueueImageCollectTask(task) {
  const runner = typeof task === "function" ? task : async () => null;
  const next = imageCollectChain.then(runner, runner);
  imageCollectChain = next.catch(() => null);
  return next;
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject, settled: false };
}

function mergeUploadedMetaIntoLocalImageMessage(localMessageId, uploadedImages) {
  const idx = messages.value.findIndex((m) => m.id === localMessageId);
  if (idx < 0 || !Array.isArray(uploadedImages) || !uploadedImages.length) return;

  const message = messages.value[idx];
  const localImages = Array.isArray(message?.metadata?.images) ? message.metadata.images : [];
  const uploadedByIndex = new Map(
    uploadedImages.map((item, fallbackIndex) => [
      Number.isInteger(Number(item?.local_index)) ? Number(item.local_index) : fallbackIndex,
      item || {},
    ])
  );
  const mergedImages = localImages.map((localImage, imageIndex) => {
    const uploaded = uploadedByIndex.get(imageIndex) || {};
    const localUrl = localImage?.preview_url || localImage?.url || localImage?.image_url || "";
    const remoteUrl = uploaded?.preview_url || uploaded?.url || uploaded?.image_url || "";
    return {
      ...uploaded,
      ...localImage,
      storage_key: uploaded.storage_key || localImage.storage_key || "",
      md5: uploaded.md5 || localImage.md5 || "",
      etag: uploaded.etag || localImage.etag || "",
      size: uploaded.size || localImage.size || 0,
      content_type: uploaded.content_type || localImage.content_type || "",
      original_name: uploaded.original_name || localImage.original_name || localImage.name || "图片",
      url: localUrl || remoteUrl,
      preview_url: localUrl || remoteUrl,
      image_url: localUrl || remoteUrl,
      remote_url: remoteUrl,
    };
  }).filter((_, imageIndex) => uploadedByIndex.has(imageIndex));

  messages.value[idx] = {
    ...message,
    metadata: {
      ...(message.metadata || {}),
      images: mergedImages,
    },
  };
}

async function uploadAndSendImages(files, hintText = "") {
  markQuoteActivity();
  if (!canUseQuoteFlow.value) {
    ElMessage.warning("当前账号只能查看助手信息，不能上传报价材料");
    return;
  }
  const imageFiles = files.filter((f) => isLikelyImageFile(f));
  if (!imageFiles.length) {
    ElMessage.warning("请上传图片文件");
    return;
  }

  activeUploadBatchCount.value += 1;
  const hint = String(hintText || "").trim();
  const uploadBatchId = `img_batch_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const localMessageId = `local_${uploadBatchId}`;
  const chips = imageFiles.map((file) => ({
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name: file.name || "图片",
    url: addLocalPreview(file),
    status: "上传中",
  }));
  uploadingImages.value = [...uploadingImages.value, ...chips];
  chatStickToBottom.value = true;
  messages.value.push({
    id: localMessageId,
    role: "user",
    content: hint,
    created_at: new Date().toISOString(),
    metadata: {
      upload_batch_id: uploadBatchId,
      images: chips.map((chip, idx) => {
        const file = imageFiles[idx];
        return {
          id: chip.id,
          url: chip.url,
          preview_url: chip.url,
          image_url: chip.url,
          original_name: file?.name || chip.name || "图片",
          content_type: file?.type || "application/octet-stream",
          size: Number(file?.size || 0),
          local_preview: true,
        };
      }),
    },
  });

  let stage = "upload";
  let batchResult = null;
  let batchHadUploadedImages = false;
  let batchProcessOk = false;
  const uploadReady = createDeferred();
  const collectResultPromise = enqueueImageCollectTask(async () => {
    const uploaded = await uploadReady.promise;
    stage = "process";
    for (const chip of chips) chip.status = "识别中";
    mergeUploadedMetaIntoLocalImageMessage(localMessageId, uploaded);
    const content = hint || "图片已提交";
    const result = await sendMessage(content, {
      useStream: true,
      silentErrors: true,
      appendUserMessage: false,
      showProcessHint: false,
      images: uploaded,
      pageContext: {
        module: "quote_assistant_workbench",
        page: "AiAssistantWorkbench",
        order_id: orderIdSafe.value || undefined,
        uploaded_images: uploaded,
        image_context_hint: hint,
        upload_batch_id: uploadBatchId,
        display_user_content: hint || "",
        suppress_user_message: true,
      },
    });
    if (result && result.ok === false && !quoteCommandHandledByBackend(result)) {
      throw new Error(result.message || "图片已上传，但后台识别归位失败");
    }
    return result;
  });
  try {
    const failedUploads = [];
    const uploadResults = await mapWithConcurrency(imageFiles, QUOTE_IMAGE_UPLOAD_CONCURRENCY, async (file, i) => {
      chips[i].status = shouldTryCompressQuoteImage(file) ? "处理中" : "上传中";
      try {
        const prepared = await compressQuoteImageIfNeeded(file);
        const uploadFile = prepared.file || file;
        chips[i].status = "上传中";
        const resp = await uploadAiAssistantImage({ slot_key: "related", file: uploadFile });
        const meta = normalizeUploadMeta(resp);
        const url = meta.url || meta.preview_url || chips[i].url;
        chips[i].status = "已上传";
        return {
          local_index: i,
          slot_key: "related",
          provided_slot_key: "related",
          upload_batch_id: uploadBatchId,
          storage_key: meta.storage_key || "",
          md5: meta.md5 || "",
          etag: meta.etag || "",
          size: meta.size || prepared.upload_size || file.size || 0,
          content_type: meta.content_type || uploadFile.type || file.type || "application/octet-stream",
          original_name: file.name || meta.original_name || "image",
          upload_original_name: meta.original_name || uploadFile.name || file.name || "image",
          original_size: prepared.original_size || file.size || 0,
          upload_size: meta.size || prepared.upload_size || uploadFile.size || 0,
          upload_optimized: !!prepared.compressed,
          upload_optimize_meta: prepared.compressed
            ? {
                original_type: prepared.original_type || file.type || "",
                source_width: prepared.source_width || undefined,
                source_height: prepared.source_height || undefined,
                upload_width: prepared.upload_width || undefined,
                upload_height: prepared.upload_height || undefined,
              }
            : undefined,
          url,
          preview_url: url,
          context_hint: hint,
        };
      } catch (e) {
        chips[i].status = "上传失败";
        failedUploads.push({ name: file?.name || `第${i + 1}张图片`, error: e });
        return null;
      }
    });
    const uploaded = uploadResults.filter(Boolean);
    if (!uploaded.length) {
      const first = failedUploads[0];
      const idx = messages.value.findIndex((m) => m.id === localMessageId);
      if (idx >= 0) messages.value.splice(idx, 1);
      for (const url of chips.map((chip) => chip.url)) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
        localPreviewUrls.value.delete(url);
      }
      throw first?.error || new Error("图片上传失败，请稍后重试");
    }

    batchHadUploadedImages = true;
    uploadReady.settled = true;
    uploadReady.resolve(uploaded);
    batchResult = await collectResultPromise;
    if (batchResult && batchResult.ok === false && !quoteCommandHandledByBackend(batchResult)) {
      throw new Error(batchResult.message || "图片已上传，但后台识别归位失败");
    }
    await maybePromptDuplicateQuoteConfirm(batchResult);
    batchProcessOk = true;
    latestSuccessfulImageCollect = {
      session_id: currentSessionIdSafe.value || "",
      result: batchResult,
      at: Date.now(),
    };
    if (failedUploads.length) {
      const names = failedUploads.map((x) => x.name).slice(0, 3).join("、");
      ElNotification.warning({
        title: "部分图片上传失败",
        message: `已继续处理 ${uploaded.length} 张图片，${failedUploads.length} 张未上传成功${names ? `：${names}` : ""}`,
        duration: 5000,
      });
    }
  } catch (e) {
    if (!uploadReady.settled) {
      uploadReady.settled = true;
      uploadReady.reject(e);
    }
    const isProcessError = stage === "process";
    const queuedQuoteText = isProcessError ? String(pendingQuoteAfterImage.value?.text || "").trim() : "";
    if (queuedQuoteText) {
      pendingQuoteAfterImage.value = null;
    }
    const baseMessage = quoteApiErrorMessage(e, isProcessError ? "图片已上传，但后台识别归位失败" : "图片上传失败");
    ElNotification.error({
      title: isProcessError ? "图片处理失败" : "图片上传失败",
      message: queuedQuoteText
        ? `${baseMessage}；已取消排队的“${queuedQuoteText}”，请确认材料后重新发送报价命令。`
        : baseMessage,
      duration: 4500,
    });
  } finally {
    const chipIds = new Set(chips.map((chip) => chip.id));
    uploadingImages.value = uploadingImages.value.filter((chip) => !chipIds.has(chip.id));
    activeUploadBatchCount.value = Math.max(0, activeUploadBatchCount.value - 1);
    if (activeUploadBatchCount.value === 0 && pendingQuoteAfterImage.value) {
      const latestCollect = latestSuccessfulImageCollect;
      const queuedAt = Number(pendingQuoteAfterImage.value?.queued_at || 0);
      const latestMatchesCurrentSession = !!(
        latestCollect?.result &&
        Number(latestCollect.at || 0) >= queuedAt &&
        (!latestCollect.session_id || latestCollect.session_id === (currentSessionIdSafe.value || ""))
      );
      if ((batchHadUploadedImages && batchProcessOk) || latestMatchesCurrentSession) {
        await flushQueuedQuoteAfterImage(batchProcessOk ? batchResult : latestCollect.result);
      }
    }
  }
}

function eventMayContainFiles(evt) {
  if (!canUseQuoteFlow.value) return false;
  const types = Array.from(evt?.dataTransfer?.types || []);
  return types.length ? types.includes("Files") : true;
}

function handleDragEnter(evt) {
  evt?.stopPropagation?.();
  if (!eventMayContainFiles(evt)) return;
  dragDepth.value += 1;
  dragOver.value = true;
}

function handleDragOver(evt) {
  evt?.stopPropagation?.();
  if (!eventMayContainFiles(evt)) return;
  if (evt?.dataTransfer) evt.dataTransfer.dropEffect = "copy";
  dragOver.value = true;
}

function handleDragLeave(evt) {
  evt?.stopPropagation?.();
  if (!eventMayContainFiles(evt)) return;
  dragDepth.value = Math.max(0, dragDepth.value - 1);
  if (dragDepth.value > 0 && evt?.currentTarget?.contains?.(evt?.relatedTarget)) return;
  dragDepth.value = 0;
  dragOver.value = false;
}

async function handleDrop(evt) {
  evt?.stopPropagation?.();
  dragDepth.value = 0;
  dragOver.value = false;
  const files = filesFromEvent(evt);
  const inlineHint = String(inputText.value || "").trim();
  const savedHint = String(pendingImageHint.value || "").trim();
  const hint = inlineHint || savedHint;
  if (files.length && inlineHint) inputText.value = "";
  if (files.length && savedHint && !inlineHint) pendingImageHint.value = "";
  await uploadAndSendImages(files, hint);
}

function pickFiles() {
  if (!canUseQuoteFlow.value) {
    ElMessage.warning("当前账号只能查看助手信息，不能上传报价材料");
    return;
  }
  fileInputRef.value?.click?.();
}

async function handleFilePicked(evt) {
  const files = filesFromEvent(evt);
  const inlineHint = String(inputText.value || "").trim();
  const savedHint = String(pendingImageHint.value || "").trim();
  const hint = inlineHint || savedHint;
  if (files.length && inlineHint) inputText.value = "";
  if (files.length && savedHint && !inlineHint) pendingImageHint.value = "";
  if (evt?.target) evt.target.value = "";
  await uploadAndSendImages(files, hint);
}

async function loadQuotePlatforms() {
  const resp = await listAiQuotePlatforms();
  const data = resp?.data?.data ?? resp?.data ?? {};
  quotePlatforms.value = Array.isArray(data.platforms) ? data.platforms : [];
}

async function loadAccountTypes(platformCode = "") {
  if (!platformCode) {
    accountTypeOptions.value = [];
    return;
  }
  try {
    const resp = await listAiPlatformAccountTypes({ platform_code: platformCode });
    const data = resp?.data?.data ?? resp?.data ?? {};
    accountTypeOptions.value = Array.isArray(data.items) ? data.items : [];
  } catch {
    accountTypeOptions.value = [];
  }
}

async function loadPlatformAccounts() {
  loadingAccounts.value = true;
  try {
    const resp = await listAiPlatformAccounts({
      platform_code: accountFilters.value.platform_code,
      keyword: accountFilters.value.keyword,
    });
    const data = resp?.data?.data ?? resp?.data ?? {};
    platformAccounts.value = Array.isArray(data.items) ? data.items : [];
  } catch (e) {
    ElNotification.error({
      title: "账号列表加载失败",
      message: quoteApiErrorMessage(e, "账号列表加载失败"),
      duration: 4500,
    });
  } finally {
    loadingAccounts.value = false;
  }
}

async function loadPlatformSchemas() {
  try {
    await loadQuotePlatforms();
    if (canManageQuoteAccounts.value) await loadPlatformAccounts();
  } catch (e) {
    ElNotification.error({
      title: "平台配置加载失败",
      message: quoteApiErrorMessage(e, "平台配置加载失败"),
      duration: 4500,
    });
  }
}

function shouldRunPlatformAccountHealthCheck() {
  if (!canUseQuoteFlow.value) return false;
  // 多开时只让第一个窗口负责入口账号健康提醒，避免同一页面弹多次。
  return !paneMode.value || Number(props.paneIndex || 1) === 1;
}

function platformHealthPromptMessage(missingItems) {
  const items = Array.isArray(missingItems) ? missingItems : [];
  if (!items.length) return "";
  return items
    .map((item) => {
      const name = String(item?.platform_name || item?.platform_code || "平台").trim();
      if (isSuperAdmin.value) {
        if (item?.status === "no_enabled_account") {
          return `${name}暂无可用平台账号，请先新增、启用并登录账号后再使用报价助手。`;
        }
        return `${name}暂无已登录且存活可用账号，请确认账号已登录、未等待验证码且额度未满。`;
      }
      return `${name}平台账号暂无存活可用会话，请联系管理员处理。`;
    })
    .filter(Boolean)
    .join("\n");
}

async function checkPlatformAccountHealth({ force = false } = {}) {
  if (!shouldRunPlatformAccountHealthCheck() || checkingPlatformAccountHealth) return;
  const now = Date.now();
  if (!force && now - platformHealthCheckedAt < PLATFORM_HEALTH_CHECK_INTERVAL_MS) return;
  platformHealthCheckedAt = now;
  checkingPlatformAccountHealth = true;
  try {
    const resp = await getAiPlatformAccountHealth();
    const data = resp?.data?.data ?? resp?.data ?? {};
    const missing = Array.isArray(data.missing) ? data.missing : [];
    if (!missing.length) {
      platformHealthPromptKey = "";
      platformHealthPromptAt = 0;
      return;
    }

    const promptKey = missing
      .map((item) => `${item?.platform_code || ""}:${item?.status || ""}`)
      .filter(Boolean)
      .join("|");
    if (!force && promptKey && promptKey === platformHealthPromptKey && now - platformHealthPromptAt < PLATFORM_HEALTH_PROMPT_INTERVAL_MS) {
      return;
    }
    platformHealthPromptKey = promptKey;
    platformHealthPromptAt = now;

    const message = platformHealthPromptMessage(missing);
    if (!message) return;
    if (isSuperAdmin.value) {
      try {
        await ElMessageBox.confirm(message, "平台账号未登录", {
          confirmButtonText: "去登录",
          cancelButtonText: "稍后",
          type: "warning",
          distinguishCancelAndClose: true,
        });
        await openAccountDialog(String(missing[0]?.platform_code || "").trim());
      } catch {
        // 用户选择稍后处理时不打断助手页面使用。
      }
      return;
    }
    try {
      await ElMessageBox.alert(message, "平台账号未登录", {
        confirmButtonText: "知道了",
        type: "warning",
      });
    } catch {
      // 用户关闭提醒时不再额外报错；下一次超过节流窗口再提醒。
    }
  } catch (e) {
    if (force) {
      ElNotification.warning({
        title: "平台账号检查失败",
        message: quoteApiErrorMessage(e, "暂时无法检查平台账号登录状态"),
        duration: 4500,
      });
    }
  } finally {
    checkingPlatformAccountHealth = false;
  }
}

async function openAccountDialog(platformCode = "") {
  if (!canManageQuoteAccounts.value) {
    ElMessage.warning("只有超级管理员可以维护平台账号");
    return;
  }
  accountDialogVisible.value = true;
  if (!quotePlatforms.value.length) await loadQuotePlatforms();
  const code = typeof platformCode === "string" ? platformCode.trim() : "";
  if (code) accountFilters.value.platform_code = code;
  await loadPlatformAccounts();
}

function resetAccountForm(row = null) {
  const firstPlatform = quotePlatforms.value[0] || {};
  const platformCode = row?.platform_code || accountFilters.value.platform_code || firstPlatform.platform_code || "";
  const platform = quotePlatforms.value.find((x) => x.platform_code === platformCode) || firstPlatform;
  editingAccount.value = row || null;
  accountForm.value = {
    platform_code: platformCode,
    platform_name: row?.platform_name || platform.platform_name || "",
    account_type_name: formAccountTypeName(row?.account_type_name),
    account_username: row?.account_username || "",
    account_password: row?.account_password || "",
    login_phone: row?.login_phone || "",
    email: row?.email || "",
    account_owner_name: row?.account_owner_name || "",
    auto_login: row ? !!row.auto_login : true,
    enabled: row ? !!row.enabled : true,
    quota_limit: row?.quota_configured ? String(row?.quota_limit ?? 0) : "",
    quota_period_type: row?.quota_period_type || "day",
    confirm_enabled_edit: false,
  };
  accountFormSnapshot.value = { ...accountForm.value };
}

async function openAccountForm(row = null) {
  if (!quotePlatforms.value.length) await loadQuotePlatforms();
  loadingAccountForm.value = false;
  resetAccountForm(row);
  accountFormVisible.value = true;
  loadAccountTypes(accountForm.value.platform_code);
  if (row?.id) {
    void hydrateAccountFormDetail(row.id);
  }
}

function hydrateFormField(key, incomingValue) {
  const currentValue = accountForm.value[key];
  const baseValue = accountFormSnapshot.value?.[key];
  if (currentValue !== baseValue) return currentValue;
  if (incomingValue === undefined || incomingValue === null) return currentValue;
  return incomingValue;
}

async function hydrateAccountFormDetail(accountId) {
  const expectedId = Number(accountId || 0);
  if (!expectedId) return;
  loadingAccountForm.value = true;
  try {
    const resp = await getAiPlatformAccount(expectedId, { include_quota: false });
    const data = resp?.data?.data ?? resp?.data ?? {};
    const account = data?.account && typeof data.account === "object" ? data.account : {};
    if (!accountFormVisible.value || Number(editingAccount.value?.id || 0) !== expectedId) return;
    editingAccount.value = { ...(editingAccount.value || {}), ...account };
    accountForm.value = {
      ...accountForm.value,
      platform_code: hydrateFormField("platform_code", account.platform_code || accountForm.value.platform_code),
      platform_name: hydrateFormField("platform_name", account.platform_name || accountForm.value.platform_name),
      account_type_name: hydrateFormField(
        "account_type_name",
        formAccountTypeName(account.account_type_name || accountForm.value.account_type_name)
      ),
      account_username: hydrateFormField("account_username", account.account_username || accountForm.value.account_username),
      account_password: hydrateFormField("account_password", account.account_password || ""),
      login_phone: hydrateFormField("login_phone", account.login_phone || ""),
      email: hydrateFormField("email", account.email || ""),
      account_owner_name: hydrateFormField("account_owner_name", account.account_owner_name || ""),
      auto_login: account.auto_login !== undefined ? !!account.auto_login : accountForm.value.auto_login,
      enabled: account.enabled !== undefined ? !!account.enabled : accountForm.value.enabled,
      quota_limit: hydrateFormField("quota_limit", accountForm.value.quota_limit),
      quota_period_type: hydrateFormField("quota_period_type", accountForm.value.quota_period_type || "day"),
    };
  } catch {
    // 详情只是为了补齐密码和完整手机号；接口不可用时保留列表已有信息，避免阻塞编辑。
  } finally {
    if (Number(editingAccount.value?.id || 0) === expectedId) {
      loadingAccountForm.value = false;
    }
  }
}

async function handleAccountPlatformChange(code) {
  const platform = quotePlatforms.value.find((x) => x.platform_code === code) || null;
  accountForm.value.platform_name = platform?.platform_name || "";
  accountForm.value.account_type_name = ACCOUNT_TYPE_GENERIC_VALUE;
  loadAccountTypes(code);
}

function accountFormPayload(extra = {}) {
  const platform = selectedQuotePlatform.value;
  const payload = {
    ...accountForm.value,
    account_type_name: storageAccountTypeName(accountForm.value.account_type_name),
    platform_name: accountForm.value.platform_name || platform?.platform_name || "",
    ...extra,
  };
  if (editingAccount.value?.id) {
    const currentPassword = String(accountForm.value.account_password || "");
    const originalPassword = String(editingAccount.value.account_password || "");
    if (!currentPassword || currentPassword === originalPassword) {
      delete payload.account_password;
    }
  }
  return payload;
}

async function submitAccountForm() {
  if (!accountForm.value.platform_code) {
    ElMessage.warning("请选择平台");
    return;
  }
  if (!String(accountForm.value.account_username || "").trim()) {
    ElMessage.warning("账号不能为空");
    return;
  }
  const accountTypeName = storageAccountTypeName(accountForm.value.account_type_name);
  if (accountTypeName && !fixedQuoteAccountTypeSet.has(accountTypeName)) {
    ElMessage.warning("账号类型标签只能选择：通用、油车-新、油车-旧、新能源车-新、新能源车-旧，或留空");
    return;
  }
  if (!editingAccount.value?.id && !String(accountForm.value.account_password || "").trim()) {
    ElMessage.warning("密码不能为空");
    return;
  }
  const quotaText = String(accountForm.value.quota_limit ?? "").trim();
  if (quotaText) {
    const quota = Number(quotaText);
    if (!Number.isFinite(quota) || quota < 0 || !Number.isInteger(quota)) {
      ElMessage.warning("查询额度必须是非负整数");
      return;
    }
  }

  let confirmEnabledEdit = false;
  if (editingAccount.value?.id && editingAccount.value.enabled) {
    try {
      await ElMessageBox.confirm(
        "该账号当前已启用，修改后可能影响正在使用的报价登录环境。确认保存本次修改？",
        "确认修改启用账号",
        { type: "warning", confirmButtonText: "确认保存", cancelButtonText: "取消" }
      );
      confirmEnabledEdit = true;
    } catch {
      return;
    }
  }

  savingAccount.value = true;
  try {
    if (editingAccount.value?.id) {
      await updateAiPlatformAccount(editingAccount.value.id, accountFormPayload({ confirm_enabled_edit: confirmEnabledEdit }));
      ElMessage.success("平台账号已更新");
    } else {
      await createAiPlatformAccount(accountFormPayload());
      ElMessage.success("平台账号已新增");
    }
    accountFormVisible.value = false;
    await loadPlatformAccounts();
  } catch (e) {
    ElNotification.error({
      title: "账号保存失败",
      message: quoteApiErrorMessage(e, "账号保存失败"),
      duration: 5000,
    });
  } finally {
    savingAccount.value = false;
  }
}

async function handleAccountLogin(row) {
  if (!row?.id) return;
  loginAccountId.value = row.id;
  try {
    const resp = await loginAiPlatformAccount(row.id);
    let data = resp?.data?.data ?? resp?.data ?? {};
    let task = data.login_task || {};
    if (task.status === "needs_code") {
      const prompt = sanitizeChatDisplayText(task.challenge_prompt) || "请输入平台验证码";
      const codeLength = Number(task?.challenge_payload?.code_length || 0);
      const inputPattern = codeLength > 0 ? new RegExp(`^\\d{${codeLength}}$`) : /^\d{4,8}$/;
      const challengeLabel = String(task?.challenge_type || "").includes("security") ? "安全码" : "验证码";
      const inputErrorMessage = codeLength > 0 ? `请输入 ${codeLength} 位数字${challengeLabel}` : "请输入 4-8 位数字验证码";
      const input = await ElMessageBox.prompt(prompt, "登录验证", {
        confirmButtonText: "提交",
        cancelButtonText: "取消",
        inputPattern,
        inputErrorMessage,
      });
      const code = String(input?.value || "").trim();
      const challengeResp = await submitAiPlatformAccountLoginChallenge(task.id, { code });
      data = challengeResp?.data?.data ?? challengeResp?.data ?? {};
      task = data.login_task || {};
    }
    const preservedSessionMessage = loginPreservedSessionNotice(data);
    if (task.status === "success") {
      ElMessage.success("登录成功");
    } else if (task.status === "failed") {
      if (preservedSessionMessage) {
        ElNotification.warning({
          title: "已保留原有会话",
          message: preservedSessionMessage,
          duration: 6000,
        });
      } else {
        ElNotification.error({
          title: "登录失败",
          message: sanitizeChatDisplayText(task.error_detail) || "平台登录失败",
          duration: 5000,
        });
      }
    } else if (task.status === "needs_code") {
      ElMessage.warning("仍在等待验证码");
    } else if (preservedSessionMessage) {
      ElNotification.warning({
        title: "已保留原有会话",
        message: preservedSessionMessage,
        duration: 6000,
      });
    }
    await loadPlatformAccounts();
    await checkPlatformAccountHealth({ force: true });
  } catch (e) {
    if (e === "cancel" || e === "close") {
      await loadPlatformAccounts();
      await checkPlatformAccountHealth({ force: true });
      return;
    }
    ElNotification.error({
      title: "登录失败",
      message: quoteApiErrorMessage(e, "平台登录失败"),
      duration: 5000,
    });
    await loadPlatformAccounts();
    await checkPlatformAccountHealth({ force: true });
  } finally {
    loginAccountId.value = null;
  }
}

function configValuesToFields(values = {}) {
  const entries = Object.entries(values && typeof values === "object" ? values : {});
  if (!entries.length) return [{ field_name: "", field_value: "" }];
  return entries.map(([field_name, field_value]) => ({
    field_name,
    field_value: isBooleanDefaultConfigField(field_name)
      ? booleanDefaultConfigDisplayValue(field_value)
      : field_value == null
        ? ""
        : String(field_value),
  }));
}

function configFieldsToValues(fields = []) {
  const out = {};
  for (const item of Array.isArray(fields) ? fields : []) {
    const key = String(item?.field_name || "").trim();
    if (!key) continue;
    if (isBooleanDefaultConfigField(key)) {
      const value = booleanDefaultConfigStorageValue(item?.field_value);
      if (value == null) continue;
      out[key] = value;
      continue;
    }
    const value = String(item?.field_value ?? "").trim();
    if (!value) continue;
    out[key] = value;
  }
  return out;
}

function numericDefaultAmount(value) {
  if (value == null || typeof value === "boolean") return null;
  const text = String(value)
    .trim()
    .replace(/[,，]/g, "")
    .replace(/\s+/g, "")
    .replace(/(元|万)$/u, "");
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) return null;
  const amount = Number(text);
  return Number.isFinite(amount) ? amount : null;
}

function firstNonPositiveDefaultValue(values = {}) {
  for (const [key, value] of Object.entries(values && typeof values === "object" ? values : {})) {
    const amount = numericDefaultAmount(value);
    const zeroAllowed = zeroAllowedDefaultConfigFieldNames.has(String(key || "").trim());
    if (amount != null && (amount < 0 || (amount === 0 && !zeroAllowed))) {
      return { key, value };
    }
  }
  return null;
}

function summarizeDefaultValues(values = {}) {
  const entries = Object.entries(values && typeof values === "object" ? values : {});
  if (!entries.length) return "-";
  return entries
    .slice(0, 4)
    .map(([key, value]) => `${key}：${formatDefaultConfigValueForDisplay(key, value)}`)
    .join("；");
}

async function loadDefaultConfigTypes(platformCode = "") {
  const code = String(platformCode || "").trim();
  if (!code) {
    defaultConfigTypeOptions.value = [];
    return;
  }
  try {
    const resp = await listAiPlatformAccountTypes({ platform_code: code });
    const data = resp?.data?.data ?? resp?.data ?? {};
    defaultConfigTypeOptions.value = Array.isArray(data.items) ? data.items : [];
  } catch {
    defaultConfigTypeOptions.value = [];
  }
}

async function loadDefaultConfigs() {
  if (!isSuperAdmin.value) return;
  loadingDefaultConfigs.value = true;
  try {
    const resp = await listAiPlatformDefaultConfigs({
      platform_code: defaultConfigFilters.value.platform_code,
      account_type_name: defaultConfigFilters.value.account_type_name,
    });
    const data = resp?.data?.data ?? resp?.data ?? {};
    defaultConfigs.value = Array.isArray(data.items) ? data.items : [];
  } catch (e) {
    ElNotification.error({
      title: "默认参数加载失败",
      message: quoteApiErrorMessage(e, "默认参数加载失败"),
      duration: 4500,
    });
  } finally {
    loadingDefaultConfigs.value = false;
  }
}

async function handleDefaultConfigFilterPlatformChange(code) {
  defaultConfigFilters.value.account_type_name = "";
  await loadDefaultConfigTypes(code);
  await loadDefaultConfigs();
}

async function openDefaultConfigDialog() {
  if (!isSuperAdmin.value) {
    ElMessage.warning("只有超级账号可以维护默认参数配置");
    return;
  }
  defaultConfigDialogVisible.value = true;
  if (!quotePlatforms.value.length) await loadQuotePlatforms();
  await loadDefaultConfigTypes(defaultConfigFilters.value.platform_code);
  await loadDefaultConfigs();
}

async function openProductDefaultConfigFromAccountManager(row = null) {
  if (!isSuperAdmin.value) {
    ElMessage.warning("只有超级账号可以维护默认参数配置");
    return;
  }
  if (!quotePlatforms.value.length) await loadQuotePlatforms();
  const piccPlatform = quotePlatforms.value.find((x) => String(x.platform_code || "").toUpperCase() === "PICC");
  const firstPlatform = quotePlatforms.value[0] || {};
  const platformCode =
    row?.platform_code || accountFilters.value.platform_code || piccPlatform?.platform_code || firstPlatform.platform_code || "";
  if (!platformCode) {
    ElMessage.warning("请先维护报价平台");
    return;
  }
  const typeName = fixedQuoteAccountTypeSet.has(String(row?.account_type_name || "").trim())
    ? String(row.account_type_name).trim()
    : "油车-旧";
  defaultConfigFilters.value.platform_code = platformCode;
  defaultConfigFilters.value.account_type_name = typeName;
  defaultConfigDialogVisible.value = true;
  await loadDefaultConfigTypes(platformCode);
  await loadDefaultConfigs();
  const existed = defaultConfigs.value.find(
    (item) => item?.platform_code === platformCode && String(item?.account_type_name || "") === typeName
  );
  await openDefaultConfigForm(existed || null);
  if (!existed) {
    defaultConfigForm.value.account_type_name = typeName;
    applyDefaultProductTemplate();
  }
}

function resetDefaultConfigForm(row = null) {
  const firstPlatform = quotePlatforms.value[0] || {};
  const platformCode = row?.platform_code || defaultConfigFilters.value.platform_code || firstPlatform.platform_code || "";
  const platform = quotePlatforms.value.find((x) => x.platform_code === platformCode) || firstPlatform;
  const accountTypeName = row?.account_type_name || defaultConfigFilters.value.account_type_name || "";
  editingDefaultConfig.value = row || null;
  defaultConfigForm.value = {
    platform_code: platformCode,
    platform_name: row?.platform_name || platform.platform_name || "",
    account_type_name: accountTypeName,
    enabled: row ? !!row.enabled : true,
    fields: configValuesToFields(row?.default_values || {}),
  };
  if (accountTypeName && isPiccDefaultConfigPlatform()) {
    if (!row) {
      defaultConfigForm.value.fields = defaultProductConfigTemplateForType(accountTypeName);
    }
  }
}

async function openDefaultConfigForm(row = null) {
  if (!quotePlatforms.value.length) await loadQuotePlatforms();
  resetDefaultConfigForm(row);
  await loadDefaultConfigTypes(defaultConfigForm.value.platform_code);
  defaultConfigFormVisible.value = true;
}

async function handleDefaultConfigPlatformChange(code) {
  const platform = quotePlatforms.value.find((x) => x.platform_code === code) || null;
  defaultConfigForm.value.platform_name = platform?.platform_name || "";
  defaultConfigForm.value.account_type_name = "";
  if (!editingDefaultConfig.value?.id) {
    defaultConfigForm.value.fields = [{ field_name: "", field_value: "" }];
  }
  await loadDefaultConfigTypes(code);
}

function handleDefaultConfigAccountTypeChange() {
  applyDefaultProductTemplate({
    silent: true,
    refreshDefaultValues: !editingDefaultConfig.value?.id,
  });
}

function addDefaultConfigField() {
  defaultConfigForm.value.fields.push({ field_name: "", field_value: "" });
}

function applyDefaultProductTemplate(options = {}) {
  const silent = !!options.silent;
  const refreshDefaultValues = !!options.refreshDefaultValues;
  if (!isPiccDefaultConfigPlatform()) {
    if (!silent) {
      ElMessage.info("当前仅内置人保投保产品字段模板，其他平台可手动添加字段");
    }
    return;
  }
  const existing = Array.isArray(defaultConfigForm.value.fields) ? defaultConfigForm.value.fields : [];
  const meaningful = existing.filter((item) => String(item?.field_name || "").trim());
  const byName = new Map();
  for (const item of meaningful) {
    byName.set(String(item.field_name || "").trim(), item);
  }
  let added = 0;
  let refreshed = 0;
  const template = defaultProductConfigTemplateForType(defaultConfigForm.value.account_type_name);
  for (const tpl of template) {
    const key = String(tpl.field_name || "").trim();
    if (!key) continue;
    if (byName.has(key)) {
      const current = byName.get(key);
      if (refreshDefaultValues && productTemplateValueLooksUntouched(key, current?.field_value)) {
        current.field_value = tpl.field_value;
        refreshed += 1;
      }
      continue;
    }
    meaningful.push({ ...tpl });
    byName.set(key, tpl);
    added += 1;
  }
  const orderMap = new Map(template.map((item, idx) => [String(item.field_name || "").trim(), idx]));
  meaningful.sort((a, b) => {
    const ak = String(a?.field_name || "").trim();
    const bk = String(b?.field_name || "").trim();
    const ao = orderMap.has(ak) ? orderMap.get(ak) : Number.MAX_SAFE_INTEGER;
    const bo = orderMap.has(bk) ? orderMap.get(bk) : Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return 0;
  });
  defaultConfigForm.value.fields = meaningful.length ? meaningful : [{ field_name: "", field_value: "" }];
  if (silent) {
    return;
  }
  if (added || refreshed) {
    const parts = [];
    if (added) parts.push(`补充 ${added} 个字段`);
    if (refreshed) parts.push(`刷新 ${refreshed} 个默认值`);
    ElMessage.success(`已${parts.join("，")}`);
  } else {
    ElMessage.info("投保产品字段已存在，无需重复添加");
  }
}

function removeDefaultConfigField(index) {
  if (defaultConfigForm.value.fields.length <= 1) {
    defaultConfigForm.value.fields = [{ field_name: "", field_value: "" }];
    return;
  }
  defaultConfigForm.value.fields.splice(index, 1);
}

function defaultConfigFormPayload() {
  const platform = selectedDefaultConfigPlatform.value;
  return {
    platform_code: defaultConfigForm.value.platform_code,
    platform_name: defaultConfigForm.value.platform_name || platform?.platform_name || "",
    account_type_name: defaultConfigForm.value.account_type_name,
    default_values: configFieldsToValues(defaultConfigForm.value.fields),
    enabled: !!defaultConfigForm.value.enabled,
  };
}

async function submitDefaultConfigForm() {
  if (!defaultConfigForm.value.platform_code) {
    ElMessage.warning("请选择平台");
    return;
  }
  const payload = defaultConfigFormPayload();
  if (!fixedQuoteAccountTypeSet.has(String(payload.account_type_name || "").trim())) {
    ElMessage.warning("请选择适用账号类型：油车-新、油车-旧、新能源车-新、新能源车-旧");
    return;
  }
  if (!Object.keys(payload.default_values).length) {
    ElMessage.warning("请至少添加一个默认参数字段");
    return;
  }
  const invalidPositive = firstNonPositiveDefaultValue(payload.default_values);
  if (invalidPositive) {
    const zeroAllowed = zeroAllowedDefaultConfigFieldNames.has(String(invalidPositive.key || "").trim());
    ElMessage.warning(
      zeroAllowed
        ? `默认参数“${invalidPositive.key}”不能小于 0`
        : `默认参数“${invalidPositive.key}”必须填写正数，不能小于或等于 0`
    );
    return;
  }

  savingDefaultConfig.value = true;
  try {
    if (editingDefaultConfig.value?.id) {
      await updateAiPlatformDefaultConfig(editingDefaultConfig.value.id, payload);
      ElMessage.success("默认参数已更新");
    } else {
      await createAiPlatformDefaultConfig(payload);
      ElMessage.success("默认参数已新增");
    }
    defaultConfigFormVisible.value = false;
    await loadDefaultConfigs();
  } catch (e) {
    ElNotification.error({
      title: "默认参数保存失败",
      message: quoteApiErrorMessage(e, "默认参数保存失败"),
      duration: 5000,
    });
  } finally {
    savingDefaultConfig.value = false;
  }
}

async function handleDeleteDefaultConfig(row) {
  if (!row?.id) return;
  try {
    await ElMessageBox.confirm("确认删除这条默认参数配置？删除后报价时将不再匹配它。", "删除默认参数", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }
  try {
    await deleteAiPlatformDefaultConfig(row.id);
    ElMessage.success("默认参数已删除");
    await loadDefaultConfigs();
  } catch (e) {
    ElNotification.error({
      title: "默认参数删除失败",
      message: quoteApiErrorMessage(e, "默认参数删除失败"),
      duration: 5000,
    });
  }
}

async function uploadExternalFiles(files, hintText = "") {
  await uploadAndSendImages(Array.from(files || []).filter(Boolean), String(hintText || ""));
}

defineExpose({
  openAccountDialog,
  openDefaultConfigDialog,
  createNewSessionLocalSafe,
  uploadExternalFiles,
});

onMounted(async () => {
  await ensureInit({ loadLatestSession: !paneMode.value || Number(props.paneIndex || 1) === 1 });
  await loadPlatformSchemas();
  void checkPlatformAccountHealth({ force: true });
  forceStickToBottom();
  void maybePromptLatestDuplicateQuoteConfirm();
  if (typeof window !== "undefined") {
    window.addEventListener("focus", handleAssistantWindowFocus);
    assistantSyncTimer = window.setInterval(() => {
      void syncAssistantConversation();
    }, 8000);
  }
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleAssistantVisibilityChange);
  }
});

onBeforeUnmount(() => {
  abortActiveRequests();
  clearQuoteFollowupTimer();
  if (typeof window !== "undefined") {
    window.removeEventListener("focus", handleAssistantWindowFocus);
    if (assistantSyncTimer) {
      window.clearInterval(assistantSyncTimer);
      assistantSyncTimer = null;
    }
  }
  if (typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", handleAssistantVisibilityChange);
  }
  if (imageLoadScrollFrame) {
    cancelAnimationFrame(imageLoadScrollFrame);
    imageLoadScrollFrame = 0;
  }
  for (const url of localPreviewUrls.value) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }
  localPreviewUrls.value.clear();
});
</script>

<style scoped>
.ai-page {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ai-page.ai-pane-mode {
  height: 100%;
  min-width: 0;
  gap: 0;
}

:global(.duplicate-quote-confirm-box),
:global(.platform-dialog-box) {
  width: min(680px, calc(100vw - 32px));
}

:global(.duplicate-quote-confirm-text),
:global(.platform-dialog-text) {
  max-height: 420px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  line-height: 1.7;
  font-family: inherit;
  color: #303133;
}

.quote-material-form-intro {
  margin: -2px 0 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f5f7fb;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.6;
}

.quote-material-missing {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #6b7280;
}

.quote-material-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
}

.quote-material-form :deep(.el-form-item) {
  margin-bottom: 13px;
}

.quote-material-form :deep(.el-form-item__label) {
  padding-bottom: 5px;
  font-size: 13px;
  color: #374151;
}

@media (max-width: 720px) {
  .quote-material-form {
    grid-template-columns: 1fr;
  }
}

.ai-page.page-drag-over {
  cursor: copy;
}

.head-card,
.chat-card {
  border-radius: 12px;
}

.head-card :deep(.el-card__body) {
  padding: 14px 16px 12px;
}

.head-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.head-main {
  display: flex;
  align-items: center;
  min-height: 32px;
}

.page-title {
  margin: 0;
  font-size: 18px;
}

.head-meta {
  margin-top: 8px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 13px;
  color: rgba(31, 42, 68, 0.8);
}

.head-actions,
.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.head-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.manage-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-left: 8px;
  border-left: 1px solid rgba(31, 42, 68, 0.12);
}

.guide-trigger {
  font-weight: 700;
}

.guide-pop {
  color: #303133;
}

.guide-pop-title {
  font-weight: 700;
  margin-bottom: 8px;
}

.guide-pop-line,
.guide-pop-tip {
  font-size: 13px;
  line-height: 1.7;
}

.guide-pop-tip {
  margin-top: 8px;
  color: #606266;
}

:global(.assistant-history-popover) {
  padding: 0;
}

.history-panel {
  padding: 10px;
}

.history-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 2px 2px 8px;
  border-bottom: 1px solid rgba(31, 42, 68, 0.08);
}

.history-panel-head strong {
  font-size: 14px;
  color: #1f2a44;
}

.history-panel-head span {
  font-size: 12px;
  color: rgba(31, 42, 68, 0.52);
}

.history-session-list {
  max-height: 390px;
  overflow: auto;
  padding-top: 6px;
}

.history-session-item {
  width: 100%;
  border: 0;
  background: transparent;
  border-radius: 10px;
  padding: 9px 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  text-align: left;
  cursor: pointer;
  color: #1f2a44;
}

.history-session-item:hover {
  background: rgba(64, 158, 255, 0.08);
}

.history-session-item.active {
  background: rgba(64, 158, 255, 0.12);
}

.history-session-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.history-session-main strong,
.history-session-main em {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-session-main strong {
  font-size: 13px;
  font-style: normal;
  font-weight: 700;
}

.history-session-main em {
  max-width: 220px;
  font-size: 12px;
  font-style: normal;
  color: rgba(31, 42, 68, 0.58);
}

.history-session-side {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  color: rgba(31, 42, 68, 0.48);
}

.history-session-side i,
.history-session-side b {
  font-size: 11px;
  font-style: normal;
  font-weight: 500;
  white-space: nowrap;
}

.history-session-loading,
.history-session-more {
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(31, 42, 68, 0.52);
}

.history-session-loading.small {
  min-height: 28px;
}

.top-hint {
  margin-top: 10px;
}

.chat-card :deep(.el-card__body) {
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 14px 14px 14px;
}

.ai-pane-mode .chat-card {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
}

.ai-pane-mode .chat-card :deep(.el-card__header) {
  flex: 0 0 auto;
  padding: 8px 8px;
}

.ai-pane-mode .chat-card :deep(.el-card__body) {
  flex: 1 1 auto;
  padding: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-header-left {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-header-title {
  font-size: 14px;
  font-weight: 700;
  color: rgba(31, 42, 68, 0.96);
}

.card-header-meta {
  max-width: min(560px, 56vw);
  display: flex;
  align-items: center;
  gap: 5px;
  overflow: hidden;
  color: rgba(31, 42, 68, 0.48);
  font-size: 12px;
  line-height: 1.3;
  white-space: nowrap;
}

.card-header-count,
.card-header-state {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-header-state {
  max-width: 260px;
  color: rgba(64, 158, 255, 0.82);
}

.card-header-dot {
  flex: 0 0 auto;
  color: rgba(31, 42, 68, 0.32);
}

.chat-body {
  position: relative;
  flex: 1 1 auto;
  min-height: calc(100vh - 390px);
  max-height: calc(100vh - 330px);
  overflow: auto;
  padding: 6px 8px 8px 2px;
  border: 1px dashed transparent;
  border-radius: 12px;
}

.ai-pane-mode .chat-body {
  min-height: 0;
  max-height: none;
  padding-right: 4px;
}

.ai-pane-mode.ai-pane-count-2 .card-header-meta,
.ai-pane-mode.ai-pane-count-3 .card-header-meta {
  max-width: 100%;
}

.ai-pane-mode.ai-pane-count-2 .card-header-state,
.ai-pane-mode.ai-pane-count-3 .card-header-state,
.ai-pane-mode.ai-pane-count-3 .card-header-count {
  display: none;
}

.ai-pane-mode.ai-pane-count-3 .card-header {
  align-items: flex-start;
  gap: 4px;
}

.ai-pane-mode.ai-pane-count-3 .header-actions {
  gap: 1px;
}

.ai-pane-mode.ai-pane-count-3 .header-actions :deep(.el-button) {
  padding-inline: 4px;
  min-width: 0;
  height: 26px;
  font-size: 12px;
}

.ai-pane-mode.ai-pane-count-3 .card-header-title {
  font-size: 13px;
}

.ai-pane-mode.ai-pane-count-3 .chat-body {
  padding-right: 0;
}

.ai-pane-mode.ai-pane-count-3 .chat-input-wrap {
  margin-top: 8px;
  padding-top: 8px;
  gap: 6px;
}

.ai-pane-mode.ai-pane-count-3 .input-actions {
  margin-top: 6px;
  gap: 6px;
}

.ai-pane-mode.ai-pane-count-3 .btns {
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.chat-body.drag-over {
  border-color: rgba(64, 158, 255, 0.55);
  background: rgba(64, 158, 255, 0.04);
}

.drop-mask {
  position: absolute;
  inset: 8px;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.84);
  backdrop-filter: blur(3px);
}

.drop-card {
  border: 1px solid rgba(64, 158, 255, 0.3);
  background: #fff;
  border-radius: 14px;
  padding: 22px 28px;
  box-shadow: 0 12px 30px rgba(31, 42, 68, 0.12);
  text-align: center;
}

.drop-title {
  font-size: 18px;
  font-weight: 800;
  color: #1f2a44;
}

.drop-sub {
  margin-top: 6px;
  font-size: 13px;
  color: rgba(31, 42, 68, 0.65);
}

.scroll-bottom-btn {
  position: absolute;
  right: 14px;
  bottom: 14px;
  z-index: 7;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 12px;
  border: 1px solid rgba(64, 158, 255, 0.24);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: #2768ff;
  box-shadow: 0 8px 18px rgba(31, 42, 68, 0.12);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
}

.scroll-bottom-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(31, 42, 68, 0.16);
}

.empty-wrap {
  padding: 28px 8px;
}

.empty-actions {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.msg-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.load-more-row {
  display: flex;
  justify-content: center;
  padding: 0 0 4px;
}

.msg-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  width: 100%;
}

.msg-avatar {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.msg-user .msg-avatar {
  background: #409eff;
}

.msg-assistant .msg-avatar {
  background: #67c23a;
}

.msg-system .msg-avatar {
  background: #909399;
}

.msg-content {
  flex: 1 1 auto;
  min-width: 0;
  max-width: min(84%, 760px);
  display: flex;
  flex-direction: column;
}

.msg-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
  font-size: 12px;
  color: rgba(31, 42, 68, 0.68);
}

.msg-role {
  font-weight: 700;
  color: rgba(31, 42, 68, 0.92);
}

.msg-bubble {
  border: 1px solid rgba(60, 60, 60, 0.1);
  border-radius: 10px;
  background: #fff;
  padding: 9px 10px;
  width: fit-content;
  max-width: 100%;
}

.msg-user .msg-bubble {
  background: rgba(64, 158, 255, 0.06);
  border-color: rgba(64, 158, 255, 0.2);
}

.msg-user {
  flex-direction: row-reverse;
}

.msg-user .msg-content {
  align-items: flex-end;
}

.msg-user .msg-head {
  justify-content: flex-end;
}

.msg-user .msg-images {
  justify-content: flex-end;
}

.msg-assistant .msg-content {
  align-items: flex-start;
}

.msg-assistant .msg-head {
  justify-content: flex-start;
}

.msg-assistant .msg-images {
  justify-content: flex-start;
}

.msg-assistant .msg-bubble {
  background: #fff;
}

.msg-system .msg-bubble {
  background: rgba(144, 147, 153, 0.05);
}

.msg-bubble-quote {
  border: 0;
  background: transparent;
  padding: 0;
}

.msg-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(31, 42, 68, 0.95);
}

.msg-images {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.msg-bubble > .msg-images:first-child {
  margin-top: 0;
}

.msg-assistant .msg-images {
  justify-content: flex-start;
}

.msg-image-wrap {
  position: relative;
  width: 84px;
  height: 84px;
  border-radius: 10px;
  overflow: hidden;
}

.msg-image-wrap.recalled .msg-image {
  filter: grayscale(1);
  opacity: 0.42;
}

.msg-image {
  width: 84px;
  height: 84px;
  border-radius: 10px;
  border: 1px solid rgba(60, 60, 60, 0.08);
}

.quote-result-image-wrap {
  width: min(500px, 100%);
  height: auto;
  overflow: visible;
  border-radius: 0;
  background: #fff;
}

.quote-result-image-clickable {
  cursor: zoom-in;
}

.quote-result-image-wrap .msg-image {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1350 / 650;
  border-radius: 0;
}

.image-loading {
  width: 84px;
  height: 84px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid rgba(60, 60, 60, 0.08);
  background: linear-gradient(135deg, rgba(245, 247, 250, 0.96), rgba(235, 239, 245, 0.92));
  color: rgba(31, 42, 68, 0.38);
}

.quote-result-image-loading {
  width: 100%;
  height: auto;
  min-height: 168px;
  aspect-ratio: 1350 / 650;
  border-radius: 0;
  background: #fff;
}

.image-error {
  width: 84px;
  height: 84px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px dashed rgba(144, 147, 153, 0.28);
  background: rgba(144, 147, 153, 0.08);
  color: rgba(31, 42, 68, 0.52);
  font-size: 12px;
}

.recall-btn {
  position: absolute;
  right: 4px;
  bottom: 4px;
  padding: 4px 7px;
  height: 24px;
}

.recalled-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(31, 42, 68, 0.46);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.data-hint {
  margin-top: 10px;
}

.quote-result-card {
  position: relative;
  isolation: isolate;
  width: 567px;
  max-width: 100%;
  min-height: 557px;
  box-sizing: border-box;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: linear-gradient(180deg, #eeeeee 0 31px, #fff4f2 31px 100%);
  padding: 55px 102px 24px 104px;
  color: #000;
  font-family: "Microsoft YaHei", "SimSun", "PingFang SC", sans-serif;
  font-size: 14px;
  line-height: 1.32;
  box-shadow: none;
}

.quote-result-card::before {
  content: "";
  position: absolute;
  top: 31px;
  bottom: 0;
  left: 0;
  width: 18px;
  background: #e7e7e7;
  border-right: 1px solid #f0c8be;
  z-index: 0;
}

.quote-result-card > :not(.quote-card-title) {
  position: relative;
  z-index: 2;
}

.quote-card-title {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 55px;
  z-index: 3;
  pointer-events: none;
}

.quote-card-ribbon {
  position: absolute;
  top: 16px;
  left: 48px;
  width: 180px;
  height: 38px;
  box-sizing: border-box;
  padding: 0 18px 0 29px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #e84f42;
  clip-path: polygon(7px 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 7px 100%, 0 50%);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  line-height: 38px;
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.84);
  pointer-events: auto;
}

.quote-card-step {
  width: auto;
  height: auto;
  border-radius: 0;
  display: inline;
  background: transparent;
  color: rgba(255, 255, 255, 0.68);
  font-family: Georgia, "Times New Roman", serif;
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}

.quote-tax-check {
  position: absolute;
  top: 35px;
  left: 277px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #000;
  font-size: 14px;
  font-weight: 400;
  line-height: 16px;
  pointer-events: auto;
  user-select: none;
}

.quote-tax-check input {
  width: 15px;
  height: 15px;
  margin: 0;
  accent-color: #3157ff;
}

.quote-card-head,
.quote-total-line,
.quote-section-line,
.quote-coverage-row {
  display: grid;
  grid-template-columns: minmax(0, 166px) 90px 104px;
  gap: 0;
  align-items: center;
}

.quote-card-head {
  min-height: 25px;
  padding: 0 0 6px;
  color: #000;
  font-size: 14px;
  font-weight: 400;
}

.quote-card-head span:nth-child(2),
.quote-card-head span:nth-child(3),
.quote-coverage-row span:nth-child(2),
.quote-coverage-row span:nth-child(3) {
  justify-content: flex-end;
  text-align: right;
}

.quote-total-line,
.quote-section-line {
  min-height: 30px;
  font-weight: 700;
}

.quote-total-line {
  padding: 0 0 7px;
  border-bottom: 1px solid rgba(178, 178, 178, 0.62);
}

.quote-section-line {
  padding: 6px 0 5px;
  border-top: 1px solid rgba(178, 178, 178, 0.62);
}

.quote-total-line + .quote-section-line {
  border-top: 0;
}

.quote-total-line strong:first-child,
.quote-section-line strong:first-child,
.quote-section-line span:first-child {
  grid-column: 1 / 3;
  display: inline-flex;
  align-items: center;
  min-width: 0;
  color: #000;
  font-weight: 700;
}

.quote-total-line strong:last-child,
.quote-section-line strong:last-child {
  grid-column: 3;
  justify-self: end;
  color: #ff0000;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0;
}

.quote-section-line em {
  margin-left: 8px;
  color: #0065ff;
  font-style: normal;
  font-weight: 400;
}

.quote-down-premium {
  letter-spacing: -0.2px;
}

.quote-section-line.thin {
  min-height: 24px;
  padding: 1px 0;
  border-top: 0;
  font-size: 14px;
  font-weight: 700;
}

.quote-section-line.thin strong {
  font-size: 16px;
}

.quote-blue-caret {
  width: 0;
  height: 0;
  margin-left: 5px;
  display: inline-block;
  vertical-align: middle;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid #2878ff;
}

.quote-badge {
  width: 16px;
  height: 16px;
  margin-right: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: #fff;
  font-size: 11px;
  font-style: normal;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.84), 0 0 4px rgba(0, 0, 0, 0.16);
}

.quote-badge-total {
  background: #ff5146;
}

.quote-badge-bi {
  background: #4f92ff;
}

.quote-badge-ci {
  background: #caa86c;
}

.quote-coverage-table {
  width: 360px;
  max-width: 100%;
  margin: 0 0 9px;
}

.quote-coverage-row {
  min-height: 25px;
  padding: 0;
  border-top: 0;
  font-size: 14px;
  font-weight: 400;
}

.quote-coverage-row span {
  min-height: 24px;
  box-sizing: border-box;
  padding: 3px 8px 2px 10px;
  display: flex;
  align-items: center;
  overflow: hidden;
  border-right: 3px solid #fff7f5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quote-coverage-row span:last-child {
  border-right: 0;
}

.quote-coverage-row:nth-child(odd) span {
  background: #f9dfdd;
}

.quote-coverage-row:nth-child(even) span {
  background: rgba(255, 255, 255, 0.7);
}

.quote-link-line {
  margin-top: 7px;
  padding: 11px 0 6px;
  border-top: 1px solid rgba(178, 178, 178, 0.62);
  color: #005eff;
  font-size: 14px;
}

.quote-claim-line {
  display: grid;
  grid-template-columns: 1.28fr 0.72fr 0.72fr 1fr;
  align-items: center;
  min-height: 26px;
  padding: 1px 0 8px;
  border-top: 0;
  font-size: 14px;
}

.quote-claim-line span {
  display: inline-flex;
  align-items: center;
}

.quote-claim-query {
  justify-content: flex-end;
  color: #005eff;
}

.quote-risk-line {
  margin-top: 5px;
  padding-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(178, 178, 178, 0.62);
  font-size: 14px;
  font-weight: 700;
}

.quote-risk-line strong {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 16px;
  font-weight: 700;
}

.quote-risk-score {
  color: #ff0000;
}

.quote-risk-arrow {
  color: #000;
}

@media (max-width: 640px) {
  .quote-result-card {
    width: 100%;
    min-width: 0;
    min-height: 0;
    padding: 55px 42px 22px 54px;
  }

  .quote-result-card::before {
    width: 12px;
  }

  .quote-card-ribbon {
    left: 24px;
  }

  .quote-tax-check {
    left: min(277px, calc(100% - 92px));
  }

  .quote-card-head,
  .quote-total-line,
  .quote-section-line,
  .quote-coverage-row {
    grid-template-columns: minmax(0, 1fr) 76px 86px;
  }

  .quote-coverage-table {
    width: 100%;
  }

  .quote-coverage-row,
  .quote-card-head,
  .quote-result-card {
    font-size: 12px;
  }
}

.action-wrap {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed rgba(60, 60, 60, 0.1);
}

.action-title {
  font-size: 12px;
  font-weight: 700;
  color: rgba(31, 42, 68, 0.72);
  margin-bottom: 6px;
}

.action-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.err-wrap {
  margin-top: 8px;
}

.quote-image-preview-dialog :deep(.el-dialog__body) {
  padding-top: 8px;
}

.quote-image-preview-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quote-image-preview-title {
  font-size: 13px;
  font-weight: 700;
  color: rgba(31, 42, 68, 0.78);
}

.quote-image-preview-img {
  width: 100%;
  max-height: 76vh;
  display: block;
  object-fit: contain;
  border-radius: 10px;
  background: #f7f8fb;
}

.account-saved-line {
  margin: -4px 0 14px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(31, 42, 68, 0.68);
}

.account-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.account-toolbar-spacer {
  flex: 1 1 auto;
  min-width: 8px;
}

.account-dialog :deep(.el-dialog) {
  max-width: 1180px;
}

.account-dialog :deep(.el-dialog__body) {
  padding-top: 8px;
}

.account-table :deep(.el-table__cell) {
  padding: 4px 0;
}

.account-table :deep(.cell) {
  padding: 0 5px;
  line-height: 1.25;
}

.account-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-inline-tags,
.account-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: nowrap;
  justify-content: center;
}

.account-actions :deep(.el-button) {
  min-height: 24px;
  padding: 2px 4px;
}

.account-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.account-form-hint {
  margin-bottom: 10px;
  font-size: 12px;
  color: rgba(31, 42, 68, 0.65);
}

.account-notice {
  color: rgba(31, 42, 68, 0.68);
  font-size: 12px;
}

.account-notice.warning {
  color: #b26a00;
}

.account-muted {
  color: rgba(31, 42, 68, 0.58);
  font-size: 12px;
}

.account-quota-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.account-switch-row {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}

.default-field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 2px 0 8px;
  font-size: 12px;
  color: rgba(31, 42, 68, 0.68);
}

.default-field-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.default-template-tip {
  margin: -2px 0 10px;
  color: rgba(31, 42, 68, 0.62);
  font-size: 12px;
  line-height: 1.5;
}

.default-field-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.default-field-row {
  display: grid;
  grid-template-columns: minmax(150px, 0.9fr) minmax(180px, 1.2fr) auto;
  gap: 8px;
  align-items: center;
}

.upload-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0;
  border-top: 1px dashed rgba(60, 60, 60, 0.08);
}

.upload-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 260px;
  border: 1px solid rgba(60, 60, 60, 0.08);
  border-radius: 10px;
  padding: 5px 8px;
  font-size: 12px;
}

.upload-thumb {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  flex-shrink: 0;
}

.chat-input-wrap {
  border-top: 1px solid rgba(60, 60, 60, 0.08);
  margin-top: 10px;
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.workbench-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.08), rgba(103, 194, 58, 0.06));
  color: rgba(31, 42, 68, 0.82);
  font-size: 12px;
  line-height: 1.5;
}

.workbench-status.busy {
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.12), rgba(64, 158, 255, 0.04));
}

.workbench-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #67c23a;
  box-shadow: 0 0 0 4px rgba(103, 194, 58, 0.12);
  flex-shrink: 0;
}

.workbench-status.busy .workbench-status-dot {
  background: #409eff;
  box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.12);
  animation: status-pulse 1.4s ease-in-out infinite;
}

@keyframes status-pulse {
  0%,
  100% {
    transform: scale(0.92);
    opacity: 0.72;
  }
  50% {
    transform: scale(1.08);
    opacity: 1;
  }
}

.input-actions {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.input-assist {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(31, 42, 68, 0.62);
}

.input-assist.warning {
  color: #b26a00;
}

.btns {
  display: flex;
  gap: 8px;
  align-items: center;
}

.scroll-fade-enter-active,
.scroll-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.scroll-fade-enter-from,
.scroll-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.hidden-file {
  display: none;
}

@media (max-width: 960px) {
  .head-row,
  .input-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .chat-body {
    min-height: 420px;
    max-height: 520px;
  }

  .head-actions,
  .btns {
    justify-content: flex-end;
  }

  .ai-pane-mode .input-actions {
    flex-direction: row;
    align-items: center;
  }

  .ai-pane-mode .chat-body {
    min-height: 0;
    max-height: none;
  }

  .default-field-row {
    grid-template-columns: 1fr;
  }
}
</style>
