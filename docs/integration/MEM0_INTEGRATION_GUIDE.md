# Mem0 MCP Integration Guide for PTBizTools

## Overview
The Mem0 MCP server is now set up and ready to use in your PTBizTools project. This guide shows you how to integrate it for practical use cases.

## Current Setup Status
✅ Server configured in `blackbox_mcp_settings.json`
✅ API key and environment variables set
✅ Server tested and working
✅ All 9 tools verified (add_memory, search_memories, get_memories, etc.)

## Practical Use Cases for PTBizTools

### 1. **Danny AI Assistant Memory**
Store conversation history and user preferences from your Danny AI assistant.

```typescript
// Example: Remember user preferences from Danny conversations
const userPreferences = {
  preferredCommunicationStyle: "professional",
  commonQuestions: ["How do I calculate PL?", "What's my clinic's KPI?"],
  lastTopics: ["compensation calculator", "call grading"]
};

// Use add_memory to store this
```

### 2. **Clinic-Specific Knowledge**
Store clinic-specific information that persists across sessions.

```typescript
// Example: Remember clinic details
const clinicInfo = {
  clinicName: "Advanced PT",
  location: "Phoenix, AZ",
  specializations: ["sports medicine", "orthopedic"],
  preferredMetrics: ["patient volume", "revenue per visit"]
};
```

### 3. **User Onboarding Memory**
Remember where users left off in onboarding.

```typescript
// Example: Track onboarding progress
const onboardingProgress = {
  userId: "user_123",
  completedSteps: ["profile_setup", "clinic_info"],
  currentStep: "tool_preferences",
  skippedFeatures: ["zoom_integration"]
};
```

### 4. **Analytics Preferences**
Store user preferences for analytics dashboards.

```typescript
// Example: Remember dashboard preferences
const analyticsPrefs = {
  defaultDateRange: "last_30_days",
  favoriteCharts: ["revenue_trend", "patient_volume"],
  alertThresholds: {
    minDailyVisits: 20,
    targetRevenue: 50000
  }
};
```

## Integration Examples

### Example 1: Adding Memory from Danny Conversations

```typescript
// In your Danny AI route handler (ptbiztools-backend/src/routes/dannyTools.ts)

import { spawn } from 'child_process';

async function addMemoryToMem0(text: string, userId: string, tags: string[]) {
  return new Promise((resolve, reject) => {
    const mem0Process = spawn('mem0-mcp-server', [], {
      env: {
        ...process.env,
        MEM0_API_KEY: 'm0-d9UBw839tmNCpej40X3wurtLJR2zRS4wHVad1FnK',
        MEM0_DEFAULT_USER_ID: userId
      }
    });

    // Send MCP protocol request
    const request = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "add_memory",
        arguments: {
          text,
          tags,
          user_id: userId
        }
      }
    };

    mem0Process.stdin.write(JSON.stringify(request) + '\n');
    
    mem0Process.stdout.on('data', (data) => {
      const response = JSON.parse(data.toString());
      resolve(response);
      mem0Process.kill();
    });

    mem0Process.stderr.on('data', (data) => {
      console.error(`Mem0 Error: ${data}`);
    });
  });
}

// Usage in your route
app.post('/api/danny/chat', async (req, res) => {
  const { message, userId } = req.body;
  
  // Process with Danny AI...
  const aiResponse = await processWithDanny(message);
  
  // Store the conversation in Mem0
  await addMemoryToMem0(
    `User asked: ${message}. Danny responded: ${aiResponse}`,
    userId,
    ['danny_conversation', 'ptbiztools']
  );
  
  res.json({ response: aiResponse });
});
```

### Example 2: Searching Memories for Context

```typescript
// Get relevant past conversations for context
async function getRelevantMemories(query: string, userId: string) {
  return new Promise((resolve, reject) => {
    const mem0Process = spawn('mem0-mcp-server', [], {
      env: {
        ...process.env,
        MEM0_API_KEY: 'm0-d9UBw839tmNCpej40X3wurtLJR2zRS4wHVad1FnK',
        MEM0_DEFAULT_USER_ID: userId
      }
    });

    const request = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "search_memories",
        arguments: {
          query,
          user_id: userId,
          limit: 5
        }
      }
    };

    mem0Process.stdin.write(JSON.stringify(request) + '\n');
    
    mem0Process.stdout.on('data', (data) => {
      const response = JSON.parse(data.toString());
      resolve(response);
      mem0Process.kill();
    });
  });
}

// Usage: Get context before responding
app.post('/api/danny/chat-with-context', async (req, res) => {
  const { message, userId } = req.body;
  
  // Get relevant past conversations
  const relevantMemories = await getRelevantMemories(message, userId);
  
  // Include context in Danny AI prompt
  const aiResponse = await processWithDanny(message, relevantMemories);
  
  res.json({ response: aiResponse });
});
```

### Example 3: Frontend Integration (React Hook)

```typescript
// ptbiztools-next/src/hooks/useMem0.ts

import { useState, useCallback } from 'react';

export function useMem0() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMemory = useCallback(async (text: string, tags: string[] = []) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/mem0/add-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, tags })
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

  return { addMemory, searchMemories, isLoading, error };
}

// Usage in a component
function Dashboard() {
  const { addMemory, searchMemories } = useMem0();
  
  const handleSavePreference = async (preference: string) => {
    await addMemory(`User preference: ${preference}`, ['user_preference']);
  };
  
  return (
    <button onClick={() => handleSavePreference('dark_mode')}>
      Save Preference
    </button>
  );
}
```

## Quick Start Steps

1. **Start the server** (if not already running):
   ```bash
   source .venv/bin/activate
   export MEM0_API_KEY="m0-d9UBw839tmNCpej40X3wurtLJR2zRS4wHVad1FnK"
   mem0-mcp-server
   ```

2. **Create API routes** in your backend:
   - `POST /api/mem0/add-memory`
   - `POST /api/mem0/search-memories`
   - `GET /api/mem0/get-memories`

3. **Use the React hook** in your frontend components

4. **Test with the demo script**:
   ```bash
   source .venv/bin/activate
   python test_mem0_mcp_direct.py
   ```

## Benefits for PTBizTools

1. **Persistent Memory**: Danny AI remembers past conversations
2. **Personalization**: Each user gets tailored responses based on their history
3. **Context Awareness**: AI understands clinic-specific terminology and preferences
4. **Cross-Session Learning**: Preferences persist across browser sessions
5. **Semantic Search**: Find relevant past conversations naturally

## Next Steps

1. Create the API routes in your backend
2. Implement the React hook in your frontend
3. Integrate with Danny AI conversations
4. Add memory features to user settings/preferences
5. Test with real user data

The Mem0 MCP server is ready to enhance your PTBizTools application with powerful memory capabilities!
