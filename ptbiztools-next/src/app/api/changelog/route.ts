import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface ChangelogEntry {
  hash: string;
  author: string;
  email: string;
  date: string;
  message: string;
  type: "feature" | "fix" | "chore" | "docs" | "refactor" | "other";
  category?: string;
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

function generateChangelogData(): {
  success: boolean;
  totalCommits: number;
  dates: string[];
  entries: Record<string, ChangelogEntry[]>;
  lastUpdated: string;
} {
  try {
    // Try to get git log
    const gitLog = execSync(
      'git log --pretty=format:"%H|%an|%ae|%ad|%s|%b<END>" --date=short -100',
      { 
        cwd: process.cwd(),
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024
      }
    );

    const entries: ChangelogEntry[] = [];
    const commits = gitLog.split("<END>").filter(Boolean);

    for (const commit of commits) {
      const lines = commit.trim().split("\n");
      const header = lines[0];
      const body = lines.slice(1).join("\n").trim();

      const parts = header.split("|");
      if (parts.length >= 5) {
        const [hash, author, email, date, message] = parts;
        
        if (author.toLowerCase().includes("jack") || email.toLowerCase().includes("jack")) {
          entries.push({
            hash: hash.slice(0, 7),
            author,
            email,
            date,
            message: message.trim(),
            type: parseCommitType(message),
            category: extractCategory(message) || extractCategory(body),
          });
        }
      }
    }

    const grouped = entries.reduce((acc, entry) => {
      if (!acc[entry.date]) {
        acc[entry.date] = [];
      }
      acc[entry.date].push(entry);
      return acc;
    }, {} as Record<string, ChangelogEntry[]>);

    const sortedDates = Object.keys(grouped).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    return {
      success: true,
      totalCommits: entries.length,
      dates: sortedDates,
      entries: grouped,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[changelog] Error generating from git:", error);
    throw error;
  }
}

// Generate data at build time
let cachedData: ReturnType<typeof generateChangelogData> | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getChangelogData() {
  const now = Date.now();
  
  // Return cached data if still valid
  if (cachedData && (now - cacheTime) < CACHE_DURATION) {
    return cachedData;
  }

  // Try to read from pre-generated JSON file (build time)
  const dataPath = join(process.cwd(), "public", "changelog-data.json");
  if (existsSync(dataPath)) {
    try {
      const fileData = JSON.parse(readFileSync(dataPath, "utf-8"));
      cachedData = fileData;
      cacheTime = now;
      return fileData;
    } catch (e) {
      console.error("[changelog] Error reading cached file:", e);
    }
  }

  // Try to generate from git (works in dev/local)
  try {
    const data = generateChangelogData();
    cachedData = data;
    cacheTime = now;
    return data;
  } catch (error) {
    console.error("[changelog] Failed to generate data:", error);
    
    // Return empty fallback
    return {
      success: true,
      totalCommits: 0,
      dates: [],
      entries: {},
      lastUpdated: new Date().toISOString(),
    };
  }
}

export async function GET() {
  const data = getChangelogData();
  return NextResponse.json(data);
}
