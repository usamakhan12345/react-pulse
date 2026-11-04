/**
 * Runs the published package (the packed tarball, CJS build) against the REAL react-native
 * implementation of View/Text/Pressable/FlatList/TextInput/StyleSheet/Share/etc.
 */
import React, { StrictMode, useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import {
  PulseDashboard,
  ReactPulse,
  exportReportJSON,
  getPulseStore,
  useRenderTracker,
  useTrackedState,
  useWhyDidYouRender,
} from "reactpulse-devtools/native";

function Counter() {
  const [count, setCount] = useTrackedState(0, "Counter.count");
  useRenderTracker("Counter", { state: { count } });
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Increment" onPress={() => setCount((c) => c + 1)}>
      <Text>count {count}</Text>
    </Pressable>
  );
}

function Child(props) {
  useWhyDidYouRender("Child", props);
  return <Text>child</Text>;
}
function Parent() {
  const [n, setN] = useState(0);
  return (
    <View>
      <Pressable accessibilityRole="button" accessibilityLabel="Parent tick" onPress={() => setN(n + 1)}>
        <Text>tick {n}</Text>
      </Pressable>
      <Child label="x" />
    </View>
  );
}

function App() {
  return (
    <View>
      <Counter />
      <Parent />
    </View>
  );
}

const press = (label) => fireEvent.press(screen.getByLabelText(label));
const flush = () => act(() => getPulseStore().flush());

beforeEach(() => {
  getPulseStore().configure({ enabled: true, uiInterval: 0, warnings: false });
  getPulseStore().resume();
  getPulseStore().clear();
});

test("exports the native API", () => {
  expect(typeof ReactPulse).toBe("function");
  expect(typeof PulseDashboard).toBe("function");
  expect(typeof useRenderTracker).toBe("function");
});

test("the provider renders the app and a launcher; the panel opens and closes", () => {
  render(
    <ReactPulse>
      <App />
    </ReactPulse>,
  );
  expect(screen.getByText("count 0")).toBeTruthy();
  expect(screen.queryByLabelText("ReactPulse panel")).toBeNull();
  press("Open ReactPulse");
  expect(screen.getByLabelText("ReactPulse panel")).toBeTruthy();
  press("Expand panel");
  expect(screen.getByLabelText("Shrink panel")).toBeTruthy();
  press("Close ReactPulse");
  expect(screen.queryByLabelText("ReactPulse panel")).toBeNull();
});

test("hooks record real renders and the dashboard shows them live", async () => {
  render(
    <ReactPulse defaultOpen>
      <App />
    </ReactPulse>,
  );
  press("Increment");
  press("Increment");
  await flush();
  const store = getPulseStore();
  expect(store.components.get("Counter").renders).toBe(3);
  expect(screen.getByLabelText("Counter, 3 renders")).toBeTruthy();
  expect(store.stateLog.map((s) => [s.label, s.prev, s.next])).toEqual([
    ["count", 0, 1],
    ["count", 1, 2],
  ]);
});

test("details show certain and probable reasons with previous/current values", async () => {
  render(
    <ReactPulse defaultOpen>
      <App />
    </ReactPulse>,
  );
  press("Increment");
  press("Parent tick");
  await flush();
  press("Counter, 2 renders");
  expect(screen.getByText(/state changed: count/)).toBeTruthy();
  expect(screen.getByText("certain")).toBeTruthy();
  press("Back to components");
  press("Child, 2 renders");
  expect(screen.getByText("probable")).toBeTruthy();
  expect(screen.getAllByText(/parent/).length).toBeGreaterThan(0);
});

test("search, filter and sort chips work with the real TextInput and ScrollView", async () => {
  render(
    <ReactPulse defaultOpen>
      <App />
    </ReactPulse>,
  );
  await flush();
  fireEvent.changeText(screen.getByLabelText("Search components"), "Coun");
  expect(screen.getByLabelText("Counter, 1 renders")).toBeTruthy();
  expect(screen.queryByLabelText("Child, 1 renders")).toBeNull();
  fireEvent.changeText(screen.getByLabelText("Search components"), "");
  press("Sort: Name");
  press("Filter: Re-rendered");
  expect(screen.getByText(/No components match/)).toBeTruthy();
});

