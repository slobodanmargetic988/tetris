#!/usr/bin/env node

const path = require('node:path');
const assert = require('node:assert/strict');

const tests = [];
let suiteStack = [];

function timestamp() {
  return new Date().toISOString();
}

function log(message) {
  process.stdout.write(`[${timestamp()}] ${message}\n`);
}

global.describe = function describe(name, fn) {
  suiteStack.push(name);
  try {
    fn();
  } finally {
    suiteStack = suiteStack.slice(0, -1);
  }
};

global.test = function test(name, fn) {
  const qualifiedName = [...suiteStack, name].join(' > ');
  tests.push({ name: qualifiedName, fn });
};

global.expect = function expect(actual) {
  return {
    toBe(expected) {
      assert.strictEqual(actual, expected);
    },
    toEqual(expected) {
      assert.deepStrictEqual(actual, expected);
    }
  };
};

require.extensions['.ts'] = require.extensions['.js'];

const specArg = process.argv.find((arg) => arg.endsWith('.spec.ts'));
const specPath = specArg
  ? path.resolve(process.cwd(), specArg)
  : path.resolve(process.cwd(), 'tests/tdd/input_pause.spec.ts');

log(`Loading spec: ${specPath}`);
require(specPath);

let failures = 0;
for (const entry of tests) {
  try {
    entry.fn();
    log(`PASS ${entry.name}`);
  } catch (error) {
    failures += 1;
    log(`FAIL ${entry.name}`);
    log(`Reason: ${error.message}`);
  }
}

if (failures > 0) {
  log(`Test run failed: ${failures} failing test(s), ${tests.length - failures} passing test(s).`);
  process.exitCode = 1;
} else {
  log(`Test run passed: ${tests.length} passing test(s).`);
}
