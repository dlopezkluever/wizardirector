# LLM Service Integration

This document describes the LLM service integration with LangSmith observability for the Wizardirector backend.

## Overview

The LLM integration provides:
- Google Gemini text generation with retry logic and error handling
- LangSmith tracing for full observability and debugging
- Database-stored prompt templates with versioning
- Token counting and cost estimation
- Usage tracking and statistics

## Setup

### 1. Environment Variables

Add the following to your `.env` file:

```env
# LangSmith Configuration
LANGSMITH_API_KEY=your_langsmith_api_key_here
LANGSMITH_PROJECT=aiuteur
LANGSMITH_TRACING=true

# Google Gemini Configuration  
GOOGLE_AI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash-lite

#image: gemini-2.5-flash-image
#video: veo-3.0-fast-generate-001
```

### 2. Database Migration

Run the database migration to add LangSmith fields and prompt templates:

```bash
npm run migrate
```

This will apply `002_add_langsmith_fields.sql` which adds:
- `langsmith_trace_id` field to `stage_states` table
- `prompt_templates` table for versioned prompt storage

### 3. Test Connectivity

Run the connectivity test to verify everything is working:

```bash
npm run test:connectivity
```

This will test:
- Database connection
- Environment variables
- Google Gemini API connectivity
- LangSmith tracing
- Prompt template system
- Full integration flow

## API Endpoints

### Text Generation

**POST** `/api/llm/generate`

Generate text with full LangSmith tracing.

```json
{
  "systemPrompt": "You are a helpful assistant.",
  "userPrompt": "Write a short story about a robot.",
  "model": "gemini-1.5-flash",
  "temperature": 0.7,
  "maxTokens": 1000,
  "metadata": {
    "userId": "user-123",
    "stage": 2
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "content": "Generated text content...",
    "usage": {
      "tokens": {
        "inputTokens": 15,
        "outputTokens": 150,
        "totalTokens": 165
      },
      "cost": {
        "inputCost": 0.000001,
        "outputCost": 0.000045,
        "totalCost": 0.000046,
        "currency": "USD"
      }
    },
    "traceId": "langsmith-trace-id",
    "requestId": "uuid",
    "model": "gemini-1.5-flash"
  }
}
```

### Cost Estimation

**POST** `/api/llm/estimate-cost`

Estimate cost without making an API call.

```json
{
  "systemPrompt": "You are a helpful assistant.",
  "userPrompt": "Write a short story.",
  "expectedOutputTokens": 500
}
```

### Usage Statistics

**GET** `/api/llm/usage-stats?start=2024-01-01&end=2024-01-31`

Get usage statistics for a time period.

### Prompt Templates

#### List Templates
**GET** `/api/llm/templates?stage=2&active=true`

#### Create Template
**POST** `/api/llm/templates`

```json
{
  "name": "treatment_expansion_v1",
  "stage_number": 2,
  "version": "1.0.0",
  "system_prompt": "You are a narrative expansion specialist.",
  "user_prompt_template": "Expand this story: {story_input}",
  "description": "Template for expanding story treatments"
}
```

#### Get Template
**GET** `/api/llm/templates/:id`

#### Update Template
**PUT** `/api/llm/templates/:id`

#### Delete Template
**DELETE** `/api/llm/templates/:id`

#### Activate Template
**POST** `/api/llm/templates/:id/activate`

#### Interpolate Template
**POST** `/api/llm/templates/interpolate`

```json
{
  "templateId": "template-uuid",
  "variables": {
    "story_input": "A robot discovers emotions"
  }
}
```

#### Get Active Template for Stage
**GET** `/api/llm/templates/stage/2/active?name=treatment_expansion`

## Usage in Code

### Direct LLM Client Usage

```typescript
import { llmClient } from '../services/llm-client.js';

const response = await llmClient.generate({
  systemPrompt: 'You are a helpful assistant.',
  userPrompt: 'Hello, world!',
  metadata: { userId: 'user-123' }
});

console.log(response.content);
console.log(`Trace ID: ${response.traceId}`);
```

### Prompt Template Usage

```typescript
import { promptTemplateService } from '../services/prompt-template.js';

// Get active template for stage 2
const template = await promptTemplateService.getActiveTemplateForStage(2);

// Interpolate variables
const interpolated = promptTemplateService.interpolateTemplate(template, {
  story_input: 'A robot discovers emotions',
  target_length: '3-5 minutes'
});

// Use with LLM client
const response = await llmClient.generate({
  systemPrompt: interpolated.system_prompt,
  userPrompt: interpolated.user_prompt,
  metadata: { 
    templateId: template.id,
    templateVersion: template.version 
  }
});
```

### Cost Estimation

```typescript
import { llmClient } from '../services/llm-client.js';

const estimate = llmClient.estimateCost({
  systemPrompt: 'System prompt...',
  userPrompt: 'User prompt...'
}, 500); // expected output tokens

console.log(`Estimated cost: $${estimate.totalCost}`);
```

## LangSmith Integration

### Viewing Traces

1. Go to [LangSmith Dashboard](https://smith.langchain.com)
2. Select your project (wizardirector-dev)
3. View traces with metadata including:
   - Request ID
   - User ID
   - Stage number
   - Template information
   - Token usage
   - Cost information

### Trace Metadata

Each trace includes:
- `requestId`: Unique identifier for the request
- `model`: Model used for generation
- `inputTokens`: Estimated input tokens
- `userId`: User making the request (if available)
- `stage`: Pipeline stage (if applicable)
- `templateId`: Template used (if applicable)

### Debugging

Use the trace ID returned from generation calls to:
1. Debug prompt issues in LangSmith playground
2. Analyze token usage patterns
3. Track cost attribution
4. Monitor generation quality

## Error Handling

The LLM client includes comprehensive error handling:

- **Rate Limiting**: Automatic retry with exponential backoff
- **Network Errors**: Retry on transient network issues
- **Authentication**: Clear error messages for API key issues
- **Server Errors**: Retry on 5xx errors
- **Client Errors**: No retry on 4xx errors (except 429)

## Cost Management

### Token Counting

Token estimation uses a heuristic of ~4 characters per token for English text. For exact token counts, use the actual API response.

### Cost Calculation

Costs are calculated based on current Gemini pricing:
- **gemini-1.5-flash**: $0.075 per 1M input tokens, $0.30 per 1M output tokens
- **gemini-1.5-pro**: $3.50 per 1M input tokens, $10.50 per 1M output tokens

### Usage Tracking

The system tracks:
- Total tokens used
- Total cost incurred
- Usage by model
- Usage by time period
- Individual request metrics

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:connectivity
```

### Manual Testing

Use the connectivity test script to verify:
1. API connectivity
2. LangSmith tracing
3. Database operations
4. Prompt template system
5. Cost calculation accuracy

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   - Ensure all required env vars are set
   - Check `.env` file is loaded correctly

2. **API Key Issues**
   - Verify Google AI API key is valid
   - Check LangSmith API key permissions

3. **Database Connection**
   - Ensure Supabase connection is working
   - Run migrations if tables are missing

4. **LangSmith Traces Not Appearing**
   - Check project name matches environment
   - Verify API key has correct permissions
   - Check network connectivity

### Debug Mode

Set `LANGSMITH_TRACING=true` and check console logs for detailed tracing information.

## Security Considerations

- API keys should never be committed to version control
- Use environment variables for all sensitive configuration
- Implement rate limiting in production
- Monitor usage to prevent unexpected costs
- Use RLS policies for prompt template access control
