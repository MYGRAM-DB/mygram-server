import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.env.TARGET_WORKDIR || "../mygram-app";
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.DEVPILOT_MODEL || "gpt-4.1-mini";
const maxFiles = 35;
const maxChars = 100_000;

function run(command, args, options = {}) {
  return execFileSync(command, args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options });
}

function trackedFiles() {
  return run("git", ["ls-files"]).split("\n").filter(Boolean)
    .filter((f) => !/(^|\/)(\.git|node_modules|vendor|dist|build)(\/|$)/.test(f))
    .filter((f) => /\.(js|mjs|cjs|html|css|json|md|yml|yaml)$/.test(f))
    .slice(0, maxFiles);
}

function readContext() {
  let total = 0;
  const chunks = [];
  for (const file of trackedFiles()) {
    try {
      const full = path.join(root, file);
      const stat = fs.statSync(full);
      if (!stat.isFile() || stat.size > 12_000) continue;
      const body = fs.readFileSync(full, "utf8");
      if (total + body.length > maxChars) break;
      chunks.push("\n--- FILE: " + file + " ---\n" + body);
      total += body.length;
    } catch {}
  }
  return chunks.join("\n");
}

if (!apiKey) {
  console.log("NO_CHANGE: OPENAI_API_KEY is not configured.");
  process.exit(0);
}

const failure = process.env.DEVPILOT_FAILURE_LOG || "Scheduled review: inspect the current repository for a small, demonstrable correctness issue.";
const prompt = fs.readFileSync(new URL("./agent-prompt.md", import.meta.url), "utf8");
const context = readContext();
const payload = {
  model,
  input: [
    { role: "system", content: [{ type: "input_text", text: prompt }] },
    { role: "user", content: [{ type: "input_text", text: "Repository: MYGRAM-DB/mygram-app\nFailure/check output:\n" + failure + "\nRepository context (tracked source files only):\n" + context }] }
  ],
  max_output_tokens: 7000
};

const response = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
  body: JSON.stringify(payload)
});
if (!response.ok) {
  console.error("OpenAI API returned HTTP", response.status, (await response.text()).slice(0, 1500));
  process.exit(1);
}
const result = await response.json();
const patch = (result.output || []).flatMap((item) => item.content || [])
  .filter((item) => item.type === "output_text").map((item) => item.text).join("\n").trim();

if (!patch || patch === "NO_CHANGE" || !patch.includes("diff --git ")) {
  console.log("NO_CHANGE: no validated repair proposal.");
  process.exit(0);
}
if (/\b(github_pat_|ghp_|sb_secret_|service_role)\b/i.test(patch)) {
  throw new Error("Patch rejected: possible credential or privileged-key content.");
}
fs.writeFileSync(path.join(root, ".devpilot-proposed.patch"), patch + "\n");
try {
  run("git", ["apply", "--check", ".devpilot-proposed.patch"]);
  run("git", ["apply", ".devpilot-proposed.patch"]);
  fs.unlinkSync(path.join(root, ".devpilot-proposed.patch"));
} catch (error) {
  console.error("Patch rejected by git apply validation:", error.message);
  process.exit(2);
}
console.log("Repair patch applied locally; workflow must run safety checks before creating a PR.");
