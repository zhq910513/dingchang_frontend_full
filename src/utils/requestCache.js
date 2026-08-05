const _stores = new Map();

function _getStore(namespace) {
  const ns = String(namespace || "default");
  if (!_stores.has(ns)) _stores.set(ns, new Map());
  return _stores.get(ns);
}

function _sortObject(value) {
  if (Array.isArray(value)) return value.map(_sortObject);
  if (!value || typeof value !== "object") return value;

  const out = {};
  for (const key of Object.keys(value).sort()) {
    const v = value[key];
    if (v === undefined) continue;
    out[key] = _sortObject(v);
  }
  return out;
}

export function stableCacheKey(value) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(_sortObject(value ?? null));
  } catch {
    return String(value);
  }
}

function _trimStore(store, maxEntries) {
  const max = Number(maxEntries);
  if (!Number.isFinite(max) || max <= 0) return;

  while (store.size > max) {
    const firstKey = store.keys().next().value;
    if (firstKey === undefined) return;
    store.delete(firstKey);
  }
}

export function cachedPromise(namespace, key, loader, options = {}) {
  const store = _getStore(namespace);
  const cacheKey = stableCacheKey(key);
  const ttlMs = Math.max(0, Number(options.ttlMs ?? 30000));
  const maxEntries = Math.max(1, Number(options.maxEntries ?? 100));
  const now = Date.now();
  const existing = store.get(cacheKey);

  if (existing?.promise) return existing.promise;
  if (existing?.hasValue && existing.expiresAt > now) {
    return Promise.resolve(existing.value);
  }

  const promise = Promise.resolve()
    .then(loader)
    .then((value) => {
      store.set(cacheKey, {
        hasValue: true,
        value,
        expiresAt: Date.now() + ttlMs,
        promise: null,
      });
      _trimStore(store, maxEntries);
      return value;
    })
    .catch((err) => {
      if (existing?.hasValue) {
        store.set(cacheKey, {
          ...existing,
          promise: null,
        });
      } else {
        store.delete(cacheKey);
      }
      throw err;
    });

  store.set(cacheKey, {
    hasValue: existing?.hasValue === true,
    value: existing?.value,
    expiresAt: existing?.expiresAt || 0,
    promise,
  });

  return promise;
}

export function invalidateCache(namespace, predicate = null) {
  const store = _getStore(namespace);
  if (typeof predicate !== "function") {
    store.clear();
    return;
  }

  for (const [key, record] of store.entries()) {
    if (predicate(key, record)) store.delete(key);
  }
}

