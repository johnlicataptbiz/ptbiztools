import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { homedir } from 'os';

const execAsync = promisify(exec);

export default async function firecrawlInitSkill(params: any) {
  const { directory, allFeatures, browser } = params;

  try {
    // Construct the command based on parameters
    let command = 'npx -y firecrawl-cli@latest init';
    
    if (allFeatures) {
      command += ' --all';
    }
    
    if (browser) {
      command += ' --browser';
    }

    // Execute the command in a safe manner
    const { stdout, stderr } = await execAsync(command);
    
    return {
      success: true,
      message: 'Firecrawl CLI initialized successfully',
      output: stdout,
      errors: stderr,
      command: command
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