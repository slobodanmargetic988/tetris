#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

const LOG_ROOT_DIR =
  process.env.TETRIS_LOG_DIR ?? path.join(os.homedir(), "projects", "LOGS");
const SIZE_CHECK_FILE = path.join(LOG_ROOT_DIR, ".log-size-check.json");
const LOG_SIZE_LIMIT_BYTES = 3 * 1024 * 1024 * 1024;
const SIZE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

function timestamp() {
  return new Date().toISOString();
}

function print(message) {
  process.stdout.write(`[${timestamp()}] ${message}\n`);
}

function asTimestampedLine(line) {
  return `[${timestamp()}] ${line}`;
}

function formatBytes(bytes) {
  const gigabytes = bytes / (1024 * 1024 * 1024);
  if (gigabytes >= 1) {
    return `${gigabytes.toFixed(2)} GB`;
  }

  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(2)} MB`;
}

async function ensureLogRoot() {
  await fs.mkdir(LOG_ROOT_DIR, { recursive: true });
}

async function walkFilesRecursively(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const filePaths = [];

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      filePaths.push(...(await walkFilesRecursively(entryPath)));
      continue;
    }

    if (entry.isFile()) {
      filePaths.push(entryPath);
    }
  }

  return filePaths;
}

async function shouldCheckLogSize() {
  try {
    const raw = await fs.readFile(SIZE_CHECK_FILE, "utf8");
    const parsed = JSON.parse(raw);
    const checkedAt = Date.parse(parsed.checkedAt);
    if (Number.isNaN(checkedAt)) {
      return true;
    }

    return Date.now() - checkedAt > SIZE_CHECK_INTERVAL_MS;
  } catch {
    return true;
  }
}

async function writeSizeCheckMarker() {
  const payload = {
    checkedAt: new Date().toISOString()
  };
  await fs.writeFile(SIZE_CHECK_FILE, JSON.stringify(payload, null, 2) + "\n", "utf8");
}

async function truncateLogsIfNeeded() {
  const shouldCheck = await shouldCheckLogSize();
  if (!shouldCheck) {
    print("Log size check skipped because a recent check is already recorded.");
    return;
  }

  const allFiles = await walkFilesRecursively(LOG_ROOT_DIR);
  const logFiles = allFiles.filter((filePath) => filePath !== SIZE_CHECK_FILE);

  let totalBytes = 0;
  for (const filePath of logFiles) {
    try {
      const stat = await fs.stat(filePath);
      totalBytes += stat.size;
    } catch {
      // Ignore files that disappear while scanning.
    }
  }

  print(
    `Log size check complete: ${logFiles.length} files, total ${formatBytes(totalBytes)}.`
  );

  if (totalBytes > LOG_SIZE_LIMIT_BYTES) {
    print(
      "Log size exceeded 3.00 GB. Truncating existing log files in ~/projects/LOGS for safety."
    );
    for (const filePath of logFiles) {
      try {
        await fs.truncate(filePath, 0);
      } catch {
        // Ignore files that cannot be truncated.
      }
    }
    print("Log truncation finished.");
  } else {
    print("Log size is within the 3.00 GB threshold. No truncation required.");
  }

  await writeSizeCheckMarker();
}

function pipeWithTimestamps(stream, writer, logStream) {
  const lineReader = readline.createInterface({ input: stream });
  lineReader.on("line", (line) => {
    const formatted = asTimestampedLine(line);
    writer.write(`${formatted}\n`);
    logStream.write(`${formatted}\n`);
  });
}

async function main() {
  await ensureLogRoot();
  await truncateLogsIfNeeded();

  const timestampForFile = timestamp().replace(/[:.]/g, "-");
  const logFilePath = path.join(LOG_ROOT_DIR, `tetris-e2e-${timestampForFile}.log`);
  const logStream = createWriteStream(logFilePath, { flags: "a" });

  print(`Playwright E2E log file: ${logFilePath}`);
  logStream.write(asTimestampedLine("Starting Playwright E2E command.") + "\n");

  const passthroughArgs = process.argv.slice(2);
  const child = spawn("npx", ["playwright", "test", ...passthroughArgs], {
    stdio: ["inherit", "pipe", "pipe"]
  });

  pipeWithTimestamps(child.stdout, process.stdout, logStream);
  pipeWithTimestamps(child.stderr, process.stderr, logStream);

  child.on("error", (error) => {
    const line = asTimestampedLine(
      `Failed to start Playwright process: ${error instanceof Error ? error.message : String(error)}`
    );
    process.stderr.write(`${line}\n`);
    logStream.write(`${line}\n`);
    logStream.end();
    process.exit(1);
  });

  child.on("close", (code, signal) => {
    const exitCode = code ?? 1;
    if (signal) {
      print(`Playwright process exited due to signal ${signal}.`);
    } else {
      print(`Playwright process finished with exit code ${exitCode}.`);
    }
    logStream.write(
      asTimestampedLine(`Playwright process completed with exit code ${exitCode}.`) + "\n"
    );
    logStream.end();
    process.exit(exitCode);
  });
}

main().catch((error) => {
  print(
    `Unhandled E2E runner failure: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
});
