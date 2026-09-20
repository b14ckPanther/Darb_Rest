import { execFileSync } from "node:child_process";
export default function setupContent() {
  execFileSync(process.execPath, ["scripts/content-e2e-server.mjs", "--fixtures-only"], {
    stdio: ["ignore", "pipe", "pipe"],
  });
}
