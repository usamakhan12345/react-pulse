import { useSyncExternalStore } from "react";
import type { Store } from "../core/store";
import { getStore } from "../core/store";

/**
 * Subscribes the calling dashboard component to the store. The snapshot is the
 * store's version number, so React only re-renders when something was recorded
 * (and not more often than `config.uiInterval`).
 */
export function useStore(): { store: Store; version: number } {
  const store = getStore();
  const version = useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);
  return { store, version };
}
