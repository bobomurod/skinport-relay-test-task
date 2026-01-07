export function simpleTTLCache(TTLms: number) {
  const cache = new Map();

  function get(key: string) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }
    return entry.value;
  }

  function set(key: string, value: any) {
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
