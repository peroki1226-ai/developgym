const path = require('node:path');
const { spawnSync } = require('node:child_process');

// EAS CLI build:view JSON omits submissions. Use the installed CLI's read-only
// withSubmissions query and its normal auth/proxy/TLS handling, rather than
// treating missing history as "not submitted". This adapter is checked against
// the lockfile's EAS CLI; an incompatible SDK fails closed before submission.
function createEasAdapter({ root, nonInteractive }) {
  const cli = require.resolve('eas-cli/bin/run');
  const sdk = path.resolve(path.dirname(cli), '..', 'build');
  const SessionManager = require(path.join(sdk, 'user/SessionManager')).default;
  const { createGraphqlClient } = require(path.join(sdk, 'commandUtils/context/contextUtils/createGraphqlClient'));
  const { BuildQuery } = require(path.join(sdk, 'graphql/queries/BuildQuery'));
  let client;
  return {
    async readBuild(id) {
      if (!client) {
        const session = new SessionManager({ setActor() {} });
        const actor = await session.getUserAsync({ requestTimeoutMs: 20000 });
        if (!actor) throw new Error('Expo authentication is required. Configure EXPO_TOKEN securely in environment settings, or run eas login on your own computer.');
        const { authenticationInfo } = await session.ensureLoggedInAsync({ nonInteractive: true });
        client = createGraphqlClient(authenticationInfo, { requestTimeoutMs: 20000 });
      }
      return BuildQuery.withSubmissionsByIdAsync(client, id, { useCache: false });
    },
    async submit(id) {
      const args = [cli, 'submit', '--platform', 'ios', '--profile', 'production', '--id', id, '--wait'];
      if (nonInteractive) args.push('--non-interactive');
      const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
      if (result.error || result.status !== 0) {
        throw new Error('EAS submission did not confirm success. The attempt is recorded; check status before retrying.');
      }
    },
  };
}

module.exports = { createEasAdapter };
