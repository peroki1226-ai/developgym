// Only the local app preview needs a subdirectory. Signed builds retain app.json.
module.exports = ({ config }) =>
  process.env.GYMFINDER_APP_PREVIEW === "1"
    ? { ...config, experiments: { ...config.experiments, baseUrl: "/app-preview" } }
    : config;
