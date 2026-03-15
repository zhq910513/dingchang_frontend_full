// src/composables/useCustomerChannelGroups.js
import {computed, ref} from "vue";
import {getChannelGroups, getCustomerGroups} from "@/api/customerChannel";

const DEFAULT_PAGE_SIZE = 20;
const MAX_CACHE_BUCKETS = 50;

const _customerBuckets = ref(new Map());
const _channelBuckets = ref(new Map());

function _trim(v) {
    return String(v ?? "").trim();
}

function _normalizeKeyword(v) {
    return _trim(v);
}

function _normalizePageSize(v) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return DEFAULT_PAGE_SIZE;
    return Math.min(Math.floor(n), 100);
}

function _makeBucketKey(keyword = "", pageSize = DEFAULT_PAGE_SIZE) {
    return `${_normalizeKeyword(keyword)}__${_normalizePageSize(pageSize)}`;
}

function _createBucket(keyword = "", pageSize = DEFAULT_PAGE_SIZE) {
    return {
        keyword: _normalizeKeyword(keyword),
        pageSize: _normalizePageSize(pageSize),
        items: [],
        page: 0,
        total: 0,
        hasMore: true,
        loading: false,
        loaded: false,
        error: "",
        promise: null,
    };
}

function _getStore(type) {
    return type === "channels" ? _channelBuckets : _customerBuckets;
}

function _ensureBucket(type, keyword = "", pageSize = DEFAULT_PAGE_SIZE) {
    const store = _getStore(type);
    const key = _makeBucketKey(keyword, pageSize);

    if (!store.value.has(key)) {
        store.value.set(key, _createBucket(keyword, pageSize));

        if (store.value.size > MAX_CACHE_BUCKETS) {
            const firstKey = store.value.keys().next().value;
            if (firstKey !== undefined) store.value.delete(firstKey);
        }
    }

    return store.value.get(key);
}

function _resetBucket(bucket) {
    bucket.items = [];
    bucket.page = 0;
    bucket.total = 0;
    bucket.hasMore = true;
    bucket.loading = false;
    bucket.loaded = false;
    bucket.error = "";
    bucket.promise = null;
}

function _normalizePageResp(resp) {
    const d = resp?.data || {};
    const items = Array.isArray(d.items) ? d.items : [];
    const page = Number(d.page || 1);
    const pageSize = Number(d.page_size || items.length || DEFAULT_PAGE_SIZE);
    const total = Number(d.total || 0);
    const hasMore = !!d.has_more;

    return {
        items,
        page: Number.isFinite(page) && page > 0 ? page : 1,
        pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE,
        total: Number.isFinite(total) && total >= 0 ? total : 0,
        hasMore,
    };
}

async function _fetchPage(type, {keyword = "", page = 1, pageSize = DEFAULT_PAGE_SIZE} = {}) {
    const params = {
        keyword: _normalizeKeyword(keyword) || undefined,
        page,
        page_size: _normalizePageSize(pageSize),
    };

    if (type === "channels") {
        return getChannelGroups(params);
    }
    return getCustomerGroups(params);
}

async function _loadFirstPage(type, {keyword = "", pageSize = DEFAULT_PAGE_SIZE, force = false} = {}) {
    const bucket = _ensureBucket(type, keyword, pageSize);

    if (bucket.loading && bucket.promise) return bucket.promise;
    if (bucket.loaded && !force) return bucket;

    if (force) _resetBucket(bucket);

    bucket.loading = true;
    bucket.error = "";

    bucket.promise = _fetchPage(type, {keyword, page: 1, pageSize})
        .then((resp) => {
            const data = _normalizePageResp(resp);
            bucket.items = data.items;
            bucket.page = data.page;
            bucket.total = data.total;
            bucket.hasMore = data.hasMore;
            bucket.loaded = true;
            return bucket;
        })
        .catch((err) => {
            bucket.error = err?.message || "加载失败";
            throw err;
        })
        .finally(() => {
            bucket.loading = false;
            bucket.promise = null;
        });

    return bucket.promise;
}

