const _versions = new Map();

export function getDataVersion(scope = "global") {
  return Number(_versions.get(String(scope)) || 0);
}

export function bumpDataVersion(scope = "global") {
  const key = String(scope || "global");
  const next = getDataVersion(key) + 1;
  _versions.set(key, next);

  try {
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent("dc:data-version", {detail: {scope: key, version: next}}));
    }
  } catch {
    // ignore browser compatibility issues
  }

  return next;
}

