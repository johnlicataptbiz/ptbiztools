const { execSync } = require("child_process");
const { writeFileSync, mkdirSync } = require("fs");
const { join } = require("path");

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
    
    const gitLog = execSync(
      'git log --pretty=format:"%H|%an|%ae|%ad|%s|%b<END>" --date=short -100',
      { 
        cwd: process.cwd(),
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024
      }
    );

    const entries = [];
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
    }, {});

    const sortedDates = Object.keys(grouped).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    const data = {
      success: true,
      totalCommits: entries.length,
      dates: sortedDates,
      entries: grouped,
      lastUpdated: new Date().toISOString(),
    };

    // Ensure public directory exists
    const publicDir = join(process.cwd(), "public");
    try {
      mkdirSync(publicDir, { recursive: true });
    } catch (e) {
      // Directory might already exist
    }

    // Write to public directory so it's included in the build
    const outputPath = join(publicDir, "changelog-data.json");
    writeFileSync(outputPath, JSON.stringify(data, null, 2));
    
    console.log(`[generate-changelog] Generated ${entries.length} commits across ${sortedDates.length} dates`);
    console.log(`[generate-changelog] Saved to ${outputPath}`);
    
    return data;
  } catch (error) {
    console.error("[generate-changelog] Error:", error.message);
    process.exit(1);
  }
}

generateChangelog();
