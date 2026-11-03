# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and the project uses
[Semantic Versioning](https://semver.org/).

## [0.1.0] - Unreleased

### Added

- Hooks: `useRenderTracker`, `useWhyDidYouRender`, `usePrevious`, `useMountTracker`,
  `usePerformanceTracker`, `useTrackedState`, `useLeakTracker`.
- `<ReactPulse>` provider with configuration and a lazily loaded dashboard.
- `<PulseProfiler>` (React `actualDuration`), slow-render detection, User Timing integration.
- Dashboard (`reactpulse/devtools`): component list, details with previous/current values,
  render history, timeline, performance tab, search/filter/sort, pause/clear, export/import,
  light/dark themes, notifications.
- Leak helpers: tracked timers, listeners and subscriptions with unmount warnings.
- JSON report export/import with validation.
- `production` export condition that replaces the dashboard with a stub.
