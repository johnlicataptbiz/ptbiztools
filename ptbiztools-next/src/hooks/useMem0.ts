import { useState, useCallback } from 'react';

export interface Mem0Memory {
  memory_id: string;
  text: string;
  metadata?: any;
  created_at: string;
  tags?: string[];
}

export interface UseMem0Return {
  addMemory: (text: string, tags?: string[], metadata?: any) => Promise<any>;
  searchMemories: (query: string, limit?: number) => Promise<any>;
  getMemories: (filters?: any, page?: number, pageSize?: number) => Promise<any>;
  getMemory: (memoryId: string) => Promise<any>;
  updateMemory: (memoryId: string, text: string) => Promise<any>;
  deleteMemory: (memoryId: string) => Promise<any>;
  deleteAllMemories: (userId?: string, agentId?: string, appId?: string, runId?: string) => Promise<any>;
  listEntities: () => Promise<any>;
  isLoading: boolean;
  error: string | null;
}

export function useMem0(): UseMem0Return {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMemory = useCallback(async (text: string, tags: string[] = [], metadata?: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/mem0/add-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, tags, metadata })
      });
      
      if (!response.ok) throw new Error('Failed to add memory');
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchMemories = useCallback(async (query: string, limit = 5) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/mem0/search-memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit })
      });
      
      if (!response.ok) throw new Error('Failed to search memories');
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getMemories = useCallback(async (filters?: any, page = 1, pageSize = 10) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });
      
      if (filters) {
        queryParams.append('filters', JSON.stringify(filters));
      }
      
      const response = await fetch(`/api/mem0/get-memories?${queryParams.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Failed to get memories');
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getMemory = useCallback(async (memoryId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/mem0/get-memory/${memoryId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Failed to get memory');
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateMemory = useCallback(async (memoryId: string, text: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/mem0/update-memory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memoryId, text })
      });
      
      if (!response.ok) throw new Error('Failed to update memory');
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteMemory = useCallback(async (memoryId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/mem0/delete-memory/${memoryId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Failed to delete memory');
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteAllMemories = useCallback(async (userId?: string, agentId?: string, appId?: string, runId?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/mem0/delete-all-memories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, agentId, appId, runId })
      });
      
      if (!response.ok) throw new Error('Failed to delete all memories');
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listEntities = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/mem0/list-entities', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Failed to list entities');
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { 
    addMemory, 
    searchMemories, 
    getMemories, 
    getMemory, 
    updateMemory, 
    deleteMemory, 
    deleteAllMemories, 
    listEntities, 
    isLoading, 
    error 
  };
}