async function _loadNextPage(type, {keyword = "", pageSize = DEFAULT_PAGE_SIZE} = {}) {
    const bucket = _ensureBucket(type, keyword, pageSize);

    if (bucket.loading && bucket.promise) return bucket.promise;
    if (!bucket.hasMore && bucket.loaded) return bucket;
    if (!bucket.loaded || bucket.page <= 0) {
        return _loadFirstPage(type, {keyword, pageSize, force: false});
    }

    const nextPage = bucket.page + 1;
    bucket.loading = true;
    bucket.error = "";

    bucket.promise = _fetchPage(type, {keyword, page: nextPage, pageSize})
        .then((resp) => {
            const data = _normalizePageResp(resp);

            const seen = new Set();
            const merged = [];

            for (const item of [...bucket.items, ...data.items]) {
                const id = item?.id;
                const key = id == null ? JSON.stringify(item) : String(id);
                if (seen.has(key)) continue;
                seen.add(key);
                merged.push(item);
            }

            bucket.items = merged;
            bucket.page = data.page;
            bucket.total = data.total;
            bucket.hasMore = data.hasMore;
            bucket.loaded = true;
            return bucket;
        })
        .catch((err) => {
            bucket.error = err?.message || "加载失败";
            throw err;
        })
        .finally(() => {
            bucket.loading = false;
            bucket.promise = null;
        });

    return bucket.promise;
}

function formatCustomerGroupLabel(g) {
    const code = _trim(g?.customer_code);
    const name = _trim(g?.customer_name);
    const id = g?.id != null ? String(g.id) : "";

    if (code && name) return `${code} - ${name}`;
    if (code) return code;
    if (name) return name;
    return id || "-";
}

function formatChannelGroupLabel(g) {
    const code = _trim(g?.channel_code);
    const name = _trim(g?.channel_name);
    const id = g?.id != null ? String(g.id) : "";

    if (code && name) return `${code} - ${name}`;
    if (code) return code;
    if (name) return name;
    return id || "-";
}

export function useCustomerChannelGroups() {
    function getCustomerBucket(keyword = "", pageSize = DEFAULT_PAGE_SIZE) {
        return _ensureBucket("customers", keyword, pageSize);
    }

    function getChannelBucket(keyword = "", pageSize = DEFAULT_PAGE_SIZE) {
        return _ensureBucket("channels", keyword, pageSize);
    }

    async function ensureCustomerGroupsLoaded({keyword = "", pageSize = DEFAULT_PAGE_SIZE, force = false} = {}) {
        return _loadFirstPage("customers", {keyword, pageSize, force});
    }

    async function ensureChannelGroupsLoaded({keyword = "", pageSize = DEFAULT_PAGE_SIZE, force = false} = {}) {
        return _loadFirstPage("channels", {keyword, pageSize, force});
    }

    async function loadMoreCustomerGroups({keyword = "", pageSize = DEFAULT_PAGE_SIZE} = {}) {
        return _loadNextPage("customers", {keyword, pageSize});
    }

    async function loadMoreChannelGroups({keyword = "", pageSize = DEFAULT_PAGE_SIZE} = {}) {
        return _loadNextPage("channels", {keyword, pageSize});
    }

    function clearCustomerGroupsCache() {
        _customerBuckets.value = new Map();
    }

    function clearChannelGroupsCache() {
        _channelBuckets.value = new Map();
    }

    function clearCache() {
        clearCustomerGroupsCache();
        clearChannelGroupsCache();
    }

    return {
        DEFAULT_PAGE_SIZE,

        getCustomerBucket,
        getChannelBucket,

        ensureCustomerGroupsLoaded,
        ensureChannelGroupsLoaded,
        loadMoreCustomerGroups,
        loadMoreChannelGroups,

        clearCustomerGroupsCache,
        clearChannelGroupsCache,
        clearCache,

        customerGroupLabel: formatCustomerGroupLabel,
        channelGroupLabel: formatChannelGroupLabel,

        customerBuckets: computed(() => _customerBuckets.value),
        channelBuckets: computed(() => _channelBuckets.value),
    };
}
