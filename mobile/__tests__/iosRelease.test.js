const { release, validateTarget } = require('../scripts/ios-release-policy.cjs');
const manifest = require('../store/IOS_RELEASE_STATUS.json');
const { expo: app } = require('../app.json');
const eas = require('../eas.json');

const submissionId = '11111111-1111-4111-8111-111111111111';
function build(overrides = {}) {
  return {
    id: manifest.easBuildId, app: { id: manifest.easProjectId }, platform: 'IOS',
    status: 'FINISHED', distribution: 'STORE', isForIosSimulator: false,
    appIdentifier: manifest.bundleIdentifier, appVersion: manifest.version,
    appBuildVersion: manifest.buildNumber, gitCommitHash: `${manifest.expectedSourceCommit}${'0'.repeat(33)}`,
    artifacts: { applicationArchiveUrl: 'https://example.invalid/signed.ipa?signature=secret' },
    submissions: [], ...overrides,
  };
}
function submission(status) {
  return { id: submissionId, platform: 'IOS', app: { id: manifest.easProjectId }, status, iosConfig: { ascAppIdentifier: manifest.ascAppId } };
}
function harness(overrides = {}) {
  // A prior machine's attempt metadata must not change these independent test fixtures.
  const { submissionAttemptedAt, submissions, lastCheckedAt, ...target } = manifest;
  return {
    mode: 'submit', app, eas, target: { ...target, buildStatus: 'IN_PROGRESS', directlyVerified: false, submissionId: null, submissionStatus: 'NOT_CONFIRMED' },
    readBuild: jest.fn().mockResolvedValue(build()), submit: jest.fn().mockResolvedValue(undefined),
    save: jest.fn(), now: () => '2026-11-02T00:00:00.000Z', ...overrides,
  };
}

test('release target must belong to the configured project', () => {
  expect(() => validateTarget({ ...manifest, easProjectId: submissionId }, app, eas)).toThrow('target');
});

test('rejects a mismatched App Store Connect submission destination', () => {
  expect(() => validateTarget(manifest, app, { submit: { production: { ios: { ascAppId: '123' } } } })).toThrow('target');
});

test.each([
  ['wrong build', { id: submissionId }],
  ['wrong project', { app: { id: submissionId } }],
  ['Android', { platform: 'ANDROID' }],
  ['wrong bundle', { appIdentifier: 'com.example.other' }],
  ['wrong version', { appVersion: '2.0.0' }],
  ['wrong build number', { appBuildVersion: '4' }],
  ['wrong source', { gitCommitHash: 'a'.repeat(40) }],
  ['unknown build state', { status: 'UNKNOWN' }],
  ['missing submission history', { submissions: undefined }],
  ['unidentified submission', { submissions: [submission('UNKNOWN')] }],
  ['submission to another ASC app', { submissions: [{ ...submission('IN_PROGRESS'), iosConfig: { ascAppIdentifier: '123' } }] }],
])('rejects %s before a remote mutation', async (_name, overrides) => {
  const h = harness({ readBuild: jest.fn().mockResolvedValue(build(overrides)) });
  await expect(release(h)).rejects.toThrow();
  expect(h.submit).not.toHaveBeenCalled();
});

test.each([
  ['queued', { status: 'IN_QUEUE' }],
  ['building', { status: 'IN_PROGRESS' }],
  ['failed', { status: 'ERRORED' }],
  ['canceled', { status: 'CANCELED' }],
  ['Ad Hoc', { distribution: 'INTERNAL' }],
  ['simulator', { isForIosSimulator: true }],
  ['missing version', { appVersion: null }],
  ['missing source', { gitCommitHash: null }],
  ['missing archive', { artifacts: {} }],
  ['HTTP archive', { artifacts: { buildUrl: 'http://example.invalid/app.ipa' } }],
])('does not submit a %s build', async (_name, overrides) => {
  const h = harness({ readBuild: jest.fn().mockResolvedValue(build(overrides)) });
  await expect(release(h)).rejects.toThrow();
  expect(h.submit).not.toHaveBeenCalled();
});

