# Foresight Medical Advisor

The Foresight Medical Advisor provides AI-powered clinical decision support with two modes of operation: think mode (advanced reasoning with code interpreter) and non-think mode (fast responses).

## Architecture Overview

### API Endpoint: `/api/advisor`

The advisor uses Server-Sent Events (SSE) streaming to provide real-time responses. It supports two operational modes:

1. **Non-Think Mode** (`think=false`): Uses OpenAI Chat Completions API for fast responses
2. **Think Mode** (`think=true`): Uses OpenAI Assistants API with code interpreter for advanced analysis

### Recent Improvements (Latest)

#### Timeout Prevention for Think Mode
- **Issue**: Think mode was failing with "Connection issue or stream interrupted" due to serverless function timeouts
- **Solution**: Implemented heartbeat mechanism and extended timeout handling
  - Heartbeat messages sent every 10 seconds during processing
  - Maximum 2-minute timeout with clear error messages
  - Vercel function timeout increased to 300 seconds (5 minutes)
  - Progressive timeout handling with helpful error messages

#### Formatting Preservation for Non-Think Mode
- **Issue**: After leaving tab inactive, formatted responses would revert to plain markdown
- **Solution**: Enhanced content preservation system
  - Final content is explicitly saved and preserved
  - Improved React re-rendering stability
  - Better markdown accumulator management

## API Parameters

### Query Parameters
- `think`: Boolean indicating mode ("true" for think mode, "false" for non-think mode)
- `patientId`: Optional patient ID for context
- `specialty`: Optional medical specialty filter
- `payload`: JSON-encoded message history

### Request Format
```typescript
{
  messages: Array<{
    role: 'user' | 'assistant' | 'system',
    content: string
  }>
}
```

## Streaming Response Format

### Event Types

#### Heartbeat Events (Think Mode)
```json
{
  "type": "heartbeat",
  "message": "Processing... (15s elapsed)",
  "status": "in_progress"
}
```

#### Content Streaming
```json
{
  "type": "markdown_chunk",
  "content": "partial response text..."
}
```

#### Final Content Preservation
```json
{
  "type": "final_content",
  "content": "complete response for preservation"
}
```

#### Code Interpreter Events (Think Mode)
```json
{
  "type": "code_interpreter_code",
  "content": "python code executed"
}
```

```json
{
  "type": "code_interpreter_output",
  "content": "execution results"
}
```

```json
{
  "type": "code_interpreter_image_id",
  "file_id": "file-abc123"
}
```

#### Stream Completion
```json
{
  "type": "stream_end"
}
```

#### Error Handling
```json
{
  "type": "error",
  "message": "Descriptive error message with guidance"
}
```

## Frontend Implementation

### Streaming Markdown Rendering

The frontend uses the `smd.js` (streaming-markdown) library for real-time markdown rendering:

1. **Active Streaming**: Content is rendered incrementally using DOM manipulation
2. **Final State**: Complete content is rendered with ReactMarkdown for full feature support
3. **Preservation**: Final markdown is stored and preserved across re-renders

### Chart and Table Rendering

- **Charts**: Generated via OpenAI Code Interpreter, displayed as images
- **Tables**: JSON data is parsed and rendered with TanStack Table
- **Loading States**: Progressive indicators during chart generation

## Configuration

### Timeout Settings

#### Vercel Configuration (`vercel.json`)
```json
{
  "functions": {
    "src/app/api/advisor/route.ts": {
      "maxDuration": 300
    }
  }
}
```

### Environment Variables
- `OPENAI_API_KEY`: OpenAI API key
- `MEDICAL_ADVISOR_ASSISTANT_ID`: Pre-created assistant ID for think mode

## Error Handling and Recovery

### Think Mode Timeouts
- Heartbeat mechanism prevents premature timeouts
- Clear error messages guide users to non-think mode for reliability
- Automatic cleanup of resources on timeout

### Connection Interruptions
- EventSource error handling with fallback messages
- Graceful degradation when streaming fails
- User-friendly error messages with actionable guidance

### Performance Optimization
- Assistant ID caching to avoid recreation
- Efficient polling with maximum limits
- Resource cleanup to prevent memory leaks

## Usage Examples

### Basic Query
```javascript
const eventSource = new EventSource('/api/advisor?think=false&payload=' + 
  encodeURIComponent(JSON.stringify({
    messages: [
      { role: 'user', content: 'What are the symptoms of pneumonia?' }
    ]
  }))
);
```

### With Patient Context
```javascript
const eventSource = new EventSource('/api/advisor?think=true&patientId=123&specialty=Pulmonology&payload=' + 
  encodeURIComponent(JSON.stringify({
    messages: [
      { role: 'user', content: 'Analyze this patient\'s chest X-ray results' }
    ]
  }))
);
```

## Best Practices

1. **Mode Selection**: Use non-think mode for quick consultations, think mode for complex analysis
2. **Error Handling**: Always implement EventSource error handlers
3. **Patient Context**: Include relevant patient data for better recommendations
4. **Specialty Filtering**: Use appropriate specialty selection for focused guidelines
5. **Timeout Management**: Set reasonable expectations for think mode response times

## Troubleshooting

### Common Issues

1. **Think Mode Timeouts**: 
   - Check network connectivity
   - Try non-think mode for faster responses
   - Verify OpenAI API key and assistant configuration

2. **Formatting Loss**: 
   - Ensure proper event handling for `final_content` events
   - Check React component re-rendering logic
   - Verify markdown accumulator preservation

3. **Missing Charts/Tables**:
   - Confirm OpenAI Assistant has code_interpreter enabled
   - Check image serving endpoint configuration
   - Verify table data parsing logic 