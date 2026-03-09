import { NextResponse } from "next/server";
import { execSync } from "child_process";

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
  // Look for patterns like "(login)" or "[dashboard]" in the message
  const match = message.match(/[\(\[]([^)\]]+)[\)\]]/);
  return match ? match[1] : undefined;
}

export async function GET() {
  try {
    // Get git log with structured format
    const gitLog = execSync(
      'git log --pretty=format:"%H|%an|%ae|%ad|%s|%b<END>" --date=short -100',
      { 
        cwd: process.cwd(),
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large logs
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
        
        // Only include commits by Jack Licata
        if (author.toLowerCase().includes("jack") || email.toLowerCase().includes("jack")) {
          entries.push({
            hash: hash.slice(0, 7), // Short hash
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

    // Group by date
    const grouped = entries.reduce((acc, entry) => {
      if (!acc[entry.date]) {
        acc[entry.date] = [];
      }
      acc[entry.date].push(entry);
      return acc;
    }, {} as Record<string, ChangelogEntry[]>);

    // Sort dates descending
    const sortedDates = Object.keys(grouped).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    return NextResponse.json({
      success: true,
      totalCommits: entries.length,
      dates: sortedDates,
      entries: grouped,
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error("[changelog] Error fetching git history:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch changelog",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
