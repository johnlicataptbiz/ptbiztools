import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function firecrawlSkill(params: any) {
  const { command, url, options } = params;

  try {
    let cmd = `npx -y firecrawl-cli@latest ${command}`;
    
    if (url) {
      cmd += ` ${url}`;
    }
    
    if (options) {
      if (typeof options === 'string') {
        cmd += ` ${options}`;
      } else if (typeof options === 'object') {
        for (const [key, value] of Object.entries(options)) {
          if (value === true) {
            cmd += ` --${key}`;
          } else {
            cmd += ` --${key} ${value}`;
          }
        }
      }
    }

    const { stdout, stderr } = await execAsync(cmd);
    
    return {
      success: true,
      message: `Firecrawl ${command} executed successfully`,
      output: stdout,
      errors: stderr,
      command: cmd
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to execute firecrawl ${command}`,
      error: error.message,
      command: cmd
    };
  }
}