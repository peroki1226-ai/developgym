const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const profile = process.argv[2];
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
try {
  if (!["preview", "production"].includes(profile))
    throw new Error("Specify preview or production.");
  run(process.execPath, [path.join(__dirname, "verify-release.cjs")]);
  const projectId = JSON.parse(
    fs.readFileSync(path.join(root, "app.json"), "utf8"),
  ).expo.extra?.eas?.projectId;
  if (
    !projectId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      projectId,
    )
  ) {
    throw new Error(
      "既存のGymFinder EASプロジェクトとの連携を確認してください。expo.extra.eas.projectIdがありません。配布済みアプリと同じプロジェクトを接続し、新しいプロジェクトや署名を推測で作成しないでください。",
    );
  }
  run(process.execPath, [path.join(path.dirname(require.resolve("typescript/package.json")), "bin/tsc"), "--noEmit"]);
  run(process.execPath, [require.resolve("jest/bin/jest"), "--runInBand"]);
  const eas = require.resolve("eas-cli/bin/run");
  run(process.execPath, [
    eas,
    "build",
    "--platform",
    "ios",
    "--profile",
    profile,
  ]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
