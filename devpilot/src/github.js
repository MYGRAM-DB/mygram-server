const API = "https://api.github.com";

export async function githubGet(path, token = process.env.GITHUB_TOKEN) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "MYGRAM-DevPilot/0.1"
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API}${path}`, { headers });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`GitHub API ${response.status} for ${path}: ${body.slice(0, 300)}`);
  }
  return response.json();
}

export async function getRepositorySnapshot({ owner, repo, branch }) {
  const prefix = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const [repository, pulls, runs, branchData] = await Promise.all([
    githubGet(prefix),
    githubGet(`${prefix}/pulls?state=open&per_page=100`),
    githubGet(`${prefix}/actions/runs?per_page=20`),
    githubGet(`${prefix}/branches/${encodeURIComponent(branch)}`)
  ]);

  const headSha = branchData.commit?.sha;
  const checks = headSha
    ? await githubGet(`${prefix}/commits/${headSha}/check-runs?per_page=100`)
    : { check_runs: [] };

  return {
    generatedAt: new Date().toISOString(),
    repository: {
      fullName: repository.full_name,
      private: repository.private,
      defaultBranch: repository.default_branch,
      htmlUrl: repository.html_url
    },
    monitoredBranch: { name: branch, sha: headSha, url: branchData._links?.html },
    openPullRequests: pulls.map(pr => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      draft: pr.draft,
      url: pr.html_url,
      headBranch: pr.head?.ref,
      headSha: pr.head?.sha,
      baseBranch: pr.base?.ref
    })),
    recentWorkflowRuns: (runs.workflow_runs || []).map(run => ({
      name: run.name,
      event: run.event,
      status: run.status,
      conclusion: run.conclusion,
      branch: run.head_branch,
      url: run.html_url,
      updatedAt: run.updated_at
    })),
    branchChecks: (checks.check_runs || []).map(check => ({
      name: check.name,
      status: check.status,
      conclusion: check.conclusion,
      url: check.html_url,
      startedAt: check.started_at,
      completedAt: check.completed_at
    }))
  };
}