test.each(['AWAITING_BUILD', 'IN_QUEUE', 'IN_PROGRESS', 'FINISHED', 'ERRORED', 'CANCELED'])(
  'detects existing %s submission and never duplicates it', async status => {
    const h = harness({ readBuild: jest.fn().mockResolvedValue(build({ submissions: [submission(status)] })) });
    const result = await release(h);
    expect(h.submit).not.toHaveBeenCalled();
    expect(result).toMatchObject({ submissionId, submissionStatus: status });
  },
);

test('status reads a queued build without submitting or storing artifact/account details', async () => {
  const h = harness({ mode: 'status', readBuild: jest.fn().mockResolvedValue(build({ status: 'IN_PROGRESS' })) });
  const result = await release(h);
  expect(result).toMatchObject({ buildStatus: 'IN_PROGRESS', directlyVerified: true });
  expect(h.submit).not.toHaveBeenCalled();
  expect(result).not.toHaveProperty('artifacts');
  expect(JSON.stringify(result)).not.toMatch(/signature=|ownerAccount/);
});

test('submits only the fixed ID, records the attempt first, and verifies the resulting submission', async () => {
  const h = harness({ readBuild: jest.fn()
    .mockResolvedValueOnce(build())
    .mockResolvedValueOnce(build({ submissions: [submission('FINISHED')] })) });
  h.submit.mockImplementation(async id => {
    expect(id).toBe(manifest.easBuildId);
    expect(h.save.mock.lastCall[0].submissionStatus).toBe('REQUESTED_UNCONFIRMED');
  });
  const result = await release(h);
  expect(h.submit).toHaveBeenCalledTimes(1);
  expect(result).toMatchObject({ submissionId, submissionStatus: 'FINISHED', deviceUpdateVerified: false, testflightInviteUrl: null });
  expect(h.readBuild.mock.calls).toEqual([[manifest.easBuildId], [manifest.easBuildId]]);
});

test('an ambiguous submission failure remains recorded and prevents a retry', async () => {
  const h = harness({ submit: jest.fn().mockRejectedValue(new Error('timeout')) });
  await expect(release(h)).rejects.toThrow('timeout');
  const saved = h.save.mock.lastCall[0];
  expect(saved).toMatchObject({ submissionStatus: 'REQUESTED_UNCONFIRMED', submissionId: null });
  const retry = harness({ target: saved });
  await expect(release(retry)).rejects.toThrow('unresolved');
  expect(retry.submit).not.toHaveBeenCalled();
});

test('exit success without a remote submission ID is never recorded as submitted', async () => {
  const h = harness();
  await expect(release(h)).rejects.toThrow('not confirmed');
  expect(h.save.mock.lastCall[0].submissionStatus).toBe('REQUESTED_UNCONFIRMED');
});

test('a later status lookup recovers confirmation after an interrupted submission', async () => {
  const h = harness({ mode: 'status', readBuild: jest.fn().mockResolvedValue(build({ submissions: [submission('IN_PROGRESS')] })) });
  h.target.submissionAttemptedAt = '2026-11-01T00:00:00.000Z';
  const result = await release(h);
  expect(result.submissionId).toBe(submissionId);
  expect(h.submit).not.toHaveBeenCalled();
});

test('lookup failure retains the report and never marks it directly verified', async () => {
  const h = harness({ readBuild: jest.fn().mockRejectedValue(new Error('authentication required')) });
  h.target.directlyVerified = false;
  await expect(release(h)).rejects.toThrow('authentication required');
  expect(h.save.mock.lastCall[0]).toMatchObject({ directlyVerified: false, buildStatus: 'IN_PROGRESS', lastCheckSucceeded: false });
  expect(h.submit).not.toHaveBeenCalled();
});

test('a previously reported submission ID blocks upload even when the live history is empty', async () => {
  const h = harness({ target: { ...manifest, submissionId, submissionStatus: 'SUBMITTED_TO_APPLE' } });
  await expect(release(h)).rejects.toThrow('unresolved');
  expect(h.submit).not.toHaveBeenCalled();
  expect(h.save.mock.lastCall[0]).toMatchObject({ submissionId, submissionStatus: 'SUBMITTED_TO_APPLE' });
});
