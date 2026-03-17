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
    :loading="loading"
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
        <span v-if="loading">加载中...</span>
        <span v-else-if="bucket?.error">{{ bucket.error }}</span>
        <span v-else>暂无数据</span>
      </div>
    </template>
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
  emit("update:modelValue", toOuterValue(v));
}

function detachScrollListener() {
  if (scrollWrap && scrollHandler) {
    scrollWrap.removeEventListener("scroll", scrollHandler);
  }
  scrollWrap = null;
  scrollHandler = null;
}

function getSelectScrollWrap() {
  const el = selectRef.value?.popperRef?.contentRef;
  if (!el) return null;
  return el.querySelector(".el-select-dropdown__wrap");
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