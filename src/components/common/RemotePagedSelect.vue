<template>
  <el-select
    ref="selectRef"
    :model-value="innerModelValue"
    filterable
    remote
    reserve-keyword
    clearable
    :placeholder="placeholder"
    :class="selectClass"
    :loading="initialLoading"
    :disabled="disabled"
    :remote-method="onSearch"
    @update:model-value="onUpdate"
    @visible-change="onVisibleChange"
  >
    <el-option
      v-for="item in mergedItems"
      :key="item._value"
      :label="labelFormatter(item)"
      :value="item._value"
    />

    <template #empty>
      <div class="select-empty-wrap">
        <span v-if="initialLoading">加载中...</span>
        <span v-else-if="bucket?.error">{{ bucket.error }}</span>
        <span v-else>暂无数据</span>
      </div>
    </template>

    <el-option
      v-if="appending"
      key="__remote_paged_select_loading_more__"
      label="加载更多..."
      value="__remote_paged_select_loading_more__"
      disabled
    />
  </el-select>
</template>

<script setup>
import {computed, nextTick, onBeforeUnmount, ref} from "vue";
import {useCustomerChannelGroups} from "@/composables/useCustomerChannelGroups";

const props = defineProps({
  modelValue: {
    type: [String, Number, null],
    default: null,
  },
  type: {
    type: String,
    required: true, // customers | channels
    validator: (v) => v === "customers" || v === "channels",
  },
  placeholder: {
    type: String,
    default: "请选择",
  },
  pageSize: {
    type: Number,
    default: 20,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  selectClass: {
    type: String,
    default: "",
  },
  currentOption: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["update:modelValue"]);

const selectRef = ref(null);
const keyword = ref("");

const {
  getCustomerBucket,
  getChannelBucket,
  ensureCustomerGroupsLoaded,
  ensureChannelGroupsLoaded,
  loadMoreCustomerGroups,
  loadMoreChannelGroups,
  customerGroupLabel,
  channelGroupLabel,
} = useCustomerChannelGroups();

function toInnerValue(v) {
  if (v === null || v === undefined || v === "") return "";
  return String(v);
}

function toOuterValue(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

function normalizeItem(item) {
  if (!item || item.id == null) return null;
  return {
    ...item,
    _value: String(item.id),
  };
}

const innerModelValue = computed(() => toInnerValue(props.modelValue));

const bucket = computed(() => {
  if (props.type === "channels") {
    return getChannelBucket(keyword.value, props.pageSize);
  }
  return getCustomerBucket(keyword.value, props.pageSize);
});

const items = computed(() => bucket.value?.items || []);
const loading = computed(() => !!bucket.value?.loading);
const initialLoading = computed(() => loading.value && items.value.length === 0);
const appending = computed(() => loading.value && items.value.length > 0);

const labelFormatter = computed(() => {
  return props.type === "channels" ? channelGroupLabel : customerGroupLabel;
});

const mergedItems = computed(() => {
  const arr = [];
  const seen = new Set();

  const pushOne = (item) => {
    const normalized = normalizeItem(item);
    if (!normalized) return;
    if (seen.has(normalized._value)) return;
    seen.add(normalized._value);
    arr.push(normalized);
  };

  pushOne(props.currentOption);
  for (const item of items.value) pushOne(item);

  return arr;
});

let scrollWrap = null;
let scrollHandler = null;

function onUpdate(v) {
  const normalizedValue = toOuterValue(v);
  if (normalizedValue === null) {
    keyword.value = "";
  }
  emit("update:modelValue", normalizedValue);
}

function toDomElement(target) {
  if (!target) return null;
  if (target instanceof HTMLElement) return target;
  if (target.$el instanceof HTMLElement) return target.$el;
  if (target.contentRef instanceof HTMLElement) return target.contentRef;
  if (target.contentRef?.$el instanceof HTMLElement) return target.contentRef.$el;
  return null;
}

function detachScrollListener() {
  if (scrollWrap && scrollHandler) {
    scrollWrap.removeEventListener("scroll", scrollHandler);
  }
  scrollWrap = null;
  scrollHandler = null;
}

function getSelectScrollWrap() {
  const popperRootCandidates = [
    toDomElement(selectRef.value?.popperRef?.contentRef),
    toDomElement(selectRef.value?.tooltipRef?.contentRef),
    toDomElement(selectRef.value?.popperPaneRef),
    toDomElement(selectRef.value?.popperRef),
  ].filter(Boolean);

  const scrollSelectors = [
    ".el-select-dropdown .el-scrollbar__wrap",
    ".el-select-dropdown__wrap",
    ".el-scrollbar__wrap",
  ];

  for (const root of popperRootCandidates) {
    for (const selector of scrollSelectors) {
      const wrap = root.querySelector(selector);
      if (wrap) return wrap;
    }
  }

  const teleportedFallback = [
    ...document.querySelectorAll(".el-select-dropdown .el-scrollbar__wrap"),
    ...document.querySelectorAll(".el-select-dropdown__wrap"),
    ...document.querySelectorAll(".el-select__popper .el-scrollbar__wrap"),
  ];

  return teleportedFallback.at(-1) || null;
}

function nearBottom(el) {
  if (!el) return false;

  const total = Number(el.scrollHeight || 0);
  const top = Number(el.scrollTop || 0);
  const height = Number(el.clientHeight || 0);

  if (total <= 0 || height <= 0) return false;
  return top + height >= total - 40;
}

async function ensureFirstPage() {
  if (props.type === "channels") {
    await ensureChannelGroupsLoaded({
      keyword: keyword.value,
      pageSize: props.pageSize,
    });
    return;
  }

  await ensureCustomerGroupsLoaded({
    keyword: keyword.value,
    pageSize: props.pageSize,
  });
}

async function loadMore() {
  if (loading.value) return;
  if (!bucket.value?.hasMore) return;

  if (props.type === "channels") {
    await loadMoreChannelGroups({
      keyword: keyword.value,
      pageSize: props.pageSize,
    });
    return;
  }

  await loadMoreCustomerGroups({
    keyword: keyword.value,
    pageSize: props.pageSize,
  });
}

async function attachScroll() {
  await nextTick();
  detachScrollListener();

  scrollWrap = getSelectScrollWrap();
  if (!scrollWrap) return;

  scrollHandler = async () => {
    if (!nearBottom(scrollWrap)) return;
    try {
      await loadMore();
    } catch (e) {
      console.error(e);
    }
  };

  scrollWrap.addEventListener("scroll", scrollHandler, {passive: true});

  if (nearBottom(scrollWrap)) {
    try {
      await loadMore();
    } catch (e) {
      console.error(e);
    }
  }
}

async function onSearch(v) {
  keyword.value = String(v || "").trim();

  try {
    await ensureFirstPage();
    await attachScroll();
  } catch (e) {
    console.error(e);
  }
}

async function onVisibleChange(open) {
  if (!open) {
    detachScrollListener();
    keyword.value = "";
    return;
  }

  try {
    await ensureFirstPage();
    await attachScroll();
  } catch (e) {
    console.error(e);
  }
}

onBeforeUnmount(() => {
  detachScrollListener();
});
</script>

<style scoped>
.select-empty-wrap {
  padding: 10px 12px;
  text-align: center;
  color: #909399;
  font-size: 12px;
}
</style>