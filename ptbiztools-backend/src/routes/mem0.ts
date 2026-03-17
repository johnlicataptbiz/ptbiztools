import { Request, Response, Router } from "express";

const MEM0_BASE_URL = process.env.MEM0_BASE_URL?.trim() || "https://api.mem0.ai";
const MEM0_API_KEY = process.env.MEM0_API_KEY?.trim();

async function mem0Fetch<T>(
  path: string,
  options: { method?: string; body?: any; query?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  if (!MEM0_API_KEY) {
    throw new Error("MEM0_API_KEY is not configured on the backend.");
  }

  const { method = "GET", body, query } = options;
  const url = new URL(path, MEM0_BASE_URL);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${MEM0_API_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data as any)?.message || response.statusText;
    throw new Error(`Mem0 error: ${message}`);
  }
  return data as T;
}

export async function addMemory(req: Request, res: Response): Promise<void> {
  try {
    const { text, messages, userId, metadata, tags } = req.body;

    if (!text && (!messages || messages.length === 0)) {
      res.status(400).json({ error: "Text or messages is required" });
      return;
    }

    const payload = {
      messages: messages || [{ role: "user", content: text }],
      user_id: userId,
      metadata: metadata || (tags ? { tags } : undefined),
    };

    const result = await mem0Fetch<any>("/v1/memories/", {
      method: "POST",
      body: payload,
    });

    res.json({ success: true, result });
  } catch (error) {
    console.error("Error adding memory:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to add memory",
    });
  }
}

export async function searchMemories(req: Request, res: Response): Promise<void> {
  try {
    const { query, userId, limit } = req.body;

    if (!query) {
      res.status(400).json({ error: "Query is required" });
      return;
    }

    const result = await mem0Fetch<any>("/v2/memories/search/", {
      method: "POST",
      body: { query, user_id: userId, limit: limit || 5 },
    });

    res.json({ success: true, result });
  } catch (error) {
    console.error("Error searching memories:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to search memories",
    });
  }
}

export async function getMemories(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.query;

    const result = await mem0Fetch<any>("/v1/memories/", {
      query: { user_id: userId as string | undefined },
    });

    res.json({ success: true, result });
  } catch (error) {
    console.error("Error getting memories:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get memories",
    });
  }
}

export async function getMemory(req: Request, res: Response): Promise<void> {
  try {
    const { memoryId } = req.params;

    if (!memoryId) {
      res.status(400).json({ error: "Memory ID is required" });
      return;
    }

    const result = await mem0Fetch<any>(`/v1/memories/${memoryId}/`);

    res.json({ success: true, result });
  } catch (error) {
    console.error("Error getting memory:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get memory",
    });
  }
}

export async function updateMemory(req: Request, res: Response): Promise<void> {
  try {
    const { memoryId, text } = req.body;

    if (!memoryId || !text) {
      res.status(400).json({ error: "Memory ID and text are required" });
      return;
    }

    const result = await mem0Fetch<any>(`/v1/memories/${memoryId}/`, {
      method: "PUT",
      body: { data: text },
    });

    res.json({ success: true, result });
  } catch (error) {
    console.error("Error updating memory:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to update memory",
    });
  }
}

export async function deleteMemory(req: Request, res: Response): Promise<void> {
  try {
    const { memoryId } = req.params;

    if (!memoryId) {
      res.status(400).json({ error: "Memory ID is required" });
      return;
    }

    const result = await mem0Fetch<any>(`/v1/memories/${memoryId}/`, {
      method: "DELETE",
    });

    res.json({ success: true, result });
  } catch (error) {
    console.error("Error deleting memory:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to delete memory",
    });
  }
}

export async function deleteAllMemories(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ error: "Bulk delete is not supported by Mem0 HTTP API." });
}

export async function listEntities(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ error: "Listing entities is not supported by Mem0 HTTP API yet." });
}

export const mem0Router = Router();

mem0Router.post("/add-memory", addMemory);
mem0Router.post("/search-memories", searchMemories);
mem0Router.get("/get-memories", getMemories);
mem0Router.get("/get-memory/:memoryId", getMemory);
mem0Router.put("/update-memory", updateMemory);
mem0Router.delete("/delete-memory/:memoryId", deleteMemory);
mem0Router.delete("/delete-all-memories", deleteAllMemories);
mem0Router.get("/list-entities", listEntities);
