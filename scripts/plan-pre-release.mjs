#!/usr/bin/env node
/**
 * StrawNote local release planner.
 * Version scheme: {base}-pre-{N}  e.g. 0.27.4-pre-12
 *
 * Usage:
 *   node scripts/plan-pre-release.mjs \
 *     --ref refs/heads/strawnote \
 *     --sha <fullsha> \
 *     --targets server,desktop-macos,desktop-windows,desktop-linux? \
 *     --out release-plan.json \
 *     [--pre-id 12] \
 *     [--base 0.27.4] \
 *     [--channel canary]
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    ref: {
      type: 'string',
      default: process.env.GITHUB_REF || 'refs/heads/strawnote',
    },
    sha: { type: 'string', default: process.env.GITHUB_SHA || '' },
    targets: {
      type: 'string',
      default: 'server,desktop-macos,desktop-windows,desktop-linux?',
    },
    out: { type: 'string', default: 'release-plan.json' },
    'pre-id': { type: 'string' },
    base: { type: 'string' },
    channel: { type: 'string', default: 'canary' },
    'request-id': { type: 'string', default: '' },
    'created-at': { type: 'string', default: new Date().toISOString() },
    previous: { type: 'string' },
  },
  allowPositionals: false,
});

function readPackageBaseVersion() {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  return String(pkg.version || '0.0.0').replace(/-.*$/, '');
}

function listPreIds(base) {
  try {
    const out = execFileSync('git', ['tag', '--list', `v${base}-pre-*`], {
      encoding: 'utf8',
    });
    const ids = [];
    for (const line of out.split('\n')) {
      const m = line
        .trim()
        .match(new RegExp(`^v${base.replace(/\./g, '\\.')}-pre-(\\d+)$`));
      if (m) ids.push(Number(m[1]));
    }
    return ids;
  } catch {
    return [];
  }
}

function nextPreId(base, override) {
  if (override != null && String(override).trim() !== '') {
    const n = Number(String(override).replace(/^pre-/, ''));
    if (!Number.isFinite(n) || n < 1) {
      throw new Error(`Invalid --pre-id: ${override}`);
    }
    return Math.trunc(n);
  }
  const fromEnv = process.env.GITHUB_RUN_NUMBER;
  if (fromEnv && Number(fromEnv) > 0) {
    // Prefer sequential from tags when available; otherwise run number.
    const existing = listPreIds(base);
    if (existing.length) {
      return Math.max(...existing) + 1;
    }
    return Number(fromEnv);
  }
  const existing = listPreIds(base);
  return existing.length ? Math.max(...existing) + 1 : 1;
}

function parseTargets(raw) {
  return String(raw)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(token => {
      const optional = token.endsWith('?');
      const name = optional ? token.slice(0, -1) : token;
      return { name, required: !optional };
    });
}

function desktopMatrixRows(targetName) {
  // Keep AFFiNE-compatible matrix shape used by release.yml
  if (targetName === 'desktop-macos') {
    return [
      {
        target: 'desktop-macos',
        platform: 'darwin',
        arch: 'x64',
        required: true,
      },
      {
        target: 'desktop-macos',
        platform: 'darwin',
        arch: 'arm64',
        required: true,
      },
    ];
  }
  if (targetName === 'desktop-windows') {
    return [
      {
        target: 'desktop-windows',
        platform: 'win32',
        arch: 'x64',
        required: true,
      },
    ];
  }
  if (targetName === 'desktop-linux') {
    return [
      {
        target: 'desktop-linux',
        platform: 'linux',
        arch: 'x64',
        required: false,
      },
    ];
  }
  return [];
}

function mobileMatrixRows(targetName) {
  if (targetName === 'mobile-ios') {
    return [
      { target: 'mobile-ios', platform: 'ios', arch: 'arm64', required: false },
    ];
  }
  if (targetName === 'mobile-android') {
    return [
      {
        target: 'mobile-android',
        platform: 'android',
        arch: 'arm64',
        required: false,
      },
    ];
  }
  return [];
}

const base = values.base || readPackageBaseVersion();
const preId = nextPreId(base, values['pre-id']);
const version = `${base}-pre-${preId}`;
const channel = values.channel || 'canary';
const sha =
  values.sha ||
  execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const targets = parseTargets(values.targets);

const buildMatrix = {
  include: targets.flatMap(t => {
    if (t.name.startsWith('desktop-')) {
      return desktopMatrixRows(t.name).map(row => ({
        ...row,
        required: t.required ? row.required : false,
      }));
    }
    if (t.name.startsWith('mobile-')) {
      return mobileMatrixRows(t.name);
    }
    return [];
  }),
};

let skip = false;
if (values.previous) {
  try {
    const previous = JSON.parse(readFileSync(values.previous, 'utf8'));
    if (
      previous?.request?.sha === sha &&
      previous?.request?.channel === channel &&
      Array.isArray(previous?.request?.targets) &&
      previous.request.targets.every(t => targets.some(x => x.name === t.name))
    ) {
      skip = true;
    }
  } catch {
    // ignore unreadable previous evidence
  }
}

const plan = {
  version,
  channel,
  skip,
  ref: values.ref,
  sha,
  requestId:
    values['request-id'] ||
    `${process.env.GITHUB_REPOSITORY_ID || 'local'}-${process.env.GITHUB_RUN_ID || '0'}`,
  createdAt: values['created-at'],
  targets,
  buildMatrix,
  displayVersion: `${base} pre-${preId}`,
};

writeFileSync(values.out, JSON.stringify(plan, null, 2) + '\n');
process.stdout.write(
  JSON.stringify(
    {
      APP_VERSION: version,
      DISPLAY_VERSION: plan.displayVersion,
      BUILD_TYPE: channel,
      SKIP: skip,
      PRE_ID: preId,
      BASE_VERSION: base,
    },
    null,
    2
  ) + '\n'
);
