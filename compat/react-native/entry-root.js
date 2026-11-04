import React from "react";
import { AppRegistry, View, Text } from "react-native";
import { ReactPulse, useRenderTracker } from "reactpulse-devtools";

function Hello() {
  useRenderTracker("Hello");
  return <View><Text>hello</Text></View>;
}
function App() {
  return <ReactPulse><Hello /></ReactPulse>;
}
AppRegistry.registerComponent("app", () => App);
