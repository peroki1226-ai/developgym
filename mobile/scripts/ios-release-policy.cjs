const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUILD_STATUSES = new Set(['NEW', 'IN_QUEUE', 'IN_PROGRESS', 'PENDING_CANCEL', 'CANCELED', 'ERRORED', 'FINISHED']);
const SUBMISSION_STATUSES = new Set(['AWAITING_BUILD', 'IN_QUEUE', 'IN_PROGRESS', 'CANCELED', 'ERRORED', 'FINISHED']);

function validateTarget(target, app, eas) {
  if (!UUID.test(target.easBuildId) || !UUID.test(target.easProjectId) ||
      target.platform !== 'ios' || target.easProjectId !== app.extra?.eas?.projectId ||
      target.bundleIdentifier !== app.ios?.bundleIdentifier || target.version !== app.version ||
      !/^[1-9]\d*$/.test(target.buildNumber) || !/^[0-9a-f]{7,40}$/i.test(target.expectedSourceCommit) ||
      !/^\d+$/.test(target.ascAppId) || target.ascAppId !== eas?.submit?.production?.ios?.ascAppId) {
    throw new Error('Release target does not match the configured GymFinder app.');
  }
}

function inspectBuild(target, build) {
  if (build?.id !== target.easBuildId || build.app?.id !== target.easProjectId || build.platform !== 'IOS') {
    throw new Error('EAS build identity does not match the release target.');
  }
  if (!BUILD_STATUSES.has(build.status) || !Array.isArray(build.submissions)) {
    throw new Error('Build status or submission history is unavailable. Submission is blocked.');
  }
  for (const [actual, expected] of [
    [build.appIdentifier, target.bundleIdentifier],
    [build.appVersion, target.version],
    [build.appBuildVersion, target.buildNumber],
  ]) {
    if (actual != null && actual !== expected) throw new Error('Build app/version/number does not match the release target.');
  }
  if (build.gitCommitHash && !build.gitCommitHash.startsWith(target.expectedSourceCommit)) {
    throw new Error('Build source commit does not match the release target.');
  }
  for (const submission of build.submissions) {
    if (!UUID.test(submission.id) || submission.platform !== 'IOS' ||
        submission.app?.id !== target.easProjectId || !SUBMISSION_STATUSES.has(submission.status) ||
        (submission.iosConfig?.ascAppIdentifier && submission.iosConfig.ascAppIdentifier !== target.ascAppId)) {
      throw new Error('Submission history cannot be safely identified.');
    }
  }
  return {
    buildStatus: build.status,
    // Never persist signed artifact URLs, account information, or raw API responses.
    sourceCommitVerified: Boolean(build.gitCommitHash),
    submissions: build.submissions.map(({ id, status }) => ({ id, status })),
  };
}

function requireSubmittable(target, build) {
  inspectBuild(target, build);
  if (build.status !== 'FINISHED') throw new Error(`Build is ${build.status}; submission requires FINISHED.`);
  if (build.distribution !== 'STORE' || build.isForIosSimulator !== false ||
      build.appIdentifier !== target.bundleIdentifier || build.appVersion !== target.version ||
      build.appBuildVersion !== target.buildNumber || !/^[0-9a-f]{40}$/i.test(build.gitCommitHash || '')) {
    throw new Error('Finished build is missing verified production app/version/source metadata.');
  }
  const artifact = build.artifacts?.applicationArchiveUrl || build.artifacts?.buildUrl;
  let url;
  try { url = new URL(artifact); } catch { throw new Error('Finished build has no valid archive URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Build archive must use HTTPS.');
}

async function release({ mode, target, app, eas, readBuild, submit, save, now = () => new Date().toISOString() }) {
  if (!['status', 'submit'].includes(mode)) throw new Error('Choose status or submit.');
  validateTarget(target, app, eas);
  let build;
  let observation;
  try {
    build = await readBuild(target.easBuildId);
    observation = inspectBuild(target, build);
  } catch (error) {
    // Keep the last successful observation, marked with its original timestamp.
    save({ ...target, lastCheckAttemptAt: now(), lastCheckSucceeded: false });
    throw error;
  }
  let record = {
    ...target, ...observation, directlyVerified: true, statusSource: 'EAS API',
    lastCheckedAt: now(), lastCheckSucceeded: true,
  };
  const existing = observation.submissions.find(s => !['CANCELED', 'ERRORED'].includes(s.status)) || observation.submissions[0];
  if (existing) {
    record.submissionId = existing.id;
    record.submissionStatus = existing.status;
  }
  save(record);
  if (mode === 'status') return record;
  // All existing submissions, including failures, require inspection instead of automatic retries.
  if (existing) return record;
  if (record.submissionAttemptedAt || record.submissionId) {
    throw new Error('A previous submission attempt is unresolved. Check EAS/App Store Connect before retrying.');
  }
  requireSubmittable(target, build);
  record = { ...record, submissionAttemptedAt: now(), submissionStatus: 'REQUESTED_UNCONFIRMED' };
  // Persist BEFORE mutation. A crash or timeout cannot silently cause a second upload on retry.
  save(record);
  await submit(target.easBuildId);
  const updated = await readBuild(target.easBuildId);
  const confirmed = inspectBuild(target, updated);
  if (confirmed.submissions.length === 0) {
    throw new Error('Submission command finished, but EAS has not confirmed a submission ID. Run status; do not resubmit.');
  }
  const submission = confirmed.submissions.find(s => !['CANCELED', 'ERRORED'].includes(s.status)) || confirmed.submissions[0];
  record = {
    ...record, ...confirmed, submissionId: submission.id, submissionStatus: submission.status,
    lastCheckedAt: now(),
  };
  save(record);
  return record;
}

module.exports = { validateTarget, inspectBuild, requireSubmittable, release };
