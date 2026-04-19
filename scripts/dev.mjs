import { spawn } from "node:child_process";
import process from "node:process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const isMockMode = process.argv.includes("--mock");

const children = new Set();
let shuttingDown = false;

function terminateChild(child) {
  if (!child.pid) {
    return;
  }

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  child.kill("SIGTERM");
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    terminateChild(child);
  }

  process.exitCode = exitCode;
}

function spawnWorkspaceProcess(name, workspace, scriptName = "dev", extraEnv = {}) {
  const child = spawn(
    `${npmCommand} run ${scriptName} --workspace=${workspace}`,
    {
      shell: true,
      stdio: "inherit",
      env: {
        ...process.env,
        ...extraEnv,
      },
      windowsHide: false,
    },
  );

  children.add(child);

  child.on("exit", (code, signal) => {
    children.delete(child);

    if (shuttingDown) {
      return;
    }

    if (signal) {
      console.error(`${name} stopped with signal ${signal}.`);
      shutdown(1);
      return;
    }

    if (typeof code === "number" && code !== 0) {
      console.error(`${name} stopped with exit code ${code}.`);
      shutdown(code);
      return;
    }

    if (children.size === 0) {
      shutdown(0);
    }
  });

  child.on("error", (error) => {
    console.error(`Failed to start ${name}:`, error);
    shutdown(1);
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

if (isMockMode) {
  spawnWorkspaceProcess("client", "@finance-twa/client", "dev", {
    VITE_USE_MOCK_API: "true",
  });
} else {
  spawnWorkspaceProcess("bot", "@finance-twa/server", "dev:bot");
  spawnWorkspaceProcess("server", "@finance-twa/server", "dev:server");
  spawnWorkspaceProcess("client", "@finance-twa/client");
}
