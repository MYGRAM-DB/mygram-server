import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

function safe(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\\n", " ");
}

export function toMarkdown(snapshot) {
  const lines = [
    "# MYGRAM DevPilot report",
    "",
    `- Generated: ${snapshot.generatedAt}`,
    `- Repository: [${snapshot.repository.fullName}](${snapshot.repository.htmlUrl})`,
    `- Default branch: ${snapshot.repository.defaultBranch}`,
    `- Monitored branch: ${snapshot.monitoredBranch.name} (${snapshot.monitoredBranch.sha || "SHA unavailable"})`,
    "",
    "## Branch checks",
    "",
    "| Check | Status | Conclusion |",
    "|---|---|---|"
  ];
  if (snapshot.branchChecks.length) {
    for (const item of snapshot.branchChecks) {
      const label = item.url ? `[${safe(item.name)}](${item.url})` : safe(item.name);
      lines.push(`| ${label} | ${safe(item.status)} | ${safe(item.conclusion || "pending")} |`);
    }
  } else lines.push("| No checks found | unknown | unknown |");

  lines.push("", "## Recent workflow runs", "", "| Workflow | Branch | Status | Conclusion |", "|---|---|---|---|");
  if (snapshot.recentWorkflowRuns.length) {
    for (const run of snapshot.recentWorkflowRuns) {
      const label = run.url ? `[${safe(run.name)}](${run.url})` : safe(run.name);
      lines.push(`| ${label} | ${safe(run.branch)} | ${safe(run.status)} | ${safe(run.conclusion || "pending")} |`);
    }
  } else lines.push("| No workflow runs found | - | - | - |");

  lines.push("", "## Open pull requests", "");
  if (snapshot.openPullRequests.length) {
    for (const pr of snapshot.openPullRequests) {
      lines.push(`- [#${pr.number} ${safe(pr.title)}](${pr.url}) (${pr.headBranch} → ${pr.baseBranch})${pr.draft ? " · draft" : ""}`);
    }
  } else lines.push("- No open pull requests.");

  lines.push(
    "",
    "## Safety boundary",
    "",
    "- Read-only GitHub API calls only.",
    "- No repository file writes, branch creation, PR creation, merge, deployment, or production database access.",
    "- Reports are generated as workflow artifacts; they are not committed to the repository.",
    ""
  );
  return lines.join("\n");
}

export async function writeReports(snapshot, directory = process.env.REPORT_DIR || "reports") {
  await mkdir(directory, { recursive: true });
  const stamp = snapshot.generatedAt.replaceAll(":", "-");
  const jsonPath = join(directory, `devpilot-${stamp}.json`);
  const markdownPath = join(directory, `devpilot-${stamp}.md`);
  await Promise.all([
    writeFile(jsonPath, JSON.stringify(snapshot, null, 2) + "\n", "utf8"),
    writeFile(markdownPath, toMarkdown(snapshot), "utf8")
  ]);
  return { jsonPath, markdownPath };
}
