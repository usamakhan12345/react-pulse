import { useRef } from "react";
import type { PulseConfig } from "../core/types";
import { getStore } from "../core/store";
import { isEqual } from "../core/comparator";

/**
 * Applies `config` to the store during render. This is on purpose: children's
 * first render and mount effects run before this component's own effects, and
 * they must already see the config. It is idempotent, so StrictMode's double
 * render is harmless, and it skips work when the config is deep-equal.
 */
export function useApplyConfig(config: Partial<PulseConfig> | undefined): void {
  const applied = useRef<Partial<PulseConfig> | undefined>(undefined);
  if (config && (!applied.current || !isEqual(applied.current, config, 2))) {
    applied.current = config;
    getStore().configure(config);
  }
}
