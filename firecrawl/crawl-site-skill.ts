import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function crawlSiteSkill(params: any) {
  const { url, mode, maxPages, includeLinks, excludePatterns } = params;

  try {
    // Construct the crawl command based on parameters
    let cmd = `npx -y firecrawl-cli@latest crawl`;
    
    if (url) {
      cmd += ` ${url}`;
    }
    
    if (mode) {
      cmd += ` --mode ${mode}`; // e.g., 'single', 'sitemap', 'links'
    }
    
    if (maxPages) {
      cmd += ` --max-pages ${maxPages}`;
    }
    
    if (includeLinks) {
      cmd += ` --include-links`;
    }
    
    if (excludePatterns && Array.isArray(excludePatterns)) {
      for (const pattern of excludePatterns) {
        cmd += ` --exclude "${pattern}"`;
      }
    }

    const { stdout, stderr } = await execAsync(cmd);
    
    return {
      success: true,
      message: 'Site crawled successfully',
      output: stdout,
      errors: stderr,
      command: cmd,
      crawledUrl: url
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to crawl site',
      error: error.message,
      command: cmd
    };
  }
}