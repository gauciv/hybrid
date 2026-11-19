// Caching repeated work, with privacy rules:
// - Anything containing raw contract text or real names (on-device name results, photo/PDF readings) is kept in
//   MEMORY ONLY: gone when the tab closes, never written to disk (shared phones, internet-café PCs).
// - Cloud explanation responses contain only placeholders ([[PERSON_1]]), never real data, so they may live in
//   sessionStorage (cleared when the tab closes). This saves free-tier quota and makes a repeat explanation instant.
// Keys are SHA-256 fingerprints of the content.

export async function fingerprint(data: string | ArrayBuffer): Promise<string> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Small in-memory LRU (insertion-ordered Map). */
export class MemoryCache<V> {
  private map = new Map<string, V>();
  private max: number;
  constructor(max = 20) {
    this.max = max;
  }
  get(k: string): V | undefined {
    const v = this.map.get(k);
    if (v !== undefined) (this.map.delete(k), this.map.set(k, v)); // refresh recency
    return v;
  }
  set(k: string, v: V) {
    this.map.delete(k);
    this.map.set(k, v);
    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value!);
  }
}

export const session = {
  get(k: string): string | null {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      sessionStorage.setItem(k, v);
    } catch {
      /* storage full or blocked: just don't cache */
    }
  },
};
