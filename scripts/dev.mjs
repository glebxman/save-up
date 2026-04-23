import { spawn } from "node:child_process";

const args = new Set(process.argv.slice(2));
const useMockApi = args.has("--mock");
const isWindows = process.platform === "win32";
const npmCommand = "npm";
const children = new Set();

function run(name, script, extraEnv = {}) {
  const command = isWindows ? `${npmCommand} run ${script}` : npmCommand;
  const commandArgs = isWindows ? [] : ["run", script];
  const child = spawn(command, commandArgs, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...extraEnv,
    },
    shell: isWindows,
    stdio: "inherit",
  });

  children.add(child);

  child.on("exit", (code, signal) => {
    children.delete(child);

    if (signal) {
      return;
    }

    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`);
      stopAll();
      process.exitCode = code;
    }
  });

  return child;
}

function stopAll() {
  for (const child of children) {
    child.kill("SIGTERM");
  }
}

process.on("SIGINT", () => {
  stopAll();
  process.exit(130);
});

process.on("SIGTERM", () => {
  stopAll();
  process.exit(143);
});

if (useMockApi) {
  run("client", "dev:client", {
    VITE_USE_MOCK_API: "true",
  });
} else {
  run("server", "dev:server", {
    VITE_USE_MOCK_API: "false",
  });
  run("client", "dev:client", {
    VITE_USE_MOCK_API: "false",
  });
}
