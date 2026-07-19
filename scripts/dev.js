import { spawn } from "node:child_process";

const processes = [
  ["api", "node", ["backend/src/server.js"]],
  ["web", "npx", ["vite", "frontend", "--host", "127.0.0.1", "--port", "5173"]],
];

for (const [name, command, args] of processes) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`);
    }
  });
}

process.on("SIGINT", () => process.exit(0));
