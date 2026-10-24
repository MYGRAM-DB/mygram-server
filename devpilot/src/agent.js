import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(process.env.TARGET_WORKDIR || "../mygram-app");
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.DEVPILOT_MODEL || "gpt-4.1-mini";
const maxFiles = 35;
const maxChars = 100_000;

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options
  });
}

function trackedFiles() {
  return run("git", ["ls-files"]).split("\n").filter(Boolean)
    .filter((f) => !/(^|\/)(\.git|node_modules|vendor|dist|build)(\/|$)/.test(f))
    .filter((f) => /\.(js|mjs|cjs|html|css|json|md|yml|yaml)$/.test(f))
    .filter((f) => !/(^|\/)(\.env[^/]*|secrets?[^/]*|.*service.?role.*)$/i.test(f))
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

const forbiddenPath = /(^|\/)(\.env([^/]*$)?|secrets?[^/]*|migrations?\/|supabase\/migrations\/)|service.?role|package-lock\.json|pnpm-lock\.yaml/i;
const changedPaths = [...patch.matchAll(/^diff --git a\/(.+?) b\/(.+)$/gm)].map((m) => [m[1], m[2]]);
if (!changedPaths.length || changedPaths.some(([a, b]) => forbiddenPath.test(a) || forbiddenPath.test(b))) {
  throw new Error("Patch rejected: no parseable file list or a protected path was targeted.");
}
if (/\b(github_pat_|ghp_|sb_secret_|service_role)\b/i.test(patch)) {
  throw new Error("Patch rejected: possible credential or privileged-key content.");
}
const protectedChange = /(^|\n)[+-].*(disable.*(auth|rls|csp)|alter table .* disable row level security|service_role)/i;
if (protectedChange.test(patch)) {
  throw new Error("Patch rejected: change may weaken an authentication or database security control.");
}

const patchPath = path.join(root, ".devpilot-proposed.patch");
fs.writeFileSync(patchPath, patch + "\n");
try {
  run("git", ["apply", "--check", patchPath]);
  run("git", ["apply", patchPath]);
  run("git", ["diff", "--check"]);
  fs.unlinkSync(patchPath);
} catch (error) {
  try { fs.unlinkSync(patchPath); } catch {}
  console.error("Patch rejected by git validation:", error.message);
  process.exit(2);
}
console.log("Repair patch applied locally and passed git apply --check and git diff --check. Workflow must run tests before publication.");
