# Medical Advisor Code Interpreter Implementation Roadmap

## Current State
- ✅ o4-mini generates Python code for charts and tables
- ✅ Code is properly formatted and streamed
- ❌ Code is not executed to produce actual visualizations

## Implementation Path for Full Code Interpreter

### 1. Backend Changes (src/app/api/advisor/route.ts)

#### Switch to Responses API for o4-mini
```typescript
// Instead of chat.completions.create, use:
const response = await openai.responses.create({
  model: "o4-mini",
  input: [...], // Formatted as Responses API expects
  tools: [{
    type: "code_interpreter",
    container: {
      type: "auto"
    }
  }],
  include: ["code_interpreter_call.outputs"],
  reasoning: {
    effort: "medium",
    summary: "auto"
  },
  store: true
});
```

#### Handle Code Interpreter Events
The API will emit events like:
- `response.code_interpreter_call_code.delta` - Python code being written
- `response.code_interpreter_call.completed` - Code execution finished
- `response.output_item.done` - Contains outputs and file annotations

#### Critical: Prompt Engineering
Add to system prompt:
```
When creating visualizations, always save them using:
plt.savefig('/mnt/data/chart.png')

When creating files, use markdown links:
[Download Chart](sandbox:/mnt/data/chart.png)
```

### 2. New API Endpoint for File Serving

Create `src/app/api/files/[fileId]/route.ts`:
```typescript
export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const { fileId } = params;
  
  // Fetch file from OpenAI container
  const file = await openai.files.retrieve(fileId);
  const content = await openai.files.content(fileId);
  
  // Return with appropriate headers
  return new Response(content, {
    headers: {
      'Content-Type': file.mime_type || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${file.filename}"`
    }
  });
}
```

### 3. Frontend Changes (src/components/views/AdvisorView.tsx)

#### Handle New Event Types
```typescript
case 'code_interpreter_image_id':
  // Update message with image info
  setMessages(prev => prev.map(m => {
    if (m.id === currentAssistantMessageIdRef.current) {
      return {
        ...m,
        content: {
          ...(m.content as AssistantMessageContent),
          codeInterpreterImages: [
            ...(existing.codeInterpreterImages || []),
            { fileId: data.file_id, filename: data.filename }
          ]
        }
      };
    }
    return m;
  }));
  break;
```

#### Render Images in AssistantMessageRenderer
```typescript
{assistantMessage.codeInterpreterImages?.map((image, idx) => (
  <div key={idx} className="mt-2">
    <img 
      src={`/api/files/${image.fileId}`}
      alt={image.filename}
      className="max-w-full rounded shadow-md"
    />
  </div>
))}
```

### 4. Types Update (src/components/advisor/chat-types.ts)
```typescript
export interface AssistantMessageContent {
  // ... existing fields
  codeInterpreterImages?: Array<{
    fileId: string;
    filename: string;
  }>;
}
```

## Option B: Client-Side Execution (Simpler Alternative)

Use a library like Pyodide to execute Python in the browser:

1. Add Pyodide to the project
2. When code is detected, offer "Run Code" button
3. Execute in sandboxed environment
4. Display results inline

## Testing Checklist

- [ ] Code Interpreter generates and saves files correctly
- [ ] File IDs are captured from annotations
- [ ] Images display properly via /api/files endpoint
- [ ] Error handling for failed executions
- [ ] Loading states during code execution
- [ ] Proper cleanup of old containers

## Security Considerations

1. Validate file IDs before serving
2. Add rate limiting to file endpoint
3. Consider file size limits
4. Implement proper CORS headers
5. Add authentication to file endpoint

## Migration Strategy

1. Start with current implementation (code display only)
2. Add "Coming Soon: Live Execution" badge
3. Implement backend changes
4. Test with small group
5. Roll out to all users 