const fs = require('node:fs');
const path = require('node:path');
const { release } = require('./ios-release-policy.cjs');
const { createEasAdapter } = require('./eas-release-adapter.cjs');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'store/IOS_RELEASE_STATUS.json');
const lock = `${file}.lock`;

async function main() {
  const [mode = 'status', ...flags] = process.argv.slice(2);
  if (!['status', 'submit'].includes(mode) || flags.some(f => f !== '--non-interactive')) {
    throw new Error('Usage: node scripts/ios-release.cjs status|submit [--non-interactive]');
  }
  let fd;
  try {
    fd = fs.openSync(lock, 'wx', 0o600);
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error('Another release command holds the lock. If it crashed, verify no release process is running before removing store/IOS_RELEASE_STATUS.json.lock.');
    throw error;
  }
  try {
    const target = JSON.parse(fs.readFileSync(file, 'utf8'));
    const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
    const eas = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
    const adapter = createEasAdapter({ root, nonInteractive: flags.includes('--non-interactive') });
    const result = await release({
      mode, target, app, eas, ...adapter,
      save(record) {
        const temporary = `${file}.tmp`;
        fs.writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`);
        fs.renameSync(temporary, file);
      },
    });
    console.log(`iOS ${result.version} (${result.buildNumber}): ${result.buildStatus}`);
    console.log(`Build ID: ${result.easBuildId}`);
    console.log(`Submission: ${result.submissionStatus}${result.submissionId ? ` (${result.submissionId})` : ''}`);
    console.log('TestFlight availability and iPhone data retention require separate verification.');
    if (mode === 'submit' && ['CANCELED', 'ERRORED'].includes(result.submissionStatus)) process.exitCode = 2;
  } finally {
    fs.closeSync(fd);
    fs.unlinkSync(lock);
  }
}

main().catch(error => {
  // Do not serialize API errors/headers or credentials into the status artifact.
  console.error(error.message);
  process.exitCode = 1;
});
