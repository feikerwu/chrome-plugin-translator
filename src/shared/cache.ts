const CACHE_KEY = "translator_cache";
const CACHE_ORDER_KEY = "translator_cache_order";
const MAX_CACHE_SIZE = 50;

export interface PageCache {
  url: string;
  entries: { original: string; translation: string }[];
  timestamp: number;
}

async function getCacheData(): Promise<{ cache: Record<string, PageCache>; order: string[] }> {
  const result = await chrome.storage.local.get([CACHE_KEY, CACHE_ORDER_KEY]);
  return {
    cache: (result[CACHE_KEY] as Record<string, PageCache> | undefined) ?? {},
    order: (result[CACHE_ORDER_KEY] as string[] | undefined) ?? [],
  };
}

export async function getPageCache(url: string): Promise<PageCache | null> {
  const { cache, order } = await getCacheData();
  const entry = cache[url];
  if (!entry) return null;

  const newOrder = [url, ...order.filter((u) => u !== url)];
  await chrome.storage.local.set({ [CACHE_ORDER_KEY]: newOrder });

  return entry;
}

export async function setPageCache(url: string, entries: PageCache["entries"]): Promise<void> {
  const { cache, order } = await getCacheData();

  cache[url] = { url, entries, timestamp: Date.now() };
  let newOrder = [url, ...order.filter((u) => u !== url)];

  while (newOrder.length > MAX_CACHE_SIZE) {
    const evicted = newOrder.pop()!;
    delete cache[evicted];
  }

  await chrome.storage.local.set({
    [CACHE_KEY]: cache,
    [CACHE_ORDER_KEY]: newOrder,
  });
}

export async function clearCache(): Promise<void> {
  await chrome.storage.local.remove([CACHE_KEY, CACHE_ORDER_KEY]);
}

export async function getCacheSize(): Promise<number> {
  const { order } = await getCacheData();
  return order.length;
}
