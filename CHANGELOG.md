# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and the project uses
[Semantic Versioning](https://semver.org/).

## [0.1.0] - Unreleased

### Added

- **React Native support.** `reactpulse-devtools/native` (also resolved by Metro through the `react-native`
  export condition): the same hooks plus `<ReactPulse>`, `<PulseDevtools>` and `<PulseDashboard>`, a native
  dashboard built from React Native primitives (components, details, activity, performance, report; share
  sheet / paste import; dev-menu item). React Native console output is plain text, and console warnings are
  off by default there. Checked against real react-native 0.88.1 (Metro bundles for Android and iOS, Hermes compile, Jest with real
  components, real type definitions via `npm run test:native-real`), a stub and react-native-web; not yet run on a device.

- Landing page (`landing/`, `npm run site`) with a live demo, install guide and API reference;
  GitHub Pages workflow in `.github/workflows/pages.yml`.

- Hooks: `useRenderTracker`, `useWhyDidYouRender`, `usePrevious`, `useMountTracker`,
  `usePerformanceTracker`, `useTrackedState`, `useLeakTracker`.
- `<ReactPulse>` provider with configuration and a lazily loaded dashboard.
- `<PulseProfiler>` (React `actualDuration`), slow-render detection, User Timing integration.
- Dashboard (`reactpulse-devtools/devtools`): component list, details with previous/current values,
  render history, timeline, performance tab, search/filter/sort, pause/clear, export/import,
  light/dark themes, notifications.
- Leak helpers: tracked timers, listeners and subscriptions with unmount warnings.
- JSON report export/import with validation.
- `production` export condition that replaces the dashboard with a stub.

### Documentation

- Clarified that the hook duration is an upper-bound render-to-commit span: it also covers components
  React renders after the hook call in the same pass, so large commits (the first mount) overstate it.
