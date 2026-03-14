const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts = ["ts", "tsx", "js", "jsx", "json", "cjs", "mjs"];

config.resolver.resolverMainFields = ["react-native", "browser", "main"];

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
];

config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = [
  "require",
  "default",
  "react-native",
];

config.transformer.unstable_allowRequireContext = true;

module.exports = config;
