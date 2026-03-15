import { spawn } from 'child_process';
import { Request, Response } from 'express';

interface MCPRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params: {
    name: string;
    arguments: any;
  };
}

interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: any;
}

/**
 * Execute a Mem0 MCP server command
 */
async function executeMem0Command(
  toolName: string,
  arguments_: any,
  userId?: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    const mem0Process = spawn('mem0-mcp-server', [], {
      env: {
        ...process.env,
        MEM0_API_KEY: 'm0-d9UBw839tmNCpej40X3wurtLJR2zRS4wHVad1FnK',
        MEM0_DEFAULT_USER_ID: userId || 'mem0-mcp'
      }
    });

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: arguments_
      }
    };

    let responseData = '';
    let timeout: NodeJS.Timeout;

    // Set timeout
    timeout = setTimeout(() => {
      mem0Process.kill();
      reject(new Error('Mem0 server timeout'));
    }, 30000); // 30 second timeout

    mem0Process.stdin.write(JSON.stringify(request) + '\n');

    mem0Process.stdout.on('data', (data) => {
      responseData += data.toString();
      
      try {
        const response: MCPResponse = JSON.parse(responseData);
        clearTimeout(timeout);
        
        if (response.error) {
          reject(new Error(response.error.message || 'Mem0 error'));
        } else {
          resolve(response.result);
        }
        
        mem0Process.kill();
      } catch (e) {
        // Response might be incomplete, wait for more data
      }
    });

    mem0Process.stderr.on('data', (data) => {
      clearTimeout(timeout);
      console.error('Mem0 stderr:', data.toString());
      reject(new Error(`Mem0 error: ${data.toString()}`));
    });

    mem0Process.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0 && !responseData) {
        reject(new Error(`Mem0 process exited with code ${code}`));
      }
    });
  });
}

/**
 * POST /api/mem0/add-memory
 * Add a new memory to Mem0
 */
export async function addMemory(req: Request, res: Response): Promise<void> {
  try {
    const { text, tags, userId, metadata } = req.body;

    if (!text) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    const result = await executeMem0Command('add_memory', {
      text,
      tags: tags || [],
      metadata,
      user_id: userId
    }, userId);

    res.json({ success: true, result });
  } catch (error) {
    console.error('Error adding memory:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to add memory' 
    });
  }
}

/**
 * POST /api/mem0/search-memories
 * Search for memories in Mem0
 */
export async function searchMemories(req: Request, res: Response): Promise<void> {
  try {
    const { query, filters, limit, userId } = req.body;

    if (!query) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    const result = await executeMem0Command('search_memories', {
      query,
      filters,
      limit: limit || 5
    }, userId);

    res.json({ success: true, result });
  } catch (error) {
    console.error('Error searching memories:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to search memories' 
    });
  }
}

/**
 * GET /api/mem0/get-memories
 * Get memories with filters and pagination
 */
export async function getMemories(req: Request, res: Response): Promise<void> {
  try {
    const { filters, page, pageSize, userId } = req.query;

    const result = await executeMem0Command('get_memories', {
      filters: filters ? JSON.parse(filters as string) : undefined,
      page: page ? parseInt(page as string) : 1,
      page_size: pageSize ? parseInt(pageSize as string) : 10
    }, userId as string);

    res.json({ success: true, result });
  } catch (error) {
    console.error('Error getting memories:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get memories' 
    });
  }
}

/**
 * GET /api/mem0/get-memory
 * Get a specific memory by ID
 */
export async function getMemory(req: Request, res: Response): Promise<void> {
  try {
    const { memoryId } = req.params;

    if (!memoryId) {
      res.status(400).json({ error: 'Memory ID is required' });
      return;
    }

    const result = await executeMem0Command('get_memory', {
      memory_id: memoryId
    });

    res.json({ success: true, result });
  } catch (error) {
    console.error('Error getting memory:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get memory' 
    });
  }
}

/**
 * PUT /api/mem0/update-memory
 * Update an existing memory
 */
export async function updateMemory(req: Request, res: Response): Promise<void> {
  try {
    const { memoryId, text } = req.body;

    if (!memoryId || !text) {
      res.status(400).json({ error: 'Memory ID and text are required' });
      return;
    }

    const result = await executeMem0Command('update_memory', {
      memory_id: memoryId,
      text
    });

    res.json({ success: true, result });
  } catch (error) {
    console.error('Error updating memory:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to update memory' 
    });
  }
}

/**
 * DELETE /api/mem0/delete-memory
 * Delete a specific memory
 */
export async function deleteMemory(req: Request, res: Response): Promise<void> {
  try {
    const { memoryId } = req.params;

    if (!memoryId) {
      res.status(400).json({ error: 'Memory ID is required' });
      return;
    }

    const result = await executeMem0Command('delete_memory', {
      memory_id: memoryId
    });

    res.json({ success: true, result });
  } catch (error) {
    console.error('Error deleting memory:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to delete memory' 
    });
  }
}

/**
 * DELETE /api/mem0/delete-all-memories
 * Delete all memories for a user/agent/app/run
 */
export async function deleteAllMemories(req: Request, res: Response): Promise<void> {
  try {
    const { userId, agentId, appId, runId } = req.body;

    const result = await executeMem0Command('delete_all_memories', {
      user_id: userId,
      agent_id: agentId,
      app_id: appId,
      run_id: runId
    });

    res.json({ success: true, result });
  } catch (error) {
    console.error('Error deleting all memories:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to delete all memories' 
    });
  }
}

/**
 * GET /api/mem0/list-entities
 * List all entities (users/agents/apps/runs)
 */
export async function listEntities(req: Request, res: Response): Promise<void> {
  try {
    const result = await executeMem0Command('list_entities', {});

    res.json({ success: true, result });
  } catch (error) {
    console.error('Error listing entities:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to list entities' 
    });
  }
}
