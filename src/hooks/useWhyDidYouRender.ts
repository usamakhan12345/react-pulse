import type { TrackInput, TrackSettings } from "../core/tracker";
import type { RenderInfo } from "./useRenderTracker";
import { useRenderTracker } from "./useRenderTracker";

export type WhyDidYouRenderOptions = Omit<TrackInput, "props"> & TrackSettings;

/**
 * Explains each re-render in the console: which props changed (previous and
 * current values side by side), plus instrumented state, context and hook
 * dependencies you pass in `options`.
 *
 * Pass the component's real `props` object. Its identity lets ReactPulse tell
 * "the parent rendered" (new object) from "internal update" (same object);
 * both are reported as *probable*, never certain.
 *
 * @example
 * function Card(props: CardProps) {
 *   useWhyDidYouRender("Card", props, { state: { open }, context: { theme } });
 * }
 */
export function useWhyDidYouRender(
  name: string,
  props: Record<string, unknown>,
  options: WhyDidYouRenderOptions = {},
): RenderInfo {
  return useRenderTracker(name, {
    log: true,
    logInitial: false,
    ...options,
    props,
    rawProps: true,
  });
}
