import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPO_OWNER = "johnlicataptbiz";
const REPO_NAME = "ptbiztools";
const CHANGELOG_LIMIT = 100;

function parseCommitType(message) {
  const lower = message.toLowerCase();
  if (lower.startsWith("feat:") || lower.startsWith("feature:")) return "feature";
  if (lower.startsWith("fix:") || lower.startsWith("bugfix:")) return "fix";
  if (lower.startsWith("docs:")) return "docs";
  if (lower.startsWith("refactor:")) return "refactor";
  if (lower.startsWith("chore:")) return "chore";
  return "other";
}

function extractCategory(message) {
  const match = message.match(/[\(\[]([^)\]]+)[\)\]]/);
  return match ? match[1] : undefined;
}

function createPayload(entries) {
  const grouped = entries.reduce((acc, entry) => {
    if (!acc[entry.date]) {
      acc[entry.date] = [];
    }
    acc[entry.date].push(entry);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  return {
    success: true,
    totalCommits: entries.length,
    dates: sortedDates,
    entries: grouped,
    lastUpdated: new Date().toISOString(),
  };
}

function parseGitLogEntries(gitLog) {
  const entries = [];
  const commits = gitLog ? gitLog.split("<END>").filter(Boolean) : [];

  for (const commit of commits) {
    const lines = commit.trim().split("\n");
    const header = lines[0];
    const parts = header.split("|");

    if (parts.length < 5) {
      continue;
    }

    const [hash, author, email, date, rawMessage] = parts;
    const message = rawMessage.trim();

    if (author.toLowerCase().includes("jack") || email.toLowerCase().includes("jack")) {
      entries.push({
        hash: hash.slice(0, 7),
        author,
        email,
        date,
        message,
        type: parseCommitType(message),
        category: extractCategory(message),
      });
    }
  }

  return entries;
}

async function fetchGithubEntries() {
  const response = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?per_page=${CHANGELOG_LIMIT}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "ptbiztools-next-changelog-generator",
      },
    },
  );

  if (!response.ok) {
    if (response.status === 403) {
      console.warn("[generate-changelog] GitHub API rate limited or unauthorized; skipping fallback");
      return [];
    }
    throw new Error(`GitHub API request failed (${response.status})`);
  }

  const commits = await response.json();
  if (!Array.isArray(commits)) {
    throw new Error("GitHub API returned an unexpected payload");
  }

  return commits.flatMap((commit) => {
    const authorName = commit?.commit?.author?.name ?? "";
    const authorEmail = commit?.commit?.author?.email ?? "";

    if (!authorName.toLowerCase().includes("jack") && !authorEmail.toLowerCase().includes("jack")) {
      return [];
    }

    const fullMessage = commit?.commit?.message ?? "";
    const subject = fullMessage.split("\n")[0]?.trim() ?? "";
    const date = (commit?.commit?.author?.date ?? "").slice(0, 10);

    return [{
      hash: String(commit?.sha ?? "").slice(0, 7),
      author: authorName,
      email: authorEmail,
      date,
      message: subject,
      type: parseCommitType(subject),
      category: extractCategory(subject),
    }];
  });
}

async function generateChangelog() {
  try {
    console.log("[generate-changelog] Fetching git history...");

    let entries = [];
    try {
      const gitLog = execSync(
        `git log --pretty=format:"%H|%an|%ae|%ad|%s<END>" --date=short -${CHANGELOG_LIMIT}`,
        {
          cwd: process.cwd(),
          encoding: "utf-8",
          maxBuffer: 10 * 1024 * 1024,
        },
      );
      entries = parseGitLogEntries(gitLog);
    } catch {
      console.log("[generate-changelog] Git not available; falling back to GitHub API");
      entries = await fetchGithubEntries();
    }

    const data = createPayload(entries);

    const publicDir = join(process.cwd(), "public");
    mkdirSync(publicDir, { recursive: true });

    const outputPath = join(publicDir, "changelog-data.json");
    writeFileSync(outputPath, JSON.stringify(data, null, 2));

    console.log(`[generate-changelog] Generated ${entries.length} commits across ${data.dates.length} dates`);
    console.log(`[generate-changelog] Saved to ${outputPath}`);

    return data;
  } catch (error) {
    console.error("[generate-changelog] Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

await generateChangelog();
