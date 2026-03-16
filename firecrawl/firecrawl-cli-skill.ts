import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function firecrawlCliSkill(params: any) {
  const { command, url, options } = params;

  try {
    let cmd = 'npx -y firecrawl-cli@latest';
    
    if (command) {
      cmd += ` ${command}`;
    }
    
    if (url) {
      cmd += ` ${url}`;
    }
    
    if (options) {
      cmd += ` ${options}`;
    }

    const { stdout, stderr } = await execAsync(cmd);
    
    return {
      success: true,
      message: 'Firecrawl CLI executed successfully',
      output: stdout,
      errors: stderr,
      command: cmd
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to execute Firecrawl CLI',
      error: error.message,
      command: cmd
    };
  }
}