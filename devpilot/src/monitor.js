import { getRepositorySnapshot } from "./github.js";
import { writeReports } from "./report.js";

export async function runMonitor(env = process.env) {
  const owner = env.GITHUB_OWNER || "MYGRAM-DB";
  const repo = env.GITHUB_REPO || "mygram-server";
  const branch = env.GITHUB_BRANCH || "devpilot/bootstrap";
  const snapshot = await getRepositorySnapshot({ owner, repo, branch });
  const files = await writeReports(snapshot, env.REPORT_DIR || "reports");
  const failures = snapshot.branchChecks.filter(c => c.conclusion === "failure").length;
  const pending = snapshot.branchChecks.filter(c => c.status !== "completed").length;
  console.log(JSON.stringify({
    repository: snapshot.repository.fullName,
    branch,
    checks: snapshot.branchChecks.length,
    failures,
    pending,
    openPullRequests: snapshot.openPullRequests.length,
    reports: files
  }, null, 2));
  return { snapshot, files, failures, pending };
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  runMonitor().catch(error => {
    console.error(`MYGRAM DevPilot failed: ${error.message}`);
    process.exitCode = 1;
  });
}
