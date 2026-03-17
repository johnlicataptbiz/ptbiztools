import { Request, Response, Router } from 'express';

const MEM0_BASE_URL = process.env.MEM0_BASE_URL?.trim() || 'https://api.mem0.ai/v1';
const MEM0_API_KEY = process.env.MEM0_API_KEY?.trim();

async function mem0Fetch<T>(
  path: string,
  options: { method?: string; body?: any; query?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  if (!MEM0_API_KEY) {
    throw new Error('MEM0_API_KEY is not configured on the backend.');
  }

  const { method = 'GET', body, query } = options;
  const url = new URL(path, MEM0_BASE_URL);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MEM0_API_KEY}`
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data as any)?.message || response.statusText;
    throw new Error(`Mem0 error: ${message}`);
  }
  return data as T;
}

/**
 * POST /api/mem0/add-memory
 * Add a new memory to Mem0
 */
export async function addMemory(req: Request, res: Response): Promise<void> {
  try {
    const { text, messages, userId, metadata, tags } = req.body;

    if (!text && (!messages || messages.length === 0)) {
      res.status(400).json({ error: 'Text or messages is required' });
      return;
    }

    const payload = {
      messages: messages || [{ role: 'user', content: text }],
      user_id: userId,
      metadata: metadata || (tags ? { tags } : undefined)
    };

    const result = await mem0Fetch<any>('/memory/add', {
      method: 'POST',
      body: payload
    });

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
    const { query, userId, limit } = req.body;

    if (!query) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    const result = await mem0Fetch<any>('/memory/search', {
      method: 'POST',
      body: { query, user_id: userId, limit: limit || 5 }
    });

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
    const { userId } = req.query;

    const result = await mem0Fetch<any>('/memory/all', {
      query: { user_id: userId as string | undefined }
    });

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

    const result = await mem0Fetch<any>(`/memory/${memoryId}`);

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

    const result = await mem0Fetch<any>('/memory/update', {
      method: 'PUT',
      body: { memory_id: memoryId, data: text }
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

    const result = await mem0Fetch<any>('/memory/delete', {
      method: 'DELETE',
      body: { memory_id: memoryId }
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
    const { userId } = req.body;

    const result = await mem0Fetch<any>('/memory/delete_all', {
      method: 'DELETE',
      query: { user_id: userId }
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
export async function listEntities(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ error: 'Listing entities is not supported by Mem0 HTTP API yet.' });
}

export const mem0Router = Router();

mem0Router.post('/add-memory', addMemory);
mem0Router.post('/search-memories', searchMemories);
mem0Router.get('/get-memories', getMemories);
mem0Router.get('/get-memory/:memoryId', getMemory);
mem0Router.put('/update-memory', updateMemory);
mem0Router.delete('/delete-memory/:memoryId', deleteMemory);
mem0Router.delete('/delete-all-memories', deleteAllMemories);
mem0Router.get('/list-entities', listEntities);
