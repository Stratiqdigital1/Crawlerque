export async function runWithConcurrency<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency = 2
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function next() {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await worker(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () =>
    next()
  );

  await Promise.all(workers);
  return results;
}