import { getStorageItem, setStorageItem, removeStorageItems } from "./storage";

export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
}

export class LRUCache<T> {
  private cacheKey: string;
  private orderKey: string;
  private maxSize: number;

  constructor(namespace: string, maxSize = 50) {
    this.cacheKey = `${namespace}_cache`;
    this.orderKey = `${namespace}_cache_order`;
    this.maxSize = maxSize;
  }

  private async getData(): Promise<{ cache: Record<string, CacheEntry<T>>; order: string[] }> {
    const [cache, order] = await Promise.all([
      getStorageItem<Record<string, CacheEntry<T>>>(this.cacheKey, {}),
      getStorageItem<string[]>(this.orderKey, []),
    ]);
    return { cache, order };
  }

  async get(key: string): Promise<T | null> {
    const { cache, order } = await this.getData();
    const entry = cache[key];
    if (!entry) return null;

    const newOrder = [key, ...order.filter((k) => k !== key)];
    await setStorageItem(this.orderKey, newOrder);
    return entry.data;
  }

  async set(key: string, data: T): Promise<void> {
    const { cache, order } = await this.getData();

    cache[key] = { key, data, timestamp: Date.now() };
    const newOrder = [key, ...order.filter((k) => k !== key)];

    while (newOrder.length > this.maxSize) {
      const evicted = newOrder.pop()!;
      delete cache[evicted];
    }

    await Promise.all([
      setStorageItem(this.cacheKey, cache),
      setStorageItem(this.orderKey, newOrder),
    ]);
  }

  async clear(): Promise<void> {
    await removeStorageItems([this.cacheKey, this.orderKey]);
  }

  async size(): Promise<number> {
    const order = await getStorageItem<string[]>(this.orderKey, []);
    return order.length;
  }
}
