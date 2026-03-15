<template>
  <el-select
      ref="selectRef"
      :model-value="modelValue"
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
        v-for="item in items"
        :key="String(item.id)"
        :label="labelFormatter(item)"
        :value="item.id"
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

let scrollWrap = null;
let scrollHandler = null;

function onUpdate(v) {
  emit("update:modelValue", v);
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
  return (top + height) / total >= 0.8;
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
