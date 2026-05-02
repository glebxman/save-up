#!/usr/bin/env node
/**
 * dev.mjs — starts server and client concurrently for local development.
 * Usage:
 *   node ./scripts/dev.mjs          # live API
 *   node ./scripts/dev.mjs --mock   # mock API (no real backend needed)
 */

import { spawn } from "node:child_process";
import { platform } from "node:os";

const isMock = process.argv.includes("--mock");
const isWindows = platform() === "win32";

function run(label, cmd, extraEnv = {}) {
  const prefix = `[${label}]`;
  const child = spawn(
    isWindows ? "cmd.exe" : "/bin/sh",
    isWindows ? ["/d", "/s", "/c", cmd] : ["-c", cmd],
    {
      env: { ...process.env, ...extraEnv },
      stdio: ["inherit", "pipe", "pipe"],
    }
  );

  child.stdout.on("data", (d) =>
    d.toString().split("\n").filter(Boolean).forEach((l) => console.log(`${prefix} ${l}`))
  );
  child.stderr.on("data", (d) =>
    d.toString().split("\n").filter(Boolean).forEach((l) => console.error(`${prefix} ${l}`))
  );
  child.on("close", (code) => {
    if (code && code !== 0) {
      console.error(`${prefix} exited with code ${code}`);
      process.exit(code);
    }
  });
  child.on("error", (err) => {
    console.error(`${prefix} error: ${err.message}`);
    process.exit(1);
  });

  return child;
}

console.log(`\nStarting dev servers${isMock ? " (mock API)" : ""}...\n`);

run("server", "pnpm --filter @finance-twa/server run dev:server");
run("client", "pnpm --filter @finance-twa/client run dev", isMock ? { VITE_USE_MOCK_API: "true" } : {});
