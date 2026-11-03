import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ReactPulse } from "reactpulse";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ReactPulse
      config={{
        // `enabled: true` so the demo also works in `vite build` output.
        enabled: true,
        threshold: 16,
        showNotifications: true,
        trackRenders: true,
        compareDepth: 3,
        performanceApi: true,
        leakDetection: true,
        leakRepeatThreshold: 5,
      }}
      defaultOpen
    >
      <App />
    </ReactPulse>
  </StrictMode>,
);
