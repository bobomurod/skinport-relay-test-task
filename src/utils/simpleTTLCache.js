export function simpleTTLCache(TTLms) {
  const cache = new Map();

  function get(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }
    return entry.value;
  }

  function set(key, value) {
    cache.set(key, {
      value,
      expiresAt: Date.now() + TTLms,
    });
  }

  function clear() {
    cache.clear();
  }

  return {
    get,
    set,
    clear,
  };
}
