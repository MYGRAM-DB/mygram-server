import test from "node:test";
import assert from "node:assert/strict";
import { toMarkdown } from "../src/report.js";

test("report identifies read-only safety boundaries", () => {
  const markdown = toMarkdown({
    generatedAt: "2026-10-24T00:00:00.000Z",
    repository: { fullName: "MYGRAM-DB/mygram-server", defaultBranch: "main", htmlUrl: "https://github.com/MYGRAM-DB/mygram-server" },
    monitoredBranch: { name: "devpilot/bootstrap", sha: "abc123" },
    branchChecks: [],
    recentWorkflowRuns: [],
    openPullRequests: []
  });
  assert.match(markdown, /Read-only GitHub API calls only/);
  assert.match(markdown, /No repository file writes/);
  assert.match(markdown, /No checks found/);
});

test("report escapes markdown table separators", () => {
  const markdown = toMarkdown({
    generatedAt: "now",
    repository: { fullName: "owner/repo", defaultBranch: "main", htmlUrl: "https://github.com/owner/repo" },
    monitoredBranch: { name: "test", sha: "abc" },
    branchChecks: [{ name: "a|b", status: "completed", conclusion: "success" }],
    recentWorkflowRuns: [],
    openPullRequests: []
  });
  assert.match(markdown, /a\\|b/);
});
