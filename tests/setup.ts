import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { resetStore } from "../src/core/store";

// Lets React know this is a test environment so act() warnings stay meaningful.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  cleanup();
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
});
