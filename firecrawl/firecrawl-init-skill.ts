import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function firecrawlInitSkill(params: any) {
  try {
    // Run the specific command you requested: npx -y firecrawl-cli@latest init --all --browser
    const cmd = 'npx -y firecrawl-cli@latest init --all --browser';
    
    const { stdout, stderr } = await execAsync(cmd);
    
    return {
      success: true,
      message: 'Firecrawl CLI initialized with all features and browser support',
      output: stdout,
      errors: stderr,
      command: cmd
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to initialize Firecrawl CLI',
      error: error.message,
      command: 'npx -y firecrawl-cli@latest init --all --browser'
    };
  }
}