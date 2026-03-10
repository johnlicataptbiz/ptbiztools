import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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

function generateChangelog() {
  try {
    console.log("[generate-changelog] Fetching git history...");

    let gitLog = "";
    try {
      gitLog = execSync(
        'git log --pretty=format:"%H|%an|%ae|%ad|%s<END>" --date=short -100',
        {
          cwd: process.cwd(),
          encoding: "utf-8",
          maxBuffer: 10 * 1024 * 1024,
        },
      );
    } catch {
      console.log("[generate-changelog] Git not available or not a git repo, using empty changelog");
    }

    const entries = [];
    const commits = gitLog ? gitLog.split("<END>").filter(Boolean) : [];

    for (const commit of commits) {
      const lines = commit.trim().split("\n");
      const header = lines[0];
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
            category: extractCategory(message),
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
    }, {});

    const sortedDates = Object.keys(grouped).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    );

    const data = {
      success: true,
      totalCommits: entries.length,
      dates: sortedDates,
      entries: grouped,
      lastUpdated: new Date().toISOString(),
    };

    const publicDir = join(process.cwd(), "public");
    mkdirSync(publicDir, { recursive: true });

    const outputPath = join(publicDir, "changelog-data.json");
    writeFileSync(outputPath, JSON.stringify(data, null, 2));

    console.log(`[generate-changelog] Generated ${entries.length} commits across ${sortedDates.length} dates`);
    console.log(`[generate-changelog] Saved to ${outputPath}`);

    return data;
  } catch (error) {
    console.error("[generate-changelog] Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

generateChangelog();
