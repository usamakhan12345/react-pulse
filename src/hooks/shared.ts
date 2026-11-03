import { useEffect, useLayoutEffect } from "react";

/** `useLayoutEffect` warns during SSR on React 18; fall back to `useEffect` on the server. */
export const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
