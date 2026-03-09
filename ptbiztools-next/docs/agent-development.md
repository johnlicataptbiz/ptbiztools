# Agent Development Guide

## Overview

PT Biz Tools uses an AI agent system built on Workflow AI and the AI SDK. This guide covers how to develop, extend, and maintain agents within the application.

## Agent Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│                    Agent Surface                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │   Protocol  │  │   Workflow  │  │   Stream Handler│ │
│  │   (Types)   │  │   Engine    │  │   (Real-time)   │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Workflow Definition                   │
│              (src/workflows/agent-surface.ts)            │
└─────────────────────────────────────────────────────────┘
```

## File Structure

```
src/
├── workflows/
│   └── agent-surface.ts          # Main workflow definition
├── lib/agent/
│   ├── protocol.ts               # Type definitions & interfaces
│   └── [future: agent configs]
├── components/agent/
│   └── agent-surface-panel.tsx   # UI component
└── app/api/agent/
    ├── surface/
    │   └── route.ts              # Init endpoint
    └── surface/[id]/
        └── stream/
            └── route.ts          # Streaming endpoint
```

## Creating a New Agent

### 1. Define the Workflow

Edit `src/workflows/agent-surface.ts`:

```typescript
import { workflow } from '@workflow/ai';

export const myNewAgent = workflow({
  id: 'my-new-agent',
  description: 'What this agent does',
  
  // Input schema
  input: z.object({
    userQuery: z.string(),
    context: z.object({
      practiceId: z.string().optional(),
    }),
  }),
  
  // Output schema
  output: z.object({
    analysis: z.string(),
    recommendations: z.array(z.string()),
    confidence: z.number(),
  }),
  
  // Agent logic
  async execute({ input, step, ai }) {
    // Step 1: Analyze input
    const analysis = await step('analyze', async () => {
      return await ai.generate({
        model: 'gpt-4o',
        prompt: `Analyze: ${input.userQuery}`,
      });
    });
    
    // Step 2: Generate recommendations
    const recommendations = await step('recommend', async () => {
      return await ai.generate({
        model: 'gpt-4o',
        prompt: `Based on analysis: ${analysis}, provide recommendations`,
      });
    });
    
    return {
      analysis: analysis.text,
      recommendations: recommendations.array,
      confidence: 0.95,
    };
  },
});
```

### 2. Update the Protocol

Add types to `src/lib/agent/protocol.ts`:

```typescript
export interface MyNewAgentInput {
  userQuery: string;
  context: {
    practiceId?: string;
  };
}

export interface MyNewAgentOutput {
  analysis: string;
  recommendations: string[];
  confidence: number;
}

export type AgentType = 'discovery-analysis' | 'financial-audit' | 'my-new-agent';
```

### 3. Create API Routes

#### Init Endpoint (`src/app/api/agent/surface/route.ts`):

```typescript
import { myNewAgent } from '@/workflows/agent-surface';

export async function POST(request: Request) {
  const body = await request.json();
  
  // Validate input
  const input = myNewAgentInputSchema.parse(body);
  
  // Start workflow run
  const run = await myNewAgent.start({
    input,
    tags: ['user-' + session.userId],
  });
  
  return Response.json({ runId: run.id });
}
```

#### Stream Endpoint (`src/app/api/agent/surface/[id]/stream/route.ts`):

```typescript
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const run = await myNewAgent.get(params.id);
  
  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const update of run.updates()) {
          controller.enqueue(
            `data: ${JSON.stringify(update)}\n\n`
          );
        }
        controller.close();
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    }
  );
}
```

### 4. Build the UI Component

Create `src/components/agent/my-new-agent-panel.tsx`:

```typescript
'use client';

import { useAgentStream } from '@/hooks/use-agent-stream';

export function MyNewAgentPanel() {
  const { start, updates, isRunning, error } = useAgentStream('my-new-agent');
  
  const handleSubmit = async (input: MyNewAgentInput) => {
    await start(input);
  };
  
  return (
    <div className="agent-panel">
      <AgentInputForm onSubmit={handleSubmit} disabled={isRunning} />
      
      {isRunning && <AgentProgress updates={updates} />}
      
      {updates.length > 0 && (
        <AgentResults results={updates[updates.length - 1]} />
      )}
      
      {error && <AgentError error={error} />}
    </div>
  );
}
```

## Agent Patterns

### 1. Streaming Updates

Always stream progress to the UI:

```typescript
async function* analyzeWithProgress(input: string) {
  yield { type: 'status', message: 'Starting analysis...' };
  
  const chunks = await chunkInput(input);
  let processed = 0;
  
  for (const chunk of chunks) {
    const result = await processChunk(chunk);
    processed += chunk.length;
    
    yield {
      type: 'progress',
      percent: (processed / input.length) * 100,
      partial: result,
    };
  }
  
  yield { type: 'complete', final: true };
}
```

### 2. Error Handling

Implement graceful degradation:

```typescript
try {
  const result = await step('analyze', async () => {
    return await ai.generate({ ... });
  });
} catch (error) {
  // Log for debugging
  console.error('Agent step failed:', error);
  
  // Return partial results if possible
  return {
    analysis: 'Unable to complete full analysis',
    partial: true,
    error: error.message,
  };
}
```

### 3. Context Management

Pass relevant context to agents:

```typescript
const context = {
  practiceId: user.practiceId,
  previousAnalyses: await db.getRecentAnalyses(user.id, 5),
  preferences: user.agentPreferences,
  timestamp: new Date().toISOString(),
};
```

## Testing Agents

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { myNewAgent } from '@/workflows/agent-surface';

describe('MyNewAgent', () => {
  it('should analyze input correctly', async () => {
    const result = await myNewAgent.execute({
      input: {
        userQuery: 'Test query',
        context: {},
      },
    });
    
    expect(result.analysis).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
describe('Agent API', () => {
  it('should stream updates', async () => {
    const response = await fetch('/api/agent/surface', {
      method: 'POST',
      body: JSON.stringify({ userQuery: 'Test' }),
    });
    
    const { runId } = await response.json();
    
    const stream = await fetch(`/api/agent/surface/${runId}/stream`);
    const reader = stream.body?.getReader();
    
    // Verify streaming updates
    const updates = [];
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      updates.push(value);
    }
    
    expect(updates.length).toBeGreaterThan(0);
  });
});
```

## Best Practices

1. **Type Safety**: Always use Zod schemas for inputs/outputs
2. **Idempotency**: Agents should be safe to retry
3. **Rate Limiting**: Implement client-side rate limiting
4. **Caching**: Cache expensive AI calls when appropriate
5. **Logging**: Log all agent runs for debugging
6. **Timeouts**: Set reasonable timeouts for AI calls
7. **Fallbacks**: Provide fallback behavior when AI fails

## Common Pitfalls

- **Memory leaks**: Clean up streams properly
- **Race conditions**: Handle concurrent agent runs
- **Large payloads**: Chunk large inputs
- **Sensitive data**: Never log PII from AI responses

## Resources

- [Workflow AI Docs](https://docs.workflow.ai)
- [AI SDK Docs](https://sdk.vercel.ai/docs)
- [OpenAI API](https://platform.openai.com/docs)
