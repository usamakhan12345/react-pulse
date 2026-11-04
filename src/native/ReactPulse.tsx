import type { ReactNode } from "react";
import type { PulseConfig } from "../core/types";
import { getStore } from "../core/store";
import { useApplyConfig } from "../provider/useApplyConfig";
import { PulseDevtools } from "./PulseDevtools";
import type { NativeDevtoolsOptions } from "./PulseDevtools";

export interface ReactPulseProps extends NativeDevtoolsOptions {
  config?: Partial<PulseConfig>;
  /**
   * Render the floating launcher and panel. Default true while monitoring is
   * enabled (React Native `__DEV__`, or `config.enabled: true`).
   */
  dashboard?: boolean;
  children?: ReactNode;
}

/**
 * Applies configuration and renders the developer panel on top of your app.
 * Put it at the root, around your navigator. It never re-renders `children`.
 *
 * Monitoring is off in release builds (`__DEV__ === false`) unless you set
 * `config.enabled: true`. Metro does not tree-shake, so the panel code is still
 * in the release bundle; see the README for a `__DEV__`-guarded require.
 */
export function ReactPulse({ config, dashboard, children, ...devtools }: ReactPulseProps) {
  useApplyConfig(config);
  const show = (dashboard ?? true) && getStore().isEnabled();
  return (
    <>
      {children}
      {show ? <PulseDevtools {...devtools} /> : null}
    </>
  );
}
