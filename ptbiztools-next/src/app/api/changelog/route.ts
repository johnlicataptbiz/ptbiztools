import { execSync } from "child_process";
import { NextResponse } from "next/server";

const REPO_OWNER = "johnlicataptbiz";
const REPO_NAME = "ptbiztools";
const CHANGELOG_LIMIT = 100;

interface ChangelogEntry {
  hash: string;
  author: string;
  email: string;
  date: string;
  message: string;
  type: "feature" | "fix" | "chore" | "docs" | "refactor" | "other";
  category?: string;
}

interface ChangelogData {
  success: boolean;
  totalCommits: number;
  dates: string[];
  entries: Record<string, ChangelogEntry[]>;
  lastUpdated: string;
}

interface GithubCommit {
  sha?: string;
  commit?: {
    author?: {
      name?: string;
      email?: string;
      date?: string;
    };
    message?: string;
  };
}

function parseCommitType(message: string): ChangelogEntry["type"] {
  const lower = message.toLowerCase();
  if (lower.startsWith("feat:") || lower.startsWith("feature:")) return "feature";
  if (lower.startsWith("fix:") || lower.startsWith("bugfix:")) return "fix";
  if (lower.startsWith("docs:")) return "docs";
  if (lower.startsWith("refactor:")) return "refactor";
  if (lower.startsWith("chore:")) return "chore";
  return "other";
}

function extractCategory(message: string): string | undefined {
  const match = message.match(/[\(\[]([^)\]]+)[\)\]]/);
  return match ? match[1] : undefined;
}

function createPayload(entries: ChangelogEntry[]): ChangelogData {
  const grouped = entries.reduce((acc, entry) => {
    if (!acc[entry.date]) {
      acc[entry.date] = [];
    }
    acc[entry.date].push(entry);
    return acc;
  }, {} as Record<string, ChangelogEntry[]>);

  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return {
    success: true,
    totalCommits: entries.length,
    dates: sortedDates,
    entries: grouped,
    lastUpdated: new Date().toISOString(),
  };
}

function parseGitLogEntries(gitLog: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const commits = gitLog.split("<END>").filter(Boolean);

  for (const commit of commits) {
    const header = commit.trim().split("\n")[0];
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

function generateChangelogData(): ChangelogData {
  const gitLog = execSync(
    `git log --pretty=format:"%H|%an|%ae|%ad|%s<END>" --date=short -${CHANGELOG_LIMIT}`,
    {
      cwd: process.cwd(),
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  return createPayload(parseGitLogEntries(gitLog));
}

async function fetchGithubChangelogData(): Promise<ChangelogData> {
  const response = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?per_page=${CHANGELOG_LIMIT}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "ptbiztools-next-changelog-api",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub API request failed (${response.status})`);
  }

  const commits = (await response.json()) as GithubCommit[];
  const entries = commits.flatMap((commit) => {
    const author = commit.commit?.author?.name ?? "";
    const email = commit.commit?.author?.email ?? "";

    if (!author.toLowerCase().includes("jack") && !email.toLowerCase().includes("jack")) {
      return [];
    }

    const message = commit.commit?.message?.split("\n")[0]?.trim() ?? "";
    const date = commit.commit?.author?.date?.slice(0, 10) ?? "";

    return [{
      hash: (commit.sha ?? "").slice(0, 7),
      author,
      email,
      date,
      message,
      type: parseCommitType(message),
      category: extractCategory(message),
    } satisfies ChangelogEntry];
  });

  return createPayload(entries);
}

let cachedData: ChangelogData | null = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000;

async function getStaticChangelogData(request: Request): Promise<ChangelogData | null> {
  try {
    const assetUrl = new URL("/changelog-data.json", request.url);
    const response = await fetch(assetUrl, {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as ChangelogData;
  } catch (error) {
    console.error("[changelog] Error loading static changelog asset:", error);
    return null;
  }
}

async function getChangelogData(request: Request): Promise<ChangelogData> {
  const now = Date.now();

  if (cachedData && (now - cacheTime) < CACHE_DURATION) {
    return cachedData;
  }

  const staticData = await getStaticChangelogData(request);
  if (staticData && staticData.totalCommits > 0) {
    cachedData = staticData;
    cacheTime = now;
    return staticData;
  }

  try {
    const data = generateChangelogData();
    cachedData = data;
    cacheTime = now;
    return data;
  } catch (error) {
    console.error("[changelog] Failed to generate data from git:", error);
  }

  try {
    const githubData = await fetchGithubChangelogData();
    cachedData = githubData;
    cacheTime = now;
    return githubData;
  } catch (error) {
    console.error("[changelog] Failed to load GitHub fallback:", error);
    return {
      success: true,
      totalCommits: 0,
      dates: [],
      entries: {},
      lastUpdated: new Date().toISOString(),
    };
  }
}

export async function GET(request: Request) {
  const data = await getChangelogData(request);
  return NextResponse.json(data);
}
