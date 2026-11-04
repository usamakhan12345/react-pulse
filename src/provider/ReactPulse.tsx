import { useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import type { PulseConfig } from "../core/types";
import { getStore } from "../core/store";
import { isBrowser } from "../utils/environment";
import { useApplyConfig } from "./useApplyConfig";

export interface DevtoolsOptions {
  /** `"system"` follows `prefers-color-scheme`. Default `"system"`. */
  theme?: "light" | "dark" | "system";
  /** Open the panel on first render. Default false (only the launcher is shown). */
  defaultOpen?: boolean;
  /** Where the panel docks. Default `"bottom"`. */
  dock?: "bottom" | "right";
}

export interface DevtoolsProps extends DevtoolsOptions {
  /** Show toast notifications for warnings (`config.showNotifications`). */
  notifications?: boolean;
}

export interface ReactPulseProps extends DevtoolsOptions {
  config?: Partial<PulseConfig>;
  /**
   * Mount the dashboard overlay. Default true while monitoring is enabled.
   * Set false to only apply `config` and keep hooks/logging.
   */
  dashboard?: boolean;
  /**
   * Custom dashboard loader. Use it to ship the dashboard in a production
   * build on purpose: `loadDevtools={() => import("reactpulse-devtools/devtools/full")}`.
   */
  loadDevtools?: () => Promise<{ DevtoolsRoot: ComponentType<DevtoolsProps> }>;
  children?: ReactNode;
}

const defaultLoader = () => import("reactpulse-devtools/devtools");

/**
 * Applies configuration and (when enabled, in the browser) lazy-loads the
 * dashboard. Without this component the hooks still work with defaults.
 * Wrapping children does not make them re-render.
 */
export function ReactPulse({
  config,
  dashboard,
  loadDevtools = defaultLoader,
  theme,
  defaultOpen,
  dock,
  children,
}: ReactPulseProps) {
  const store = getStore();
  useApplyConfig(config);

  const [Devtools, setDevtools] = useState<ComponentType<DevtoolsProps> | null>(null);
  const wantDashboard = (dashboard ?? true) && isBrowser() && store.isEnabled();
  useEffect(() => {
    if (!wantDashboard) return;
    let alive = true;
    loadDevtools().then(
      (mod) => {
        // The production stub exports a component that renders nothing.
        if (alive && mod.DevtoolsRoot) setDevtools(() => mod.DevtoolsRoot);
      },
      (error) => console.warn("[reactpulse] could not load the dashboard:", error),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantDashboard]);

  return (
    <>
      {children}
      {wantDashboard && Devtools ? (
        <Devtools
          theme={theme}
          defaultOpen={defaultOpen}
          dock={dock}
          notifications={store.config.showNotifications}
        />
      ) : null}
    </>
  );
}