test("pause, resume and clear update the UI immediately", async () => {
  render(
    <ReactPulse defaultOpen>
      <App />
    </ReactPulse>,
  );
  expect(screen.getByText("Recording")).toBeTruthy();
  press("Pause monitoring");
  expect(screen.getByText("Paused")).toBeTruthy();
  press("Increment");
  expect(getPulseStore().components.get("Counter").renders).toBe(1);
  press("Resume monitoring");
  press("Clear history");
  // Components that are still mounted keep a (reset) record; only history is cleared.
  expect(screen.getByLabelText("Counter, 0 renders")).toBeTruthy();
  expect(getPulseStore().timeline).toHaveLength(0);
});

test("Share.share is called with a valid report; import works through TextInput", async () => {
  const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });
  render(
    <ReactPulse defaultOpen>
      <App />
    </ReactPulse>,
  );
  await flush();
  press("Report");
  await act(async () => {
    press("Share report");
  });
  expect(share).toHaveBeenCalledTimes(1);
  const { message } = share.mock.calls[0][0];
  expect(JSON.parse(message).format).toBe("reactpulse-report");

  const json = exportReportJSON();
  getPulseStore().clear();
  fireEvent.changeText(screen.getByLabelText("Report JSON"), json);
  press("Import report");
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(getPulseStore().paused).toBe(true);
  expect(screen.getByText(/Viewing an imported report/)).toBeTruthy();
});

test("invalid import shows an error and keeps data", async () => {
  render(
    <ReactPulse defaultOpen>
      <App />
    </ReactPulse>,
  );
  press("Report");
  fireEvent.changeText(screen.getByLabelText("Report JSON"), "{nope");
  press("Import report");
  expect(screen.getByText(/Invalid ReactPulse report/)).toBeTruthy();
  expect(getPulseStore().paused).toBe(false);
});

test("performance and activity tabs render with real FlatList / ScrollView", async () => {
  render(
    <ReactPulse defaultOpen>
      <App />
    </ReactPulse>,
  );
  press("Increment");
  await flush();
  press("Activity");
  expect(screen.getByLabelText("Counter render 2")).toBeTruthy();
  press("Performance");
  expect(screen.getByText("Total renders")).toBeTruthy();
  expect(screen.getByText(/What the numbers mean/i)).toBeTruthy();
});

test("works under StrictMode and does not double count", async () => {
  render(
    <StrictMode>
      <ReactPulse defaultOpen>
        <App />
      </ReactPulse>
    </StrictMode>,
  );
  press("Increment");
  await flush();
  expect(getPulseStore().components.get("Counter").renders).toBe(2);
  expect(getPulseStore().components.get("Counter").mounts).toBe(1);
});

test("is off when disabled: no launcher, no recording", () => {
  getPulseStore().configure({ enabled: false });
  render(
    <ReactPulse>
      <App />
    </ReactPulse>,
  );
  expect(screen.queryByLabelText("Open ReactPulse")).toBeNull();
  press("Increment");
  expect(getPulseStore().components.size).toBe(0);
});

test("React Native console output is plain text when navigator.product is ReactNative", () => {
  // RN's runtime sets this in Libraries/Core/setUpNavigator.js; Jest does not run that file.
  Object.defineProperty(global, "navigator", { value: { product: "ReactNative" }, configurable: true });
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  const table = jest.spyOn(console, "table").mockImplementation(() => {});
  getPulseStore().configure({ log: true });
  render(<Counter />);
  press("Increment");
  getPulseStore().configure({ log: false });
  expect(log).toHaveBeenCalled();
  expect(log.mock.calls.some((c) => String(c[0]).includes("⚛ Counter #2"))).toBe(true);
  expect(table).not.toHaveBeenCalled();
});
