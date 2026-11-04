const Metro = require("metro");
const path = require("path");
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
(async () => {
  const [, , entry, platform, dev, out] = process.argv;
  const config = mergeConfig(getDefaultConfig(__dirname), {
    projectRoot: __dirname,
    watchFolders: [__dirname],
    resolver: { useWatchman: false },
    watcher: { watchman: { deferStates: [] }, healthCheck: { enabled: false } },
  });
  const t = Date.now();
  await Metro.runBuild(config, { entry: path.resolve(__dirname, entry), platform, dev: dev === "true", minify: dev !== "true", out });
  console.log(`built ${entry} for ${platform} dev=${dev} in ${Date.now() - t}ms`);
})().catch((e) => { console.error("BUNDLE FAILED:", e.message.slice(0, 600)); process.exit(1); });
